import { describe, expect, it } from "vitest";
import { emitBaseCSS, emitThemeCSS } from "../scripts/emit-css.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { acmePalette, acmeSlots } from "../src/themes/customers/acme.js";
import { emitScaleVarsCSS } from "../scripts/emit-utilities.js";
import { token, slot } from "../src/dsl/builders.js";

describe("emitBaseCSS", () => {
  it("emits palette vars inside @layer ds.base", () => {
    const css = emitBaseCSS(defaultPalette);
    expect(css).toContain("@layer ds.base");
    expect(css).toContain("--ds-palette-obsidian");
    expect(css).toContain("--ds-palette-sapphire");
    expect(css).toContain("oklch(");
  });

  it("base.css declares the full ds layer order before any layer block", () => {
    const css = emitBaseCSS(defaultPalette);
    const firstLayerLine = css.split("\n").find((l) => l.trimStart().startsWith("@layer"));
    expect(firstLayerLine?.trim()).toBe("@layer ds.base, ds.theme, ds.components, ds.utilities;");
  });
});

describe("emitThemeCSS", () => {
  it("emits semantic tokens inside @layer ds.theme", () => {
    const css = emitThemeCSS("light", lightTheme, defaultPalette, defaultSlots);
    expect(css).toContain("@layer ds.theme");
    expect(css).toContain("--ds-bg-primary");
    expect(css).toContain("--ds-fg-accent");
    expect(css).toContain("--ds-fill-tint-accent");
  });

  it("light theme targets :root and [data-ds-theme='light']", () => {
    const css = emitThemeCSS("light", lightTheme, defaultPalette, defaultSlots);
    expect(css).toContain(":root");
    expect(css).toContain('[data-ds-theme="light"]');
  });

  it("uses live oklch(from var(...) ...) form for slot-sourced tokens", () => {
    const css = emitThemeCSS("light", lightTheme, defaultPalette, defaultSlots);
    expect(css).toMatch(/oklch\(from var\(--ds-palette-/);
  });

  it("uses live var() form for ref-sourced tokens", () => {
    const css = emitThemeCSS("light", lightTheme, defaultPalette, defaultSlots);
    expect(css).toMatch(/oklch\(from var\(--ds-fg-primary\)/);
  });

  it("scopes a customer theme's own palette vars inside its theme selector block", () => {
    const css = emitThemeCSS("acme", lightTheme, acmePalette, acmeSlots);

    // The theme selector for a non-light/dark theme is scoped, not :root.
    const selectorIndex = css.indexOf('[data-ds-theme="acme"]');
    expect(selectorIndex).toBeGreaterThan(-1);

    // Palette vars must be present and land inside the selector block
    // (i.e. after the opening selector, before its closing brace).
    const openBraceIndex = css.indexOf("{", selectorIndex);
    const closeBraceIndex = css.indexOf("\n  }", openBraceIndex);
    const blockBody = css.slice(openBraceIndex, closeBraceIndex);

    expect(css).toContain("--ds-palette-coral: oklch(");
    expect(blockBody).toContain("--ds-palette-coral: oklch(");
  });

  it("emits brand font roles inside the theme block (D29)", () => {
    const css = emitThemeCSS("ember", { bgPrimary: token({ from: slot.canvas }) },
      { emberCanvas: { l: 0.147, c: 0.004, h: 49 } },
      { ink: "emberCanvas", canvas: "emberCanvas", accent: "emberCanvas", success: "emberCanvas", warning: "emberCanvas", danger: "emberCanvas" },
      { fonts: { display: '"Archivo", system-ui, sans-serif', mono: '"IBM Plex Mono", "Courier New", monospace' } });
    expect(css).toContain(`--ds-font-display: "Archivo", system-ui, sans-serif;`);
    expect(css).toContain(`--ds-font-mono: "IBM Plex Mono", "Courier New", monospace;`);
    expect(css).toContain(`[data-ds-theme="ember"]`);
  });

  it("emits brand component-token overrides into the components layer (D34)", () => {
    const css = emitThemeCSS("ember", { bgPrimary: token({ from: slot.canvas }) },
      { emberCanvas: { l: 0.147, c: 0.004, h: 49 } },
      { ink: "emberCanvas", canvas: "emberCanvas", accent: "emberCanvas", success: "emberCanvas", warning: "emberCanvas", danger: "emberCanvas" },
      { componentOverrides: { "card-radius": "0", "button-font": "var(--ds-text-mono-15-24-regular)" } });
    expect(css).toContain(`@layer ds.components {\n  [data-ds-theme="ember"] {`);
    expect(css).toContain("--ds-card-radius: 0;");
    expect(css).toContain("--ds-button-font: var(--ds-text-mono-15-24-regular);");
  });
});

describe("base.css assembly no longer bundles customer palettes", () => {
  it("only carries the default palette + scale vars, never a customer's palette names", () => {
    // Mirrors the assembly build.ts performs: emitBaseCSS(defaultPalette) is
    // no longer fed a merge of every theme's palette. Scale vars are appended
    // as their own :root block via string concatenation (no regex surgery).
    const baseCSS =
      emitBaseCSS(defaultPalette) +
      `\n@layer ds.base {\n  :root {\n${emitScaleVarsCSS()}\n  }\n}\n`;

    expect(baseCSS).toContain("--ds-palette-obsidian");

    const acmeOnlyNames = ["charcoal", "cream", "coral", "mint", "gold", "crimson"];
    for (const name of acmeOnlyNames) {
      expect(baseCSS).not.toContain(`--ds-palette-${name}`);
    }
  });
});
