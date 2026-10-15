import { useContext, useLayoutEffect, useRef } from "react";
import type { InputHTMLAttributes, Ref } from "react";
import { FieldContext } from "../Field/Field.js";
import styles from "./checkbox.module.css";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "placeholder"> {
  /** Label text. */
  children?: React.ReactNode;
  /**
   * Accessible name when there is no visible label — a table's row-selection
   * checkbox, say. Optional, unlike IconButton's required form (D60): a
   * labelled checkbox is still the common case.
   */
  "aria-label"?: string;
  /** The mixed state, e.g. a "select all" over a partial selection (D103).
   * Sets the input's DOM property, which the platform exposes as
   * aria-checked="mixed", and draws a dash. Re-applied on every render,
   * because a click clears the property before the consumer re-renders.
   * When absent, the property is left alone, so a state set through the ref
   * survives. */
  indeterminate?: boolean;
  /** Forwarded ref to the underlying `<input type="checkbox">` element. */
  ref?: Ref<HTMLInputElement>;
}

/** Native checkbox with a built-in label; for independent binary choices.
 * In an invalid group Field it is aria-invalid, and an unchecked box marked
 * aria-invalid outlines in the error colour (D108). */
export function Checkbox({
  children,
  className,
  disabled,
  indeterminate,
  ref,
  ...rest
}: CheckboxProps) {
  // D108: in an invalid group Field, every checkbox is aria-invalid, as every
  // Radio is (D104). Not `required`: on a checkbox that means this box must be
  // ticked. A consumer's own aria-invalid, in `rest`, still wins.
  const field = useContext(FieldContext);
  const fieldInvalid = (field?.group && field.invalid) || undefined;
  const innerRef = useRef<HTMLInputElement | null>(null);
  const setRef = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  // No dependency list on purpose (D103): the browser clears `indeterminate`
  // on a click before the consumer re-renders, so the prop must be written
  // back on every render, not only when it changes. Only when it is passed:
  // `undefined` leaves the property to whoever set it through the ref.
  useLayoutEffect(() => {
    if (indeterminate !== undefined && innerRef.current) {
      innerRef.current.indeterminate = indeterminate;
    }
  });

  const cls = [styles.label, disabled && styles.disabled, className]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={cls}>
      <input
        ref={setRef}
        type="checkbox"
        className={`psi-sr-only ${styles.input}`}
        disabled={disabled}
        aria-invalid={fieldInvalid}
        {...rest}
      />
      <span className={styles.indicator} aria-hidden="true" />
      {children && <span className={styles.text}>{children}</span>}
    </label>
  );
}
