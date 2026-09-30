import { useContext } from "react";
import { FieldContext } from "./Field.js";

/** What a control spreads onto its focusable element to join a Field (D84).
 * Each key is present only when the Field supplies it: the flags are `true`
 * or absent, never `false`. */
export interface FieldControlProps {
  /** The id the Field's label points at. */
  id?: string;
  /** The Field's message line — its description, or its error when set. */
  "aria-describedby"?: string;
  /** Present while the Field carries an error. */
  "aria-invalid"?: true;
  /** Present while the Field is required. */
  "aria-required"?: true;
  /** Present while the Field is required, for a native form control. */
  required?: true;
}

/** The wiring a Field gives its control, as props, for a control Psi did not
 * write (D84) — a combo box or date-time picker built on another library, say.
 * Spread the result onto the element that takes focus:
 *
 *     const field = useFieldControl();
 *     <div role="combobox" {...field} />
 *
 * Inside a Field it returns the label's `id`, `aria-describedby` for the
 * message line, and `aria-invalid`, `aria-required` and `required` when the
 * Field sets them — the same wiring Input and Select do for themselves.
 * Outside a Field it returns an empty object, so a control can be used with
 * or without one.
 *
 * The element must carry a role that admits `aria-required` (combobox,
 * textbox, listbox, spinbutton, …). If it also merges its own
 * `aria-describedby`, join the two ids with a space. */
export function useFieldControl(): FieldControlProps {
  const field = useContext(FieldContext);
  if (!field) return {};
  return {
    id: field.id,
    ...(field.describedBy ? { "aria-describedby": field.describedBy } : {}),
    ...(field.invalid ? { "aria-invalid": true as const } : {}),
    ...(field.required ? { "aria-required": true as const, required: true as const } : {}),
  };
}
