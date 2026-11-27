import { describe, expect, it } from "vitest";
import { uiSdkTokenMap, uiSdkColourRoles, uiSdkLeftAlone, type UiSdkRole } from "../src/bridges/ui-sdk.js";
import { readUiSdkWebCss } from "../src/bridges/ui-sdk-source.js";
import { wcagAAPairs, componentLabelPairs, nonTextPairs } from "../src/contrast-matrix.js";
import { lightTheme } from "../src/themes/light.js";

const declared = [...new Set([...readUiSdkWebCss().matchAll(/--ui-([a-z0-9-]+):/g)].map((m) => m[1]))].sort();
const kebabToCamel = (s: string) => s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const allPairs = [...wcagAAPairs, ...componentLabelPairs, ...nonTextPairs];

/** The roles with a contrast duty, and the tokens each may alias. */
const GATED: Partial<Record<UiSdkRole, string[]>> = {
  text: ["fgPrimary", "fgSecondary"],
  "danger-text": ["fgDanger"],
  "text-on-accent": ["fgOnAccent"],
  "accent-fill": ["fillAccent"],
  "control-border": ["borderControl"],
  focus: ["borderFocus"],
};

describe("UI SDK token map (D146)", () => {
  it("covers every --ui-* token the pinned web.css declares, and nothing else", () => {
    const covered = [...Object.keys(uiSdkTokenMap), ...uiSdkLeftAlone].sort();
    expect(covered).toEqual(declared);
    expect(new Set(covered).size).toBe(covered.length);
  });

  it("tags every colour entry with a role, and only map keys", () => {
    for (const key of Object.keys(uiSdkColourRoles)) expect(uiSdkTokenMap).toHaveProperty(key);
    const colourKeys = Object.entries(uiSdkTokenMap)
      .filter(([, v]) => /^var\(--psi-(bg|fg|fill|border|scrim)-/.test(v))
      .map(([k]) => k);
    expect(Object.keys(uiSdkColourRoles).sort()).toEqual(colourKeys.sort());
  });

  for (const [key, role] of Object.entries(uiSdkColourRoles)) {
    it(`--ui-${key} (${role}) aliases one semantic token in a gated role`, () => {
      const m = /^var\(--psi-([a-z0-9-]+)\)$/.exec(uiSdkTokenMap[key]);
      expect(m, uiSdkTokenMap[key]).not.toBeNull();
      const token = kebabToCamel(m![1]);
      expect(lightTheme).toHaveProperty(token);
      const allowed = GATED[role];
      if (allowed) {
        expect(allowed).toContain(token);
        expect(allPairs.some((p) => p.fg === token || p.bg === token), `${token} is in no matrix pair`).toBe(true);
      }
    });
  }
});
