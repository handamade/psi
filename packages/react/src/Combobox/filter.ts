import type { ComboboxOption } from "./types.js";

/** Case- and accent-blind form of a string: NFD, combining marks stripped,
 * lower-cased in the locale, so "Zürich" and "zur" meet at "zurich". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

/** The Combobox's default filter (D130): a "contains" match on the label,
 * ignoring case and accents. Empty text matches every option. */
export function defaultFilter(option: ComboboxOption, text: string): boolean {
  if (text === "") return true;
  return fold(option.label).includes(fold(text));
}
