import type { HTMLAttributes, Ref } from "react";
import styles from "./tag.module.css";

type Variant = "neutral" | "accent" | "success" | "warning" | "danger";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  /** Label content. */
  children?: React.ReactNode;
  /** Semantic color variant. @default "neutral" */
  variant?: Variant;
  /** Use tinted background with semantic foreground. @default false */
  subtle?: boolean;
  /** When provided, renders a dismiss button that calls this handler. */
  onDismiss?: () => void;
  /** Forwarded ref to the underlying `<span>` element. */
  ref?: Ref<HTMLSpanElement>;
}

const variantClass: Record<Variant, string> = {
  neutral: styles.neutral,
  accent: styles.accent,
  success: styles.success,
  warning: styles.warning,
  danger: styles.danger,
};

const subtleVariantClass: Record<Variant, string> = {
  neutral: styles.neutralSubtle,
  accent: styles.accentSubtle,
  success: styles.successSubtle,
  warning: styles.warningSubtle,
  danger: styles.dangerSubtle,
};

/** Compact label for status or category; semantic variants, optional subtle
 * tint and dismiss button. */
export function Tag({
  variant = "neutral",
  subtle = false,
  onDismiss,
  className,
  children,
  ref,
  ...rest
}: TagProps) {
  const variantMap = subtle ? subtleVariantClass : variantClass;
  const cls = [styles.tag, variantMap[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <span ref={ref} className={cls} {...rest}>
      {children}
      {onDismiss && (
        <button
          type="button"
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </span>
  );
}
