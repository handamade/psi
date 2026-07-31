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
 * Home/End, character typeahead, Esc with focus return. Disabled items are
 * skipped everywhere. Psi's only keyboard-navigation JS — a deliberate
 * departure from D52, which refused role="toolbar" precisely to avoid it. */
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

  /** Moves focus back to the trigger's focusable node. Shared by Esc (which
   * reports the dismissal but, per D50, does not close the popover — so the
   * effect cleanup below never runs) and by the close-driven unmount/rerun
   * path, so both routes return focus the same way. */
  const focusTrigger = useCallback(() => {
    const triggerEl = triggerRef.current?.querySelector<HTMLElement>("button, a, [tabindex]");
    triggerEl?.focus();
  }, [triggerRef]);

  // Focus the first enabled item on open; restore focus to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const items = enabledItems();
    focusItem(items[0]);
    return () => {
      focusTrigger();
    };
  }, [open, enabledItems, focusItem, focusTrigger]);

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
        // Esc reports the dismissal but leaves the popover open (D50), so
        // the effect above never re-runs its cleanup for this case. Focus
        // must return to the trigger here, explicitly, or it would be
        // stranded on the (still-mounted, now-inert-to-the-user) menu item.
        focusTrigger();
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
          focusItem(items[(current - 1 + items.length) % items.length]);
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
    [enabledItems, focusItem, focusTrigger, onEsc],
  );
}
