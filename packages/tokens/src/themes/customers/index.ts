import type { Palette, SlotMap, ThemeDef } from "../../dsl/types.js";
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
   * omit the --ds- prefix, e.g. "card-radius": "0". Must not break a11y,
   * sizing contracts, or interaction states. */
  componentOverrides?: Record<string, string>;
}

/** Assemble the full semantic ThemeDef for a customer brand (D27). */
export function assembleCustomerTheme(c: CustomerTheme): ThemeDef {
  const base = c.base === "dark" ? darkTheme : lightTheme;
  return { ...base, ...c.overrides };
}

export const customerThemes: Record<string, CustomerTheme> = {
  acme: { palette: acmePalette, slots: acmeSlots, overrides: acmeOverrides },
  ember: { palette: emberPalette, slots: emberSlots, base: "dark", overrides: emberOverrides, fonts: emberFonts, componentOverrides: emberComponentOverrides },
  // <ds:register — new-theme inserts here, do not remove>
};
