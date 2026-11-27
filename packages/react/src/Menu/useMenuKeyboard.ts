import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { handBackFocus, isFocusLost } from "../internal/focus/focusReturn.js";
import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";

/** How long consecutive keystrokes accumulate into one typeahead query. */
const TYPEAHEAD_RESET_MS = 500;

interface Options {
  popoverRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  /** Which end to focus on open (D102); reset to "first" once read. */
  openAtRef?: RefObject<"first" | "last">;
  onEsc: () => void;
  /** Tab or Shift Tab inside the open menu (D102). */
  onTab?: () => void;
  /** D147: the consumer's onFocusReturn, kept current by Menu. */
  onFocusReturnRef?: RefObject<((event: FocusReturnEvent<"close">) => void) | undefined>;
}

/** Roving-tabindex keyboard navigation for Menu (D53): Up/Down with wrap,
 * Home/End, character typeahead, Esc, and focus return on close. Disabled
 * items are reachable by every one of these (D131, after the APG's advice
 * that disabled menu items stay focusable); MenuItem refuses to activate
 * them. Psi's first keyboard-navigation JS — a deliberate departure from D52,
 * which refused role="toolbar" precisely to avoid it. */
export function useMenuKeyboard({ popoverRef, triggerRef, open, openAtRef, onEsc, onTab, onFocusReturnRef }: Options) {
  const queryRef = useRef("");
  const queryAtRef = useRef(0);

  // D131: every item, disabled or not. A disabled item can be reached and
  // read; MenuItem's click handler is what refuses it.
  const menuItems = useCallback((): HTMLElement[] => {
    const root = popoverRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>("[data-psi-menu-item]"));
  }, [popoverRef]);

  const focusItem = useCallback(
    (item: HTMLElement | undefined) => {
      if (!item) return;
      for (const other of menuItems()) other.tabIndex = other === item ? 0 : -1;
      item.focus();
    },
    [menuItems],
  );

  // Focus the first item on open; restore focus to the trigger on
  // close — but only if focus is still inside the menu.
  //
  // Every close route funnels through this one cleanup, because a close is
  // always the consumer flipping `open` (D50). The three routes differ only
  // in where focus sits by the time the flip lands:
  //
  //   esc / item-select — focus is still on a menu item, so restoring it to
  //     the trigger is the whole point: the menu is about to disappear from
  //     under it.
  //   outside (light dismiss) — the platform already hid the popover and the
  //     user's click already moved focus somewhere deliberate (a text field,
  //     say). Yanking it back to the trigger would steal keystrokes from
  //     whatever they just clicked, so the guard declines.
  //
  // The guard reads the DOM rather than a reason flag so it stays correct for
  // any route, including ones no reason is reported for.
  useEffect(() => {
    if (!open) return;
    const items = menuItems();
    const atLast = openAtRef?.current === "last";
    if (openAtRef) openAtRef.current = "first";
    focusItem(atLast ? items[items.length - 1] : items[0]);
    // D147: hand focus back only from a menu that still holds it, so a light
    // dismiss onto another control, or onto the page, is left alone.
    return () => {
      const triggerEl = triggerRef.current?.querySelector<HTMLElement>("button, a, [tabindex]") ?? null;
      handBackFocus({
        departing: popoverRef.current,
        includeNowhere: false,
        candidates: [triggerEl],
        reason: "close",
        onFocusReturn: onFocusReturnRef?.current,
      });
    };
  }, [open, popoverRef, triggerRef, openAtRef, onFocusReturnRef, menuItems, focusItem]);

  // D131: a re-render that removes the focused item must not drop focus to
  // the page, where the menu's keyboard can no longer hear Esc or the arrows.
  // React keeps an item's element for a stable key, so an item that survives
  // keeps its focus by itself. One that goes hands focus to the item now at
  // its position (the new last, if it was last), or, in an emptied menu, to
  // the menu element (tabindex=-1). Focus the user moved elsewhere is left.
  useEffect(() => {
    const root = popoverRef.current;
    if (!open || !root) return;
    let last: { el: HTMLElement; index: number } | null = null;

    const onFocusIn = (event: FocusEvent) => {
      const el = event.target as HTMLElement;
      const index = menuItems().indexOf(el);
      if (index !== -1) last = { el, index };
    };
    const observer = new MutationObserver(() => {
      if (!last || last.el.isConnected) return;
      // D147: the one rule. Focus the user moved out of the menu is left alone.
      if (!isFocusLost(root)) return;
      const items = menuItems();
      const next = items[Math.min(last.index, items.length - 1)];
      last = null;
      if (next) focusItem(next);
      else root.focus();
    });

    root.addEventListener("focusin", onFocusIn);
    observer.observe(root, { childList: true, subtree: true });
    // The open effect above may already have focused an item.
    if (document.activeElement instanceof HTMLElement) {
      const index = menuItems().indexOf(document.activeElement);
      if (index !== -1) last = { el: document.activeElement, index };
    }
    return () => {
      root.removeEventListener("focusin", onFocusIn);
      observer.disconnect();
    };
  }, [open, popoverRef, menuItems, focusItem]);

  return useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      // Checked first, ahead of the empty-items guard below: Esc must be
      // reportable even when a Menu has no MenuItem children (Task 3's own
      // tests render a Menu with plain text content), so it cannot be
      // folded into the item-navigation switch that bails out early when
      // there is nothing to navigate.
      if (event.key === "Escape") {
        event.preventDefault();
        onEsc();
        // Focus deliberately stays where it is. Esc only *reports* the
        // dismissal (D50); the menu is still open and fully interactive until
        // the consumer flips `open`, at which point the effect cleanup above
        // returns focus to the trigger. Moving focus here instead would break
        // the case where the consumer declines to close: focus would sit
        // outside a still-open menu, arrow keys would no longer reach this
        // handler, and a second Escape would be taken by the platform's close
        // watcher — resurfacing as onClose("outside"), the exact
        // reason-misreporting this hook exists to prevent.
        return;
      }

      // D102: Tab and Shift Tab leave the menu. Not prevented, so focus moves
      // on as the browser moves it; the dismissal is only reported (D50).
      // Focus is outside the menu by the time `open` flips, so the close
      // effect above does not pull it back to the trigger.
      if (event.key === "Tab") {
        onTab?.();
        return;
      }

      const items = menuItems();
      if (items.length === 0) return;
      const current = items.indexOf(document.activeElement as HTMLElement);

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          focusItem(items[(current + 1 + items.length) % items.length]);
          return;
        case "ArrowUp":
          event.preventDefault();
          // `current <= 0`, not a plain modulo: with no item focused
          // (`current === -1`) the modulo lands on the second-to-last item.
          // Both "wrapping off the first" and "starting from nothing" mean
          // the last item.
          focusItem(items[current <= 0 ? items.length - 1 : current - 1]);
          return;
        case "Home":
          event.preventDefault();
          focusItem(items[0]);
          return;
        case "End":
          event.preventDefault();
          focusItem(items[items.length - 1]);
          return;
        default:
          break;
      }

      // Typeahead: single printable characters accumulate into a prefix query.
      if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
      const now = Date.now();
      queryRef.current = now - queryAtRef.current > TYPEAHEAD_RESET_MS
        ? event.key.toLowerCase()
        : queryRef.current + event.key.toLowerCase();
      queryAtRef.current = now;

      const match = items.find((item) =>
        (item.textContent ?? "").trim().toLowerCase().startsWith(queryRef.current),
      );
      if (match) {
        event.preventDefault();
        focusItem(match);
      }
    },
    [menuItems, focusItem, onEsc, onTab],
  );
}
