import { describe, it, expect } from "vitest";
import { contrastOf, hexFor, solveL } from "../src/generate/solve.js";

describe("hexFor", () => {
  it("returns an sRGB hex string", () => {
    expect(hexFor(0.5, 0.1, 200)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("clamps an out-of-gamut chroma rather than throwing", () => {
    expect(hexFor(0.55, 0.5, 145)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("contrastOf", () => {
  it("matches the WCAG extremes", () => {
    expect(contrastOf("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastOf("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});

describe("solveL", () => {
  const WHITE = "#ffffff";
  const NEAR_BLACK = "#0a0a0a";

  it("finds a lightness clearing 4.5:1 against a light canvas", () => {
    const l = solveL({ c: 0.15, h: 260, against: WHITE, target: 4.5, direction: "darker" });
    expect(contrastOf(hexFor(l, 0.15, 260), WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it("finds a lightness clearing 4.5:1 against a dark canvas", () => {
    const l = solveL({ c: 0.15, h: 260, against: NEAR_BLACK, target: 4.5, direction: "lighter" });
    expect(contrastOf(hexFor(l, 0.15, 260), NEAR_BLACK)).toBeGreaterThanOrEqual(4.5);
  });

  it("clears the stricter 7:1 target too", () => {
    const l = solveL({ c: 0.05, h: 30, against: WHITE, target: 7, direction: "darker" });
    expect(contrastOf(hexFor(l, 0.05, 30), WHITE)).toBeGreaterThanOrEqual(7);
  });

  it("solves every hue on the circle at 4.5:1", () => {
    for (let h = 0; h < 360; h += 15) {
      const l = solveL({ c: 0.2, h, against: WHITE, target: 4.5, direction: "darker" });
      const ratio = contrastOf(hexFor(l, 0.2, h), WHITE);
      expect(ratio, `hue ${h} gave ${ratio}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("returns a lightness inside the legal range", () => {
    const l = solveL({ c: 0.1, h: 90, against: WHITE, target: 4.5, direction: "darker" });
    expect(l).toBeGreaterThanOrEqual(0);
    expect(l).toBeLessThanOrEqual(1);
  });

  it("is deterministic", () => {
    const opts = { c: 0.12, h: 300, against: WHITE, target: 4.5, direction: "darker" } as const;
    expect(solveL(opts)).toBe(solveL(opts));
  });
});
