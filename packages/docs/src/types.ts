export type ThemeName = "light" | "dark" | "acme" | "ember";

export interface PropInfo {
  name: string;
  type: string;
  required: boolean;
  default: string | number | null;
  description: string;
}

export interface ExportInfo {
  name: string;
  description: string;
  props: PropInfo[];
}

export interface Oklch {
  l: number;
  c: number;
  h: number;
  alpha?: number;
}

export interface Resolved {
  theme: string;
  colorScheme: string;
  tokens: Record<string, { name: string; oklch: Oklch; hex: string; formula: string; scopes?: string[] }>;
  typography: { name: string; fontSize: number; lineHeight: number; weight: string; cssWeight: number }[];
  display: {
    name: string;
    min: number;
    max: number;
    vw: number;
    lineHeight: number;
    weight: string;
    tracking: number;
    cssWeight: number;
  }[];
  scales: {
    space: number[];
    size: number[];
    radius: number[];
    motion: { durations: number[]; easings: Record<string, string> };
    layout: {
      breakpoints: Record<string, number>;
      container: Record<string, number>;
      zIndex: Record<string, number>;
    };
    focusRing: Record<string, number>;
    scopes: Record<string, string[]>;
  };
}

export interface Guidance {
  variants: { variant: string; intent: string; typicalUse: string }[];
  typographyDefaults: Record<string, string>;
  motion: { reducedMotion: string; recipes: Record<string, string> };
  layout: { note: string; container: string };
  geometry: { note: string; sizes: number[] };
}

export interface ColorToken {
  name: string;
  cssVar: string;
  formula: string;
  byTheme: Record<ThemeName, { hex: string; oklch: string }>;
}

export interface ExampleSource {
  slug: string;
  name: string;
  source: string;
}

export interface GuideSource {
  id: string;
  title: string;
  description: string;
  order: number;
  /** The MDX after its frontmatter, as written. */
  body: string;
}

/** Everything a docs page is built from. The builders in markdown.ts read
 * nothing else, so the site and the MCP's index build produce the same
 * text from the same input. */
export interface DocsInput {
  /** @handamade/psi-react's version. */
  version: string;
  componentCount: number;
  iconCount: number;
  exports: ExportInfo[];
  /** packages/react/docs/<Export>.md, without its leading comment line. */
  generatedDocs: Record<string, string>;
  guidance: Guidance;
  resolved: Record<ThemeName, Resolved>;
  examples: ExampleSource[];
  guides: GuideSource[];
}

export interface PatternNodeLike {
  component: string;
  props?: Record<string, unknown>;
  slots?: Record<string, Array<PatternNodeLike | string>>;
  content?: string;
}

export interface PatternLike {
  id: string;
  intent: string;
  match: string[];
  compose: PatternNodeLike;
  parameters: Array<{ key: string; ask: string; options: Array<string | number>; default?: string | number }>;
  content: Record<string, string>;
  gaps: string[];
  blocked: boolean;
  preset: string | null;
}

/** Everything the MCP index serves as markdown, built from one DocsInput. */
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
