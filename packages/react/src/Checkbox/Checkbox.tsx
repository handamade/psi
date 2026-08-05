import type { InputHTMLAttributes, Ref } from "react";
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
  /** Forwarded ref to the underlying `<input type="checkbox">` element. */
  ref?: Ref<HTMLInputElement>;
}

/** Native checkbox with a built-in label; for independent binary choices. */
export function Checkbox({
  children,
  className,
  disabled,
  ref,
  ...rest
}: CheckboxProps) {
  const cls = [styles.label, disabled && styles.disabled, className]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={cls}>
      <input
        ref={ref}
        type="checkbox"
        className={styles.input}
        disabled={disabled}
        {...rest}
      />
      <span className={styles.indicator} aria-hidden="true" />
      {children && <span className={styles.text}>{children}</span>}
    </label>
  );
}
