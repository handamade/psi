import { createContext, useId } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./field.module.css";

/** Wiring a Field provides to its control (Input/Select consume it; D49). */
export interface FieldContextValue {
  /** Generated (or htmlFor-overridden) id the label points at. */
  id: string;
  /** id of the rendered message line, if any — joins aria-describedby. */
  describedBy?: string;
  /** True when the Field carries an error. */
  invalid: boolean;
  /** Mirrors Field's required prop into the control. */
  required: boolean;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

export interface FieldProps extends HTMLAttributes<HTMLElement> {
  /** Label content; renders a <label> (or <legend> in group mode). */
  label?: ReactNode;
  /** Helper line under the control; replaced by error when error is set. */
  description?: ReactNode;
  /** Error content; when truthy it replaces the description and switches the
   * field (and a wrapped Input/Select) into error state. */
  error?: ReactNode;
  /** Renders the required marker and flows `required` to the control. @default false */
  required?: boolean;
  /** Group mode: fieldset/legend wrapping several self-labeled controls
   * (Checkbox/Switch); the message describes the whole group. @default false */
  group?: boolean;
  /** Override the generated control id (pair it with the same id on the control). */
  htmlFor?: string;
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement | HTMLFieldSetElement>;
}

/** Labeled form-row wrapper: label above, control, one message line below —
 * description normally, error when set (aria-live). Auto-wires
 * id/aria-describedby/aria-invalid into Input and Select (D49). */
export function Field({
  label,
  description,
  error,
  required = false,
  group = false,
  htmlFor,
  className,
  children,
  ref,
  ...rest
}: FieldProps) {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  const invalid = Boolean(error);
  const message = invalid ? error : description;
  const messageId = message != null && message !== false ? `${id}-message` : undefined;

  const cls = [styles.field, invalid && styles.invalid, className].filter(Boolean).join(" ");

  const labelContent =
    label != null ? (
      <>
        {label}
        {required && (
          <span aria-hidden="true" className={styles.marker}>
            {" *"}
          </span>
        )}
      </>
    ) : null;

  const body = (
    <>
      {labelContent != null &&
        (group ? (
          <legend className={styles.label}>{labelContent}</legend>
        ) : (
          <label className={styles.label} htmlFor={id}>
            {labelContent}
          </label>
        ))}
      <FieldContext.Provider value={{ id, describedBy: messageId, invalid, required }}>
        {children}
      </FieldContext.Provider>
      {messageId && (
        <p id={messageId} className={styles.message} aria-live="polite">
          {message}
        </p>
      )}
    </>
  );

  return group ? (
    <fieldset
      ref={ref as Ref<HTMLFieldSetElement>}
      className={cls}
      aria-describedby={messageId}
      {...rest}
    >
      {body}
    </fieldset>
  ) : (
    <div ref={ref as Ref<HTMLDivElement>} className={cls} {...rest}>
      {body}
    </div>
  );
}
