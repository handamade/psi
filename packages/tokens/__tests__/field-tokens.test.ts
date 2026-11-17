import { describe, it, expect } from "vitest";
import { fieldVars } from "../src/components/field.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";

describe("field tokens", () => {
  it("declares the D49 tokens, the D84 required-text colour, the D92 label height and the D115 layout tokens", () => {
    expect(fieldVars).toEqual({
      "label-fg": "var(--psi-fg-secondary)",
      "message-fg": "var(--psi-fg-tertiary)",
      "error-fg": "var(--psi-fg-danger)",
      "marker-fg": "var(--psi-fg-danger)",
      "required-text-fg": "var(--psi-fg-secondary)",
      gap: "var(--psi-space-6)",
      "label-height": "20px",
      "label-align": "start",
      "label-max-width": "240px",
      "column-gap": "var(--psi-space-12)",
      "stack-max-width": "640px",
    });
  });

  it("the D115 layout tokens carry no -fg/-bg/-border segment, so they stay out of the colour gates", async () => {
    const { keyGroup } = await import("../src/scopes.js");
    for (const key of ["label-align", "label-max-width", "column-gap", "stack-max-width"]) expect(keyGroup(key)).toBeUndefined();
  });

  it("emits --psi-field-* custom properties", () => {
    const css = emitComponentVarsCSS("field", fieldVars);
    expect(css).toContain("--psi-field-label-fg: var(--psi-fg-secondary)");
    expect(css).toContain("--psi-field-gap: var(--psi-space-6)");
    expect(css).toContain("--psi-field-label-height: 20px");
    expect(css).toContain("--psi-field-stack-max-width: 640px");
  });

  it("label-height carries no -fg/-bg/-border segment, so it stays out of the D46 colour gates", async () => {
    const { keyGroup } = await import("../src/scopes.js");
    expect(keyGroup("label-height")).toBeUndefined();
  });
});
