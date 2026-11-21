import { describe, expect, it } from "vitest";
import { classifyComponentTokens, overrideDependents } from "../src/emit/component-scope.js";
import { componentVars } from "../src/components/registry.js";
import { lightTheme } from "../src/themes/light.js";

const semantic = Object.keys(lightTheme);
const scopes = classifyComponentTokens(componentVars, semantic);

describe("classifyComponentTokens (D139)", () => {
  it("classifies every token in the registry", () => {
    const count = Object.values(componentVars).reduce((n, v) => n + Object.keys(v).length, 0);
    expect(scopes.size).toBe(count);
  });

  it.each([
    ["--psi-app-shell-sidebar-width", "page"], // a literal
    ["--psi-app-shell-main-padding-inline", "page"], // a space scale
    ["--psi-navbar-gutter", "page"], // a base layout value
    ["--psi-button-radius", "page"], // an alias of a geometry dial
    ["--psi-button-24-icon-size", "page"], // two aliases deep
    ["--psi-toolbar-action-offset", "page"], // calc() over another family's geometry
    ["--psi-app-shell-sidebar-border-width", "page"], // a border's width, not its colour
    ["--psi-navbar-border-width", "page"],
    ["--psi-app-shell-sidebar-padding", "page"], // D140
    ["--psi-navbar-brand-width", "page"], // D140: a header sub-theme reads the page's sidebar
    ["--psi-navbar-brand-inset", "page"],
    ["--psi-app-shell-sidebar-bg", "theme"], // a semantic colour
    ["--psi-app-shell-bg", "theme"], // a colour key with a literal default
    ["--psi-card-bg", "theme"],
    ["--psi-button-accent-bg-hover", "theme"], // a colour key with a state suffix
    ["--psi-inline-alert-border-danger", "theme"],
    ["--psi-navbar-focus-ring", "theme"], // no colour suffix, a colour value
    ["--psi-nav-tree-indicator", "theme"],
    ["--psi-dialog-backdrop", "theme"],
  ])("%s is %s-scoped", (name, scope) => {
    expect(scopes.get(name)).toBe(scope);
  });

  it("follows a colour through another component's token", () => {
    const vars = { a: { tint: "var(--psi-b-ink)" }, b: { ink: "var(--psi-fg-primary)" } };
    expect(classifyComponentTokens(vars, semantic).get("--psi-a-tint")).toBe("theme");
  });

  it("counts a palette entry as a theme's value", () => {
    const vars = { a: { tint: "var(--psi-palette-sapphire)" } };
    expect(classifyComponentTokens(vars, semantic).get("--psi-a-tint")).toBe("theme");
  });

  it("terminates on a cycle, and a cycle of geometry stays page", () => {
    const vars = { a: { x: "var(--psi-a-y)", y: "calc(var(--psi-a-x) + 1px)" } };
    const out = classifyComponentTokens(vars, semantic);
    expect(out.get("--psi-a-x")).toBe("page");
    expect(out.get("--psi-a-y")).toBe("page");
  });
});

describe("overrideDependents (D139)", () => {
  it("re-declares the page-scoped aliases of an overridden dial, transitively, with their defaults", () => {
    const deps = overrideDependents({ "control-24-height": "1.25rem" }, componentVars, scopes);
    expect(deps["button-24-height"]).toBe("var(--psi-control-24-height)");
    expect(deps["button-24-icon-size"]).toBe("calc(var(--psi-button-24-height) / 2)");
    expect(deps["control-24-height"]).toBeUndefined();
  });

  it("leaves out a token the theme overrides itself", () => {
    const deps = overrideDependents(
      { "control-radius": "0", "button-radius": "9999px" },
      componentVars,
      scopes,
    );
    expect(deps["button-radius"]).toBeUndefined();
    expect(deps["input-radius"]).toBe("var(--psi-control-radius)");
    expect(deps["nav-tree-radius"]).toBe("var(--psi-control-radius)");
  });

  it("leaves out theme-scoped tokens: every theme declares them already", () => {
    const deps = overrideDependents({ "surface-bg": "var(--psi-bg-secondary)" }, componentVars, scopes);
    expect(Object.keys(deps)).toEqual([]);
  });

  it("keeps the registry's order", () => {
    const deps = Object.keys(overrideDependents({ "control-radius": "0" }, componentVars, scopes));
    const order = [...scopes.keys()].map((n) => n.slice("--psi-".length)).filter((n) => deps.includes(n));
    expect(deps).toEqual(order);
  });

  it("reaches nothing from ember's overrides, so ember.css is unchanged", () => {
    const deps = overrideDependents(
      { "button-font": "x", "card-radius": "0", "media-tint": "none" },
      componentVars,
      scopes,
    );
    expect(deps).toEqual({});
  });
});
