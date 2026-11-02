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

describe("navbar border width (D110)", () => {
  it("keeps today's 1px line by default", () => {
    expect(componentVars.navbar["border-width"]).toBe("1px");
  });
});
