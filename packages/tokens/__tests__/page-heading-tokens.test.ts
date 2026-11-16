import { describe, it, expect } from "vitest";
import { componentVars } from "../src/components/registry.js";
import { checkOverrideScopes } from "../src/scope-gate.js";
import { lightTheme } from "../src/themes/light.js";
import { emitDTCG } from "../scripts/emit-dtcg.js";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { guidance } from "../src/guidance.js";

describe("page-heading tokens (D118)", () => {
  it("bind the display text style and the gated primary foreground", () => {
    expect(componentVars["page-heading"]).toEqual({
      font: "var(--psi-text-display-24-32-medium)",
      fg: "var(--psi-fg-primary)",
    });
  });

  it("a theme may swap the font for another text style and the colour for another foreground", () => {
    const overrides = {
      "page-heading-font": "var(--psi-text-30-36-bold)",
      "page-heading-fg": "var(--psi-fg-secondary)",
    };
    expect(checkOverrideScopes(overrides, componentVars, lightTheme)).toEqual([]);
  });

  it("the scope gate refuses a surface token on page-heading-fg", () => {
    const violations = checkOverrideScopes({ "page-heading-fg": "var(--psi-bg-primary)" }, componentVars, lightTheme);
    expect(violations).toHaveLength(1);
    expect(violations[0].token).toBe("bgPrimary");
  });

  it("the DTCG output sets the display text style in the display family", () => {
    const parsed = JSON.parse(emitDTCG("light", resolve(lightTheme, defaultPalette, defaultSlots)));
    expect(parsed.typography["display-24-32-medium"].$value).toEqual({
      fontFamily: "{fontFamily.display}",
      fontSize: "24px",
      lineHeight: "32px",
      fontWeight: 500,
    });
  });

  it("guidance names the page heading's style, and leaves the section heading's alone", () => {
    expect(guidance.typographyDefaults.pageHeading).toBe("display-24-32-medium");
    expect(guidance.typographyDefaults.heading).toBe("24-32-medium");
  });
});
