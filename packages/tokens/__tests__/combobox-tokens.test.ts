import { describe, it, expect } from "vitest";
import { comboboxVars } from "../src/components/combobox.js";
import { selectVars } from "../src/components/select.js";
import { menuVars } from "../src/components/menu.js";
import { componentVars } from "../src/components/registry.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";

describe("combobox tokens (D130)", () => {
  it("is registered, so the scope gate and the emitters see it", () => {
    expect(componentVars.combobox).toBe(comboboxVars);
  });

  it("binds the control to the semantic values Select binds, so no new contrast pair", () => {
    for (const key of [
      "bg", "fg", "placeholder", "border", "border-hover", "border-error", "focus-ring", "chevron-fg", "radius",
      "24-height", "32-height", "40-height", "48-height",
      "24-padding-inline", "32-padding-inline", "40-padding-inline", "48-padding-inline",
      "24-font", "32-font", "40-font", "48-font",
    ]) {
      expect(comboboxVars[key], key).toBe(selectVars[key]);
    }
  });

  it("binds the popup and its options to the values Menu binds", () => {
    expect(comboboxVars["popup-bg"]).toBe(menuVars.bg);
    expect(comboboxVars["popup-border"]).toBe(menuVars.border);
    expect(comboboxVars["popup-radius"]).toBe(menuVars.radius);
    expect(comboboxVars["option-bg"]).toBe(menuVars["item-bg"]);
    expect(comboboxVars["option-bg-highlight"]).toBe(menuVars["item-bg-hover"]);
    expect(comboboxVars["option-fg"]).toBe(menuVars["item-fg"]);
    expect(comboboxVars["option-fg-disabled"]).toBe(menuVars["item-fg-disabled"]);
    expect(comboboxVars["option-check-fg"]).toBe(menuVars["item-fg"]);
    expect(comboboxVars["option-description-fg"]).toBe(menuVars["text-fg"]);
    expect(comboboxVars["status-fg"]).toBe(menuVars["text-fg"]);
  });

  it("aliases the shared popup cap rather than holding a literal (D131 amends D130)", () => {
    expect(comboboxVars["popup-max-height"]).toBe("var(--psi-popup-max-height)");
    expect(emitComponentVarsCSS("combobox", comboboxVars)).toContain(
      "--psi-combobox-popup-max-height: var(--psi-popup-max-height)",
    );
  });

  it("emits --psi-combobox-* custom properties", () => {
    const css = emitComponentVarsCSS("combobox", comboboxVars);
    expect(css).toContain("--psi-combobox-border: var(--psi-border-control)");
    expect(css).toContain("--psi-combobox-option-bg-highlight: var(--psi-fill-neutral3)");
  });
});
