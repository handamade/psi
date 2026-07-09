import { token, delta, slot, ref } from "../../dsl/builders.js";
import type { Palette, SlotMap, ThemeDef } from "../../dsl/types.js";

/** Dark-first brand (D27) — the portfolio's ember-field identity.
 * Anchors are culori-derived from the shipped portfolio hexes. */
export const emberPalette: Palette = {
  emberCanvas: { l: 0.147, c: 0.004, h: 49 },  // #0c0a09 page
  emberInk: { l: 0.949, c: 0.011, h: 72 },     // #f3ede6 text
  emberAccent: { l: 0.724, c: 0.177, h: 40 },  // #ff7847
  emberEmerald: { l: 0.52, c: 0.19, h: 155 },  // default success anchor values
  emberAmber: { l: 0.75, c: 0.18, h: 75 },     // default warning anchor values
  emberRuby: { l: 0.55, c: 0.22, h: 25 },      // default danger anchor values
  white: { l: 1.0, c: 0, h: 0 },
  black: { l: 0.0, c: 0, h: 0 },
};

export const emberSlots: SlotMap = {
  ink: "emberInk",
  canvas: "emberCanvas",
  accent: "emberAccent",
  success: "emberEmerald",
  warning: "emberAmber",
  danger: "emberRuby",
};

export const emberOverrides: ThemeDef = {
  // Inherited dark formulas land off-target (#0e0b07 / #1a150f / #eee6e2);
  // canvas/ink-anchor overrides hit the shipped hexes exactly.
  bgPrimary: token({ from: slot.canvas }),                                    // #0c0a09
  bgSecondary: token({ from: slot.canvas, l: delta(+0.015), c: delta(+0.003) }), // #100d0b
  fgPrimary: token({ from: slot.ink }),                                       // #f3ede6
  // Dark label on the ember accent (D37): white is 2.62:1 on #ff7847.
  fgOnAccent: token({ from: ref.fgStaticBlack }),
};
