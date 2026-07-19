import type { InputHTMLAttributes, Ref } from "react";
import styles from "./checkbox.module.css";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Label text. */
  children?: React.ReactNode;
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
