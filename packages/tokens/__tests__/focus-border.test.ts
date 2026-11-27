import { describe, expect, it } from "vitest";
import { checkContrast, nonTextPairs } from "../src/contrast-matrix.js";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";

const themes = [
  ["light", lightTheme, defaultPalette, defaultSlots],
  ["dark", darkTheme, defaultPalette, defaultSlots],
  ...Object.entries(customerThemes).map(([n, c]) => [n, assembleCustomerTheme(c), c.palette, c.slots] as const),
] as const;

describe("borderFocus (D146)", () => {
  it("is gated at 3:1 on bgPrimary and bgSecondary", () => {
    expect(nonTextPairs).toEqual(expect.arrayContaining([
      { fg: "borderFocus", bg: "bgPrimary", minRatio: 3 },
      { fg: "borderFocus", bg: "bgSecondary", minRatio: 3 },
    ]));
  });

  for (const [name, theme, palette, slots] of themes) {
    it(`passes in ${name}`, () => {
      const resolved = resolve(theme, palette, slots);
      const results = checkContrast(resolved, nonTextPairs.filter((p) => p.fg === "borderFocus"));
      expect(results).toHaveLength(2);
      expect(results.filter((r) => !r.pass)).toEqual([]);
    });
  }
});
