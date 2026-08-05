import { describe, it, expect } from "vitest";
import { tableVars } from "../src/components/table.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";

describe("table tokens", () => {
  it("declares the D62 tokens bound to gated semantics", () => {
    expect(tableVars).toEqual({
      bg: "var(--psi-surface-bg)",
      border: "var(--psi-surface-border)",
      radius: "var(--psi-surface-radius)",
      fg: "var(--psi-fg-primary)",
      "header-fg": "var(--psi-fg-secondary)",
      "cell-border": "var(--psi-border-faint)",
      "row-bg": "transparent",
      "row-bg-hover": "var(--psi-fill-neutral3)",
      "row-bg-selected": "var(--psi-fill-tint-accent)",
      "sort-indicator-fg": "var(--psi-fg-accent)",
      "focus-ring": "var(--psi-border-focus)",
      "32-row-height": "var(--psi-control-32-height)",
      "40-row-height": "var(--psi-control-40-height)",
      "48-row-height": "var(--psi-control-48-height)",
      "32-cell-padding-x": "var(--psi-control-32-padding-inline)",
      "40-cell-padding-x": "var(--psi-control-40-padding-inline)",
      "48-cell-padding-x": "var(--psi-control-48-padding-inline)",
    });
  });

  it("emits --psi-table-* custom properties", () => {
    const css = emitComponentVarsCSS("table", tableVars);
    expect(css).toContain("--psi-table-bg: var(--psi-surface-bg)");
    expect(css).toContain("--psi-table-row-bg-selected: var(--psi-fill-tint-accent)");
    expect(css).toContain("--psi-table-40-row-height: var(--psi-control-40-height)");
    expect(css).toContain("--psi-table-40-cell-padding-x: var(--psi-control-40-padding-inline)");
  });
});
