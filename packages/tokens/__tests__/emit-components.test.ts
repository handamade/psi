import { describe, expect, it } from "vitest";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";
import { buttonVars } from "../src/components/button.js";
import { inputVars } from "../src/components/input.js";
import { selectVars } from "../src/components/select.js";
import { checkboxVars } from "../src/components/checkbox.js";
import { switchVars } from "../src/components/switch.js";
import { tagVars } from "../src/components/tag.js";
import { tooltipVars } from "../src/components/tooltip.js";
import { toolbarVars } from "../src/components/toolbar.js";
import { appShellVars } from "../src/components/app-shell.js";
import { componentVars } from "../src/components/registry.js";
import { classifyComponentTokens } from "../src/emit/component-scope.js";
import { lightTheme } from "../src/themes/light.js";

const scopes = classifyComponentTokens(componentVars, Object.keys(lightTheme));

describe("emitComponentVarsCSS", () => {
  it("declares page-scoped tokens at :root alone and theme-scoped ones on every theme (D139)", () => {
    const css = emitComponentVarsCSS("app-shell", appShellVars, scopes);
    const [page, theme] = css.split(":where(:root, [data-psi-theme])");
    expect(page).toContain(":where(:root) {");
    expect(page).toContain("--psi-app-shell-sidebar-width: 16rem;");
    expect(page).toContain("--psi-app-shell-sidebar-border-width: 0;");
    expect(page).not.toContain("--psi-app-shell-sidebar-bg");
    expect(theme).toContain("--psi-app-shell-sidebar-bg: var(--psi-bg-primary);");
    expect(theme).toContain("--psi-app-shell-bg: transparent;");
    expect(theme).not.toContain("sidebar-width");
  });

  it("emits one rule for a component with one scope", () => {
    const css = emitComponentVarsCSS("toolbar", toolbarVars, scopes);
    expect(css).toContain(":where(:root) {");
    expect(css).not.toContain("[data-psi-theme]");
  });

  it("refuses a token with no scope", () => {
    expect(() => emitComponentVarsCSS("nope", { x: "1px" }, scopes)).toThrow(/no scope/);
  });

  it("emits psi.components layer with prefixed vars", () => {
    const css = emitComponentVarsCSS("button", buttonVars, scopes);
    expect(css).toContain("@layer psi.components");
    expect(css).toContain(":where(:root, [data-psi-theme])");
    expect(css).toContain("--psi-button-accent-bg: var(--psi-fill-accent);");
    expect(css).toContain(
      "--psi-button-accent-bg-hover: oklch(from var(--psi-button-accent-bg) calc(l - 0.04) c h);",
    );
  });

  it("emits every inputVars key as a prefixed --psi-input-* declaration", () => {
    const css = emitComponentVarsCSS("input", inputVars, scopes);
    for (const key of Object.keys(inputVars)) {
      expect(css).toContain(`--psi-input-${key}: ${inputVars[key]};`);
    }
  });

  it("emits every selectVars key as a prefixed --psi-select-* declaration", () => {
    const css = emitComponentVarsCSS("select", selectVars, scopes);
    for (const key of Object.keys(selectVars)) {
      expect(css).toContain(`--psi-select-${key}: ${selectVars[key]};`);
    }
  });

  it("emits every checkboxVars key as a prefixed --psi-checkbox-* declaration", () => {
    const css = emitComponentVarsCSS("checkbox", checkboxVars, scopes);
    for (const key of Object.keys(checkboxVars)) {
      expect(css).toContain(`--psi-checkbox-${key}: ${checkboxVars[key]};`);
    }
  });

  it("emits every switchVars key as a prefixed --psi-switch-* declaration", () => {
    const css = emitComponentVarsCSS("switch", switchVars, scopes);
    for (const key of Object.keys(switchVars)) {
      expect(css).toContain(`--psi-switch-${key}: ${switchVars[key]};`);
    }
  });

  it("emits every tagVars key as a prefixed --psi-tag-* declaration", () => {
    const css = emitComponentVarsCSS("tag", tagVars, scopes);
    for (const key of Object.keys(tagVars)) {
      expect(css).toContain(`--psi-tag-${key}: ${tagVars[key]};`);
    }
  });

  it("emits every tooltipVars key as a prefixed --psi-tooltip-* declaration", () => {
    const css = emitComponentVarsCSS("tooltip", tooltipVars, scopes);
    for (const key of Object.keys(tooltipVars)) {
      expect(css).toContain(`--psi-tooltip-${key}: ${tooltipVars[key]};`);
    }
  });

  it("emits every toolbarVars key as a prefixed --psi-toolbar-* declaration", () => {
    const css = emitComponentVarsCSS("toolbar", toolbarVars, scopes);
    for (const key of Object.keys(toolbarVars)) {
      expect(css).toContain(`--psi-toolbar-${key}: ${toolbarVars[key]};`);
    }
  });
});
