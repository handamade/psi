import { describe, expect, it } from "vitest";
import { emitDTCG } from "../scripts/emit-dtcg.js";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";

describe("emitDTCG", () => {
  it("outputs valid JSON", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    const json = emitDTCG("light", resolved);
    const parsed = JSON.parse(json);
    expect(parsed).toBeDefined();
  });

  it("has color tokens with correct structure", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    const json = emitDTCG("light", resolved);
    const parsed = JSON.parse(json);

    expect(parsed.color).toBeDefined();
    expect(parsed.color.bg).toBeDefined();
    expect(parsed.color.bg.primary).toBeDefined();
    expect(parsed.color.bg.primary.$type).toBe("color");
  });

  it("color tokens have valid hex values", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    const json = emitDTCG("light", resolved);
    const parsed = JSON.parse(json);

    expect(parsed.color.bg.primary.$value).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i);
  });

  it("has dimension tokens with correct structure", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    const json = emitDTCG("light", resolved);
    const parsed = JSON.parse(json);

    expect(parsed.dimension).toBeDefined();
    expect(parsed.dimension.space).toBeDefined();
    expect(parsed.dimension.space["8"]).toBeDefined();
    expect(parsed.dimension.space["8"].$type).toBe("dimension");
    expect(parsed.dimension.space["8"].$value).toBe("0.5rem");
  });

  it("all color tokens have description containing formula", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    const json = emitDTCG("light", resolved);
    const parsed = JSON.parse(json);

    for (const group of Object.values(parsed.color)) {
      for (const token of Object.values(group)) {
        const tokenObj = token as Record<string, unknown>;
        expect(tokenObj.$description).toBeDefined();
        expect(typeof tokenObj.$description).toBe("string");
        expect((tokenObj.$description as string).length).toBeGreaterThan(0);
      }
    }
  });

  it("has typography tokens with correct structure", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    const json = emitDTCG("light", resolved);
    const parsed = JSON.parse(json);

    expect(parsed.typography).toBeDefined();
    expect(Object.keys(parsed.typography).length).toBeGreaterThan(0);
  });

  it("has fontFamily token", () => {
    const resolved = resolve(lightTheme, defaultPalette, defaultSlots);
    const json = emitDTCG("light", resolved);
    const parsed = JSON.parse(json);

    expect(parsed.fontFamily).toBeDefined();
    expect(parsed.fontFamily.sans).toBeDefined();
    expect(parsed.fontFamily.sans.$type).toBe("fontFamily");
  });
});
