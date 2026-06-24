import { wcagContrast, clampChroma, formatHex } from "culori";
import type { ResolvedToken } from "./dsl/types.js";
import type { ResolvedTheme } from "./dsl/resolver.js";

// ── Types ──────────────────────────────────────────────────────────

export interface ContrastPair {
  fg: string;
  bg: string;
  minRatio: number;
}

export interface ContrastResult extends ContrastPair {
  ratio: number;
  pass: boolean;
}

// ── Alpha compositing ─────────────────────────────────────────────

/**
 * Composite a foreground color with alpha onto an opaque background.
 * Uses OKLCH linear blending: mixed = fg * alpha + bg * (1 - alpha).
 * Returns an opaque hex color.
 */
function compositeOnBackground(
  fg: ResolvedToken,
  bg: ResolvedToken,
): string {
  const alpha = fg.oklch.alpha ?? 1;

  if (alpha >= 1) {
    return fg.hex;
  }

  const mixedL = fg.oklch.l * alpha + bg.oklch.l * (1 - alpha);
  const mixedC = fg.oklch.c * alpha + bg.oklch.c * (1 - alpha);
  const mixedH = fg.oklch.h;

  const clamped = clampChroma(
    { mode: "oklch" as const, l: mixedL, c: mixedC, h: mixedH },
    "oklch",
    "rgb",
  );

  return formatHex(clamped) ?? "#000000";
}

// ── Contrast checker ──────────────────────────────────────────────

/**
 * Check contrast ratios for a set of fg/bg pairs in a resolved theme.
 *
 * Alpha handling:
 * - bg with alpha (e.g. fillTint*) is composited onto bgPrimary
 * - fg with alpha (e.g. fgSecondary) is composited onto the bg token
 *
 * bgPrimary is used as the base surface for alpha-bg compositing.
 */
export function checkContrast(
  resolved: ResolvedTheme,
  pairs: ContrastPair[],
): ContrastResult[] {
  const bgPrimary = resolved.bgPrimary;
  if (!bgPrimary) {
    throw new Error("Theme must include bgPrimary for contrast checking");
  }

  return pairs.map((pair) => {
    const fgToken = resolved[pair.fg];
    const bgToken = resolved[pair.bg];

    if (!fgToken) {
      throw new Error(`Unknown foreground token: "${pair.fg}"`);
    }
    if (!bgToken) {
      throw new Error(`Unknown background token: "${pair.bg}"`);
    }

    // Resolve effective bg: if bg has alpha, composite onto bgPrimary
    const bgAlpha = bgToken.oklch.alpha ?? 1;
    const effectiveBgHex =
      bgAlpha < 1
        ? compositeOnBackground(bgToken, bgPrimary)
        : bgToken.hex;

    // Resolve effective fg: if fg has alpha, composite onto the bg
    const fgAlpha = fgToken.oklch.alpha ?? 1;
    const effectiveFgHex =
      fgAlpha < 1
        ? compositeOnBackground(fgToken, bgToken)
        : fgToken.hex;

    const ratio = wcagContrast(effectiveFgHex, effectiveBgHex);

    return {
      ...pair,
      ratio: Math.round(ratio * 100) / 100,
      pass: ratio >= pair.minRatio,
    };
  });
}

// ── Default contrast pairs ────────────────────────────────────────

const bgSurfaces = [
  "bgPrimary",
  "bgSecondary",
  "fillNeutral1",
  "fillNeutral2",
  "fillNeutral3",
  "fillNeutral4",
  "fillNeutral5",
  "fillNeutral6",
];

/**
 * Standard WCAG AA contrast pairs that every theme must pass.
 */
export const wcagAAPairs: ContrastPair[] = [
  // fgPrimary on all surfaces
  ...bgSurfaces.map((bg) => ({ fg: "fgPrimary", bg, minRatio: 4.5 })),

  // fgSecondary on all surfaces
  ...bgSurfaces.map((bg) => ({ fg: "fgSecondary", bg, minRatio: 4.5 })),

  // Semantic fg on primary background
  { fg: "fgAccent", bg: "bgPrimary", minRatio: 4.5 },
  { fg: "fgSuccess", bg: "bgPrimary", minRatio: 4.5 },
  { fg: "fgWarning", bg: "bgPrimary", minRatio: 4.5 },
  { fg: "fgDanger", bg: "bgPrimary", minRatio: 4.5 },

  // Semantic fg on their tint backgrounds
  { fg: "fgAccent", bg: "fillTintAccent", minRatio: 4.5 },
  { fg: "fgSuccess", bg: "fillTintSuccess", minRatio: 4.5 },
  { fg: "fgWarning", bg: "fillTintWarning", minRatio: 4.5 },
  { fg: "fgDanger", bg: "fillTintDanger", minRatio: 4.5 },
];
