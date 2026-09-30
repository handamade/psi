import { describe, it, expect } from "vitest";
import { skeletonVars } from "../src/components/skeleton.js";
import { componentVars } from "../src/components/registry.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";

describe("skeleton tokens", () => {
  it("declares the D86 tokens", () => {
    expect(skeletonVars).toEqual({
      bg: "var(--psi-fill-neutral4)",
      radius: "var(--psi-radius-4)",
    });
  });

  it("is registered, so the D46 scope gate reads it", () => {
    expect(componentVars.skeleton).toBe(skeletonVars);
  });

  it("emits --psi-skeleton-* custom properties", () => {
    const css = emitComponentVarsCSS("skeleton", skeletonVars);
    expect(css).toContain("--psi-skeleton-bg: var(--psi-fill-neutral4)");
    expect(css).toContain("--psi-skeleton-radius: var(--psi-radius-4)");
  });

  it("is pure indirection — every value is a var() reference", () => {
    for (const [key, value] of Object.entries(skeletonVars)) {
      expect(value, `${key} must bind a token, not a literal`).toMatch(/^var\(--psi-[a-z0-9-]+\)$/);
    }
  });
});
