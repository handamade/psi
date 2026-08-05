import { useContext } from "react";
import type { InputHTMLAttributes, Ref } from "react";
import { FieldContext } from "../Field/Field.js";
import styles from "./input.module.css";

type Size = 24 | 32 | 40 | 48;

/** Input types Psi's Input supports. Deliberately narrower than the native
 * `HTMLInputTypeAttribute`: checkbox/radio/file/submit are separate controls
 * (Checkbox, Switch, Button), not variants of a text field (D60). */
export type InputType =
  | "text"
  | "search"
  | "email"
  | "tel"
  | "url"
  | "password"
  | "number"
  | "date";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Input type. @default "text" */
  type?: InputType;
  /** Height in px (24 | 32 | 40 | 48). @default 32 */
  size?: Size;
  /** Show error styling. Inside a Field, the Field's error also lights this. @default false */
  error?: boolean;
  /** Forwarded ref to the underlying `<input>` element. */
  ref?: Ref<HTMLInputElement>;
}

const sizeClass: Record<Size, string> = {
  24: styles.size24,
  32: styles.size32,
  40: styles.size40,
  48: styles.size48,
};

/** Single-line text input with pixel-true heights (24–48) and an error state.
 * Inside a Field, id/aria-describedby/aria-invalid/required are wired
 * automatically (D49). */
export function Input({ size = 32, error = false, type = "text", className, ref, ...rest }: InputProps) {
  const field = useContext(FieldContext);
  const invalid = error || (field?.invalid ?? false);
  const describedBy =
    [field?.describedBy, rest["aria-describedby"]].filter(Boolean).join(" ") || undefined;

  const cls = [styles.input, sizeClass[size], invalid && styles.error, className]
    .filter(Boolean)
    .join(" ");

  return (
    <input
      ref={ref}
      className={cls}
      id={rest.id ?? field?.id}
      required={rest.required ?? (field?.required || undefined)}
      aria-invalid={field?.invalid || undefined}
      type={type}
      {...rest}
      aria-describedby={describedBy}
    />
  );
}
