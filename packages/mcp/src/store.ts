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

/** Order the empty-query overview is filled in. Guidance first, catalog last,
 * because the two grow and cost very differently:
 *
 *   topics   — a fixed, slow-growing set of terse briefs (~90 chars each).
 *              Carries the rules an agent cannot guess, `getting-started`
 *              (the five required CSS imports) above all.
 *   patterns — composition recipes; their stored summaries carry match
 *              phrases for keyword ranking and can run long, so the
 *              overview projects a trimmed copy (see overviewBrief) capped
 *              near topic size — the stored, untrimmed brief is still what
 *              score() ranks against.
 *   components — verbose (up to 220 chars each) and the only axis that grows
 *              with every release. Also the axis a keyword query recovers
 *              best: search("menu") finds Menu; no query re-derives a house
 *              rule an agent doesn't know exists.
 *
 * Capping by item *count* (the previous scheme) evicted the tail, and since
 * components were emitted first the tail was always topics — so registering
 * D53's Menu components silently dropped eight topics including
 * `getting-started`. Filling by serialized *length* in this order instead
 * degrades only the component tail, which is the cheap thing to lose. */
const OVERVIEW_KIND_ORDER: Array<Brief["kind"]> = ["topic", "pattern", "component"];

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

/** Overview-only cap on the *intro* portion of a pattern summary (intent +
 * match phrases + parameter count), comparable to a topic brief (~100
 * bytes). The stored `Brief.summary` built by patternSummary() above stays
 * full-length — score() reads it for keyword ranking (the match phrases are
 * what let "delete confirmation" find destructive-confirm) — so this only
 * shapes a copy used when search("") projects the overview list.
 *
 * The `, blocked (gaps: …)` tail is never subject to this cap: it is the
 * backlog signal this cycle exists to publish, and patternSummary() puts it
 * at the END of the string — a length-based slice of the assembled summary
 * would silently drop it for every one of the 13 patterns (all longer than
 * 120 chars), which is exactly the bug this trims to avoid. So the overview
 * projects a pattern's summary from the underlying PatternEntry directly:
 * trim the intro, then always append the tail. */
const OVERVIEW_PATTERN_INTRO_LIMIT = 100;

/** Trims `s` to at most `limit` chars, backing off to the last word boundary
 * and marking the cut with an ellipsis — never a mid-word fragment that
 * could read as a complete (if coincidental) match phrase. */
function truncateAtWord(s: string, limit: number): string {
  if (s.length <= limit) return s;
  const cut = s.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}

function overviewPatternSummary(p: PatternEntry): string {
  const intro = truncateAtWord(
    `${p.intent} — ${p.match.join(", ")}, ${p.parameters.length} parameters`,
    OVERVIEW_PATTERN_INTRO_LIMIT,
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
   * never mutated. */
  function overviewBrief(b: Brief): Brief {
    if (b.kind !== "pattern") return b;
    const pattern = patternsById.get(b.title);
    if (!pattern) return b;
    return { ...b, summary: overviewPatternSummary(pattern) };
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
      // Overview: topics, then patterns, then as many components as the
      // response budget still affords (tokens are discoverable via query).
      // Filled by serialized length, not item count, so the thing that gets
      // dropped is always the component tail — never the guidance surface.
      const candidates = OVERVIEW_KIND_ORDER.flatMap((kind) =>
        briefs.filter((b) => b.kind === kind),
      );
      const out: Brief[] = [];
      for (const brief of candidates) {
        out.push(overviewBrief(brief));
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
