import { describe, it, expect } from "vitest";
import { bannerVars } from "../src/components/banner.js";
import { componentVars } from "../src/components/registry.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";

describe("banner tokens", () => {
  it("declares the D86 tokens bound to gated semantics", () => {
    expect(bannerVars).toEqual({
      "bg-neutral": "var(--psi-fill-neutral3)",
      "bg-success": "var(--psi-fill-tint-success)",
      "bg-warning": "var(--psi-fill-tint-warning)",
      "bg-danger": "var(--psi-fill-tint-danger)",
      fg: "var(--psi-fg-primary)",
      "icon-fg-neutral": "var(--psi-fg-secondary)",
      "icon-fg-success": "var(--psi-fg-success)",
      "icon-fg-warning": "var(--psi-fg-warning)",
      "icon-fg-danger": "var(--psi-fg-danger)",
    });
  });

  it("is registered, so the D46 scope gate reads it", () => {
    expect(componentVars.banner).toBe(bannerVars);
  });

  it("emits --psi-banner-* custom properties", () => {
    const css = emitComponentVarsCSS("banner", bannerVars);
    expect(css).toContain("--psi-banner-bg-danger: var(--psi-fill-tint-danger)");
    expect(css).toContain("--psi-banner-icon-fg-success: var(--psi-fg-success)");
  });

  it("is pure indirection — every value is a var() reference", () => {
    for (const [key, value] of Object.entries(bannerVars)) {
      expect(value, `${key} must bind a token, not a literal`).toMatch(/^var\(--psi-[a-z0-9-]+\)$/);
    }
  });
});
