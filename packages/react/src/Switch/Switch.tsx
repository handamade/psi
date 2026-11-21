import type { InputHTMLAttributes, Ref } from "react";
import { useFieldWiring } from "../Field/useFieldWiring.js";
import styles from "./switch.module.css";

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role" | "placeholder"> {
  /** Label text. */
  children?: React.ReactNode;
  /** Forwarded ref to the underlying `<input type="checkbox" role="switch">` element. */
  ref?: Ref<HTMLInputElement>;
}

/** On/off toggle (`role="switch"`) with a built-in label; for settings that
 * take effect immediately. It reads a Field as Checkbox does (D135): in a
 * Field the Field's id, message, aria-invalid and required, winning over the
 * caller's; in a group Field aria-invalid only. It draws no error state of
 * its own: the Field's message line shows the error. */
export function Switch({
  children,
  className,
  disabled,
  ref,
  ...rest
}: SwitchProps) {
  const wiring = useFieldWiring("Switch", rest, { choice: true });
  const cls = [styles.label, disabled && styles.disabled, className]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={cls}>
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        className={`psi-sr-only ${styles.input}`}
        disabled={disabled}
        {...rest}
        {...wiring}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      {children && <span className={styles.text}>{children}</span>}
    </label>
  );
}
