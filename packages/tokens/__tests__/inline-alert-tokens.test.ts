import { describe, it, expect } from "vitest";
import { inlineAlertVars } from "../src/components/inline-alert.js";
import { componentVars } from "../src/components/registry.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";

describe("inline-alert tokens", () => {
  it("declares the D86 tokens bound to gated semantics", () => {
    expect(inlineAlertVars).toEqual({
      "bg-neutral": "var(--psi-fill-neutral3)",
      "bg-success": "var(--psi-fill-tint-success)",
      "bg-warning": "var(--psi-fill-tint-warning)",
      "bg-danger": "var(--psi-fill-tint-danger)",
      fg: "var(--psi-fg-primary)",
      "icon-fg-neutral": "var(--psi-fg-secondary)",
      "icon-fg-success": "var(--psi-fg-success)",
      "icon-fg-warning": "var(--psi-fg-warning)",
      "icon-fg-danger": "var(--psi-fg-danger)",
      "border-neutral": "var(--psi-border-neutral)",
      "border-success": "var(--psi-fg-success)",
      "border-warning": "var(--psi-fg-warning)",
      "border-danger": "var(--psi-fg-danger)",
      radius: "var(--psi-radius-8)",
    });
  });

  it("is registered, so the D46 scope gate reads it", () => {
    expect(componentVars["inline-alert"]).toBe(inlineAlertVars);
  });

  it("emits --psi-inline-alert-* custom properties", () => {
    const css = emitComponentVarsCSS("inline-alert", inlineAlertVars);
    expect(css).toContain("--psi-inline-alert-bg-danger: var(--psi-fill-tint-danger)");
    expect(css).toContain("--psi-inline-alert-border-success: var(--psi-fg-success)");
  });

  it("is pure indirection — every value is a var() reference", () => {
    for (const [key, value] of Object.entries(inlineAlertVars)) {
      expect(value, `${key} must bind a token, not a literal`).toMatch(/^var\(--psi-[a-z0-9-]+\)$/);
    }
  });
});
