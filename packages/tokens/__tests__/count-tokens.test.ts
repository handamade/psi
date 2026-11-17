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

describe("count tokens (D124)", () => {
  it("declares the five count tokens with their defaults", () => {
    expect(componentVars.count).toEqual({
      fg: "var(--psi-fg-secondary)",
      "attention-fg": "var(--psi-fg-warning)",
      "attention-bg": "var(--psi-fill-tint-warning)",
      "attention-backdrop-bg": "var(--psi-bg-primary)",
      "attention-padding-x": "var(--psi-space-6)",
    });
  });

  it("the shipped defaults pass the scope gate", () => {
    const overrides = Object.fromEntries(
      Object.entries(componentVars.count).map(([k, v]) => [`count-${k}`, v]),
    );
    expect(checkOverrideScopes(overrides, componentVars, lightTheme)).toEqual([]);
  });

  it("the scope gate refuses a surface token on count-fg", () => {
    const violations = checkOverrideScopes({ "count-fg": "var(--psi-bg-primary)" }, componentVars, lightTheme);
    expect(violations).toHaveLength(1);
    expect(violations[0].token).toBe("bgPrimary");
  });

  it("the scope gate refuses a text token on count-attention-bg", () => {
    const violations = checkOverrideScopes({ "count-attention-bg": "var(--psi-fg-primary)" }, componentVars, lightTheme);
    expect(violations).toHaveLength(1);
    expect(violations[0].token).toBe("fgPrimary");
  });

  it("rides pairs the gate already holds: fgSecondary on the tree's surfaces, fgWarning on its tint", () => {
    for (const bg of ["bgPrimary", "fillNeutral3", "fillNeutral4"]) {
      expect(wcagAAPairs).toContainEqual({ fg: "fgSecondary", bg, minRatio: 4.5 });
    }
    expect(wcagAAPairs).toContainEqual({ fg: "fgWarning", bg: "fillTintWarning", minRatio: 4.5 });
  });

  // The attention pill paints fill-tint-warning over its own bg-primary
  // backdrop, so wherever it sits (the current entry's fillNeutral4 included)
  // its background is the composite the gate measures. A bare tint over
  // fillNeutral4 measured 4.43 in the light theme.
  it.each(themes)("the attention pill clears 4.5 over its backdrop in %s", (_name, r) => {
    const t = r.fillTintWarning;
    const pill = compositeHex(t.hex, t.oklch.alpha ?? 1, r.bgPrimary.hex);
    expect(wcagContrast(r.fgWarning.hex, pill)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("nav-tree icon tokens (D124)", () => {
  it("sizes the icon at half the entry's height and spaces it by space-8", () => {
    expect(componentVars["nav-tree"]["icon-size"]).toBe("calc(var(--psi-size-32) / 2)");
    expect(componentVars["nav-tree"]["icon-gap"]).toBe("var(--psi-space-8)");
  });
});
