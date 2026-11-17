import { useCallback } from "react";
import type { KeyboardEvent, RefObject } from "react";
import type { TabsOrientation } from "./Tabs.js";

interface Options {
  listRef: RefObject<HTMLDivElement | null>;
  orientation: TabsOrientation;
  onValueChange: (value: string) => void;
}

/** Roving-tabindex keyboard navigation for Tabs (D67): arrow keys along the
 * orientation's axis with wrap, Home/End, and selection following focus
 * (automatic activation). A disabled tab is reachable (D131): it takes focus
 * and the tab stop, but not the selection, so the panel stays put.
 *
 * Deliberately separate from useMenuKeyboard rather than abstracted with it.
 * They share "roving tabindex with wrap and Home/End" and diverge on
 * everything else: Menu is vertical-only, adds character typeahead, handles
 * Esc, and returns focus to a trigger; Tabs is bi-axial, has none of those, and
 * moves selection as it moves focus. A shared hook would take an options object
 * with more branches than either caller uses. If a third caller appears, that
 * is the signal to abstract. */
export function useTabsKeyboard({ listRef, orientation, onValueChange }: Options) {
  // D131: every tab, disabled or not.
  const allTabs = useCallback((): HTMLElement[] => {
    const root = listRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>("[data-psi-tab]"));
  }, [listRef]);

  /** Focus a tab and, unless it is disabled, report it as the new selection.
   * The roving tabindex is rewritten here rather than left to render, so
   * keyboard focus lands correctly even before the consumer's state update
   * commits — and so a focused disabled tab holds the stop, and Tab leaves
   * the list for the panel rather than landing on the selected tab. */
  const activate = useCallback(
    (target: HTMLElement | undefined) => {
      if (!target) return;
      for (const other of allTabs()) other.tabIndex = other === target ? 0 : -1;
      target.focus();
      if (target.getAttribute("aria-disabled") === "true") return;
      const value = target.dataset.value;
      if (value != null) onValueChange(value);
    },
    [allTabs, onValueChange],
  );

  return useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const tabs = allTabs();
      if (tabs.length === 0) return;

      const [prevKey, nextKey] =
        orientation === "vertical" ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];

      // Index of the focused tab; -1 when focus is elsewhere, in which case
      // the arrows work from the start.
      const current = tabs.indexOf(document.activeElement as HTMLElement);

      switch (e.key) {
        case nextKey:
          e.preventDefault();
          activate(tabs[(current + 1 + tabs.length) % tabs.length]);
          break;
        case prevKey:
          e.preventDefault();
          activate(tabs[(current - 1 + tabs.length) % tabs.length]);
          break;
        case "Home":
          e.preventDefault();
          activate(tabs[0]);
          break;
        case "End":
          e.preventDefault();
          activate(tabs[tabs.length - 1]);
          break;
        default:
          // Everything else — including the cross-axis arrows — falls through
          // untouched, so a vertical list does not swallow Left/Right.
          break;
      }
    },
    [activate, allTabs, orientation],
  );
}
