import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

/** "auto": the platform's light dismiss, as Menu uses (D53). "manual": no
 * platform dismissal; an outside pointerdown is reported instead (D130). */
export type PopupMode = "auto" | "manual";

interface Options {
  popoverRef: RefObject<HTMLElement | null>;
  /** The element the popup belongs to. A pointerdown inside it is not
   * "outside" in manual mode. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Controlled open state; synced to showPopover()/hidePopover(). */
  open: boolean;
  mode: PopupMode;
  /** A dismissal the popup's owner did not drive. Reported only while `open`
   * is true (D58); the owner flips `open`. */
  onDismiss: (reason: "outside") => void;
}

export interface AnchoredPopupProps {
  popover: PopupMode;
  onToggle: () => void;
}

function isPopoverOpen(el: HTMLElement): boolean {
  return el.hasAttribute("data-open") || el.matches(":popover-open");
}

/** A popup on the native Popover API top layer, kept in step with an `open`
 * prop (D53, D50, D58; moved out of Menu by D130). Spread the returned props
 * onto the popover element.
 *
 * Controlled: the hook never changes `open`. In "auto" mode light dismiss is
 * the one asymmetry, and the platform forces it: the browser hides the
 * popover itself and the hide-side `beforetoggle` is not cancelable, so the
 * popover is already closed by the time the resulting `toggle` lets us report
 * onDismiss("outside"). The owner must still flip `open` so React's state
 * matches the DOM.
 *
 * `toggle` therefore reports only that one reason. A close driven by the
 * owner (`open` true -> false) runs through the sync effect's own
 * hidePopover(), which raises a `toggle` too — that one is suppressed, because
 * a programmatic close is not a dismissal.
 *
 * In "manual" mode nothing closes the popover but the owner; a pointerdown
 * outside both the popover and the anchor is reported as "outside". */
export function useAnchoredPopup({
  popoverRef,
  anchorRef,
  open,
  mode,
  onDismiss,
}: Options): AnchoredPopupProps {
  // Set by the sync effect immediately before its own hidePopover(), and
  // consumed by onToggle, so an owner-driven close stays silent.
  const suppressNextCloseRef = useRef(false);

  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;
    const isOpen = isPopoverOpen(el);
    if (open && !isOpen) el.showPopover();
    else if (!open && isOpen) {
      suppressNextCloseRef.current = true;
      el.hidePopover();
    }
  }, [open, popoverRef]);

  const onToggle = useCallback(() => {
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
    // another menu's trigger light-dismisses this one before the owner's
    // click handler runs. In that case the sync effect takes neither branch
    // (the popover is already closed), so suppressNextCloseRef is never armed.
    // Report a dismissal only for a popup that is still open according to its
    // own prop; otherwise this is a stale toggle for a close the owner
    // already knows about, and reporting it would clear a selection that has
    // since moved on. React reads this handler off the committed props at
    // dispatch time, so the closure's `open` is never staler than the DOM.
    if (!open) return;
    onDismiss("outside");
  }, [onDismiss, open, popoverRef]);

  // Manual mode: the platform has no light dismiss to offer, so an outside
  // pointerdown is ours to report. Capture phase, so a handler that stops
  // propagation further down cannot hide it.
  useEffect(() => {
    if (mode !== "manual" || !open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onDismiss("outside");
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [mode, open, onDismiss, popoverRef, anchorRef]);

  return { popover: mode, onToggle };
}
