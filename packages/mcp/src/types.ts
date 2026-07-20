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

export interface PsiIndex {
  version: string;
  themes: string[];
  components: ComponentEntry[];
  tokens: TokenEntry[];
  patterns: PatternEntry[];
  scales: Record<string, unknown>;
  topics: Record<string, unknown>;
}
