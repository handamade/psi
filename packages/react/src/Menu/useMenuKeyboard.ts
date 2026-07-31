import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent, RefObject } from "react";

/** How long consecutive keystrokes accumulate into one typeahead query. */
const TYPEAHEAD_RESET_MS = 500;

interface Options {
  popoverRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  onEsc: () => void;
}

/** Roving-tabindex keyboard navigation for Menu (D53): Up/Down with wrap,
 * Home/End, character typeahead, Esc, and focus return on close. Disabled
 * items are skipped everywhere. Psi's only keyboard-navigation JS — a
 * deliberate departure from D52, which refused role="toolbar" precisely to
 * avoid it. */
export function useMenuKeyboard({ popoverRef, triggerRef, open, onEsc }: Options) {
  const queryRef = useRef("");
  const queryAtRef = useRef(0);

  const enabledItems = useCallback((): HTMLElement[] => {
    const root = popoverRef.current;
    if (!root) return [];
    return Array.from(
      root.querySelectorAll<HTMLElement>('[data-psi-menu-item]:not([aria-disabled="true"])'),
    );
  }, [popoverRef]);

  const focusItem = useCallback(
    (item: HTMLElement | undefined) => {
      if (!item) return;
      for (const other of enabledItems()) other.tabIndex = other === item ? 0 : -1;
      item.focus();
    },
    [enabledItems],
  );

  /** Moves focus back to the trigger's focusable node. */
  const focusTrigger = useCallback(() => {
    const triggerEl = triggerRef.current?.querySelector<HTMLElement>("button, a, [tabindex]");
    triggerEl?.focus();
  }, [triggerRef]);

  // Focus the first enabled item on open; restore focus to the trigger on
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
    const items = enabledItems();
    focusItem(items[0]);
    return () => {
      if (popoverRef.current?.contains(document.activeElement)) focusTrigger();
    };
  }, [open, popoverRef, enabledItems, focusItem, focusTrigger]);

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

      const items = enabledItems();
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
    [enabledItems, focusItem, onEsc],
  );
}
