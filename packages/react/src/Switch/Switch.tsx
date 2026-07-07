import type { InputHTMLAttributes, Ref } from "react";
import styles from "./switch.module.css";

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> {
  /** Label text. */
  children?: React.ReactNode;
  /** Forwarded ref to the underlying `<input type="checkbox" role="switch">` element. */
  ref?: Ref<HTMLInputElement>;
}

export function Switch({
  children,
  className,
  disabled,
  ref,
  ...rest
}: SwitchProps) {
  const cls = [styles.label, disabled && styles.disabled, className]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={cls}>
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        className={styles.input}
        disabled={disabled}
        {...rest}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      {children && <span className={styles.text}>{children}</span>}
    </label>
  );
}
