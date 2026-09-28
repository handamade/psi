// D81 — @handamade/psi-tokens/theme: build a gated theme outside the Psi repo.
// A consumer keeps its brand's definition in its own repository; nothing
// client-named has to ship in this package.
import { assembleCustomerTheme, type CustomerTheme } from "../themes/customers/index.js";
import { emitThemeCSS } from "../emit/css.js";
import { gateTheme } from "./gate.js";

export { ThemeGateError } from "./gate.js";
export type { CustomerTheme, BrandFonts } from "../themes/customers/index.js";
export type { Palette, PaletteEntry, SlotMap, ThemeDef, TokenDef } from "../dsl/types.js";
export { token, set, delta, cap, slot, ref } from "../dsl/builders.js";

export interface ThemeBuild {
  /** The theme's CSS, scoped to `[data-psi-theme="<name>"]`. Load it after
   * `base.css`; apply it with the attribute on any element. */
  css: string;
  /** Non-fatal gamut warnings. */
  warnings: string[];
}

/** Build one theme through the same gates as Psi's shipped themes: the
 * definition is validated, then refused with a ThemeGateError if any WCAG AA
 * contrast pair or D46 token scope fails. */
export function buildThemeCss(name: string, theme: CustomerTheme): ThemeBuild {
  if (name === "light" || name === "dark") {
    throw new Error(`"${name}" is a built-in theme name; choose another`);
  }
  const def = assembleCustomerTheme(theme);
  const { warnings } = gateTheme(name, def, theme.palette, theme.slots, theme.componentOverrides);
  const css = emitThemeCSS(name, def, theme.palette, theme.slots, {
    fonts: theme.fonts,
    componentOverrides: theme.componentOverrides,
  });
  return { css, warnings };
}
