import type { Palette, SlotMap } from "../../dsl/types.js";

export const acmePalette: Palette = {
  charcoal: { l: 0.22, c: 0.015, h: 30 },
  cream: { l: 0.96, c: 0.01, h: 80 },
  coral: { l: 0.55, c: 0.2, h: 30 },
  mint: { l: 0.52, c: 0.15, h: 160 },
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
