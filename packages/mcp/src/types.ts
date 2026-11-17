export interface PropDoc {
  name: string;
  type: string;
  required: boolean;
  default: unknown;
  description: string;
}

export interface ComponentEntry {
  name: string;
  description: string;
  props: PropDoc[];
  /** Full generated markdown doc (includes the a11y/keyboard table). */
  doc: string;
  /** Authored slot contracts (D45): what each named slot accepts, how
   * many, in what order. Empty for components with no slots. */
  slots: Array<{
    name: string;
    accepts: { components?: string[]; contracts?: string[] };
    cardinality: string;
    order?: number;
  }>;
  /** The React attribute interface its props extend, e.g. "ButtonHTMLAttributes"; null when none (D129). */
  attributes: string | null;
  /** Index into PsiIndex.attributeSets: the attribute names it passes through. */
  attributeSet: number | null;
  /** At least one of these attributes must be present (D129). */
  accessibleName: { oneOf: string[] } | null;
}

export interface Oklch { l: number; c: number; h: number; alpha?: number }

export interface TokenEntry {
  name: string;
  formula: string;
  values: Record<string, { oklch: Oklch; hex: string }>;
}

/** A single node in a pattern's `compose` tree: a component instance, its
 * props (which may hold `{param:key}` / `{content:key}` placeholders), and
 * its slot fills (nested nodes or string literals / placeholders). Mirrors
 * `packages/react/scripts/patterns.ts`'s `PatternNode` — the shape emitted
 * into `packages/react/dist/patterns.json` (D47). */
export interface PatternNode {
  component: string;
  props?: Record<string, unknown>;
  slots?: Record<string, Array<PatternNode | string>>;
  content?: string;
}

export interface PatternParameter {
  key: string;
  ask: string;
  options: Array<string | number>;
  default?: string | number;
}

/** Shape of one entry in `packages/react/dist/patterns.json` (D47/D48):
 * an authored composition recipe plus its build-time validation/render
 * results (`gaps`, `blocked`, `preset`). */
export interface PatternEntry {
  id: string;
  intent: string;
  match: string[];
  compose: PatternNode;
  parameters: PatternParameter[];
  content: Record<string, string>;
  gaps: string[];
  blocked: boolean;
  preset: string | null;
}

/** Everything the MCP index serves as markdown, built from one DocsInput.
 * A mirror of `@handamade/psi-docs`' `DocsPages`: src/ never imports that
 * package, so tsc does not compile its TS source (D129). */
export interface DocsPages {
  overview: string;
  /** By page slug. */
  components: Record<string, { title: string; members: string[]; markdown: string }>;
  /** By token page slug; title is e.g. "Color tokens". */
  tokenPages: Record<string, { title: string; markdown: string }>;
  /** By guide id. */
  guides: Record<string, { title: string; description: string; markdown: string }>;
  /** By token name, e.g. "bgPrimary". */
  tokens: Record<string, string>;
  /** By pattern id. */
  patterns: Record<string, string>;
  /** By topic name. */
  topics: Record<string, string>;
}

export interface PsiIndex {
  version: string;
  themes: string[];
  components: ComponentEntry[];
  tokens: TokenEntry[];
  patterns: PatternEntry[];
  scales: Record<string, unknown>;
  topics: Record<string, unknown>;
  /** Attribute names components pass through to their element, deduplicated (D129). */
  attributeSets: string[][];
  /** Slot contract name → member components (src/contracts.json). */
  contracts: Record<string, string[]>;
  /** Every name @handamade/psi-react exports, values and types. */
  exports: string[];
  /** Every docs page and every single-token, pattern and topic page, as
   * markdown, baked from @handamade/psi-docs at publish time (D129). */
  docs: DocsPages;
}

/** What `buildIndex` returns: the index before its docs are baked. */
export type BaseIndex = Omit<PsiIndex, "docs">;
