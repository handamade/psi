import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  MouseEventHandler,
  Ref,
} from "react";
import styles from "./button.module.css";

type Variant =
  | "accent"
  | "accent-subtle"
  | "neutral"
  | "neutral-subtle"
  | "ghost"
  | "danger"
  | "danger-subtle"
  | "outline";

type Size = 24 | 32 | 40 | 48;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant. @default "neutral" */
  variant?: Variant;
  /** Height in px (24 | 32 | 40 | 48). @default 32 */
  size?: Size;
  /** Render as an anchor with this href (D33). disabled → aria-disabled,
   * no href attribute, pointer-events: none. */
  href?: string;
  /** Anchor target; only used with href. */
  target?: string;
  /** Anchor rel; only used with href. */
  rel?: string;
  /** Forwarded ref to the underlying element. */
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement>;
}

const variantClass: Record<Variant, string> = {
  accent: styles.accent,
  "accent-subtle": styles.accentSubtle,
  neutral: styles.neutral,
  "neutral-subtle": styles.neutralSubtle,
  ghost: styles.ghost,
  danger: styles.danger,
  "danger-subtle": styles.dangerSubtle,
  outline: styles.outline,
};

const sizeClass: Record<Size, string> = {
  24: styles.size24,
  32: styles.size32,
  40: styles.size40,
  48: styles.size48,
};

/** Action trigger. With `href` renders an anchor with identical styling (D33);
 * `disabled` then maps to `aria-disabled`. */
export function Button({
  variant = "neutral",
  size = 32,
  href,
  target,
  rel,
  disabled,
  className,
  onClick,
  ref,
  ...rest
}: ButtonProps) {
  const cls = [
    styles.button,
    variantClass[variant],
    sizeClass[size],
    href !== undefined && disabled ? styles.disabled : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href !== undefined) {
    return (
      <a
        ref={ref as Ref<HTMLAnchorElement>}
        className={cls}
        href={disabled ? undefined : href}
        target={target}
        rel={rel}
        aria-disabled={disabled || undefined}
        // CSS `pointer-events: none` (see .button.disabled) suppresses
        // pointer-triggered activation in real browsers; this guard also
        // blocks keyboard/synthetic dispatch of the click handler itself.
        onClick={
          disabled
            ? undefined
            : (onClick as unknown as MouseEventHandler<HTMLAnchorElement>)
        }
        {...(rest as unknown as AnchorHTMLAttributes<HTMLAnchorElement>)}
      />
    );
  }

  return (
    <button
      ref={ref as Ref<HTMLButtonElement>}
      className={cls}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    />
  );
}
