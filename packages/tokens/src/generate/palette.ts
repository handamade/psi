import type { Palette, SlotMap } from "../dsl/types.js";
import type { BrandVector, ChromaWord } from "./types.js";

/** Accent chroma by character. Values sit inside sRGB for most hues; the
 * solver (Task 4) caps per-hue where a given hue cannot carry them. */
const ACCENT_CHROMA: Readonly<Record<ChromaWord, number>> = {
  muted: 0.06,
  calm: 0.10,
  balanced: 0.15,
  vivid: 0.20,
  electric: 0.26,
};

/** Status hues are fixed: green reads as success and red as danger regardless
 * of the brand. Only their chroma follows the brand's character. */
const STATUS_HUES = { success: 155, warning: 75, danger: 25 } as const;

export function buildBrandPalette(v: BrandVector): {
  palette: Palette;
  lightSlots: SlotMap;
  darkSlots: SlotMap;
} {
  const accentC = ACCENT_CHROMA[v.chroma];
  // Neutrals carry a trace of the brand hue so the pair reads as one family.
  const neutralC = Math.min(0.02, accentC * 0.12);
  const statusC = Math.max(0.14, Math.min(0.22, accentC));

  const palette: Palette = {
    brandInkLight: { l: 0.25, c: neutralC, h: v.hue },
    brandInkDark: { l: 0.95, c: neutralC, h: v.hue },
    brandCanvasLight: { l: 0.96, c: neutralC * 0.5, h: v.hue },
    brandCanvasDark: { l: 0.15, c: neutralC * 0.5, h: v.hue },
    brandAccent: { l: 0.55, c: accentC, h: v.hue },
    brandSuccess: { l: 0.52, c: statusC, h: STATUS_HUES.success },
    brandWarning: { l: 0.75, c: statusC, h: STATUS_HUES.warning },
    brandDanger: { l: 0.55, c: statusC, h: STATUS_HUES.danger },
    white: { l: 1.0, c: 0, h: 0 },
    black: { l: 0.0, c: 0, h: 0 },
  };

  const shared = {
    accent: "brandAccent",
    success: "brandSuccess",
    warning: "brandWarning",
    danger: "brandDanger",
  } as const;

  return {
    palette,
    lightSlots: { ink: "brandInkLight", canvas: "brandCanvasLight", ...shared },
    darkSlots: { ink: "brandInkDark", canvas: "brandCanvasDark", ...shared },
  };
}
