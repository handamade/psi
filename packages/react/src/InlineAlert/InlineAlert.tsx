import type { HTMLAttributes, ReactNode, Ref } from "react";
import { resolveStatusPrefix, statusIcons } from "../Toast/status.js";
import type { StatusVariant } from "../Toast/status.js";
import styles from "./inline-alert.module.css";

/** InlineAlert's variants are the shared status axis (see Toast/status.ts). */
export type InlineAlertVariant = StatusVariant;

export interface InlineAlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Status variant. @default "neutral" */
  variant?: InlineAlertVariant;
  /** A short heading, rendered before the body in the medium weight. */
  title?: ReactNode;
  /** The message. */
  children: ReactNode;
  /** Trailing affordance — a ghost Button (Review, Retry, Learn more). */
  action?: ReactNode;
  /** The visually hidden status word (D83). A string replaces the default
   * ("Success:", "Warning:", "Error:") — pass the translated word; `null`
   * drops it. Unset keeps the default, and `neutral` has none. */
  statusLabel?: string | null;
  className?: string;
  /** Forwarded ref to the underlying `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

const variantIconClass: Record<InlineAlertVariant, string> = {
  neutral: styles.iconNeutral,
  success: styles.iconSuccess,
  warning: styles.iconWarning,
  danger: styles.iconDanger,
};

/** Not `role="alert"`, despite its name. It is not a live region: it renders
 * no `role` and no `aria-live`, so mounting one announces nothing, and
 * announcing stays the application's — route the same event through a
 * `ToastRegion` or an `Announcement` if it must be spoken.
 *
 * A status message that sits inside content (D86): above a form, in a panel.
 * A tinted surface with a 1px border in the variant's colour and a radius; it
 * fills the width of its container rather than setting its own. Presentational
 * and stateless, with no dismiss button. For a page-wide strip, use `Banner`. */
export function InlineAlert({
  variant = "neutral",
  title,
  children,
  action,
  statusLabel,
  className,
  ref,
  ...rest
}: InlineAlertProps) {
  const Icon = statusIcons[variant];
  const prefix = resolveStatusPrefix(variant, statusLabel);
  const cls = [styles.inlineAlert, className].filter(Boolean).join(" ");

  return (
    <div {...rest} ref={ref} className={cls} data-variant={variant} data-psi-inline-alert>
      <span className={[styles.icon, variantIconClass[variant]].join(" ")}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className={styles.body}>
        {prefix && <span className="psi-sr-only">{prefix}</span>}
        {title != null && <strong className={styles.title}>{title}</strong>}
        {children}
      </div>
      {action != null && <div className={styles.action}>{action}</div>}
    </div>
  );
}
