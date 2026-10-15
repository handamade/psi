import { useEffect, useId, useRef } from "react";
import type { DialogHTMLAttributes, MouseEvent, ReactNode, Ref, RefObject, SyntheticEvent } from "react";
import { Button } from "../Button/Button.js";
import { IconButton } from "../IconButton/IconButton.js";
import { IconClose } from "../icons/index.js";
import styles from "./dialog.module.css";

type Width = 400 | 560 | 720;

/** Where the panel sits. `inline-*` pin it full-height to that edge — that is
 * a drawer / side sheet, and D66 is the decision that it is a placement rather
 * than a sibling component. Logical, not `left`/`right`, so RTL flips without a
 * second code path. */
export type DialogPlacement = "center" | "inline-start" | "inline-end";

export interface DialogProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "title" | "onClose" | "open"> {
  /** Body content, between the title and footer slots. */
  children?: ReactNode;
  /** Controlled open state; syncs to showModal()/close(). */
  open: boolean;
  /** Called on every dismissal attempt with its source; the consumer flips `open`. */
  onClose: (reason: "esc" | "backdrop" | "close-button") => void;
  /** Heading; renders an <h2> wired to aria-labelledby. Without it, pass aria-label. */
  title?: ReactNode;
  /** Action row (Buttons — one accent per group, danger for destructive). */
  footer?: ReactNode;
  /** Panel width in px (400 | 560 | 720). For an `inline-*` placement this is
   * the drawer's width; the height is always the full viewport. @default 560 */
  width?: Width;
  /** Where the panel sits. `inline-start` / `inline-end` pin it full-height to
   * that edge, making it a drawer (D66). @default "center" */
  placement?: DialogPlacement;
  /** false = no close button, Esc and backdrop swallowed — footer is the only exit.
   * `closeOnEscape` can give Escape back on its own (D101). @default true */
  dismissible?: boolean;
  /** Whether Escape reports onClose("esc"), separately from the close button
   * and the backdrop (D101). A consequential confirmation is
   * `dismissible={false} closeOnEscape`: no close button, no backdrop
   * dismissal, and Escape cancels. @default dismissible */
  closeOnEscape?: boolean;
  /** The element to focus each time the dialog opens, after the platform's own
   * focusing (D101), e.g. a ref to the footer's Cancel button. Without it, the
   * platform focuses the first focusable control, as before. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Visible text for the close button (D101). When set, the close button is a
   * ghost Button with this text instead of the icon-only "Close dialog"
   * button. */
  closeLabel?: string;
  /** Forwarded ref to the underlying <dialog> element. */
  ref?: Ref<HTMLDialogElement>;
}

const widthClass: Record<Width, string> = {
  400: styles.w400,
  560: styles.w560,
  720: styles.w720,
};

const placementClass: Record<DialogPlacement, string> = {
  center: styles.center,
  "inline-start": styles.inlineStart,
  "inline-end": styles.inlineEnd,
};

/** Modal dialog on the native <dialog> top layer: focus trap, aria-modal and
 * focus restore come from the platform; title/footer slots, Esc/backdrop/
 * close-button dismissal via onClose(reason) (D50).
 *
 * `placement` moves the panel and nothing else (D66): an `inline-start` /
 * `inline-end` Dialog is a drawer, pinned full-height to that edge, with the
 * same modality, focus trap, focus restore and dismissal reasons as a centered
 * one. There is deliberately no separate Drawer component — a sibling would
 * have to duplicate or wrap all of that. */
export function Dialog({
  open,
  onClose,
  title,
  footer,
  width = 560,
  placement = "center",
  dismissible = true,
  closeOnEscape,
  initialFocus,
  closeLabel,
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
    if (open && !el.open) {
      el.showModal();
      // D101: after the platform has focused its first control, so this wins.
      initialFocus?.current?.focus();
    } else if (!open && el.open) el.close();
    // Deliberately keyed on `open` alone: initialFocus is a ref, read once per
    // open, so a new ref object on a re-render never refocuses an open dialog.
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
    if (closeOnEscape ?? dismissible) onClose("esc");
  };

  const handleClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (dismissible && e.target === innerRef.current) onClose("backdrop");
  };

  const cls = [styles.dialog, widthClass[width], placementClass[placement], className]
    .filter(Boolean)
    .join(" ");

  return (
    <dialog
      ref={setRef}
      className={cls}
      data-placement={placement}
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
            {dismissible &&
              (closeLabel != null ? (
                <Button variant="ghost" size={32} onClick={() => onClose("close-button")}>
                  {closeLabel}
                </Button>
              ) : (
                <IconButton
                  variant="ghost"
                  size={32}
                  aria-label="Close dialog"
                  onClick={() => onClose("close-button")}
                >
                  <IconClose aria-hidden="true" />
                </IconButton>
              ))}
          </div>
        )}
        {children}
        {footer != null && <div className={styles.footer}>{footer}</div>}
      </div>
    </dialog>
  );
}
