import { describe, expect, it } from "vitest";
import { guidance } from "../src/guidance.js";

describe("guidance", () => {
  it("has 9 variant entries", () => {
    expect(guidance.variants).toHaveLength(9);
  });

  it("includes accent variant with non-empty intent", () => {
    const accentVariant = guidance.variants.find((v) => v.variant === "accent");
    expect(accentVariant).toBeDefined();
    expect(accentVariant?.intent).toBeTruthy();
    expect(accentVariant?.intent).toMatch(/Primary action/);
  });

  it("has hover state equal to 'L - 0.04'", () => {
    expect(guidance.states.hover).toBe("L - 0.04");
  });
});
