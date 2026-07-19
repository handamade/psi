import { useContext } from "react";
import type { SelectHTMLAttributes, Ref } from "react";
import { FieldContext } from "../Field/Field.js";
import styles from "./select.module.css";

type Size = 24 | 32 | 40 | 48;

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Height in px (24 | 32 | 40 | 48). Replaces the native `size` attribute
   * (which sets the visible option-row count on a listbox-style `<select>`)
   * with the design system's control height in pixels.
   * @default 32
   */
  size?: Size;
  /** Show error styling. Inside a Field, the Field's error also lights this. @default false */
  error?: boolean;
  /** Forwarded ref to the underlying `<select>` element. */
  ref?: Ref<HTMLSelectElement>;
}

const sizeClass: Record<Size, string> = {
  24: styles.size24,
  32: styles.size32,
  40: styles.size40,
  48: styles.size48,
};

/** Styled native `<select>` with pixel-true heights (24–48) and an error state.
 * Inside a Field, id/aria-describedby/aria-invalid/required are wired
 * automatically (D49). */
export function Select({
  size = 32,
  error = false,
  className,
  ref,
  children,
  ...rest
}: SelectProps) {
  const field = useContext(FieldContext);
  const invalid = error || (field?.invalid ?? false);
  const describedBy =
    [field?.describedBy, rest["aria-describedby"]].filter(Boolean).join(" ") || undefined;

  const cls = [
    styles.select,
    sizeClass[size],
    invalid && styles.error,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <select
      ref={ref}
      className={cls}
      id={rest.id ?? field?.id}
      required={rest.required ?? (field?.required || undefined)}
      aria-invalid={field?.invalid || undefined}
      {...rest}
      aria-describedby={describedBy}
    >
      {children}
    </select>
  );
}
