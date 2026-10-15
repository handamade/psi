import { useContext } from "react";
import type { ReactNode, Ref } from "react";
import { RadioGroupContext } from "./RadioGroup.js";
import styles from "./radio-group.module.css";

export interface RadioProps {
  /** The value this radio selects. */
  value: string;
  /** Label text. */
  children?: ReactNode;
  /** Disables this radio; a disabled RadioGroup disables all of them. */
  disabled?: boolean;
  className?: string;
  /** Forwarded ref to the underlying `<input type="radio">` element. */
  ref?: Ref<HTMLInputElement>;
}

/** One choice in a RadioGroup (D104): a native radio with a built-in label,
 * drawn like Checkbox on a circle. Takes its name, checked state, required
 * and aria-invalid from the group. */
export function Radio({ value, children, disabled, className, ref }: RadioProps) {
  const group = useContext(RadioGroupContext);
  const isDisabled = disabled || group?.disabled || false;
  const cls = [styles.label, isDisabled && styles.disabled, className].filter(Boolean).join(" ");

  return (
    <label className={cls}>
      <input
        ref={ref}
        type="radio"
        className={`psi-sr-only ${styles.input}`}
        name={group?.name}
        value={value}
        checked={group ? group.value === value : undefined}
        onChange={() => group?.select(value)}
        disabled={isDisabled}
        required={group?.required || undefined}
        aria-invalid={group?.invalid || undefined}
      />
      <span className={styles.circle} aria-hidden="true" />
      {children && <span className={styles.text}>{children}</span>}
    </label>
  );
}
