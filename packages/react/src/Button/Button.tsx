import type { ButtonHTMLAttributes, Ref } from "react";
import styles from "./button.module.css";

type Variant =
  | "accent"
  | "accent-subtle"
  | "neutral"
  | "neutral-subtle"
  | "ghost"
  | "danger"
  | "danger-subtle";

type Size = 24 | 32 | 40 | 48;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant. @default "neutral" */
  variant?: Variant;
  /** Height in px (24 | 32 | 40 | 48). @default 32 */
  size?: Size;
  /** Forwarded ref to the underlying `<button>` element. */
  ref?: Ref<HTMLButtonElement>;
}

const variantClass: Record<Variant, string> = {
  accent: styles.accent,
  "accent-subtle": styles.accentSubtle,
  neutral: styles.neutral,
  "neutral-subtle": styles.neutralSubtle,
  ghost: styles.ghost,
  danger: styles.danger,
  "danger-subtle": styles.dangerSubtle,
};

const sizeClass: Record<Size, string> = {
  24: styles.size24,
  32: styles.size32,
  40: styles.size40,
  48: styles.size48,
};

export function Button({
  variant = "neutral",
  size = 32,
  className,
  ref,
  ...rest
}: ButtonProps) {
  const cls = [
    styles.button,
    variantClass[variant],
    sizeClass[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button ref={ref} className={cls} {...rest} />;
}
