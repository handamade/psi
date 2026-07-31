import { describe, it, expect } from "vitest";
import { controlVars } from "../src/components/control.js";
import { inputVars } from "../src/components/input.js";
import { selectVars } from "../src/components/select.js";
import { buttonVars } from "../src/components/button.js";
import { checkboxVars } from "../src/components/checkbox.js";
import { tooltipVars } from "../src/components/tooltip.js";
import { tagVars } from "../src/components/tag.js";
import { switchVars } from "../src/components/switch.js";
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

  it("declares a size-invariant radius (D56)", () => {
    expect(controlVars.radius).toBe("var(--psi-radius-8)");
  });

  it("binds only scale tokens — the family aliases nothing component-level", () => {
    for (const value of Object.values(controlVars)) {
      expect(value).toMatch(/^var\(--psi-(size|space|text|radius)-[a-z0-9-]+\)$/);
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

  it("has exactly 29 tokens", () => {
    expect(Object.keys(controlVars)).toHaveLength(29);
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

describe("control radius consumers (D56)", () => {
  it("Button, Input and Select bind the dial directly", () => {
    expect(buttonVars.radius).toBe("var(--psi-control-radius)");
    expect(inputVars.radius).toBe("var(--psi-control-radius)");
    expect(selectVars.radius).toBe("var(--psi-control-radius)");
  });

  it("Checkbox and Tooltip cap themselves at their own ceiling", () => {
    expect(checkboxVars["box-radius"]).toBe(
      "min(var(--psi-control-radius), var(--psi-radius-4))",
    );
    expect(tooltipVars.radius).toBe(
      "min(var(--psi-control-radius), var(--psi-radius-6))",
    );
  });

  it("Tag and Switch declare no radius token — pill-ness is identity", () => {
    for (const vars of [tagVars, switchVars]) {
      expect(Object.keys(vars).filter((k) => k.includes("radius"))).toEqual([]);
    }
  });

  it("radius keys carry no D46 scope, so both gates skip them", () => {
    expect(keyGroup("radius")).toBeUndefined();
    expect(keyGroup("box-radius")).toBeUndefined();
  });

  it("emits the five per-component custom properties", () => {
    expect(emitComponentVarsCSS("button", buttonVars)).toContain(
      "--psi-button-radius: var(--psi-control-radius)",
    );
    expect(emitComponentVarsCSS("checkbox", checkboxVars)).toContain(
      "--psi-checkbox-box-radius: min(var(--psi-control-radius), var(--psi-radius-4))",
    );
    expect(emitComponentVarsCSS("tooltip", tooltipVars)).toContain(
      "--psi-tooltip-radius: min(var(--psi-control-radius), var(--psi-radius-6))",
    );
  });
});
