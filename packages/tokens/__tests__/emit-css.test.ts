import { describe, expect, it } from "vitest";
import { emitBaseCSS, emitThemeCSS } from "../scripts/emit-css.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { acmePalette, acmeSlots } from "../src/themes/customers/acme.js";
import { emitScaleVarsCSS } from "../scripts/emit-utilities.js";
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
