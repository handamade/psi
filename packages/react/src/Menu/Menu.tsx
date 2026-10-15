import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
} from "react";
import type { KeyboardEvent, ReactElement, ReactNode, Ref } from "react";
import styles from "./menu.module.css";
import { useMenuKeyboard } from "./useMenuKeyboard.js";
import { useMenuPlacement } from "./useMenuPlacement.js";

export type MenuPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

/** Why Menu reports a dismissal (D50, D102). Annotate a handler with this
 * rather than restating the union, so a new reason reaches it. */
export type MenuCloseReason = "esc" | "outside" | "item-select" | "tab";

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
   *
   * Invariant (D58): a dismissal is only ever reported for a menu that is
   * currently open according to its own `open` prop. The platform can close
   * an auto popover before the consumer's state catches up — clicking another
   * menu's trigger light-dismisses this one before the consumer's click
   * handler runs — and a report for an already-closed menu would clear a
   * selection that has since moved on.
   *
   * `"tab"` (D102): Tab or Shift Tab inside the open menu. Focus moves on to
   * the next control as the browser moves it; the consumer flips `open`.
   */
  onClose: (reason: MenuCloseReason) => void;
  /**
   * The trigger element. Must be a single React element that spreads unknown
   * props onto a focusable node (a Psi `Button`, say): Menu clones it to add
   * `aria-haspopup="menu"` and `aria-expanded`, so assistive tech associates
   * the menu with the control users actually focus.
   */
  trigger: ReactElement<Record<string, unknown>>;
  /** Placement relative to the trigger. @default "bottom-start" */
  placement?: MenuPlacement;
  /** The menu element's id, which the trigger's `aria-controls` names (D102).
   * Generated when absent. */
  id?: string;
  /** Accessible name for the menu when there is no visible label. */
  "aria-label"?: string;
  /** The id of a `MenuText` (or any element) that describes the menu (D99).
   * Unset by default: a description may be spoken every time the menu opens. */
  "aria-describedby"?: string;
  /** MenuItem, MenuSeparator and MenuText children. */
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
  id,
  ref,
  ...rest
}: MenuProps) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  // Set by the sync effect immediately before its own hidePopover(), and
  // consumed by handleToggle, so a consumer-driven close stays silent.
  const suppressNextCloseRef = useRef(false);

  const uid = useId().replace(/:/g, "");
  const anchorName = `--psi-menu-${uid}`;
  const menuId = id ?? `psi-menu-${uid}`;
  // D102: which end of the menu an arrow key on the closed trigger asked for;
  // read once by the open effect in useMenuKeyboard.
  const openAtRef = useRef<"first" | "last">("first");

  useMenuPlacement({ popoverRef, triggerRef, open, placement, anchorName });

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
    // D58: the platform can close this popover before `open` flips — clicking
    // another menu's trigger light-dismisses this one before the consumer's
    // click handler runs. In that case the sync effect takes neither branch
    // (the popover is already closed), so suppressNextCloseRef is never armed.
    // Report a dismissal only for a menu that is still open according to its
    // own prop; otherwise this is a stale toggle for a close the consumer
    // already knows about, and reporting it would clear a selection that has
    // since moved on. React reads this handler off the committed props at
    // dispatch time, so the closure's `open` is never staler than the DOM.
    if (!open) return;
    onClose("outside");
  }, [onClose, open]);

  // Roving-tabindex keyboard navigation (D53): Up/Down, Home/End, typeahead,
  // and Esc. Esc's own preventDefault() (inside the hook) suppresses the
  // platform's native popover Escape dismissal, so the popover stays open
  // until the consumer flips `open`.
  const handleKeyDown = useMenuKeyboard({
    popoverRef,
    triggerRef,
    open,
    openAtRef,
    onEsc: () => onClose("esc"),
    onTab: () => onClose("tab"),
  });

  // D102: Arrow Down / Arrow Up on the closed trigger open the menu on its
  // first / last item. Menu is controlled-only (D50) and cannot open itself, so
  // it clicks the trigger — the activation Enter and Space already perform —
  // and the consumer's onClick flips `open`. Handled on the wrapper so a
  // consumer's own onKeyDown on the trigger still runs; a disabled trigger
  // fires no click, so the arrows do nothing there either.
  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (open || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
    const el = triggerRef.current?.querySelector<HTMLElement>("button, a, [tabindex]");
    if (!el) return;
    event.preventDefault();
    openAtRef.current = event.key === "ArrowUp" ? "last" : "first";
    el.click();
  };

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
    ? cloneElement(trigger, { "aria-haspopup": "menu", "aria-expanded": open, "aria-controls": menuId })
    : trigger;

  return (
    <>
      {/* The wrapper stays: Task 6 uses it as the anchor box for CSS anchor
          positioning. Only the ARIA lives on the trigger element itself. */}
      <div ref={triggerRef} className={styles.trigger} data-psi-menu-trigger onKeyDown={handleTriggerKeyDown}>
        {triggerEl}
      </div>
      <div
        {...rest}
        id={menuId}
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
