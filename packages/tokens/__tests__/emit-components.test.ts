import { describe, expect, it } from "vitest";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";
import { buttonVars } from "../src/components/button.js";
import { inputVars } from "../src/components/input.js";
import { selectVars } from "../src/components/select.js";
import { checkboxVars } from "../src/components/checkbox.js";
import { switchVars } from "../src/components/switch.js";
import { tagVars } from "../src/components/tag.js";
import { tooltipVars } from "../src/components/tooltip.js";

describe("emitComponentVarsCSS", () => {
  it("emits psi.components layer with prefixed vars", () => {
    const css = emitComponentVarsCSS("button", buttonVars);
    expect(css).toContain("@layer psi.components");
    expect(css).toContain(":where(:root, [data-psi-theme])");
    expect(css).toContain("--psi-button-accent-bg: var(--psi-fill-accent);");
    expect(css).toContain(
      "--psi-button-accent-bg-hover: oklch(from var(--psi-button-accent-bg) calc(l - 0.04) c h);",
    );
  });

  it("emits every inputVars key as a prefixed --psi-input-* declaration", () => {
    const css = emitComponentVarsCSS("input", inputVars);
    for (const key of Object.keys(inputVars)) {
      expect(css).toContain(`--psi-input-${key}: ${inputVars[key]};`);
    }
  });

  it("emits every selectVars key as a prefixed --psi-select-* declaration", () => {
    const css = emitComponentVarsCSS("select", selectVars);
    for (const key of Object.keys(selectVars)) {
      expect(css).toContain(`--psi-select-${key}: ${selectVars[key]};`);
    }
  });

  it("emits every checkboxVars key as a prefixed --psi-checkbox-* declaration", () => {
    const css = emitComponentVarsCSS("checkbox", checkboxVars);
    for (const key of Object.keys(checkboxVars)) {
      expect(css).toContain(`--psi-checkbox-${key}: ${checkboxVars[key]};`);
    }
  });

  it("emits every switchVars key as a prefixed --psi-switch-* declaration", () => {
    const css = emitComponentVarsCSS("switch", switchVars);
    for (const key of Object.keys(switchVars)) {
      expect(css).toContain(`--psi-switch-${key}: ${switchVars[key]};`);
    }
  });

  it("emits every tagVars key as a prefixed --psi-tag-* declaration", () => {
    const css = emitComponentVarsCSS("tag", tagVars);
    for (const key of Object.keys(tagVars)) {
      expect(css).toContain(`--psi-tag-${key}: ${tagVars[key]};`);
    }
  });

  it("emits every tooltipVars key as a prefixed --psi-tooltip-* declaration", () => {
    const css = emitComponentVarsCSS("tooltip", tooltipVars);
    for (const key of Object.keys(tooltipVars)) {
      expect(css).toContain(`--psi-tooltip-${key}: ${tooltipVars[key]};`);
    }
  });
});
