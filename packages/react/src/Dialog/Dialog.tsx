import { useEffect, useId, useRef } from "react";
import type { DialogHTMLAttributes, MouseEvent, ReactNode, Ref, SyntheticEvent } from "react";
import { IconButton } from "../IconButton/IconButton.js";
import { IconClose } from "../icons/index.js";
import styles from "./dialog.module.css";

type Width = 400 | 560 | 720;

export interface DialogProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "title" | "onClose" | "open"> {
  /** Controlled open state; syncs to showModal()/close(). */
  open: boolean;
  /** Called on every dismissal attempt with its source; the consumer flips `open`. */
  onClose: (reason: "esc" | "backdrop" | "close-button") => void;
  /** Heading; renders an <h2> wired to aria-labelledby. Without it, pass aria-label. */
  title?: ReactNode;
  /** Action row (Buttons — one accent per group, danger for destructive). */
  footer?: ReactNode;
  /** Panel width in px (400 | 560 | 720). @default 560 */
  width?: Width;
  /** false = no close button, Esc and backdrop swallowed — footer is the only exit. @default true */
  dismissible?: boolean;
  /** Forwarded ref to the underlying <dialog> element. */
  ref?: Ref<HTMLDialogElement>;
}

const widthClass: Record<Width, string> = {
  400: styles.w400,
  560: styles.w560,
  720: styles.w720,
};

/** Modal dialog on the native <dialog> top layer: focus trap, aria-modal and
 * focus restore come from the platform; title/footer slots, Esc/backdrop/
 * close-button dismissal via onClose(reason) (D50). */
export function Dialog({
  open,
  onClose,
  title,
  footer,
  width = 560,
  dismissible = true,
  className,
  children,
  ref,
  ...rest
}: DialogProps) {
  const innerRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  const setRef = (node: HTMLDialogElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleCancel = (e: SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault(); // stay controlled — only onClose may flip `open`
    if (dismissible) onClose("esc");
  };

  const handleClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (dismissible && e.target === innerRef.current) onClose("backdrop");
  };

  const cls = [styles.dialog, widthClass[width], className].filter(Boolean).join(" ");

  return (
    <dialog
      ref={setRef}
      className={cls}
      aria-labelledby={title != null ? titleId : undefined}
      onCancel={handleCancel}
      onClick={handleClick}
      {...rest}
    >
      <div className={styles.panel}>
        {(title != null || dismissible) && (
          <div className={styles.header}>
            {title != null && (
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
            )}
            {dismissible && (
              <IconButton
                variant="ghost"
                size={32}
                aria-label="Close dialog"
                onClick={() => onClose("close-button")}
              >
                <IconClose aria-hidden="true" />
              </IconButton>
            )}
          </div>
        )}
        {children}
        {footer != null && <div className={styles.footer}>{footer}</div>}
      </div>
    </dialog>
  );
}
