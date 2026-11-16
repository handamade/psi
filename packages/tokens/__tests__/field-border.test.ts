import { describe, it, expect } from "vitest";
import { resolve } from "../src/dsl/resolver.js";
import { ref, token } from "../src/dsl/builders.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { acmePalette, acmeSlots } from "../src/themes/customers/acme.js";
import * as matrix from "../src/contrast-matrix.js";
import { gateTheme, ThemeGateError } from "../src/theme/gate.js";
import type { ContrastPair } from "../src/contrast-matrix.js";

/** D120 — a text field is identified by its border alone (its fill is the
 * canvas), so WCAG 1.4.11 asks 3:1 at rest and on hover. Rest binds
 * borderControl (D106); hover binds the new borderControlHover. */

const nonTextPairs = (): ContrastPair[] =>
  ((matrix as Record<string, unknown>).nonTextPairs as ContrastPair[] | undefined) ?? [];

describe("borderControlHover (D120)", () => {
  it("is fgPrimary at alpha 0.75 in the light base and 0.60 in the dark base", () => {
    expect(lightTheme.borderControlHover).toEqual({ from: ref.fgPrimary, alpha: 0.75, scopes: ["border"] });
    expect(darkTheme.borderControlHover).toEqual({ from: ref.fgPrimary, alpha: 0.6, scopes: ["border"] });
  });

  it("nonTextPairs gates borderControl and borderControlHover on bgPrimary and bgSecondary at 3:1", () => {
    expect(nonTextPairs()).toEqual([
      { fg: "borderControl", bg: "bgPrimary", minRatio: 3 },
      { fg: "borderControl", bg: "bgSecondary", minRatio: 3 },
      { fg: "borderControlHover", bg: "bgPrimary", minRatio: 3 },
      { fg: "borderControlHover", bg: "bgSecondary", minRatio: 3 },
    ]);
  });

  for (const [name, theme, palette, slots] of [
    ["light", lightTheme, defaultPalette, defaultSlots],
    ["dark", darkTheme, defaultPalette, defaultSlots],
    ["acme", lightTheme, acmePalette, acmeSlots],
  ] as const) {
    it(`${name}: hover clears 3:1 and is a step darker than rest on both surfaces`, () => {
      const resolved = resolve(theme, palette, slots);
      expect(resolved.borderControlHover, "borderControlHover resolves").toBeDefined();
      for (const bg of ["bgPrimary", "bgSecondary"]) {
        const [rest, hover] = matrix.checkContrast(resolved, [
          { fg: "borderControl", bg, minRatio: 3 },
          { fg: "borderControlHover", bg, minRatio: 3 },
        ]);
        expect(hover!.ratio, `borderControlHover on ${bg}`).toBeGreaterThanOrEqual(3);
        expect(hover!.ratio - rest!.ratio, `hover over rest on ${bg}`).toBeGreaterThan(1.5);
      }
    });
  }

  it("the theme gate (Psi's build and buildThemeCss) refuses a borderControlHover under 3:1, naming the pairs", () => {
    const weak = { ...lightTheme, borderControlHover: token({ from: ref.fgPrimary, alpha: 0.15, scopes: ["border"] }) };
    let caught: unknown;
    try {
      gateTheme("weak", weak, defaultPalette, defaultSlots);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ThemeGateError);
    const failing = (caught as ThemeGateError).contrastFailures.map((f) => `${f.fg}/${f.bg}`);
    expect(failing).toEqual(["borderControlHover/bgPrimary", "borderControlHover/bgSecondary"]);
  });
});
