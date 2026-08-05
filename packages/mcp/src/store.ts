import type { ComponentEntry, PatternEntry, PsiIndex, TokenEntry } from "./types.js";

export interface Brief {
  id: string;
  kind: "component" | "token" | "topic" | "pattern";
  title: string;
  summary: string;
}

export type Detail =
  | ({ kind: "component" } & ComponentEntry)
  | ({ kind: "token" } & TokenEntry)
  | ({ kind: "pattern" } & PatternEntry)
  | { kind: "topic"; name: string; content: unknown };

export interface Store {
  search(query: string): Brief[];
  get(id: string): Detail | null;
}

const MAX_RESULTS = 20;

/** Documented search-response budget: "serialized result <= 6000 characters
 * (~1.5k tokens)" (docs/superpowers/plans/2026-07-18-agent-access-plan.md),
 * asserted by __tests__/store.test.ts's "stays within the response budget". */
const RESPONSE_BUDGET = 6000;

/** How the empty-query overview divides its budget across kinds. Topics,
 * patterns, and components grow and cost very differently:
 *
 *   topics   — a fixed, slow-growing set of terse briefs (~90 chars each).
 *              Carries the rules an agent cannot guess, `getting-started`
 *              (the five required CSS imports) above all. Takes its full
 *              cost, unconditionally.
 *   components — verbose (up to 220 chars each) and the only axis that grows
 *              with every release. Also the axis a keyword query recovers
 *              best: search("menu") finds Menu; no query re-derives a house
 *              rule an agent doesn't know exists. Reserved a floor of
 *              `COMPONENT_FLOOR` items before patterns spend the remainder,
 *              so catalog growth cannot starve them below the floor.
 *   patterns — composition recipes; their stored summaries carry match
 *              phrases for keyword ranking and can run long, so the overview
 *              projects a trimmed copy (see overviewBrief) at a *derived*
 *              per-call cap — the largest that lets every pattern fit
 *              alongside topics and the component floor. The stored,
 *              untrimmed brief is still what score() ranks against.
 *
 * Previously the overview filled topics, then patterns, then components
 * until the budget ran out, so whichever kind was filled last absorbed all
 * catalog growth — three more patterns was enough to starve components from
 * six down to four (D61). Allocating by kind first means catalog growth
 * shortens pattern summaries instead of evicting items off the tail. */
const COMPONENT_FLOOR = 8;

const TOPIC_SUMMARIES: Record<string, string> = {
  variants: "Variant intent and typical use for all 8 flat variants",
  rules: "House rules: accent budget, sizing, color binding",
  states: "hover/active/disabled/focus derivation formulas",
  typographyDefaults: "Default type combos per role",
  fonts: "Font roles and brand font stacks",
  motion: "Durations, easings, reduced-motion behavior, recipes",
  layout: "Breakpoints, container, z-index",
  recipes: "Composition recipes (mediaTint, sectionHeader)",
  tags: "Tag/badge rules incl. the accent exemption (D40)",
  "getting-started": "Install, the five required CSS imports, theme attribute, core rules",
  themes: "Theme list (light|dark|acme|ember), data-psi-theme mechanics, customer themes",
  scales:
    "Pixel scales — space, size, radius, motion, layout — the values behind " +
    "--psi-space-* / --psi-radius-* / --psi-duration-*",
};

function componentSummary(c: ComponentEntry): string {
  const axis = (name: string) => c.props.find((p) => p.name === name)?.type;
  const parts: string[] = [];
  if (c.description) parts.push(c.description);
  const variants = axis("variant");
  const sizes = axis("size");
  if (variants) parts.push(`variants: ${variants.replaceAll('"', "")}`);
  if (sizes) parts.push(`sizes: ${sizes}`);
  if (!variants && !sizes) parts.push(`props: ${c.props.map((p) => p.name).slice(0, 6).join(", ")}`);
  return parts.join(" — ").slice(0, 220);
}

function patternSummary(p: PatternEntry): string {
  let summary = `${p.intent} — ${p.match.join(", ")}, ${p.parameters.length} parameters`;
  if (p.blocked) summary += `, blocked (gaps: ${p.gaps.join(", ")})`;
  return summary;
}

/** Most an overview pattern intro (intent + match phrases + parameter count)
 * may cost. The effective limit is derived per-call (see the empty-query
 * branch): patterns take whatever the budget leaves after topics and the
 * component floor, so a growing catalog shortens summaries instead of
 * evicting items (D61).
 *
 * The `, blocked (gaps: …)` tail is never subject to this cap: it is the
 * backlog signal this cycle exists to publish, and patternSummary() puts it
 * at the END of the string — a length-based slice of the assembled summary
 * would silently drop it for every one of the 13 patterns (all longer than
 * 120 chars), which is exactly the bug this trims to avoid. So the overview
 * projects a pattern's summary from the underlying PatternEntry directly:
 * trim the intro, then always append the tail. */
const OVERVIEW_PATTERN_INTRO_MAX = 120;

/** Trims `s` to at most `limit` chars, backing off to the last word boundary
 * and marking the cut with an ellipsis — never a mid-word fragment that
 * could read as a complete (if coincidental) match phrase. */
function truncateAtWord(s: string, limit: number): string {
  if (s.length <= limit) return s;
  const cut = s.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}

function overviewPatternSummary(p: PatternEntry, limit: number): string {
  const intro = truncateAtWord(
    `${p.intent} — ${p.match.join(", ")}, ${p.parameters.length} parameters`,
    limit,
  );
  return p.blocked ? `${intro}, blocked (gaps: ${p.gaps.join(", ")})` : intro;
}

export function createStore(index: PsiIndex): Store {
  const patternsById = new Map(index.patterns.map((p) => [p.id, p]));

  /** Overview-only projection: returns `b` unchanged for every kind except
   * pattern, where it re-derives the summary from the underlying
   * `PatternEntry` (via `overviewPatternSummary`) rather than slicing the
   * already-assembled, full-length `Brief.summary` — so the `blocked (gaps:
   * …)` tail always survives the overview's trim. Always a shallow copy for
   * patterns: the stored brief kept in `briefs` (and used by score()) is
   * never mutated. `limit` is derived per-call by the empty-query branch
   * (D61), not a module constant, so a growing catalog shortens summaries
   * instead of evicting items. */
  function overviewBrief(b: Brief, limit: number): Brief {
    if (b.kind !== "pattern") return b;
    const pattern = patternsById.get(b.title);
    if (!pattern) return b;
    return { ...b, summary: overviewPatternSummary(pattern, limit) };
  }

  const briefs: Brief[] = [
    ...index.components.map((c) => ({
      id: `component:${c.name}`,
      kind: "component" as const,
      title: c.name,
      summary: componentSummary(c),
    })),
    ...index.patterns.map((p) => ({
      id: `pattern:${p.id}`,
      kind: "pattern" as const,
      title: p.id,
      summary: patternSummary(p),
    })),
    ...Object.keys(index.topics).map((name) => ({
      id: `topic:${name}`,
      kind: "topic" as const,
      title: name,
      summary: TOPIC_SUMMARIES[name] ?? "Guidance topic",
    })),
    ...index.tokens.map((t) => ({
      id: `token:${t.name}`,
      kind: "token" as const,
      title: t.name,
      summary: t.formula,
    })),
  ];

  function score(brief: Brief, terms: string[]): number {
    let s = 0;
    const title = brief.title.toLowerCase();
    const summary = brief.summary.toLowerCase();
    for (const term of terms) {
      if (title === term) s += 10;
      else if (title.includes(term)) s += 5;
      if (summary.includes(term)) s += 1;
    }
    return s;
  }

  function search(query: string): Brief[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      // D61: allocate before filling. Topics take their full cost, components
      // are reserved a floor, and patterns take the remainder via a derived
      // cap — so catalog growth shortens summaries instead of evicting the
      // tail. Whichever kind was filled last used to absorb all growth;
      // that was the bug. (Tokens are omitted; they are discoverable via
      // query.)
      const topics = briefs.filter((b) => b.kind === "topic");
      const patterns = briefs.filter((b) => b.kind === "pattern");
      const components = briefs.filter((b) => b.kind === "component");

      const reserve = JSON.stringify(components.slice(0, COMPONENT_FLOOR)).length;
      const fits = (limit: number) =>
        JSON.stringify([...topics, ...patterns.map((b) => overviewBrief(b, limit))]).length +
          reserve <=
        RESPONSE_BUDGET;

      let limit = OVERVIEW_PATTERN_INTRO_MAX;
      while (limit > 0 && !fits(limit)) limit -= 10;

      const out: Brief[] = [...topics, ...patterns.map((b) => overviewBrief(b, limit))];
      for (const component of components) {
        out.push(component);
        if (JSON.stringify(out).length > RESPONSE_BUDGET) {
          out.pop();
          break;
        }
      }
      return out;
    }
    return briefs
      .map((b) => ({ b, s: score(b, terms) }))
      .filter((x) => x.s > 0)
      .sort((a, z) => z.s - a.s)
      .slice(0, MAX_RESULTS)
      .map((x) => x.b);
  }

  function get(id: string): Detail | null {
    const [prefix, rest] = id.includes(":") ? id.split(/:(.*)/s) : [null, id];
    const name = (rest ?? id).toLowerCase();
    const want = (kind: string) => prefix === null || prefix === kind;

    if (want("component")) {
      const c = index.components.find((c) => c.name.toLowerCase() === name);
      if (c) return { kind: "component", ...c };
    }
    if (want("token")) {
      const t = index.tokens.find((t) => t.name.toLowerCase() === name);
      if (t) return { kind: "token", ...t };
    }
    if (want("pattern")) {
      const p = index.patterns.find((p) => p.id.toLowerCase() === name);
      if (p) return { kind: "pattern", ...p };
    }
    if (want("topic")) {
      const key = Object.keys(index.topics).find((k) => k.toLowerCase() === name);
      if (key) return { kind: "topic", name: key, content: index.topics[key] };
    }
    return null;
  }

  return { search, get };
}
