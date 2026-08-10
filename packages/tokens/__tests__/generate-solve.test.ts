import { describe, it, expect } from "vitest";
import { contrastOf, hexFor, solveL } from "../src/generate/solve.js";

describe("hexFor", () => {
  it("returns an sRGB hex string", () => {
    expect(hexFor(0.5, 0.1, 200)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("clamps an out-of-gamut chroma rather than throwing", () => {
    expect(hexFor(0.55, 0.5, 145)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("throws on non-finite input rather than laundering it into black", () => {
    expect(() => hexFor(Number.NaN, 0.1, 200)).toThrow(/non-finite/);
    expect(() => hexFor(0.5, Number.NaN, 200)).toThrow(/non-finite/);
    expect(() => hexFor(0.5, 0.1, Number.POSITIVE_INFINITY)).toThrow(/non-finite/);
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
    const l = solveL({ c: 0.15, h: 260, against: WHITE, target: 4.5, direction: "darker" }).l;
    expect(contrastOf(hexFor(l, 0.15, 260), WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it("finds a lightness clearing 4.5:1 against a dark canvas", () => {
    const l = solveL({ c: 0.15, h: 260, against: NEAR_BLACK, target: 4.5, direction: "lighter" }).l;
    expect(contrastOf(hexFor(l, 0.15, 260), NEAR_BLACK)).toBeGreaterThanOrEqual(4.5);
  });

  it("clears the stricter 7:1 target too", () => {
    const l = solveL({ c: 0.05, h: 30, against: WHITE, target: 7, direction: "darker" }).l;
    expect(contrastOf(hexFor(l, 0.05, 30), WHITE)).toBeGreaterThanOrEqual(7);
  });

  it("solves every hue on the circle at 4.5:1", () => {
    for (let h = 0; h < 360; h += 15) {
      const l = solveL({ c: 0.2, h, against: WHITE, target: 4.5, direction: "darker" }).l;
      const ratio = contrastOf(hexFor(l, 0.2, h), WHITE);
      expect(ratio, `hue ${h} gave ${ratio}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("returns a lightness inside the legal range", () => {
    const l = solveL({ c: 0.1, h: 90, against: WHITE, target: 4.5, direction: "darker" }).l;
    expect(l).toBeGreaterThanOrEqual(0);
    expect(l).toBeLessThanOrEqual(1);
  });

  it("is deterministic", () => {
    const opts = { c: 0.12, h: 300, against: WHITE, target: 4.5, direction: "darker" } as const;
    expect(solveL(opts)).toEqual(solveL(opts));
  });

  it("reports cleared:false when the target is unreachable in either direction", () => {
    // Mid-gray: black reaches only ~4.69:1 against it and white only ~4.48:1,
    // so 7:1 is unreachable from both ends. This is the ONE path where the
    // returned lightness does not satisfy the target, so it must say so.
    const MID = "#777777";
    const darker = solveL({ c: 0.1, h: 200, against: MID, target: 7, direction: "darker" });
    expect(darker.cleared).toBe(false);
    expect(darker.l).toBe(0);

    const lighter = solveL({ c: 0.1, h: 200, against: MID, target: 7, direction: "lighter" });
    expect(lighter.cleared).toBe(false);
    expect(lighter.l).toBe(1);
  });

  it("reports cleared:true whenever it returns a solved value", () => {
    const r = solveL({ c: 0.15, h: 260, against: "#ffffff", target: 4.5, direction: "darker" });
    expect(r.cleared).toBe(true);
    expect(contrastOf(hexFor(r.l, 0.15, 260), "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
});
