import type { Palette, SlotMap } from "../dsl/types.js";

export const defaultPalette: Palette = {
  obsidian: { l: 0.25, c: 0.02, h: 250 },
  platinum: { l: 0.95, c: 0.005, h: 250 },
  sapphire: { l: 0.55, c: 0.21, h: 260 },
  ruby: { l: 0.55, c: 0.22, h: 25 },
  // D39: c retuned to the anchor's own in-gamut max at l 0.75 (was 0.18, out of
  // sRGB gamut). fillWarning (light/dark) reads this anchor unmodified, and
  // dark fgWarning sets l to this same 0.75 — both were already clamping to
  // this exact value, so the fix is value-neutral.
  amber: { l: 0.75, c: 0.1582, h: 75 },
  // D39: c intentionally left as-is. fillSuccess (light/dark) is out-of-gamut
  // at this anchor's own l 0.52, but dark's fgSuccess also reads this anchor
  // unmodified at l 0.75 (a different lightness) where it IS in-gamut —
  // lowering c here would shift that token's rendered hex. Fixed instead via
  // c: cap(0.1285) on the fillSuccess formulas in light.ts/dark.ts.
  emerald: { l: 0.52, c: 0.19, h: 155 },
  white: { l: 1.0, c: 0, h: 0 },
  black: { l: 0.0, c: 0, h: 0 },
};

export const defaultSlots: SlotMap = {
  ink: "obsidian",
  canvas: "platinum",
  accent: "sapphire",
  success: "emerald",
  warning: "amber",
  danger: "ruby",
};
