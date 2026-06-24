import type { SelectHTMLAttributes, Ref } from "react";
import styles from "./select.module.css";

type Size = 24 | 32 | 40 | 48;

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Height in px (24 | 32 | 40 | 48). @default 32 */
  size?: Size;
  /** Show error styling. @default false */
  error?: boolean;
  ref?: Ref<HTMLSelectElement>;
}

const sizeClass: Record<Size, string> = {
  24: styles.size24,
  32: styles.size32,
  40: styles.size40,
  48: styles.size48,
};

export function Select({
  size = 32,
  error = false,
  className,
  ref,
  children,
  ...rest
}: SelectProps) {
  const cls = [
    styles.select,
    sizeClass[size],
    error && styles.error,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <select ref={ref} className={cls} {...rest}>
      {children}
    </select>
  );
}
