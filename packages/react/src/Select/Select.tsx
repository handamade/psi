import { useContext } from "react";
import type { SelectHTMLAttributes, Ref, ReactNode } from "react";
import { FieldContext } from "../Field/Field.js";
import { useFieldWiring } from "../Field/useFieldWiring.js";
import styles from "./select.module.css";

type Size = 24 | 32 | 40 | 48;

/**
 * Props for the native `<select>` wrapper. `multiple` is not accepted (D130):
 * a native multi-select is a fixed-height listbox that can't grow, and Psi's
 * `size` is a height, not a row count. Pick several values with `Combobox
 * multiple`; `Select` is for one value from a short fixed list.
 */
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "multiple"> {
  /** The <option> elements. */
  children?: ReactNode;
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
 * One value from a short fixed list; for a list long enough to search, or
 * several values, use Combobox (D130).
 * Inside a Field, id/aria-describedby/aria-invalid/required are wired
 * automatically (D49), and the Field's win over the caller's (D135): set a
 * known id with the Field's `htmlFor`. */
export function Select({
  size = 32,
  error = false,
  className,
  ref,
  children,
  ...rest
}: SelectProps) {
  const field = useContext(FieldContext);
  const wiring = useFieldWiring("Select", rest);
  const invalid = error || (field?.invalid ?? false);

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
      {...rest}
      {...wiring}
    >
      {children}
    </select>
  );
}
