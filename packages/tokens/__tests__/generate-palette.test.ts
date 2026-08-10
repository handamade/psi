import { describe, it, expect } from "vitest";
import { buildBrandPalette } from "../src/generate/palette.js";
import { parsePrompt } from "../src/generate/prompt.js";

const v = parsePrompt("quiet lagoon");

describe("buildBrandPalette", () => {
  it("emits both modes' ink and canvas anchors in one palette", () => {
    const { palette } = buildBrandPalette(v);
    for (const key of [
      "brandInkLight", "brandInkDark", "brandCanvasLight", "brandCanvasDark",
      "brandAccent", "brandSuccess", "brandWarning", "brandDanger",
    ]) {
      expect(palette[key], key).toBeDefined();
    }
  });

  it("inverts only lightness between the modes", () => {
    const { palette } = buildBrandPalette(v);
    expect(palette.brandCanvasLight!.l).toBeGreaterThan(0.9);
    expect(palette.brandCanvasDark!.l).toBeLessThan(0.2);
    expect(palette.brandInkLight!.l).toBeLessThan(0.35);
    expect(palette.brandInkDark!.l).toBeGreaterThan(0.9);
    // The brand hue is shared — this is what makes the pair one brand.
    expect(palette.brandInkLight!.h).toBe(palette.brandInkDark!.h);
  });

  it("carries the vector's hue onto the accent anchor", () => {
    const { palette } = buildBrandPalette(parsePrompt("a forest brand"));
    expect(palette.brandAccent!.h).toBe(145);
  });

  it("maps chroma words onto increasing accent chroma", () => {
    const c = (word: string) =>
      buildBrandPalette({ ...v, chroma: word as typeof v.chroma }).palette.brandAccent!.c;
    expect(c("muted")).toBeLessThan(c("calm"));
    expect(c("calm")).toBeLessThan(c("balanced"));
    expect(c("balanced")).toBeLessThan(c("vivid"));
    expect(c("vivid")).toBeLessThan(c("electric"));
  });

  it("points each slot map at its own mode's anchors", () => {
    const { lightSlots, darkSlots } = buildBrandPalette(v);
    expect(lightSlots.ink).toBe("brandInkLight");
    expect(lightSlots.canvas).toBe("brandCanvasLight");
    expect(darkSlots.ink).toBe("brandInkDark");
    expect(darkSlots.canvas).toBe("brandCanvasDark");
    // Status and accent slots are shared across the pair.
    expect(darkSlots.accent).toBe(lightSlots.accent);
    expect(darkSlots.danger).toBe(lightSlots.danger);
  });

  it("keeps status hues fixed regardless of the brand hue", () => {
    const a = buildBrandPalette(parsePrompt("forest")).palette;
    const b = buildBrandPalette(parsePrompt("crimson")).palette;
    expect(a.brandSuccess!.h).toBe(b.brandSuccess!.h);
    expect(a.brandDanger!.h).toBe(b.brandDanger!.h);
  });
});
