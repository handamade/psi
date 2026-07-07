import { describe, expect, it } from "vitest";
import { emitBaseCSS, emitThemeCSS } from "../scripts/emit-css.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { acmePalette, acmeSlots } from "../src/themes/customers/acme.js";
import { emitScaleVarsCSS } from "../scripts/emit-utilities.js";

describe("emitBaseCSS", () => {
  it("emits palette vars inside @layer ds.base", () => {
    const css = emitBaseCSS(defaultPalette);
    expect(css).toContain("@layer ds.base");
    expect(css).toContain("--ds-palette-obsidian");
    expect(css).toContain("--ds-palette-sapphire");
    expect(css).toContain("oklch(");
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
