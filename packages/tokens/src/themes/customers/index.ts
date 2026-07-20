import type { Palette, SlotMap, ThemeDef, TokenDef } from "../../dsl/types.js";
import { lightTheme } from "../light.js";
import { darkTheme } from "../dark.js";
import { acmePalette, acmeSlots, acmeOverrides } from "./acme.js";
import { emberPalette, emberSlots, emberOverrides, emberFonts, emberComponentOverrides } from "./ember.js";

/** Brand-level font role assignment (D29). Emitted inside the brand's theme
 * block; the DS never ships font files — consumers load the webfonts. */
export interface BrandFonts { sans?: string; serif?: string; mono?: string; display?: string; }

export interface CustomerTheme {
  palette: Palette;
  slots: SlotMap;
  /** Which default theme the brand's formulas build on (D27). Default: "light". */
  base?: "light" | "dark";
  /** Optional semantic-token formula overrides, merged over the base theme. */
  overrides?: ThemeDef;
  /** Optional brand-level font role assignment (D29). */
  fonts?: BrandFonts;
  /** Component-token overrides (D34) — part of the themeable surface. Keys
   * omit the --psi- prefix, e.g. "card-radius": "0". Must not break a11y,
   * sizing contracts, or interaction states. */
  componentOverrides?: Record<string, string>;
}

/** Assemble the full semantic ThemeDef for a customer brand (D27). D46: an
 * override inherits the base token's scopes unless it declares its own — a
 * brand retuning fgOnAccent's formula must not silently unscope it. */
export function assembleCustomerTheme(c: CustomerTheme): ThemeDef {
  const base = c.base === "dark" ? darkTheme : lightTheme;
  const merged: Record<string, TokenDef> = { ...base };
  for (const [name, def] of Object.entries(c.overrides ?? {})) {
    const baseScopes = base[name]?.scopes;
    merged[name] = def.scopes === undefined && baseScopes !== undefined
      ? { ...def, scopes: baseScopes }
      : def;
  }
  return merged;
}

export const customerThemes: Record<string, CustomerTheme> = {
  acme: { palette: acmePalette, slots: acmeSlots, overrides: acmeOverrides },
  ember: { palette: emberPalette, slots: emberSlots, base: "dark", overrides: emberOverrides, fonts: emberFonts, componentOverrides: emberComponentOverrides },
  // <ds:register — new-theme inserts here, do not remove>
};
