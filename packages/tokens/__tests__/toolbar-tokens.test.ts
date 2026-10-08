import { describe, it, expect } from "vitest";
import { toolbarVars } from "../src/components/toolbar.js";
import { fieldVars } from "../src/components/field.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";

describe("toolbar tokens", () => {
  it("keeps the D77 control width", () => {
    expect(toolbarVars["control-width"]).toBe("200px");
  });

  describe("action offset (D92)", () => {
    // Under align="start" a Field's control starts one label line and one
    // field gap below the Field's top; a button with no label starts at the
    // row's top. The offset is what moves the button onto the control line.
    // It must be derived from the Field's own metrics, so that a change to
    // either cannot silently leave the button behind.
    const offset = toolbarVars["action-offset"];

    it("is the Field label height plus the Field gap", () => {
      expect(offset).toBe("calc(var(--psi-field-label-height) + var(--psi-field-gap))");
    });

    it("references only Field tokens that exist", () => {
      const refs = [...offset.matchAll(/var\(--psi-field-([a-z0-9-]+)\)/g)].map((m) => m[1]);
      expect(refs.sort()).toEqual(["gap", "label-height"]);
      for (const key of refs) {
        expect(fieldVars[key], `--psi-field-${key} must be declared`).toBeDefined();
      }
    });

    it("emits --psi-toolbar-action-offset", () => {
      const css = emitComponentVarsCSS("toolbar", toolbarVars);
      expect(css).toContain(
        "--psi-toolbar-action-offset: calc(var(--psi-field-label-height) + var(--psi-field-gap))",
      );
    });
  });
});
