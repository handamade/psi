import { createContext, useId } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./field.module.css";

/** Wiring a Field provides to its control (Input/Select consume it; D49). */
export interface FieldContextValue {
  /** Generated (or htmlFor-overridden) id the label points at. */
  id: string;
  /** id of the rendered <label>, when there is one and the Field is not a
   * group. A <label for> names only a labelable element, so a control that is
   * not one (a combobox div, say) names itself with aria-labelledby (D84). */
  labelId?: string;
  /** id of the rendered message line, if any — joins aria-describedby. */
  describedBy?: string;
  /** True when the Field carries an error. */
  invalid: boolean;
  /** Mirrors Field's required prop into the control. */
  required: boolean;
}

export const FieldContext = createContext<FieldContextValue | null>(null);

export interface FieldProps extends HTMLAttributes<HTMLElement> {
  /** The control this field labels. */
  children?: ReactNode;
  /** Label content; renders a <label> (or <legend> in group mode). */
  label?: ReactNode;
  /** Helper line under the control; replaced by error when error is set. */
  description?: ReactNode;
  /** Error content; when truthy it replaces the description and switches the
   * field (and a wrapped Input/Select) into error state. */
  error?: ReactNode;
  /** Renders the required marker and flows `required` to the control. @default false */
  required?: boolean;
  /** With `required`, the label shows this text — "(Required)", say — instead
   * of the asterisk, so the requirement is stated in words and not by a glyph
   * alone (D84). Visible and aria-hidden: the control carries the programmatic
   * signal (`required` / `aria-required`), and a screen reader that heard both
   * would say it twice. Without `required` it renders nothing. */
  requiredText?: string;
  /** Group mode: fieldset/legend wrapping several self-labeled controls
   * (Checkbox/Switch); the message describes the whole group. @default false */
  group?: boolean;
  /** Override the generated control id (pair it with the same id on the control). */
  htmlFor?: string;
  /** When false, the message line is not a live region: an application that
   * routes every announcement through one announcer of its own sets this and
   * announces field errors itself. The message still describes the control
   * (aria-describedby). @default true (D81) */
  announce?: boolean;
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement | HTMLFieldSetElement>;
}

/** Labeled form-row wrapper: label above, control, one message line below —
 * description normally, error when set (aria-live unless `announce={false}`).
 * Auto-wires id/aria-describedby/aria-invalid into Input and Select (D49). */
export function Field({
  label,
  description,
  error,
  required = false,
  requiredText,
  group = false,
  htmlFor,
  announce = true,
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
  const labelId = label != null && !group ? `${id}-label` : undefined;

  const cls = [styles.field, invalid && styles.invalid, className].filter(Boolean).join(" ");

  const labelContent =
    label != null ? (
      <>
        {label}
        {required &&
          (requiredText !== undefined ? (
            <span aria-hidden="true" className={styles.requiredText}>
              {" "}
              {requiredText}
            </span>
          ) : (
            <span aria-hidden="true" className={styles.marker}>
              {" *"}
            </span>
          ))}
      </>
    ) : null;

  const body = (
    <>
      {labelContent != null &&
        (group ? (
          <legend className={styles.label}>{labelContent}</legend>
        ) : (
          <label id={labelId} className={styles.label} htmlFor={id}>
            {labelContent}
          </label>
        ))}
      <FieldContext.Provider value={{ id, labelId, describedBy: messageId, invalid, required }}>
        {children}
      </FieldContext.Provider>
      {messageId && (
        <p id={messageId} className={styles.message} aria-live={announce ? "polite" : undefined}>
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
