// D138 — a guide line along a group's entries, the current bar on it, and icon
// colours apart from the text: tokens only, so a theme's componentOverrides
// produce the look with no consumer CSS.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { componentVars } from "../src/components/registry.js";
import { checkOverrideScopes } from "../src/scope-gate.js";
import { lightTheme } from "../src/themes/light.js";
import { buildThemeCss, ThemeGateError, type CustomerTheme } from "../src/theme/index.js";

const dist = join(import.meta.dirname, "..", "dist");

/** The look a consumer drew with structural CSS on 2026-11-18 (spec D138). */
const look: Record<string, string> = {
  "nav-tree-group-icon-fg": "var(--psi-fg-primary)",
  "nav-tree-item-fg": "var(--psi-fg-primary)",
  "nav-tree-item-icon-fg": "var(--psi-fg-secondary)",
  "nav-tree-item-fg-current": "var(--psi-fg-accent)",
  "nav-tree-item-bg-current": "transparent",
  "nav-tree-guide-width": "1px",
  "nav-tree-guide-border": "var(--psi-border-strong)",
  "nav-tree-indicator-width": "1px",
  "nav-tree-indicator-inset-block": "var(--psi-space-6)",
  "nav-tree-indicator-radius": "0",
};

// The dark sidebar theme-build.test.ts builds (D81), which clears every gate.
const sidebar: CustomerTheme = {
  base: "dark",
  palette: {
    pine: { l: 0.97, c: 0.01, h: 150 },
    paper: { l: 0.18, c: 0.03, h: 150 },
    leaf: { l: 0.5, c: 0.12, h: 150 },
    moss: { l: 0.55, c: 0.1, h: 185 },
    amber: { l: 0.78, c: 0.15, h: 80 },
    brick: { l: 0.55, c: 0.2, h: 25 },
  },
  slots: { ink: "pine", canvas: "paper", accent: "leaf", success: "moss", warning: "amber", danger: "brick" },
};

describe("nav-tree tokens (D138)", () => {
  it("adds seven keys whose defaults render today's pixels", () => {
    const v = componentVars["nav-tree"];
    expect(v["item-icon-fg"]).toBe("currentColor");
    expect(v["group-icon-fg"]).toBe("currentColor");
    expect(v["guide-width"]).toBe("0px");
    expect(v["guide-border"]).toBe("var(--psi-border-strong)");
    expect(v["indicator-width"]).toBe("3px");
    expect(v["indicator-inset-block"]).toBe("0");
    expect(v["indicator-radius"]).toBe("var(--psi-nav-tree-radius)");
  });

  it("guide-width carries a unit: it is used inside calc(), where a bare 0 is a number", () => {
    expect(componentVars["nav-tree"]["guide-width"]).toMatch(/^\d+(\.\d+)?px$/);
  });

  it("there is no item-icon-fg-current: the current entry's icon follows its text", () => {
    expect(componentVars["nav-tree"]).not.toHaveProperty("item-icon-fg-current");
  });

  it.runIf(existsSync(join(dist, "components.css")))("components.css declares the seven keys", () => {
    const css = readFileSync(join(dist, "components.css"), "utf8");
    for (const decl of [
      "--psi-nav-tree-item-icon-fg: currentColor;",
      "--psi-nav-tree-group-icon-fg: currentColor;",
      "--psi-nav-tree-guide-width: 0px;",
      "--psi-nav-tree-guide-border: var(--psi-border-strong);",
      "--psi-nav-tree-indicator-width: 3px;",
      "--psi-nav-tree-indicator-inset-block: 0;",
      "--psi-nav-tree-indicator-radius: var(--psi-nav-tree-radius);",
    ]) {
      expect(css).toContain(decl);
    }
  });

  it.runIf(existsSync(join(dist, "scope-map.json")))("scope-map.json scopes the icon keys to text and the line to border", () => {
    const map = JSON.parse(readFileSync(join(dist, "scope-map.json"), "utf8"));
    expect(map.component["nav-tree-item-icon-fg"]).toEqual(["text"]);
    expect(map.component["nav-tree-group-icon-fg"]).toEqual(["text"]);
    expect(map.component["nav-tree-guide-border"]).toEqual(["border"]);
    expect(map.component["nav-tree-guide-width"]).toBeUndefined();
  });

  it("the look's overrides pass the scope gate", () => {
    expect(checkOverrideScopes(look, componentVars, lightTheme)).toEqual([]);
  });

  it("the scope gate refuses a text token on the guide line and a surface token on an icon", () => {
    const v = checkOverrideScopes(
      { "nav-tree-guide-border": "var(--psi-fg-secondary)", "nav-tree-item-icon-fg": "var(--psi-bg-primary)" },
      componentVars,
      lightTheme,
    );
    expect(v.map((x) => x.token).sort()).toEqual(["bgPrimary", "fgSecondary"]);
  });

  it("a sidebar theme's componentOverrides emit the look, with no consumer CSS", () => {
    const { css } = buildThemeCss("guided-sidebar", { ...sidebar, componentOverrides: look });
    const layer = css.slice(css.indexOf("@layer psi.components"));
    expect(layer).toContain('[data-psi-theme="guided-sidebar"]');
    for (const [k, value] of Object.entries(look)) expect(layer).toContain(`--psi-${k}: ${value};`);
  });

  it("buildThemeCss refuses a guide line bound to a text token", () => {
    expect(() =>
      buildThemeCss("bad-guide", { ...sidebar, componentOverrides: { "nav-tree-guide-border": "var(--psi-fg-secondary)" } }),
    ).toThrow(ThemeGateError);
  });
});
