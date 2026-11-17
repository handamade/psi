import { describe, it, expect } from "vitest";
import { wcagContrast } from "culori";
import { componentVars } from "../src/components/registry.js";
import { checkOverrideScopes } from "../src/scope-gate.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { assembleCustomerTheme, customerThemes } from "../src/themes/customers/index.js";
import { compositeHex, wcagAAPairs } from "../src/contrast-matrix.js";

const themes = [
  ["light", resolve(lightTheme, defaultPalette, defaultSlots)],
  ["dark", resolve(darkTheme, defaultPalette, defaultSlots)],
  ...Object.entries(customerThemes).map(
    ([name, c]) => [name, resolve(assembleCustomerTheme(c), c.palette, c.slots)] as const,
  ),
] as const;

describe("segmented tokens (D132)", () => {
  it("binds the semantic layer, the control ramp, a pill radius and the focus ring", () => {
    const v = componentVars.segmented;
    expect(v["selected-bg"]).toBe("var(--psi-fill-tint-accent)");
    expect(v["selected-fg"]).toBe("var(--psi-fg-accent)");
    expect(v["selected-ring"]).toBe("var(--psi-fg-accent)");
    expect(v.bg).toBe("var(--psi-bg-primary)");
    expect(v.radius).toBe("var(--psi-radius-full)");
    expect(v["focus-ring"]).toBe("var(--psi-border-focus)");
    for (const size of [24, 32, 40]) {
      expect(v[`${size}-height`]).toBe(`var(--psi-control-${size}-height)`);
      expect(v[`${size}-padding-x`]).toBe(`var(--psi-control-${size}-padding-inline)`);
      expect(v[`${size}-font`]).toBe(`var(--psi-control-${size}-font)`);
    }
    expect(v["48-height"]).toBeUndefined();
  });

  it("the shipped defaults pass the scope gate", () => {
    const overrides = Object.fromEntries(
      Object.entries(componentVars.segmented).map(([k, v]) => [`segmented-${k}`, v]),
    );
    expect(checkOverrideScopes(overrides, componentVars, lightTheme)).toEqual([]);
  });

  it("rides pairs the gate already holds", () => {
    for (const pair of [
      { fg: "fgSecondary", bg: "bgPrimary" },
      { fg: "fgPrimary", bg: "fillNeutral3" },
      { fg: "fgAccent", bg: "fillTintAccent" },
      { fg: "fgAccent", bg: "bgPrimary" },
    ]) {
      expect(wcagAAPairs).toContainEqual({ ...pair, minRatio: 4.5 });
    }
  });

  // The track paints bg-primary, so the selected tint is always this composite.
  it.each(themes)("selected text clears 4.5 and its ring 3:1 in %s", (_name, r) => {
    const t = r.fillTintAccent;
    const selected = compositeHex(t.hex, t.oklch.alpha ?? 1, r.bgPrimary.hex);
    expect(wcagContrast(r.fgAccent.hex, selected)).toBeGreaterThanOrEqual(4.5);
    expect(wcagContrast(r.fgAccent.hex, r.bgPrimary.hex)).toBeGreaterThanOrEqual(3);
    expect(wcagContrast(r.fgSecondary.hex, r.bgPrimary.hex)).toBeGreaterThanOrEqual(4.5);
  });
});
