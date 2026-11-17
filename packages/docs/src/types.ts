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
