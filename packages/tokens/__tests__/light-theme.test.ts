import { describe, expect, it } from "vitest";
import { token, ref } from "../src/dsl/builders.js";
import { validate } from "../src/dsl/validator.js";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";

describe("light theme", () => {
  it("passes validation", () => {
    expect(() => validate(lightTheme, defaultSlots)).not.toThrow();
  });

  it("resolves all tokens", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    const names = Object.keys(resolved);
    expect(names).toContain("bgPrimary");
    expect(names).toContain("bgSecondary");
    expect(names).toContain("fgPrimary");
    expect(names).toContain("fgSecondary");
    expect(names).toContain("fgTertiary");
    expect(names).toContain("fgQuaternary");
    expect(names).toContain("fgPrimaryInverted");
    expect(names).toContain("fgStaticWhite");
    expect(names).toContain("fgOnAccent");
    expect(names).toContain("fgAccent");
    expect(names).toContain("fgSuccess");
    expect(names).toContain("fgWarning");
    expect(names).toContain("fgDanger");
    expect(names).toContain("fillNeutral1");
    expect(names).toContain("fillNeutral6");
    expect(names).toContain("fillAccent");
    expect(names).toContain("fillTintAccent");
    expect(names).toContain("borderNeutral");
    expect(names).toContain("borderStrong");
    expect(names).toContain("borderFocus");
    expect(names).toContain("borderFaint");
    expect(names).toContain("scrimSoft");
    expect(names).toContain("scrimMedium");
    expect(names).toContain("scrimHeavy");
  });

  it("fgPrimary has low lightness (dark text on light bg)", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    expect(resolved.fgPrimary.oklch.l).toBeLessThan(0.4);
  });

  it("bgPrimary has high lightness", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    expect(resolved.bgPrimary.oklch.l).toBeGreaterThan(0.9);
  });

  it("fgAccent chroma is capped at 0.23", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    expect(resolved.fgAccent.oklch.c).toBeLessThanOrEqual(0.23 + 0.001);
  });

  it("fillTintAccent has alpha 0.12", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    expect(resolved.fillTintAccent.oklch.alpha).toBeCloseTo(0.12, 2);
  });

  it("defines hairline and scrim alphas (WS4, D32)", () => {
    expect(lightTheme.borderFaint).toEqual(token({ from: ref.fgPrimary, alpha: 0.08 }));
    expect(lightTheme.scrimSoft).toEqual(token({ from: ref.bgPrimary, alpha: 0.25 }));
    expect(lightTheme.scrimMedium).toEqual(token({ from: ref.bgPrimary, alpha: 0.35 }));
    expect(lightTheme.scrimHeavy).toEqual(token({ from: ref.bgPrimary, alpha: 0.82 }));
  });
});
