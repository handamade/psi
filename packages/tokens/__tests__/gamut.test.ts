import { describe, expect, it } from "vitest";
import { gamutWarnings } from "../src/gamut.js";
import { resolve } from "../src/dsl/resolver.js";
import { token, set, slot } from "../src/dsl/builders.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";

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

  it("default light theme gamut warnings for out-of-gamut anchors", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    const warnings = gamutWarnings(resolved, lightTheme, defaultPalette, defaultSlots);
    // Current palette anchors have out-of-gamut colors that need to be adjusted
    // Affected tokens: fgSuccess, fgWarning, fgDanger, fillSuccess, fillWarning, fillTintSuccess, fillTintWarning, fillTintDanger
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.includes("fgSuccess"))).toBe(true);
    expect(warnings.some((w) => w.includes("fgWarning"))).toBe(true);
    expect(warnings.some((w) => w.includes("fgDanger"))).toBe(true);
  });
});
