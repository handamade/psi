import type { ReactNode, Ref } from "react";
import { IconButton } from "../IconButton/IconButton.js";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconClose,
  IconInfo,
} from "../icons/index.js";
import styles from "./toast.module.css";

export type ToastVariant = "neutral" | "success" | "warning" | "danger";

/** Which of ToastRegion's two live wrappers speaks a child (D83). */
export type ToastPoliteness = "polite" | "assertive";

export interface ToastProps {
  /** Status variant. @default "neutral" */
  variant?: ToastVariant;
  /** The message. */
  children: ReactNode;
  /** Trailing affordance — a ghost Button (Undo, Retry, View). */
  action?: ReactNode;
  /** When provided, renders the dismiss button and calls this. Toast does not
   * remove itself; the owner disposes. */
  onDismiss?: () => void;
  /** Which live wrapper ToastRegion routes this toast into (D83). Unset, the
   * variant decides: neutral and success are polite, warning and danger
   * assertive. Set it when the kind of event, not its tone, decides — the
   * outcome of the user's own action may interrupt even when it succeeded. */
  politeness?: ToastPoliteness;
  /** The visually hidden status word (D83). A string replaces the default
   * ("Success:", "Warning:", "Error:") — pass the translated word; `null`
   * drops it. Unset keeps the default, and `neutral` has none. */
  statusLabel?: string | null;
  className?: string;
  /** Forwarded ref to the underlying `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

const icons: Record<ToastVariant, typeof IconInfo> = {
  neutral: IconInfo,
  success: IconCheck,
  warning: IconAlertTriangle,
  danger: IconAlertCircle,
};

/** Visually hidden status word, so the variant's meaning never rests on colour
 * and shape alone. `neutral` carries no status, so it gets no prefix. */
const statusPrefix: Record<ToastVariant, string | null> = {
  neutral: null,
  success: "Success:",
  warning: "Warning:",
  danger: "Error:",
};

const variantIconClass: Record<ToastVariant, string> = {
  neutral: styles.iconNeutral,
  success: styles.iconSuccess,
  warning: styles.iconWarning,
  danger: styles.iconDanger,
};

/** A single transient notification card (D64). Controlled and presentational:
 * it holds no state, runs no timer, and never removes itself — `onDismiss`
 * reports and the owner disposes, exactly as Dialog (D50) and Menu (D53) do.
 *
 * Toast does not carry its own `role`/`aria-live`. Politeness belongs to the
 * two persistent wrappers inside ToastRegion, because a live region must
 * pre-exist the content it announces; a role on the toast itself would
 * reintroduce the mount-with-content problem one level down.
 * `politeness` (D83) only tells the region which wrapper to use.
 *
 * Composed by hand with ToastRegion for full control, or driven by
 * ToastProvider's queue. */
export function Toast({
  variant = "neutral",
  children,
  action,
  onDismiss,
  statusLabel,
  className,
  ref,
}: ToastProps) {
  const Icon = icons[variant];
  // `politeness` is deliberately not read here: ToastRegion reads it off the
  // element to pick a wrapper, the same way it reads `variant`.
  const prefix = statusLabel === undefined ? statusPrefix[variant] : statusLabel;
  const cls = [styles.toast, className].filter(Boolean).join(" ");

  return (
    <div ref={ref} className={cls} data-variant={variant} data-psi-toast>
      <span className={[styles.icon, variantIconClass[variant]].join(" ")}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className={styles.body}>
        {prefix && <span className="psi-sr-only">{prefix}</span>}
        {children}
      </div>
      {action != null && <div className={styles.action}>{action}</div>}
      {onDismiss && (
        <IconButton
          variant="ghost"
          size={32}
          aria-label="Dismiss notification"
          onClick={onDismiss}
        >
          <IconClose aria-hidden="true" />
        </IconButton>
      )}
    </div>
  );
}
