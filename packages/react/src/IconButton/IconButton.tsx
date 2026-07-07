import type { ButtonHTMLAttributes, Ref } from "react";
import styles from "./icon-button.module.css";

type Variant = "accent" | "neutral" | "ghost" | "danger";
type Size = 24 | 32 | 40 | 48;

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant. @default "neutral" */
  variant?: Variant;
  /** Square size in px (24 | 32 | 40 | 48). @default 32 */
  size?: Size;
  /** Forwarded ref to the underlying `<button>` element. */
  ref?: Ref<HTMLButtonElement>;
}

const variantClass: Record<Variant, string> = {
  accent: styles.accent,
  neutral: styles.neutral,
  ghost: styles.ghost,
  danger: styles.danger,
};

const sizeClass: Record<Size, string> = {
  24: styles.size24,
  32: styles.size32,
  40: styles.size40,
  48: styles.size48,
};

export function IconButton({
  variant = "neutral",
  size = 32,
  className,
  ref,
  ...rest
}: IconButtonProps) {
  const cls = [
    styles.iconButton,
    variantClass[variant],
    sizeClass[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <button ref={ref} className={cls} {...rest} />;
}
