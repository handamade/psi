import { describe, expect, it } from "vitest";
import { gamutWarnings } from "../src/gamut.js";
import { resolve } from "../src/dsl/resolver.js";
import { token, set, slot } from "../src/dsl/builders.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
import type { Palette, SlotMap, ThemeDef } from "../src/dsl/types.js";

/** Constructs the fully-assembled theme/palette/slots for a built theme name,
 * mirroring scripts/build.ts's theme table (D39 gamut retune harness). */
function buildTheme(name: string): {
  resolved: ReturnType<typeof resolve>;
  theme: ThemeDef;
  palette: Palette;
  slots: SlotMap;
} {
  let theme: ThemeDef;
  let palette: Palette;
  let slots: SlotMap;

  if (name === "light") {
    theme = lightTheme;
    palette = defaultPalette;
    slots = defaultSlots;
  } else if (name === "dark") {
    theme = darkTheme;
    palette = defaultPalette;
    slots = defaultSlots;
  } else {
    const c = customerThemes[name]!;
    theme = assembleCustomerTheme(c);
    palette = c.palette;
    slots = c.slots;
  }

  const resolved = resolve(theme, palette, slots);
  return { resolved, theme, palette, slots };
}

describe("gamutWarnings", () => {
  it("flags tokens clamped by more than deltaE 2", () => {
    const neon = { neon: { l: 0.8, c: 0.37, h: 150 } };
    const slots = { ...defaultSlots, accent: "neon" };
    const resolved = resolve(
      { hot: token({ from: slot.accent, l: set(0.8) }) },
      { ...defaultPalette, ...neon },
      slots,
    );
    const warnings = gamutWarnings(
      resolved,
      { hot: token({ from: slot.accent, l: set(0.8) }) },
      { ...defaultPalette, ...neon },
      slots,
    );
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toMatch(/hot/);
  });

  // Target contract per spec decision D19 — unskipped now that palette anchors
  // and formula caps are retuned to their in-gamut rendered values (D39).
  it("default light theme produces no gamut warnings (target contract)", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    expect(gamutWarnings(resolved, lightTheme, defaultPalette, defaultSlots)).toEqual([]);
  });

  it.each(["light", "dark", "acme", "ember"])("%s theme resolves fully in-gamut (D39)", (name) => {
    const { resolved, theme, palette, slots } = buildTheme(name);
    expect(gamutWarnings(resolved, theme, palette, slots)).toEqual([]);
  });
});
