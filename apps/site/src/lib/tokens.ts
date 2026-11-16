import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export type ThemeName = "light" | "dark" | "acme" | "ember";
export const THEMES: ThemeName[] = ["light", "dark", "acme", "ember"];

interface Oklch {
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

const cache = new Map<ThemeName, Resolved>();
export function resolved(theme: ThemeName = "light"): Resolved {
  if (!cache.has(theme)) {
    const path = require.resolve(`@handamade/psi-tokens/resolved/${theme}.json`);
    cache.set(theme, JSON.parse(readFileSync(path, "utf8")) as Resolved);
  }
  return cache.get(theme)!;
}

export interface Guidance {
  typographyDefaults: Record<string, string>;
  motion: { reducedMotion: string; recipes: Record<string, string> };
  layout: { note: string; container: string };
  geometry: { note: string; sizes: number[] };
}

let guidanceCache: Guidance | undefined;
export function guidance(): Guidance {
  guidanceCache ??= JSON.parse(
    readFileSync(require.resolve("@handamade/psi-tokens/guidance.json"), "utf8"),
  ) as Guidance;
  return guidanceCache;
}

export function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function formatOklch(o: Oklch): string {
  const base = `oklch(${o.l} ${o.c} ${o.h}`;
  return o.alpha != null ? `${base} / ${o.alpha})` : `${base})`;
}

export interface ColorToken {
  name: string;
  cssVar: string;
  formula: string;
  byTheme: Record<ThemeName, { hex: string; oklch: string }>;
}

export function colorTokens(): ColorToken[] {
  return Object.values(resolved("light").tokens).map((t) => ({
    name: t.name,
    cssVar: `--psi-${kebab(t.name)}`,
    formula: t.formula,
    byTheme: Object.fromEntries(
      THEMES.map((th) => {
        const v = resolved(th).tokens[t.name];
        return [th, { hex: v.hex, oklch: formatOklch(v.oklch) }];
      }),
    ) as ColorToken["byTheme"],
  }));
}
