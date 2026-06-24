import { describe, expect, it } from "vitest";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { checkContrast, wcagAAPairs } from "../src/contrast-matrix.js";
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
