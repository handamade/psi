import { describe, it, expect } from "vitest";
import { dialogVars } from "../src/components/dialog.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";

describe("dialog tokens", () => {
  it("declares the D50/D51 tokens bound to gated semantics", () => {
    expect(dialogVars).toEqual({
      bg: "var(--psi-surface-bg)",
      border: "var(--psi-surface-border)",
      radius: "var(--psi-surface-radius)",
      backdrop: "var(--psi-scrim-heavy)",
      fg: "var(--psi-fg-primary)",
      "title-fg": "var(--psi-fg-primary)",
    });
  });

  it("emits --psi-dialog-* custom properties", () => {
    const css = emitComponentVarsCSS("dialog", dialogVars);
    expect(css).toContain("--psi-dialog-bg: var(--psi-surface-bg)");
    expect(css).toContain("--psi-dialog-radius: var(--psi-surface-radius)");
    expect(css).toContain("--psi-dialog-backdrop: var(--psi-scrim-heavy)");
    expect(css).toContain("--psi-dialog-fg: var(--psi-fg-primary)");
  });
});
