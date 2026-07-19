import { describe, it, expect } from "vitest";
import { fieldVars } from "../src/components/field.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";

describe("field tokens", () => {
  it("declares the five D49 tokens bound to gated semantics", () => {
    expect(fieldVars).toEqual({
      "label-fg": "var(--psi-fg-secondary)",
      "message-fg": "var(--psi-fg-tertiary)",
      "error-fg": "var(--psi-fg-danger)",
      "marker-fg": "var(--psi-fg-danger)",
      gap: "var(--psi-space-6)",
    });
  });

  it("emits --psi-field-* custom properties", () => {
    const css = emitComponentVarsCSS("field", fieldVars);
    expect(css).toContain("--psi-field-label-fg: var(--psi-fg-secondary)");
    expect(css).toContain("--psi-field-gap: var(--psi-space-6)");
  });
});
