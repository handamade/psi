import { describe, expect, it } from "vitest";
import { emitBaseCSS, emitThemeCSS } from "../scripts/emit-css.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { acmePalette, acmeSlots } from "../src/themes/customers/acme.js";
import { emitScaleVarsCSS, emitUtilitiesCSS, emitUtilitiesRoster } from "../scripts/emit-utilities.js";
import { token, slot } from "../src/dsl/builders.js";

describe("emitBaseCSS", () => {
  it("emits palette vars inside @layer psi.base", () => {
    const css = emitBaseCSS(defaultPalette);
    expect(css).toContain("@layer psi.base");
    expect(css).toContain("--psi-palette-obsidian");
    expect(css).toContain("--psi-palette-sapphire");
    expect(css).toContain("oklch(");
  });

  it("base.css declares the full ds layer order before any layer block", () => {
    const css = emitBaseCSS(defaultPalette);
    const firstLayerLine = css.split("\n").find((l) => l.trimStart().startsWith("@layer"));
    expect(firstLayerLine?.trim()).toBe("@layer psi.base, psi.theme, psi.components, psi.utilities;");
  });
});

describe("emitThemeCSS", () => {
  it("emits semantic tokens inside @layer psi.theme", () => {
    const css = emitThemeCSS("light", lightTheme, defaultPalette, defaultSlots);
    expect(css).toContain("@layer psi.theme");
    expect(css).toContain("--psi-bg-primary");
    expect(css).toContain("--psi-fg-accent");
    expect(css).toContain("--psi-fill-tint-accent");
  });

  it("light theme targets :root and [data-psi-theme='light']", () => {
    const css = emitThemeCSS("light", lightTheme, defaultPalette, defaultSlots);
    expect(css).toContain(":root");
    expect(css).toContain('[data-psi-theme="light"]');
  });

  it("uses live oklch(from var(...) ...) form for slot-sourced tokens", () => {
    const css = emitThemeCSS("light", lightTheme, defaultPalette, defaultSlots);
    expect(css).toMatch(/oklch\(from var\(--psi-palette-/);
  });

  it("uses live var() form for ref-sourced tokens", () => {
    const css = emitThemeCSS("light", lightTheme, defaultPalette, defaultSlots);
    expect(css).toMatch(/oklch\(from var\(--psi-fg-primary\)/);
  });

  it("scopes a customer theme's own palette vars inside its theme selector block", () => {
    const css = emitThemeCSS("acme", lightTheme, acmePalette, acmeSlots);

    // The theme selector for a non-light/dark theme is scoped, not :root.
    const selectorIndex = css.indexOf('[data-psi-theme="acme"]');
    expect(selectorIndex).toBeGreaterThan(-1);

    // Palette vars must be present and land inside the selector block
    // (i.e. after the opening selector, before its closing brace).
    const openBraceIndex = css.indexOf("{", selectorIndex);
    const closeBraceIndex = css.indexOf("\n  }", openBraceIndex);
    const blockBody = css.slice(openBraceIndex, closeBraceIndex);

    expect(css).toContain("--psi-palette-coral: oklch(");
    expect(blockBody).toContain("--psi-palette-coral: oklch(");
  });

  it("emits brand font roles inside the theme block (D29)", () => {
    const css = emitThemeCSS("ember", { bgPrimary: token({ from: slot.canvas }) },
      { emberCanvas: { l: 0.147, c: 0.004, h: 49 } },
      { ink: "emberCanvas", canvas: "emberCanvas", accent: "emberCanvas", success: "emberCanvas", warning: "emberCanvas", danger: "emberCanvas" },
      { fonts: { display: '"Archivo", system-ui, sans-serif', mono: '"IBM Plex Mono", "Courier New", monospace' } });
    expect(css).toContain(`--psi-font-display: "Archivo", system-ui, sans-serif;`);
    expect(css).toContain(`--psi-font-mono: "IBM Plex Mono", "Courier New", monospace;`);
    expect(css).toContain(`[data-psi-theme="ember"]`);
  });

  it("emits brand component-token overrides into the components layer (D34)", () => {
    const css = emitThemeCSS("ember", { bgPrimary: token({ from: slot.canvas }) },
      { emberCanvas: { l: 0.147, c: 0.004, h: 49 } },
      { ink: "emberCanvas", canvas: "emberCanvas", accent: "emberCanvas", success: "emberCanvas", warning: "emberCanvas", danger: "emberCanvas" },
      { componentOverrides: { "card-radius": "0", "button-font": "var(--psi-text-mono-15-24-regular)" } });
    expect(css).toContain(`@layer psi.components {\n  [data-psi-theme="ember"] {`);
    expect(css).toContain("--psi-card-radius: 0;");
    expect(css).toContain("--psi-button-font: var(--psi-text-mono-15-24-regular);");
  });
});

describe("base.css assembly no longer bundles customer palettes", () => {
  it("only carries the default palette + scale vars, never a customer's palette names", () => {
    // Mirrors the assembly build.ts performs: emitBaseCSS(defaultPalette) is
    // no longer fed a merge of every theme's palette. Scale vars are appended
    // as their own :root block via string concatenation (no regex surgery).
    const baseCSS =
      emitBaseCSS(defaultPalette) +
      `\n@layer psi.base {\n  :root {\n${emitScaleVarsCSS()}\n  }\n}\n`;

    expect(baseCSS).toContain("--psi-palette-obsidian");

    const acmeOnlyNames = ["charcoal", "cream", "coral", "mint", "gold", "crimson"];
    for (const name of acmeOnlyNames) {
      expect(baseCSS).not.toContain(`--psi-palette-${name}`);
    }
  });
});

describe("tabular numerals (D62)", () => {
  it("emits the numeric-variant scale token", () => {
    expect(emitScaleVarsCSS()).toContain("--psi-font-variant-numeric: tabular-nums;");
  });

  it("emits a .psi-tabular utility bound to the token", () => {
    expect(emitUtilitiesCSS()).toContain(
      ".psi-tabular { font-variant-numeric: var(--psi-font-variant-numeric); }",
    );
  });
});

describe("spacing utility families (D79) — order and structure locked", () => {
  const css = emitUtilitiesCSS();
  const lines = css.split("\n");

  it("gap utilities appear before padding utilities", () => {
    const gapIndex = lines.findIndex((l) => l.includes(".psi-gap-8 {"));
    const paddingIndex = lines.findIndex((l) => l.includes(".psi-p-8 {"));
    expect(gapIndex).toBeGreaterThan(-1);
    expect(paddingIndex).toBeGreaterThan(-1);
    expect(gapIndex).toBeLessThan(paddingIndex);
  });

  it("padding utilities appear before margin utilities", () => {
    const paddingIndex = lines.findIndex((l) => l.includes(".psi-p-8 {"));
    const marginIndex = lines.findIndex((l) => l.includes(".psi-m-8 {"));
    expect(paddingIndex).toBeGreaterThan(-1);
    expect(marginIndex).toBeGreaterThan(-1);
    expect(paddingIndex).toBeLessThan(marginIndex);
  });

  it("within padding group, .psi-p precedes .psi-px precedes .psi-py for the same step", () => {
    const pIndex = lines.findIndex((l) => l.includes(".psi-p-8 {"));
    const pxIndex = lines.findIndex((l) => l.includes(".psi-px-8 {"));
    const pyIndex = lines.findIndex((l) => l.includes(".psi-py-8 {"));
    expect(pIndex).toBeGreaterThan(-1);
    expect(pxIndex).toBeGreaterThan(-1);
    expect(pyIndex).toBeGreaterThan(-1);
    expect(pIndex).toBeLessThan(pxIndex);
    expect(pxIndex).toBeLessThan(pyIndex);
  });

  it("within margin group, .psi-m precedes .psi-mx precedes .psi-my for the same step", () => {
    const mIndex = lines.findIndex((l) => l.includes(".psi-m-8 {"));
    const mxIndex = lines.findIndex((l) => l.includes(".psi-mx-8 {"));
    const myIndex = lines.findIndex((l) => l.includes(".psi-my-8 {"));
    expect(mIndex).toBeGreaterThan(-1);
    expect(mxIndex).toBeGreaterThan(-1);
    expect(myIndex).toBeGreaterThan(-1);
    expect(mIndex).toBeLessThan(mxIndex);
    expect(mxIndex).toBeLessThan(myIndex);
  });

  it("blank line separates gap group from padding group", () => {
    // Find the last gap utility and the first padding utility
    const lastGapIndex = lines.findLastIndex((l) => l.includes(".psi-gap-") && l.includes("{"));
    const firstPaddingIndex = lines.findIndex((l) => l.includes(".psi-p-8 {"));
    expect(lastGapIndex).toBeGreaterThan(-1);
    expect(firstPaddingIndex).toBeGreaterThan(-1);
    // There should be exactly one blank line between them
    expect(lines[lastGapIndex + 1]).toBe("");
  });

  it("blank line separates padding group from margin group", () => {
    // Find the last padding utility and the first margin utility
    const lastPaddingIndex = lines.findLastIndex(
      (l) => (l.includes(".psi-p-") || l.includes(".psi-px-") || l.includes(".psi-py-")) && l.includes("{"),
    );
    const firstMarginIndex = lines.findIndex((l) => l.includes(".psi-m-8 {"));
    expect(lastPaddingIndex).toBeGreaterThan(-1);
    expect(firstMarginIndex).toBeGreaterThan(-1);
    // There should be exactly one blank line between them
    expect(lines[lastPaddingIndex + 1]).toBe("");
  });
});

describe("emitUtilitiesRoster", () => {
  it("lists every class the CSS emits, and nothing it does not", () => {
    const roster = emitUtilitiesRoster();
    const css = emitUtilitiesCSS();
    const inCss = [...css.matchAll(/^\s*\.(psi-[a-z0-9-]+)\s*[,{]/gm)].map((m) => m[1]);
    expect([...new Set(inCss)].sort()).toEqual(roster.classes);
  });

  it("carries the margin family the eval kept missing", () => {
    expect(emitUtilitiesRoster().classes).toContain("psi-m-0");
  });

  it("describes each family's property and scale", () => {
    const gap = emitUtilitiesRoster().families.find((f) => f.prefix === "psi-gap-*");
    expect(gap).toBeDefined();
    expect(gap!.property).toBe("gap");
    expect(gap!.scale).toContain(24);
  });

  it("carries the sr-only utility (D80)", () => {
    expect(emitUtilitiesRoster().classes).toContain("psi-sr-only");
  });
});

describe("visually-hidden utility (D80)", () => {
  it("emits .psi-sr-only with both clip and clip-path", () => {
    const css = emitUtilitiesCSS();
    const rule = css.match(/\.psi-sr-only\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule![0]).toContain("clip: rect(0 0 0 0)");
    expect(rule![0]).toContain("clip-path: inset(50%)");
    expect(rule![0]).toContain("position: absolute");
  });

  it("registers in the roster with no scale, matching .psi-container", () => {
    const family = emitUtilitiesRoster().families.find((f) => f.prefix === "psi-sr-only");
    expect(family).toBeDefined();
    expect(family!.scale).toBeNull();
    expect(family!.classes).toEqual(["psi-sr-only"]);
  });
});
