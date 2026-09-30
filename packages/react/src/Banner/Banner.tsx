import type { HTMLAttributes, ReactNode, Ref } from "react";
import { IconButton } from "../IconButton/IconButton.js";
import { IconClose } from "../icons/index.js";
import { resolveStatusPrefix, statusIcons } from "../Toast/status.js";
import type { StatusVariant } from "../Toast/status.js";
import styles from "./banner.module.css";

/** Banner's variants are the shared status axis (see Toast/status.ts). */
export type BannerVariant = StatusVariant;

export interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Status variant. @default "neutral" */
  variant?: BannerVariant;
  /** A short heading, rendered before the body in the medium weight. */
  title?: ReactNode;
  /** The message. */
  children: ReactNode;
  /** Trailing affordance — a ghost Button (Review, Retry, Learn more). */
  action?: ReactNode;
  /** When provided, renders the dismiss button and calls this. Banner does not
   * remove itself; the owner disposes. */
  onDismiss?: () => void;
  /** The visually hidden status word (D83). A string replaces the default
   * ("Success:", "Warning:", "Error:") — pass the translated word; `null`
   * drops it. Unset keeps the default, and `neutral` has none. */
  statusLabel?: string | null;
  className?: string;
  /** Forwarded ref to the underlying `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

const variantIconClass: Record<BannerVariant, string> = {
  neutral: styles.iconNeutral,
  success: styles.iconSuccess,
  warning: styles.iconWarning,
  danger: styles.iconDanger,
};

/** A full-width, page-level status message (D86). It is not a live region:
 * it renders no `role` and no `aria-live`, so mounting one announces nothing,
 * and announcing stays the application's — route the same event through a
 * `ToastRegion` or an `Announcement` if it must be spoken.
 *
 * Controlled and presentational: it holds no state and never removes itself;
 * `onDismiss` reports and the owner disposes. A tinted strip with no radius
 * and no border, it is meant to span the page edge to edge, above the
 * content. For the same message inside content, use `InlineAlert`. */
export function Banner({
  variant = "neutral",
  title,
  children,
  action,
  onDismiss,
  statusLabel,
  className,
  ref,
  ...rest
}: BannerProps) {
  const Icon = statusIcons[variant];
  const prefix = resolveStatusPrefix(variant, statusLabel);
  const cls = [styles.banner, className].filter(Boolean).join(" ");

  return (
    <div {...rest} ref={ref} className={cls} data-variant={variant} data-psi-banner>
      <span className={[styles.icon, variantIconClass[variant]].join(" ")}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className={styles.body}>
        {prefix && <span className="psi-sr-only">{prefix}</span>}
        {title != null && <strong className={styles.title}>{title}</strong>}
        {children}
      </div>
      {action != null && <div className={styles.action}>{action}</div>}
      {onDismiss && (
        <IconButton variant="ghost" size={32} aria-label="Dismiss" onClick={onDismiss}>
          <IconClose aria-hidden="true" />
        </IconButton>
      )}
    </div>
  );
}
