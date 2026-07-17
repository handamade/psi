import { token, set, cap, slot } from "../../dsl/builders.js";
import type { Palette, SlotMap, ThemeDef } from "../../dsl/types.js";

export const acmePalette: Palette = {
  charcoal: { l: 0.22, c: 0.015, h: 30 },
  cream: { l: 0.96, c: 0.01, h: 80 },
  coral: { l: 0.55, c: 0.2, h: 30 },
  // D39: c retuned to the anchor's own in-gamut max at l 0.52 (was 0.15, out
  // of sRGB gamut) — fillSuccess reads this anchor unmodified and was already
  // clamping to exactly this value.
  mint: { l: 0.52, c: 0.1176, h: 160 },
  gold: { l: 0.78, c: 0.15, h: 85 },
  crimson: { l: 0.55, c: 0.22, h: 15 },
  white: { l: 1.0, c: 0, h: 0 },
  black: { l: 0.0, c: 0, h: 0 },
};

export const acmeSlots: SlotMap = {
  ink: "charcoal",
  canvas: "cream",
  accent: "coral",
  success: "mint",
  warning: "gold",
  danger: "crimson",
};

/** D39: acme's status hues (160/85/15) have lower in-gamut chroma maxima at
 * l 0.48 than light.ts's default caps, so the fg formulas carry acme's own
 * clamp targets. Values are the rendered chromas from dist/resolved/acme.json
 * — hex output is unchanged. */
export const acmeOverrides: ThemeDef = {
  fgSuccess: token({ from: slot.success, l: set(0.48), c: cap(0.1086) }),
  fgWarning: token({ from: slot.warning, l: set(0.48), c: cap(0.0984) }),
  fgDanger: token({ from: slot.danger, l: set(0.48), c: cap(0.1919) }),
};
