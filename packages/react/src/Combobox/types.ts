/** One choice in a Combobox (D130). Options are data, not children:
 * filtering needs each option's text. */
export interface ComboboxOption {
  /** What onChange reports and a form submits. */
  value: string;
  /** Shown, filtered on and read aloud. */
  label: string;
  /** An optional second line, joined into the option's accessible name. */
  description?: string;
  /** Reachable by arrow key, never picked (aria-disabled). */
  disabled?: boolean;
}
