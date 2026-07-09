import type { Palette, SlotMap, ThemeDef } from "../../dsl/types.js";
import { lightTheme } from "../light.js";
import { darkTheme } from "../dark.js";
import { acmePalette, acmeSlots } from "./acme.js";

export interface CustomerTheme {
  palette: Palette;
  slots: SlotMap;
  /** Which default theme the brand's formulas build on (D27). Default: "light". */
  base?: "light" | "dark";
  /** Optional semantic-token formula overrides, merged over the base theme. */
  overrides?: ThemeDef;
}

/** Assemble the full semantic ThemeDef for a customer brand (D27). */
export function assembleCustomerTheme(c: CustomerTheme): ThemeDef {
  const base = c.base === "dark" ? darkTheme : lightTheme;
  return { ...base, ...c.overrides };
}

export const customerThemes: Record<string, CustomerTheme> = {
  acme: { palette: acmePalette, slots: acmeSlots },
  // <ds:register — new-theme inserts here, do not remove>
};
