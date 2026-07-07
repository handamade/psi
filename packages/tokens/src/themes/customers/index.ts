import type { Palette, SlotMap, ThemeDef } from "../../dsl/types.js";
import { acmePalette, acmeSlots } from "./acme.js";

export interface CustomerTheme {
  palette: Palette;
  slots: SlotMap;
  /** Optional semantic-token formula overrides, merged over lightTheme. */
  overrides?: ThemeDef;
}

export const customerThemes: Record<string, CustomerTheme> = {
  acme: { palette: acmePalette, slots: acmeSlots },
  // <ds:register — new-theme inserts here, do not remove>
};
