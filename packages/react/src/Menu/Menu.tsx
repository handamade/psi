import { cloneElement, createContext, isValidElement, useCallback, useEffect, useRef } from "react";
import type { ReactElement, ReactNode, Ref } from "react";
import styles from "./menu.module.css";
import { useMenuKeyboard } from "./useMenuKeyboard.js";

export type Placement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

export interface MenuContextValue {
  close: (reason: "item-select") => void;
}

export const MenuContext = createContext<MenuContextValue>({ close: () => {} });

export interface MenuProps {
  /** Controlled open state; syncs to showPopover()/hidePopover(). */
  open: boolean;
  /**
   * Called when a dismissal is *requested*; the consumer flips `open`.
   *
   * Menu never closes itself on `"esc"` or `"item-select"` — the popover stays
   * open until `open` becomes false (D50). `"outside"` is the one exception:
   * light dismiss is performed by the browser before it tells us, so by the
   * time that reason is reported the popover is already closed. Flipping
   * `open` to false is still required, to keep React's state in step.
   */
  onClose: (reason: "esc" | "outside" | "item-select") => void;
  /**
   * The trigger element. Must be a single React element that spreads unknown
   * props onto a focusable node (a Psi `Button`, say): Menu clones it to add
   * `aria-haspopup="menu"` and `aria-expanded`, so assistive tech associates
   * the menu with the control users actually focus.
   */
  trigger: ReactElement<Record<string, unknown>>;
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

/** Action menu on the native Popover API top layer: the top layer and light
 * dismiss come from the platform; Esc, roving keyboard, placement and
 * dismissal reasons are Psi's (D53). Controlled-only, like Dialog (D50).
 *
 * Controlled-only means Menu does not change its own visibility. Esc and
 * item-select *report* a dismissal via onClose(reason) and leave the popover
 * open; only the consumer flipping `open` to false actually closes it. Esc
 * calls preventDefault() to suppress the platform's own popover dismissal,
 * which is what makes that possible.
 *
 * Light dismiss (outside click) is the one asymmetry, and it is forced by the
 * platform: the browser hides the popover itself and the hide-side
 * `beforetoggle` is not cancelable, so the popover is already closed by the
 * time the resulting `toggle` lets us report onClose("outside"). The consumer
 * must still flip `open` to false so React's state matches the DOM.
 *
 * `toggle` therefore reports only that one reason. A close driven by the
 * consumer (`open` true -> false) runs through the sync effect's own
 * hidePopover(), which raises a `toggle` too — that one is suppressed, because
 * a programmatic close is not a dismissal and must not call onClose. */
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
  // Set by the sync effect immediately before its own hidePopover(), and
  // consumed by handleToggle, so a consumer-driven close stays silent.
  const suppressNextCloseRef = useRef(false);

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
    else if (!open && isOpen) {
      suppressNextCloseRef.current = true;
      el.hidePopover();
    }
  }, [open]);

  const handleToggle = useCallback(() => {
    const el = popoverRef.current;
    if (!el) return;
    // Checked before the open/closed test on purpose: the flag must be
    // consumed by the very next toggle whatever the element's state reads as
    // by then, or a later genuine dismissal would inherit the suppression.
    if (suppressNextCloseRef.current) {
      suppressNextCloseRef.current = false;
      return;
    }
    if (isPopoverOpen(el)) return; // opening toggle — nothing to report
    onClose("outside");
  }, [onClose]);

  // Roving-tabindex keyboard navigation (D53): Up/Down, Home/End, typeahead,
  // and Esc. Esc's own preventDefault() (inside the hook) suppresses the
  // platform's native popover Escape dismissal, so the popover stays open
  // until the consumer flips `open`.
  const handleKeyDown = useMenuKeyboard({
    popoverRef,
    triggerRef,
    open,
    onEsc: () => onClose("esc"),
  });

  // Consumed by Task 4's MenuItem via MenuContext, so item selection can
  // report "item-select" without prop drilling. Reports only — the popover
  // stays open until the consumer flips `open`.
  const close = useCallback(
    (reason: "item-select") => {
      onClose(reason);
    },
    [onClose],
  );

  // `trigger` is typed as a single element, but JS consumers (and `as any`)
  // can still pass a string or an array — cloneElement would throw on those.
  // Fall back to rendering it untouched, minus the trigger ARIA, and say so
  // rather than failing silently or crashing the tree. (A Fragment passes
  // isValidElement and is not caught here; React's own dev warning covers it.)
  const triggerIsElement = isValidElement(trigger);

  useEffect(() => {
    if (triggerIsElement) return;
    console.warn(
      "Psi Menu: `trigger` must be a single React element that forwards props to a focusable " +
        "node. Menu clones it to attach aria-haspopup and aria-expanded; a string, fragment or " +
        "array cannot carry them, so the menu renders without its trigger ARIA.",
    );
  }, [triggerIsElement]);

  const triggerEl = triggerIsElement
    ? cloneElement(trigger, { "aria-haspopup": "menu", "aria-expanded": open })
    : trigger;

  return (
    <>
      {/* The wrapper stays: Task 6 uses it as the anchor box for CSS anchor
          positioning. Only the ARIA lives on the trigger element itself. */}
      <div ref={triggerRef} className={styles.trigger} data-psi-menu-trigger>
        {triggerEl}
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
