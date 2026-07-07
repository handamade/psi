import resolvedLight from "@dku/tokens/resolved/light.json";
import resolvedDark from "@dku/tokens/resolved/dark.json";
import resolvedAcme from "@dku/tokens/resolved/acme.json";

export type ThemeName = "light" | "dark" | "acme";

export interface DocToken {
  /** Original camelCase name from the theme definition */
  name: string;
  /** CSS custom property, e.g. `--ds-bg-primary` */
  cssVar: string;
  /** Resolved hex value */
  hex: string;
  /** Formula string describing how the token was derived */
  formula: string;
  /** OKLCH string, e.g. `oklch(0.95 0.005 250)` or `oklch(0.3 0.03 250 / 0.7)` */
  oklch: string;
}

function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function formatOklch(o: {
  l: number;
  c: number;
  h: number;
  alpha?: number;
}): string {
  const base = `oklch(${o.l} ${o.c} ${o.h}`;
  return o.alpha != null ? `${base} / ${o.alpha})` : `${base})`;
}

export interface DocTypographyCombo {
  /** Combo name, e.g. `16-24-regular` */
  name: string;
  fontSize: number;
  lineHeight: number;
  weight: "regular" | "medium" | "semibold" | "bold";
  /** Numeric CSS font-weight value, e.g. 400 */
  cssWeight: number;
}

interface ResolvedTheme {
  theme: string;
  tokens: Record<
    string,
    {
      name: string;
      oklch: { l: number; c: number; h: number; alpha?: number };
      hex: string;
      formula: string;
    }
  >;
  typography: DocTypographyCombo[];
}

const RESOLVED: Record<ThemeName, ResolvedTheme> = {
  light: resolvedLight as ResolvedTheme,
  dark: resolvedDark as ResolvedTheme,
  acme: resolvedAcme as ResolvedTheme,
};

function buildDocTokens(resolved: ResolvedTheme): DocToken[] {
  return Object.values(resolved.tokens).map((t) => ({
    name: t.name,
    cssVar: `--ds-${camelToKebab(t.name)}`,
    hex: t.hex,
    formula: t.formula,
    oklch: formatOklch(t.oklch),
  }));
}

/**
 * Resolved color tokens for a given theme. Defaults to `light` when the
 * theme is unknown (e.g. before Storybook globals have initialized).
 */
export function getTokens(theme: ThemeName = "light"): DocToken[] {
  return buildDocTokens(RESOLVED[theme] ?? RESOLVED.light);
}

/**
 * Typography combos are theme-independent (only color tokens vary by
 * theme), so this remains a static export sourced from the light theme's
 * resolution.
 */
export const docTypography: DocTypographyCombo[] = RESOLVED.light.typography;

/** Group tokens by their prefix (bg, fg, fill, border). */
export function groupByPrefix(
  tokens: DocToken[],
): Record<string, DocToken[]> {
  const groups: Record<string, DocToken[]> = {};
  for (const token of tokens) {
    // Extract prefix: everything before the first uppercase letter
    const match = token.name.match(/^([a-z]+)/);
    const prefix = match ? match[1] : "other";
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(token);
  }
  return groups;
}
