import { describe, it, expect } from "vitest";
import { menuVars } from "../src/components/menu.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";

describe("menu tokens", () => {
  it("declares the D53 tokens bound to gated semantics", () => {
    expect(menuVars).toEqual({
      bg: "var(--psi-surface-bg)",
      border: "var(--psi-surface-border)",
      radius: "var(--psi-surface-radius)",
      fg: "var(--psi-fg-primary)",
      "item-bg": "transparent",
      "item-bg-hover": "var(--psi-fill-neutral3)",
      "item-bg-active": "var(--psi-fill-neutral4)",
      "item-fg": "var(--psi-fg-primary)",
      "item-fg-danger": "var(--psi-fg-danger)",
      "item-fg-disabled": "var(--psi-fg-quaternary)",
      "separator-border": "var(--psi-border-faint)",
    });
  });

  it("emits --psi-menu-* custom properties", () => {
    const css = emitComponentVarsCSS("menu", menuVars);
    expect(css).toContain("--psi-menu-bg: var(--psi-surface-bg)");
    expect(css).toContain("--psi-menu-radius: var(--psi-surface-radius)");
    expect(css).toContain("--psi-menu-item-bg-hover: var(--psi-fill-neutral3)");
    expect(css).toContain("--psi-menu-item-fg-danger: var(--psi-fg-danger)");
    expect(css).toContain("--psi-menu-separator-border: var(--psi-border-faint)");
  });
});
