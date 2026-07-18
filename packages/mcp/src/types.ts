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
}

export interface Oklch { l: number; c: number; h: number; alpha?: number }

export interface TokenEntry {
  name: string;
  formula: string;
  values: Record<string, { oklch: Oklch; hex: string }>;
}

export interface PsiIndex {
  version: string;
  themes: string[];
  components: ComponentEntry[];
  tokens: TokenEntry[];
  scales: Record<string, unknown>;
  topics: Record<string, unknown>;
}
