import { describe, it, expect } from "vitest";
import { resolve } from "../src/dsl/resolver.js";
import { ref, token } from "../src/dsl/builders.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { acmePalette, acmeSlots } from "../src/themes/customers/acme.js";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
import * as matrix from "../src/contrast-matrix.js";
import { gateTheme, ThemeGateError } from "../src/theme/gate.js";
import type { ContrastPair } from "../src/contrast-matrix.js";

/** DNNN — an unchecked Switch is identified by its track alone and its state
 * by where the white thumb sits on it, so WCAG 1.4.11 asks 3:1 for the track
 * against its surface and for the thumb against the track, at rest and on
 * hover. fillNeutral4 measured 1.10-1.27. */

const nonTextPairs = (): ContrastPair[] =>
  ((matrix as Record<string, unknown>).nonTextPairs as ContrastPair[] | undefined) ?? [];

const SWITCH_PAIRS: ContrastPair[] = [
  { fg: "fillControl", bg: "bgPrimary", minRatio: 3 },
  { fg: "fillControl", bg: "bgSecondary", minRatio: 3 },
  { fg: "fillControlHover", bg: "bgPrimary", minRatio: 3 },
  { fg: "fillControlHover", bg: "bgSecondary", minRatio: 3 },
  { fg: "fillStaticWhite", bg: "fillControl", minRatio: 3 },
  { fg: "fillStaticWhite", bg: "fillControlHover", minRatio: 3 },
];

const ember = customerThemes.ember!;

describe("fillControl and fillControlHover (DNNN)", () => {
  it("fillControl is a ref to borderControl and fillControlHover is fgPrimary at 0.75 / 0.55, both surfaces", () => {
    expect(lightTheme.fillControl).toEqual({ from: ref.borderControl, scopes: ["surface"] });
    expect(darkTheme.fillControl).toEqual({ from: ref.borderControl, scopes: ["surface"] });
    expect(lightTheme.fillControlHover).toEqual({ from: ref.fgPrimary, alpha: 0.75, scopes: ["surface"] });
    expect(darkTheme.fillControlHover).toEqual({ from: ref.fgPrimary, alpha: 0.55, scopes: ["surface"] });
  });

  it("nonTextPairs gates the track on both surfaces and the thumb on the track", () => {
    expect(nonTextPairs()).toEqual(expect.arrayContaining(SWITCH_PAIRS));
  });

  for (const [name, theme, palette, slots] of [
    ["light", lightTheme, defaultPalette, defaultSlots],
    ["dark", darkTheme, defaultPalette, defaultSlots],
    ["acme", lightTheme, acmePalette, acmeSlots],
    ["ember", assembleCustomerTheme(ember), ember.palette, ember.slots],
  ] as const) {
    it(`${name}: clears all six pairs, and hover is further from the surface than rest`, () => {
      const resolved = resolve(theme, palette, slots);
      expect(resolved.fillControl, "fillControl resolves").toBeDefined();
      for (const r of matrix.checkContrast(resolved, SWITCH_PAIRS)) {
        expect(r.ratio, `${r.fg} on ${r.bg}`).toBeGreaterThanOrEqual(3);
      }
      for (const bg of ["bgPrimary", "bgSecondary"]) {
        const [rest, hover] = matrix.checkContrast(resolved, [
          { fg: "fillControl", bg, minRatio: 3 },
          { fg: "fillControlHover", bg, minRatio: 3 },
        ]);
        expect(hover!.ratio, `hover over rest on ${bg}`).toBeGreaterThan(rest!.ratio + 1.5);
      }
    });
  }

  it("the theme gate (Psi's build and buildThemeCss) refuses a fillControl under 3:1, naming the pairs", () => {
    const weak = { ...lightTheme, fillControl: token({ from: ref.fgPrimary, alpha: 0.15, scopes: ["surface"] }) };
    let caught: unknown;
    try {
      gateTheme("weak", weak, defaultPalette, defaultSlots);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ThemeGateError);
    const failing = (caught as ThemeGateError).contrastFailures.map((f) => `${f.fg}/${f.bg}`);
    // Measured: 1.32 / 1.32 track, 1.52 thumb.
    expect(failing).toEqual(["fillControl/bgPrimary", "fillControl/bgSecondary", "fillStaticWhite/fillControl"]);
  });
});
