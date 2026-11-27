import { useEffect, useId, useLayoutEffect, useRef } from "react";
import type { DialogHTMLAttributes, MouseEvent, ReactNode, Ref, RefObject, SyntheticEvent } from "react";
import { Button } from "../Button/Button.js";
import { IconButton } from "../IconButton/IconButton.js";
import { IconClose } from "../icons/index.js";
import { createFocusReturnEvent, isFocusLost, useLatestRef } from "../internal/focus/focusReturn.js";
import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";
import styles from "./dialog.module.css";

type Width = 400 | 560 | 720;

/** Where the panel sits. `inline-*` pin it full-height to that edge — that is
 * a drawer / side sheet, and D66 is the decision that it is a placement rather
 * than a sibling component. Logical, not `left`/`right`, so RTL flips without a
 * second code path. */
export type DialogPlacement = "center" | "inline-start" | "inline-end";

/** Why Dialog hands focus back (D147): a controlled close, or removal while open (D136). */
export type DialogFocusReturnReason = "close" | "unmount";

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
  /** Called after the dialog closes while focus is inside it (D147), once the
   * platform has returned focus to the opener: `event.target` is the element
   * now focused. Focus your own element in the handler to take over.
   * `preventDefault()` has no effect here, because the platform's restore in
   * `close()` cannot be stopped. `reason` is `"close"` for `open={false}` and
   * `"unmount"` for a dialog removed while open (D136). See the Focus guide. */
  onFocusReturn?: (event: FocusReturnEvent<DialogFocusReturnReason>) => void;
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

/** D147: close, then report the platform's restore. The platform focuses the
 * opener inside close(), and a handler run before it could not focus outside
 * the still-open modal, so the event comes after. */
function closeAndReport(
  el: HTMLDialogElement,
  reason: DialogFocusReturnReason,
  onFocusReturn: ((event: FocusReturnEvent<DialogFocusReturnReason>) => void) | undefined,
) {
  const held = isFocusLost(el, { includeNowhere: false });
  el.close();
  if (!held || !onFocusReturn) return;
  const doc = el.ownerDocument;
  const active = doc.activeElement;
  const target =
    active instanceof HTMLElement && active !== doc.body && active !== doc.documentElement ? active : null;
  onFocusReturn(createFocusReturnEvent(target, reason));
}

/** Modal dialog on the native <dialog> top layer: focus trap, aria-modal and
 * focus restore come from the platform; title/footer slots, Esc/backdrop/
 * close-button dismissal via onClose(reason) (D50).
 *
 * Focus returns to the opener whether the dialog closes (`open={false}`) or is
 * removed while open (`{open && <Dialog open />}`): unmounting closes it first
 * (D136). `onFocusReturn` reports that return after it happens, with reason
 * `"close"` or `"unmount"`. Focusing another element in the handler takes
 * over (D147).
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
  onFocusReturn,
  closeLabel,
  className,
  children,
  ref,
  ...rest
}: DialogProps) {
  const innerRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const onFocusReturnRef = useLatestRef(onFocusReturn);

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
    } else if (!open && el.open) closeAndReport(el, "close", onFocusReturnRef.current);
    // Deliberately keyed on `open` alone: initialFocus is a ref, read once per
    // open, so a new ref object on a re-render never refocuses an open dialog.
  }, [open]);

  // D136: the platform returns focus to the opener on close(), and only on
  // close(). A dialog removed while open — `{open && <Dialog open />}` removes
  // on every dismissal — would leave focus on <body>. React runs a component's
  // layout cleanups before it removes the component's host nodes, so this
  // close() reaches a dialog that is still connected, and the platform's own
  // restore runs, exactly as on the controlled close. Nothing is reported
  // through onClose: the consumer removed it.
  useLayoutEffect(() => {
    const el = innerRef.current;
    return () => {
      if (el?.open) closeAndReport(el, "unmount", onFocusReturnRef.current);
    };
  }, []);

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
