import type { InputHTMLAttributes, Ref } from "react";
import styles from "./input.module.css";

type Size = 24 | 32 | 40 | 48;

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Height in px (24 | 32 | 40 | 48). @default 32 */
  size?: Size;
  /** Show error styling. @default false */
  error?: boolean;
  ref?: Ref<HTMLInputElement>;
}

const sizeClass: Record<Size, string> = {
  24: styles.size24,
  32: styles.size32,
  40: styles.size40,
  48: styles.size48,
};

export function Input({
  size = 32,
  error = false,
  className,
  ref,
  ...rest
}: InputProps) {
  const cls = [
    styles.input,
    sizeClass[size],
    error && styles.error,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <input ref={ref} className={cls} {...rest} />;
}
