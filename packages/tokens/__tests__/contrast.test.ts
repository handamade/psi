import { describe, expect, it } from "vitest";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { checkContrast, wcagAAPairs, componentLabelPairs, compositeHex } from "../src/contrast-matrix.js";
import { acmePalette, acmeSlots } from "../src/themes/customers/acme.js";
import type { ContrastResult } from "../src/contrast-matrix.js";

function formatFailures(results: ContrastResult[]): string {
  const failures = results.filter((r) => !r.pass);
  if (failures.length === 0) return "";
  const lines = failures.map(
    (f) =>
      `  ${f.fg} on ${f.bg}: ${f.ratio} (need ${f.minRatio})`,
  );
  return `${failures.length} contrast failures:\n${lines.join("\n")}`;
}

describe("contrast matrix", () => {
  describe("compositeHex", () => {
    it("composites in sRGB: 50% black on white = #808080", () => {
      expect(compositeHex("#000000", 0.5, "#ffffff")).toBe("#808080");
    });

    it("alpha 0: returns background color", () => {
      expect(compositeHex("#000000", 0, "#ffffff")).toBe("#ffffff");
    });

    it("alpha 1: returns foreground color", () => {
      expect(compositeHex("#123456", 1, "#ffffff")).toBe("#123456");
    });

    it("unparseable foreground color throws with input named", () => {
      expect(() => compositeHex("nope", 0.5, "#ffffff")).toThrow(/nope/);
    });

    it("unparseable background color throws with input named", () => {
      expect(() => compositeHex("#123456", 0.5, "nope")).toThrow(/nope/);
    });
  });

  describe("light theme", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    const results = checkContrast(resolved, wcagAAPairs);

    it("passes all WCAG AA contrast pairs", () => {
      const failures = results.filter((r) => !r.pass);
      expect(failures, formatFailures(results)).toHaveLength(0);
    });

    it("returns correct number of results", () => {
      expect(results).toHaveLength(wcagAAPairs.length);
    });

    it("each result has ratio and pass fields", () => {
      for (const result of results) {
        expect(result.ratio).toBeGreaterThan(0);
        expect(typeof result.pass).toBe("boolean");
      }
    });
  });

  describe("dark theme", () => {
    const resolved = resolve(darkTheme, defaultPalette, defaultSlots);
    const results = checkContrast(resolved, wcagAAPairs);

    it("passes all WCAG AA contrast pairs", () => {
      const failures = results.filter((r) => !r.pass);
      expect(failures, formatFailures(results)).toHaveLength(0);
    });

    it("returns correct number of results", () => {
      expect(results).toHaveLength(wcagAAPairs.length);
    });
  });

  it("throws on unknown token name", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    expect(() =>
      checkContrast(resolved, [
        { fg: "nonexistent", bg: "bgPrimary", minRatio: 4.5 },
      ]),
    ).toThrow("Unknown foreground token");
  });
});

describe("component label pairs", () => {
  it("includes solid-variant label pairs", () => {
    const key = (p: { fg: string; bg: string }) => `${p.fg}/${p.bg}`;
    const keys = componentLabelPairs.map(key);
    expect(keys).toContain("fgStaticWhite/fillAccent");
    expect(keys).toContain("fgStaticWhite/fillDanger");
    expect(keys).toContain("fgStaticWhite/fillSuccess");
    expect(keys).toContain("fgStaticBlack/fillWarning");
  });

  for (const [name, palette, slots] of [
    ["light", defaultPalette, defaultSlots],
    ["dark", defaultPalette, defaultSlots],
    ["acme", acmePalette, acmeSlots],
  ] as const) {
    it(`${name}: all component label pairs pass AA`, () => {
      const theme = name === "dark" ? darkTheme : lightTheme;
      const resolved = resolve(theme, palette, slots);
      const results = checkContrast(resolved, componentLabelPairs);
      expect(results.filter((r) => !r.pass)).toEqual([]);
    });
  }
});
