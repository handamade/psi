import { describe, expect, it } from "vitest";
import { token, ref } from "../src/dsl/builders.js";
import { validate } from "../src/dsl/validator.js";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { darkTheme } from "../src/themes/dark.js";

describe("dark theme", () => {
  it("passes validation", () => {
    expect(() => validate(darkTheme, defaultSlots)).not.toThrow();
  });

  it("has the same token names as expected", () => {
    const resolved = resolve(darkTheme, defaultPalette, defaultSlots);
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
    expect(names).toContain("fillNeutral2");
    expect(names).toContain("fillNeutral3");
    expect(names).toContain("fillNeutral4");
    expect(names).toContain("fillNeutral5");
    expect(names).toContain("fillNeutral6");
    expect(names).toContain("fillAccent");
    expect(names).toContain("fillSuccess");
    expect(names).toContain("fillWarning");
    expect(names).toContain("fillDanger");
    expect(names).toContain("fillTintAccent");
    expect(names).toContain("fillTintSuccess");
    expect(names).toContain("fillTintWarning");
    expect(names).toContain("fillTintDanger");
    expect(names).toContain("borderNeutral");
    expect(names).toContain("borderStrong");
    expect(names).toContain("borderFocus");
    expect(names).toContain("borderFaint");
    expect(names).toContain("scrimSoft");
    expect(names).toContain("scrimMedium");
    expect(names).toContain("scrimHeavy");
  });

  it("fgPrimary has high lightness (> 0.8, light text on dark bg)", () => {
    const resolved = resolve(darkTheme, defaultPalette, defaultSlots);
    expect(resolved.fgPrimary.oklch.l).toBeGreaterThan(0.8);
  });

  it("bgPrimary has low lightness (< 0.25, dark background)", () => {
    const resolved = resolve(darkTheme, defaultPalette, defaultSlots);
    expect(resolved.bgPrimary.oklch.l).toBeLessThan(0.25);
  });

  it("fgAccent chroma is capped at 0.23", () => {
    const resolved = resolve(darkTheme, defaultPalette, defaultSlots);
    expect(resolved.fgAccent.oklch.c).toBeLessThanOrEqual(0.23 + 0.001);
  });

  it("fillTintAccent has alpha 0.15", () => {
    const resolved = resolve(darkTheme, defaultPalette, defaultSlots);
    expect(resolved.fillTintAccent.oklch.alpha).toBeCloseTo(0.15, 2);
  });

  it("defines hairline and scrim alphas (WS4, D32)", () => {
    expect(darkTheme.borderFaint).toEqual(token({ from: ref.fgPrimary, alpha: 0.08, scopes: ["border"] }));
    expect(darkTheme.scrimSoft).toEqual(token({ from: ref.bgPrimary, alpha: 0.25, scopes: ["surface"] }));
    expect(darkTheme.scrimMedium).toEqual(token({ from: ref.bgPrimary, alpha: 0.35, scopes: ["surface"] }));
    expect(darkTheme.scrimHeavy).toEqual(token({ from: ref.bgPrimary, alpha: 0.82, scopes: ["surface"] }));
  });
});
