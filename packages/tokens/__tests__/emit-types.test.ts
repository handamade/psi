import { describe, expect, it } from "vitest";
import { emitTokenTypes } from "../scripts/emit-types.js";
import { lightTheme } from "../src/themes/light.js";

describe("emitTokenTypes", () => {
  it("emits Size union with unquoted numbers and Variant union with quoted strings", () => {
    const themes = { light: lightTheme };
    const output = emitTokenTypes(themes, [24, 32, 40, 48], ["accent", "ghost"]);

    // Check for Size union with unquoted numbers
    expect(output).toContain("export type Size =");
    expect(output).toMatch(/\|\s*24\s*\|/);
    expect(output).toMatch(/\|\s*32\s*\|/);
    expect(output).toMatch(/\|\s*40\s*\|/);
    expect(output).toMatch(/\|\s*48;/);

    // Check for Variant union with quoted strings
    expect(output).toContain('export type Variant =');
    expect(output).toMatch(/\|\s*"accent"\s*\|/);
    expect(output).toMatch(/\|\s*"ghost";/);
  });

  it("emits TokenName and ThemeName unions", () => {
    const themes = { light: lightTheme };
    const output = emitTokenTypes(themes, [24, 32, 40, 48], ["accent", "ghost"]);

    expect(output).toContain("export type TokenName =");
    expect(output).toContain("export type ThemeName =");
  });

  it("defaults to string types when sizes and variants are empty", () => {
    const themes = { light: lightTheme };
    const output = emitTokenTypes(themes, [], []);

    expect(output).toContain("export type Size = string;");
    expect(output).toContain("export type Variant = string;");
  });
});
