import { describe, expect, it } from "vitest";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";
import { buttonVars } from "../src/components/button.js";
import { inputVars } from "../src/components/input.js";
import { selectVars } from "../src/components/select.js";
import { checkboxVars } from "../src/components/checkbox.js";
import { switchVars } from "../src/components/switch.js";

describe("emitComponentVarsCSS", () => {
  it("emits ds.components layer with prefixed vars", () => {
    const css = emitComponentVarsCSS("button", buttonVars);
    expect(css).toContain("@layer ds.components");
    expect(css).toContain(":root, [data-ds-theme]");
    expect(css).toContain("--ds-button-accent-bg: var(--ds-fill-accent);");
    expect(css).toContain(
      "--ds-button-accent-bg-hover: oklch(from var(--ds-button-accent-bg) calc(l - 0.04) c h);",
    );
  });

  it("emits every inputVars key as a prefixed --ds-input-* declaration", () => {
    const css = emitComponentVarsCSS("input", inputVars);
    for (const key of Object.keys(inputVars)) {
      expect(css).toContain(`--ds-input-${key}: ${inputVars[key]};`);
    }
  });

  it("emits every selectVars key as a prefixed --ds-select-* declaration", () => {
    const css = emitComponentVarsCSS("select", selectVars);
    for (const key of Object.keys(selectVars)) {
      expect(css).toContain(`--ds-select-${key}: ${selectVars[key]};`);
    }
  });

  it("emits every checkboxVars key as a prefixed --ds-checkbox-* declaration", () => {
    const css = emitComponentVarsCSS("checkbox", checkboxVars);
    for (const key of Object.keys(checkboxVars)) {
      expect(css).toContain(`--ds-checkbox-${key}: ${checkboxVars[key]};`);
    }
  });

  it("emits every switchVars key as a prefixed --ds-switch-* declaration", () => {
    const css = emitComponentVarsCSS("switch", switchVars);
    for (const key of Object.keys(switchVars)) {
      expect(css).toContain(`--ds-switch-${key}: ${switchVars[key]};`);
    }
  });
});
