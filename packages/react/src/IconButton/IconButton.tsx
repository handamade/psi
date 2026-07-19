import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  MouseEventHandler,
  Ref,
} from "react";
import styles from "./icon-button.module.css";

type Variant = "accent" | "neutral" | "ghost" | "danger";
type Size = 24 | 32 | 40 | 48;

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant. @default "neutral" */
  variant?: Variant;
  /** Square size in px (24 | 32 | 40 | 48). @default 32 */
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

/** Square icon-only button; same variant/size/href contract as Button.
 * Give it an accessible name (`aria-label`). */
export function IconButton({
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
}: IconButtonProps) {
  const cls = [
    styles.iconButton,
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
        // CSS `pointer-events: none` (see .iconButton.disabled) suppresses
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
