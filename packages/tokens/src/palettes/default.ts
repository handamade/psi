import type { Palette, SlotMap } from "../dsl/types.js";

export const defaultPalette: Palette = {
  obsidian: { l: 0.25, c: 0.02, h: 250 },
  platinum: { l: 0.95, c: 0.005, h: 250 },
  sapphire: { l: 0.55, c: 0.21, h: 260 },
  ruby: { l: 0.55, c: 0.22, h: 25 },
  amber: { l: 0.75, c: 0.18, h: 75 },
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
