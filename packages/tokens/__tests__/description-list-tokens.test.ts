import { describe, it, expect } from "vitest";
import { descriptionListVars } from "../src/components/description-list.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";
import { wcagAAPairs, componentLabelPairs } from "../src/contrast-matrix.js";

describe("description-list tokens", () => {
  it("declares the D70 tokens bound to gated semantics", () => {
    expect(descriptionListVars).toEqual({
      "term-fg": "var(--psi-fg-secondary)",
      "value-fg": "var(--psi-fg-primary)",
    });
  });

  it("is pure indirection — every value is a var() reference", () => {
    for (const [key, value] of Object.entries(descriptionListVars)) {
      expect(value, `${key} must bind a token, not a literal`).toMatch(/^var\(--psi-[a-z0-9-]+\)$/);
    }
  });

  it("invents no token family", () => {
    // D64's lesson: the Toast spec drafted --psi-shadow-overlay, which has
    // never existed. A key naming a family the semantic layer does not ship
    // resolves to nothing at runtime and fails silently.
    for (const key of Object.keys(descriptionListVars)) {
      expect(key, `${key} must not reference a shadow family`).not.toContain("shadow");
    }
  });

  it("emits --psi-description-list-* custom properties", () => {
    const css = emitComponentVarsCSS("description-list", descriptionListVars);
    expect(css).toContain("--psi-description-list-term-fg: var(--psi-fg-secondary)");
    expect(css).toContain("--psi-description-list-value-fg: var(--psi-fg-primary)");
  });

  it("adds no contrast pairs — both colours are already gated", () => {
    // fgPrimary and fgSecondary on bgPrimary/bgSecondary are in wcagAAPairs
    // already; a key/value list introduces no new foreground. Counts pinned so
    // a later edit that quietly adds an ungated colour shows up in the diff.
    expect(wcagAAPairs).toHaveLength(28);
    expect(componentLabelPairs).toHaveLength(5);
  });
});
