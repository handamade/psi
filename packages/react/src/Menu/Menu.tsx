import { createContext, useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode, Ref } from "react";
import styles from "./menu.module.css";

export type Placement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

export interface MenuContextValue {
  close: (reason: "item-select") => void;
}

export const MenuContext = createContext<MenuContextValue>({ close: () => {} });

export interface MenuProps {
  /** Controlled open state; syncs to showPopover()/hidePopover(). */
  open: boolean;
  /** Called once per dismissal with its source; the consumer flips `open`. */
  onClose: (reason: "esc" | "outside" | "item-select") => void;
  /** Rendered by Menu, which owns its trigger wrapper and aria-haspopup wiring. */
  trigger: ReactNode;
  /** Placement relative to the trigger. @default "bottom-start" */
  placement?: Placement;
  /** Accessible name for the menu when there is no visible label. */
  "aria-label"?: string;
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the popover element. */
  ref?: Ref<HTMLDivElement>;
}

function isPopoverOpen(el: HTMLElement): boolean {
  return el.hasAttribute("data-open") || el.matches(":popover-open");
}

/** Action menu on the native Popover API top layer: top layer, light dismiss
 * and Esc come from the platform; roving keyboard, placement and dismissal
 * reasons are Psi's (D53). Controlled-only, like Dialog (D50).
 *
 * `toggle` fires on every popover state change — ours (Esc, item-select) and
 * the platform's (outside click) alike — so it is the single place onClose
 * is called from. Esc and item-select never call onClose directly: they
 * attribute a reason via `reasonRef` and ask the popover to hide, and the
 * `toggle` that hide raises is what actually reports the dismissal. That
 * keeps a dismissal reported exactly once even after the consumer's `open`
 * prop comes back around and the sync effect below re-observes it — by then
 * the popover is already closed, so the effect is a no-op instead of a second
 * hidePopover() call that would otherwise raise a second, unattributed
 * "outside" toggle for the same dismissal. */
export function Menu({
  open,
  onClose,
  trigger,
  placement = "bottom-start",
  children,
  className,
  ref,
  ...rest
}: MenuProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const reasonRef = useRef<"esc" | "item-select" | null>(null);

  const setRef = (node: HTMLDivElement | null) => {
    popoverRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    const isOpen = isPopoverOpen(el);
    if (open && !isOpen) el.showPopover();
    else if (!open && isOpen) el.hidePopover();
  }, [open]);

  const handleToggle = useCallback(() => {
    const el = popoverRef.current;
    if (!el) return;
    if (isPopoverOpen(el)) return; // opening toggle — nothing to report
    const attributed = reasonRef.current;
    reasonRef.current = null;
    onClose(attributed ?? "outside");
  }, [onClose]);

  // Attribute `reason`, then ask the popover to hide (no-op if it already
  // is). hidePopover() dispatches `toggle` synchronously, consumed by
  // handleToggle above — the only place onClose is actually called.
  const closeWith = useCallback((reason: "esc" | "item-select") => {
    const el = popoverRef.current;
    if (!el || !isPopoverOpen(el)) return;
    reasonRef.current = reason;
    el.hidePopover();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeWith("esc");
  };

  // Consumed by Task 4's MenuItem via MenuContext, so item selection can
  // report "item-select" without prop drilling.
  const close = useCallback(
    (reason: "item-select") => {
      closeWith(reason);
    },
    [closeWith],
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={styles.trigger}
        data-psi-menu-trigger
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </div>
      <div
        {...rest}
        ref={setRef}
        popover="auto"
        role="menu"
        data-psi-menu
        data-placement={placement}
        className={[styles.menu, className].filter(Boolean).join(" ")}
        onToggle={handleToggle}
        onKeyDown={handleKeyDown}
      >
        <MenuContext.Provider value={{ close }}>{children}</MenuContext.Provider>
      </div>
    </>
  );
}
