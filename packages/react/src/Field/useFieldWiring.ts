import { useContext, useEffect } from "react";
import type { AriaAttributes } from "react";
import { FieldContext } from "./Field.js";

/** The props a Field and a caller both set on a control. */
export interface OwnWiring {
  id?: string;
  required?: boolean;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
  "aria-describedby"?: string;
}

/** What a native control Psi writes puts on its element inside a Field (D135).
 * Internal: Input, Select, Textarea, Checkbox and Switch spread it after the
 * caller's props.
 *
 * The Field's wiring wins: its id (the one its <label for> points at), and
 * `true` for aria-invalid while it has an error and for required while it is
 * required. A caller adds to it and never undoes it: their aria-invalid or
 * required stands while the Field sets neither, and their aria-describedby
 * joins the Field's message, after `describedBy` (a Textarea's counter).
 *
 * A choice control (Checkbox, Switch) in a group Field takes aria-invalid
 * only: the fieldset holds the label and the message, and `required` on a box
 * means that box must be ticked (D108). Outside a Field the caller's values
 * pass through. */
export function useFieldWiring(
  component: string,
  own: OwnWiring,
  options: { choice?: boolean; describedBy?: string } = {},
): OwnWiring {
  const field = useContext(FieldContext);
  const wired = field != null && !(options.choice && field.group);
  const fieldId = wired ? field.id : undefined;
  const ownId = own.id;

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (fieldId === undefined || ownId === undefined || ownId === fieldId) return;
    console.warn(
      `${component}: inside a Field the control takes the Field's id, so id="${ownId}" was not used. Set it on the Field instead: <Field htmlFor="${ownId}">.`,
    );
  }, [component, fieldId, ownId]);

  const describedBy =
    [wired ? field.describedBy : undefined, options.describedBy, own["aria-describedby"]]
      .filter(Boolean)
      .join(" ") || undefined;

  return {
    id: fieldId ?? own.id,
    required: wired && field.required ? true : own.required,
    "aria-invalid": field?.invalid ? true : own["aria-invalid"],
    "aria-describedby": describedBy,
  };
}
