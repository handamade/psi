// D116 — a theme declares its color-scheme from its base, so the browser
// draws its own parts (date pickers, select lists, scrollbars) to match.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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

describe("the shipped themes (D116)", () => {
  const dist = join(import.meta.dirname, "..", "dist");
  const expected = { light: "light", dark: "dark", acme: "light", ember: "dark" } as const;
  const resolved = (theme: string) =>
    JSON.parse(readFileSync(join(dist, "resolved", `${theme}.json`), "utf8")) as { colorScheme?: string };

  for (const [theme, scheme] of Object.entries(expected)) {
    it(`dist/${theme}.css declares ${scheme} once, and resolved/${theme}.json says so`, () => {
      const css = readFileSync(join(dist, `${theme}.css`), "utf8");
      expect(css.match(/color-scheme: [a-z ]+;/g)).toEqual([`color-scheme: ${scheme};`]);
      expect(resolved(theme).colorScheme).toBe(scheme);
    });
  }

  it("every resolved theme carries a scheme, so a new theme cannot ship without one", () => {
    for (const file of readdirSync(join(dist, "resolved")).filter((f) => f.endsWith(".json"))) {
      expect(["light", "dark"], file).toContain(resolved(file.replace(/\.json$/, "")).colorScheme);
    }
  });
});
