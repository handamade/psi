// D116 — a theme declares its color-scheme from its base, so the browser
// draws its own parts (date pickers, select lists, scrollbars) to match.
import { describe, expect, it } from "vitest";
import { customerColorScheme, customerThemes } from "../src/themes/customers/index.js";

describe("customerColorScheme (D116)", () => {
  it("is the theme's base", () => {
    expect(customerColorScheme({ ...customerThemes.acme, base: "dark" })).toBe("dark");
    expect(customerColorScheme({ ...customerThemes.acme, base: "light" })).toBe("light");
    expect(customerColorScheme(customerThemes.ember)).toBe("dark");
  });

  it("is light when the theme names no base", () => {
    expect(customerThemes.acme.base).toBeUndefined();
    expect(customerColorScheme(customerThemes.acme)).toBe("light");
  });
});
