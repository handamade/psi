import { describe, it, expect } from "vitest";
import { componentVars } from "../src/components/registry.js";
import { checkOverrideScopes } from "../src/scope-gate.js";
import { lightTheme } from "../src/themes/light.js";

describe("app-shell tokens (D110)", () => {
  it("paint nothing by default, so a consumer that sets none keeps today's look", () => {
    expect(componentVars["app-shell"].bg).toBe("transparent");
    expect(componentVars["app-shell"]["main-bg"]).toBe("transparent");
    expect(componentVars["app-shell"]["main-radius"]).toBe("0");
  });

  it("a theme may set both backgrounds to a surface, and the corner from the radius scale", () => {
    const overrides = {
      "app-shell-bg": "var(--psi-bg-inverted)",
      "app-shell-main-bg": "var(--psi-bg-primary)",
      "app-shell-main-radius": "var(--psi-radius-12)",
    };
    expect(checkOverrideScopes(overrides, componentVars, lightTheme)).toEqual([]);
  });

  it.each(["app-shell-bg", "app-shell-main-bg"])("the scope gate refuses a text token on %s", (key) => {
    const violations = checkOverrideScopes({ [key]: "var(--psi-fg-primary)" }, componentVars, lightTheme);
    expect(violations).toHaveLength(1);
    expect(violations[0].token).toBe("fgPrimary");
  });
});

describe("app-shell main padding (D113)", () => {
  it("pads the page by 24px on both axes by default", () => {
    expect(componentVars["app-shell"]["main-padding-inline"]).toBe("var(--psi-space-24)");
    expect(componentVars["app-shell"]["main-padding-block"]).toBe("var(--psi-space-24)");
  });

  it("a theme may set either from the space scale, or remove it", () => {
    const overrides = {
      "app-shell-main-padding-inline": "var(--psi-space-16)",
      "app-shell-main-padding-block": "0",
    };
    expect(checkOverrideScopes(overrides, componentVars, lightTheme)).toEqual([]);
  });
});

describe("app-shell sidebar line (D114)", () => {
  it("is off by default: a faint colour at width 0", () => {
    expect(componentVars["app-shell"]["sidebar-border"]).toBe("var(--psi-border-faint)");
    expect(componentVars["app-shell"]["sidebar-border-width"]).toBe("0");
  });

  it("a theme may turn it on and recolour it from a border token", () => {
    const overrides = {
      "app-shell-sidebar-border-width": "1px",
      "app-shell-sidebar-border": "var(--psi-border-neutral)",
    };
    expect(checkOverrideScopes(overrides, componentVars, lightTheme)).toEqual([]);
  });

  it("the scope gate refuses a surface token on the line's colour", () => {
    const violations = checkOverrideScopes(
      { "app-shell-sidebar-border": "var(--psi-bg-primary)" },
      componentVars,
      lightTheme,
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].token).toBe("bgPrimary");
  });
});

describe("navbar border width (D110)", () => {
  it("keeps today's 1px line by default", () => {
    expect(componentVars.navbar["border-width"]).toBe("1px");
  });
});

describe("navbar text colour (D111)", () => {
  it("aliases the semantic layer, so it re-resolves under a data-psi-theme on the bar", () => {
    expect(componentVars.navbar.fg).toBe("var(--psi-fg-primary)");
  });

  it("the scope gate refuses a surface token on navbar-fg", () => {
    const violations = checkOverrideScopes({ "navbar-fg": "var(--psi-bg-primary)" }, componentVars, lightTheme);
    expect(violations).toHaveLength(1);
    expect(violations[0].token).toBe("bgPrimary");
  });
});
