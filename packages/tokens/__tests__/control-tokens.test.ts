import { describe, it, expect } from "vitest";
import { controlVars } from "../src/components/control.js";
import { inputVars } from "../src/components/input.js";
import { selectVars } from "../src/components/select.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";
import { keyGroup } from "../src/scopes.js";

const SIZES = [24, 32, 40, 48] as const;

describe("controlVars", () => {
  it("declares height and gap for every size (shared across roles)", () => {
    expect(SIZES.map((n) => controlVars[`${n}-height`])).toEqual([
      "var(--psi-size-24)", "var(--psi-size-32)",
      "var(--psi-size-40)", "var(--psi-size-48)",
    ]);
    expect(SIZES.map((n) => controlVars[`${n}-gap`])).toEqual([
      "var(--psi-space-4)", "var(--psi-space-8)",
      "var(--psi-space-8)", "var(--psi-space-8)",
    ]);
  });

  it("declares the label ramp — padding 8/12/16/20, icon inset 6/8/12/16", () => {
    expect(SIZES.map((n) => controlVars[`${n}-padding-inline`])).toEqual([
      "var(--psi-space-8)", "var(--psi-space-12)",
      "var(--psi-space-16)", "var(--psi-space-20)",
    ]);
    expect(SIZES.map((n) => controlVars[`${n}-padding-inline-icon`])).toEqual([
      "var(--psi-space-6)", "var(--psi-space-8)",
      "var(--psi-space-12)", "var(--psi-space-16)",
    ]);
  });

  it("declares the value ramp one step tighter than the label ramp (D55)", () => {
    expect(SIZES.map((n) => controlVars[`value-${n}-padding-inline`])).toEqual([
      "var(--psi-space-8)", "var(--psi-space-8)",
      "var(--psi-space-12)", "var(--psi-space-16)",
    ]);
  });

  it("label fonts are medium, value fonts are regular at every size", () => {
    for (const n of SIZES) {
      expect(controlVars[`${n}-font`]).toMatch(/-medium\)$/);
      expect(controlVars[`value-${n}-font`]).toMatch(/-regular\)$/);
    }
    expect(controlVars["value-48-font"]).toBe("var(--psi-text-18-28-regular)");
  });

  it("binds only scale tokens — the family aliases nothing component-level", () => {
    for (const value of Object.values(controlVars)) {
      expect(value).toMatch(/^var\(--psi-(size|space|text)-[a-z0-9-]+\)$/);
    }
  });

  it("carries no scope-bearing keys, so both D46 gates skip it", () => {
    for (const key of Object.keys(controlVars)) {
      expect(keyGroup(key)).toBeUndefined();
    }
  });

  it("emits --psi-control-* custom properties", () => {
    const css = emitComponentVarsCSS("control", controlVars);
    expect(css).toContain("--psi-control-40-padding-inline: var(--psi-space-16)");
    expect(css).toContain("--psi-control-40-padding-inline-icon: var(--psi-space-12)");
    expect(css).toContain("--psi-control-value-40-padding-inline: var(--psi-space-12)");
    expect(css).toContain("--psi-control-value-48-font: var(--psi-text-18-28-regular)");
  });

  it("has exactly 28 tokens", () => {
    expect(Object.keys(controlVars)).toHaveLength(28);
  });
});

describe("value-ramp consumers cannot drift (D54 acceptance)", () => {
  const SIZES = [24, 32, 40, 48] as const;

  it("Input and Select resolve to the SAME value-ramp token at every size", () => {
    for (const n of SIZES) {
      expect(inputVars[`${n}-padding-inline`]).toBe(`var(--psi-control-value-${n}-padding-inline)`);
      expect(selectVars[`${n}-padding-inline`]).toBe(inputVars[`${n}-padding-inline`]);
      expect(inputVars[`${n}-font`]).toBe(`var(--psi-control-value-${n}-font)`);
      expect(selectVars[`${n}-font`]).toBe(inputVars[`${n}-font`]);
      expect(inputVars[`${n}-height`]).toBe(`var(--psi-control-${n}-height)`);
      expect(selectVars[`${n}-height`]).toBe(inputVars[`${n}-height`]);
    }
  });

  it("neither text control binds the label ramp", () => {
    for (const vars of [inputVars, selectVars]) {
      for (const [key, value] of Object.entries(vars)) {
        if (!/-padding-inline$|-font$/.test(key) || !/^\d\d-/.test(key)) continue;
        expect(value).toContain("--psi-control-value-");
      }
    }
  });

  it("Select's chevron well derives from the value ramp, not a literal", () => {
    for (const n of SIZES) {
      expect(selectVars[`${n}-chevron-offset`]).toBe(`var(--psi-control-value-${n}-padding-inline)`);
      // 12px glyph + 4px breathing; 28 is not on the spacing scale, hence calc.
      expect(selectVars[`${n}-padding-inline-end`]).toBe(
        `calc(var(--psi-control-value-${n}-padding-inline) + var(--psi-space-16))`,
      );
    }
  });
});
