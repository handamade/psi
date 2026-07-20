import { describe, expect, it } from "vitest";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
import { validateScopeConsistency } from "../src/dsl/validator.js";

describe("authored scopes (D46)", () => {
  it("every color token in light and dark is scoped", () => {
    for (const [name, theme] of Object.entries({ light: lightTheme, dark: darkTheme })) {
      for (const [tokenName, def] of Object.entries(theme)) {
        expect(def.scopes, `${name}.${tokenName} must declare scopes`).toBeDefined();
      }
    }
  });

  it("light and dark declare identical scopes per token", () => {
    expect(() => validateScopeConsistency({ light: lightTheme, dark: darkTheme })).not.toThrow();
  });

  it("cross-family design decisions are declared, not smuggled", () => {
    expect(lightTheme.fgDanger.scopes).toEqual(["text", "border"]);
    expect(lightTheme.fillAccent.scopes).toEqual(["surface", "border"]);
    expect(lightTheme.fgPrimary.scopes).toEqual(["text"]);
    expect(lightTheme.bgInverted.scopes).toEqual(["surface"]);
    expect(lightTheme.fgOnInverted.scopes).toEqual(["text"]);
  });

  it("customer overrides inherit base scopes (ember fgOnAccent, acme fgDanger)", () => {
    const ember = assembleCustomerTheme(customerThemes.ember);
    expect(ember.fgOnAccent.scopes).toEqual(["text"]);
    const acme = assembleCustomerTheme(customerThemes.acme);
    expect(acme.fgDanger.scopes).toEqual(["text", "border"]);
  });

  it("assembled customer themes stay scope-consistent with base themes", () => {
    expect(() => validateScopeConsistency({
      light: lightTheme,
      dark: darkTheme,
      ...Object.fromEntries(Object.entries(customerThemes).map(([n, c]) => [n, assembleCustomerTheme(c)])),
    })).not.toThrow();
  });
});
