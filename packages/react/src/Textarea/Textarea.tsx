import { useContext, useId, useState } from "react";
import type { ChangeEvent, Ref, TextareaHTMLAttributes } from "react";
import { FieldContext } from "../Field/Field.js";
import styles from "./textarea.module.css";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Visible rows. A textarea's height is its rows; there is no `size`. @default 3 */
  rows?: number;
  /** Native minimum length, reported by constraint validation. */
  minLength?: number;
  /** Native maximum length, enforced while typing. With it, the counter shows
   * `{length} / {maxLength}` unless `showCounter={false}`. */
  maxLength?: number;
  /** Show error styling. Inside a Field, the Field's error also lights this. @default false */
  error?: boolean;
  /** With `maxLength`, show the `{length} / {maxLength}` counter under the
   * control. It is not a live region; it describes the textarea. @default true */
  showCounter?: boolean;
  /** Forwarded ref to the underlying `<textarea>` element. */
  ref?: Ref<HTMLTextAreaElement>;
}

/** Multi-line text input (D104): the Input recipe on a native `<textarea>`.
 * Inside a Field, id/aria-describedby/aria-invalid/required are wired as for
 * Input (D49). `minLength` and `maxLength` are the native attributes. With
 * `maxLength`, a counter under the control shows the length; it is not a
 * live region (a count spoken on every keystroke is noise) and joins
 * aria-describedby, so it is read with the field on focus. */
export function Textarea({
  rows = 3,
  error = false,
  showCounter = true,
  maxLength,
  className,
  onChange,
  ref,
  ...rest
}: TextareaProps) {
  const field = useContext(FieldContext);
  const counterId = `${useId()}-counter`;
  const invalid = error || (field?.invalid ?? false);
  const controlled = rest.value !== undefined;
  const [typed, setTyped] = useState(() => String(rest.defaultValue ?? "").length);
  const length = controlled ? String(rest.value ?? "").length : typed;
  const counter = maxLength !== undefined && showCounter;

  const describedBy =
    [field?.describedBy, counter ? counterId : undefined, rest["aria-describedby"]]
      .filter(Boolean)
      .join(" ") || undefined;

  const cls = [styles.textarea, invalid && styles.error, className].filter(Boolean).join(" ");

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (!controlled) setTyped(event.target.value.length);
    onChange?.(event);
  };

  const control = (
    <textarea
      ref={ref}
      className={cls}
      rows={rows}
      maxLength={maxLength}
      id={rest.id ?? field?.id}
      required={rest.required ?? (field?.required || undefined)}
      aria-invalid={field?.invalid || undefined}
      {...rest}
      onChange={handleChange}
      aria-describedby={describedBy}
    />
  );

  if (!counter) return control;
  return (
    <div className={styles.wrap}>
      {control}
      <div id={counterId} className={styles.counter} data-psi-textarea-counter>
        {length} / {maxLength}
        <span className="psi-sr-only"> characters</span>
      </div>
    </div>
  );
}
