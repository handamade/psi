import { describe, it, expect } from "vitest";
import { formatHex, interpolate, wcagContrast } from "culori";
import { componentVars } from "../src/components/registry.js";
import { checkOverrideScopes } from "../src/scope-gate.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { assembleCustomerTheme, customerThemes } from "../src/themes/customers/index.js";
import { compositeHex } from "../src/contrast-matrix.js";

const themes = [
  ["light", resolve(lightTheme, defaultPalette, defaultSlots)],
  ["dark", resolve(darkTheme, defaultPalette, defaultSlots)],
  ...Object.entries(customerThemes).map(
    ([name, c]) => [name, resolve(assembleCustomerTheme(c), c.palette, c.slots)] as const,
  ),
] as const;

describe("link tokens (D119)", () => {
  it("declares the nine link tokens with their defaults", () => {
    expect(componentVars.link).toEqual({
      fg: "var(--psi-fg-accent)",
      "fg-hover": "color-mix(in oklab, var(--psi-link-fg) 70%, var(--psi-fg-primary))",
      "fg-current": "var(--psi-fg-primary)",
      "font-weight-current": "500",
      "underline-thickness": "1px",
      "underline-thickness-hover": "2px",
      "underline-offset": "0.2em",
      "focus-ring": "var(--psi-border-focus)",
      radius: "var(--psi-radius-4)",
    });
  });

  it("the shipped defaults pass the scope gate", () => {
    const overrides = Object.fromEntries(
      Object.entries(componentVars.link).map(([k, v]) => [`link-${k}`, v]),
    );
    expect(checkOverrideScopes(overrides, componentVars, lightTheme)).toEqual([]);
  });

  it("a theme may retune each colour to another foreground", () => {
    const overrides = {
      "link-fg": "var(--psi-fg-primary)",
      "link-fg-hover": "var(--psi-fg-accent)",
      "link-fg-current": "var(--psi-fg-secondary)",
    };
    expect(checkOverrideScopes(overrides, componentVars, lightTheme)).toEqual([]);
  });

  it("the scope gate refuses a surface token on link-fg", () => {
    const violations = checkOverrideScopes({ "link-fg": "var(--psi-bg-primary)" }, componentVars, lightTheme);
    expect(violations).toHaveLength(1);
    expect(violations[0].token).toBe("bgPrimary");
  });

  // The hover colour is a runtime color-mix, so the build gate never sees it.
  // Assert here that mixing 30% toward fgPrimary in oklab keeps AA on every
  // surface a link is gated on, in every shipped theme.
  describe.each(themes)("hover contrast in %s", (_name, r) => {
    const hover = formatHex(interpolate([r.fgAccent.hex, r.fgPrimary.hex], "oklab")(0.3))!;
    const surface = (name: string) => {
      const t = r[name];
      const a = t.oklch.alpha ?? 1;
      return a < 1 ? compositeHex(t.hex, a, r.bgPrimary.hex) : t.hex;
    };
    it.each(["bgPrimary", "bgSecondary", "fillTintAccent"])("clears 4.5 on %s, and no less than rest", (bg) => {
      const rest = wcagContrast(r.fgAccent.hex, surface(bg));
      const hov = wcagContrast(hover, surface(bg));
      expect(hov).toBeGreaterThanOrEqual(4.5);
      expect(hov).toBeGreaterThanOrEqual(rest);
    });
  });
});
