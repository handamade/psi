import { describe, it, expect } from "vitest";
import { resolve } from "../src/dsl/resolver.js";
import { ref, token } from "../src/dsl/builders.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { acmePalette, acmeSlots } from "../src/themes/customers/acme.js";
import * as matrix from "../src/contrast-matrix.js";
import { gateTheme, ThemeGateError } from "../src/theme/gate.js";
import { checkboxVars } from "../src/components/checkbox.js";
import { radioGroupVars } from "../src/components/radio-group.js";
import { inputVars } from "../src/components/input.js";
import { selectVars } from "../src/components/select.js";
import { textareaVars } from "../src/components/textarea.js";
import type { ContrastPair } from "../src/contrast-matrix.js";

/** D106 — an unchecked checkbox or radio is identified by its outline alone,
 * so WCAG 1.4.11 asks 3:1 for it. `borderNeutral` measured 1.32-1.48. */

const nonTextPairs = (): ContrastPair[] =>
  ((matrix as Record<string, unknown>).nonTextPairs as ContrastPair[] | undefined) ?? [];

describe("borderControl (D106)", () => {
  it("is fgPrimary at alpha 0.55 in the light base and 0.40 in the dark base", () => {
    expect(lightTheme.borderControl).toEqual({ from: ref.fgPrimary, alpha: 0.55, scopes: ["border"] });
    expect(darkTheme.borderControl).toEqual({ from: ref.fgPrimary, alpha: 0.4, scopes: ["border"] });
  });

  it("is gated at 3:1 on bgPrimary and bgSecondary", () => {
    expect(nonTextPairs()).toEqual([
      { fg: "borderControl", bg: "bgPrimary", minRatio: 3 },
      { fg: "borderControl", bg: "bgSecondary", minRatio: 3 },
    ]);
  });

  for (const [name, theme, palette, slots] of [
    ["light", lightTheme, defaultPalette, defaultSlots],
    ["dark", darkTheme, defaultPalette, defaultSlots],
    ["acme", lightTheme, acmePalette, acmeSlots],
  ] as const) {
    it(`${name}: clears 3:1 with headroom on both surfaces`, () => {
      const resolved = resolve(theme, palette, slots);
      expect(resolved.borderControl, "borderControl resolves").toBeDefined();
      const results = matrix.checkContrast(resolved, nonTextPairs());
      expect(results).toHaveLength(2);
      for (const r of results) expect(r.ratio, `${r.fg} on ${r.bg}`).toBeGreaterThanOrEqual(3.1);
    });
  }

  it("the theme gate refuses a borderControl under 3:1, naming the pair", () => {
    const weak = { ...lightTheme, borderControl: token({ from: ref.fgPrimary, alpha: 0.15, scopes: ["border"] }) };
    let caught: unknown;
    try {
      gateTheme("weak", weak, defaultPalette, defaultSlots);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ThemeGateError);
    const failing = (caught as ThemeGateError).contrastFailures.map((f) => `${f.fg}/${f.bg}`);
    expect(failing).toEqual(["borderControl/bgPrimary", "borderControl/bgSecondary"]);
  });

  it("is bound by the checkbox box and the radio circle, and by no field", () => {
    expect(checkboxVars["box-border"]).toBe("var(--psi-border-control)");
    expect(radioGroupVars["circle-border"]).toBe("var(--psi-border-control)");
    expect(inputVars.border).toBe("var(--psi-border-neutral)");
    expect(selectVars.border).toBe("var(--psi-border-neutral)");
    expect(textareaVars.border).toBe("var(--psi-border-neutral)");
  });
});
