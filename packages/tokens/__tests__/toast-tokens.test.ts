import { describe, it, expect } from "vitest";
import { toastVars } from "../src/components/toast.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";
import { wcagAAPairs } from "../src/contrast-matrix.js";

describe("toast tokens", () => {
  it("declares the D64/D65 tokens bound to gated semantics", () => {
    expect(toastVars).toEqual({
      bg: "var(--psi-surface-bg)",
      border: "var(--psi-surface-border)",
      radius: "var(--psi-surface-radius)",
      fg: "var(--psi-fg-primary)",
      "icon-fg-neutral": "var(--psi-fg-secondary)",
      "icon-fg-success": "var(--psi-fg-success)",
      "icon-fg-warning": "var(--psi-fg-warning)",
      "icon-fg-danger": "var(--psi-fg-danger)",
    });
  });

  it("emits --psi-toast-* custom properties", () => {
    const css = emitComponentVarsCSS("toast", toastVars);
    expect(css).toContain("--psi-toast-bg: var(--psi-surface-bg)");
    expect(css).toContain("--psi-toast-icon-fg-danger: var(--psi-fg-danger)");
  });

  it("is pure indirection — every value is a var() reference", () => {
    for (const [key, value] of Object.entries(toastVars)) {
      expect(value, `${key} must bind a token, not a literal`).toMatch(/^var\(--psi-[a-z0-9-]+\)$/);
    }
  });

  it("declares no shadow key — Psi has no elevation scale", () => {
    // An earlier draft of the spec carried `shadow: var(--psi-shadow-overlay)`.
    // No --psi-shadow-* token exists in any form, and neither menu.module.css
    // nor dialog.module.css declares a box-shadow: Psi's elevated surfaces are
    // border + background. Adding an elevation scale is its own decision.
    expect(Object.keys(toastVars).some((k) => k.includes("shadow"))).toBe(false);
  });

  it("gates each status foreground on the elevated surface", () => {
    // --psi-surface-bg resolves to bgSecondary. The matrix already gates these
    // three foregrounds on bgPrimary; Toast puts them on the surface instead.
    for (const fg of ["fgSuccess", "fgWarning", "fgDanger"]) {
      expect(
        wcagAAPairs.some((p) => p.fg === fg && p.bg === "bgSecondary" && p.minRatio === 4.5),
        `${fg} on bgSecondary must be gated at 4.5`,
      ).toBe(true);
    }
  });
});
