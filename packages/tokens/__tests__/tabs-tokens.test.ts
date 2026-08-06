import { describe, it, expect } from "vitest";
import { tabsVars } from "../src/components/tabs.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";
import { wcagAAPairs, componentLabelPairs } from "../src/contrast-matrix.js";

describe("tabs tokens", () => {
  it("declares the D67 tokens bound to gated semantics", () => {
    expect(tabsVars).toEqual({
      fg: "var(--psi-fg-secondary)",
      "fg-selected": "var(--psi-fg-accent)",
      "fg-disabled": "var(--psi-fg-quaternary)",
      "bg-hover": "var(--psi-fill-neutral3)",
      indicator: "var(--psi-fill-accent)",
      "list-border": "var(--psi-border-faint)",
      "focus-ring": "var(--psi-border-focus)",
      "32-height": "var(--psi-control-32-height)",
      "40-height": "var(--psi-control-40-height)",
      "32-padding-x": "var(--psi-control-32-padding-inline)",
      "40-padding-x": "var(--psi-control-40-padding-inline)",
    });
  });

  it("is pure indirection — every value is a var() reference", () => {
    for (const [key, value] of Object.entries(tabsVars)) {
      expect(value, `${key} must bind a token, not a literal`).toMatch(/^var\(--psi-[a-z0-9-]+\)$/);
    }
  });

  it("emits --psi-tabs-* custom properties", () => {
    const css = emitComponentVarsCSS("tabs", tabsVars);
    expect(css).toContain("--psi-tabs-fg-selected: var(--psi-fg-accent)");
    expect(css).toContain("--psi-tabs-40-height: var(--psi-control-40-height)");
  });

  it("adds no contrast pairs — every colour it binds is already gated", () => {
    // fgAccent and fgSecondary on bgPrimary are in wcagAAPairs already. Pinning
    // the counts so a later edit that quietly introduces an ungated colour, or
    // adds a pair for disabled text, is visible in the diff rather than silent.
    expect(wcagAAPairs).toHaveLength(28);
    expect(componentLabelPairs).toHaveLength(5);
  });

  it("leaves fg-disabled ungated on purpose", () => {
    // Disabled text is exempt from WCAG 1.4.3; gating it would force a contrast
    // that defeats the affordance. Menu's item-fg-disabled binds the same token
    // for the same reason.
    expect(tabsVars["fg-disabled"]).toBe("var(--psi-fg-quaternary)");
    expect(
      wcagAAPairs.some((p) => p.fg === "fgQuaternary"),
      "fgQuaternary must not be contrast-gated",
    ).toBe(false);
  });
});

describe("border scope group (D46 allow-list)", () => {
  it("accepts the logical border longhands as well as the physical ones", async () => {
    const { PROPERTY_GROUPS } = await import("../src/scopes.js");
    // A vertical tab list binds --psi-tabs-list-border to border-inline-start.
    // The group carried border-inline/border-block and every physical longhand
    // but not these four, which was an omission — and the logical form is the
    // one that survives RTL.
    for (const prop of [
      "border-inline-start",
      "border-inline-end",
      "border-block-start",
      "border-block-end",
    ]) {
      expect(PROPERTY_GROUPS.border, `${prop} must be a legal border binding`).toContain(prop);
    }
  });
});
