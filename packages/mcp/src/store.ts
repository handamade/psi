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

export function createStore(index: PsiIndex): Store {
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
      // Overview: all components, patterns, and topics (tokens are discoverable via query).
      return briefs.filter((b) => b.kind !== "token").slice(0, MAX_RESULTS + 10);
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
