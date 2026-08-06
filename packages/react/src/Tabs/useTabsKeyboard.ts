import { useCallback } from "react";
import type { KeyboardEvent, RefObject } from "react";
import type { TabsOrientation } from "./Tabs.js";

interface Options {
  listRef: RefObject<HTMLDivElement | null>;
  orientation: TabsOrientation;
  onValueChange: (value: string) => void;
}

/** Roving-tabindex keyboard navigation for Tabs (D67): arrow keys along the
 * orientation's axis with wrap, Home/End, disabled tabs skipped, and selection
 * following focus (automatic activation).
 *
 * Deliberately separate from useMenuKeyboard rather than abstracted with it.
 * They share "roving tabindex with wrap and Home/End" and diverge on
 * everything else: Menu is vertical-only, adds character typeahead, handles
 * Esc, and returns focus to a trigger; Tabs is bi-axial, has none of those, and
 * moves selection as it moves focus. A shared hook would take an options object
 * with more branches than either caller uses. If a third caller appears, that
 * is the signal to abstract. */
export function useTabsKeyboard({ listRef, orientation, onValueChange }: Options) {
  const enabledTabs = useCallback((): HTMLElement[] => {
    const root = listRef.current;
    if (!root) return [];
    return Array.from(
      root.querySelectorAll<HTMLElement>('[data-psi-tab]:not([aria-disabled="true"])'),
    );
  }, [listRef]);

  /** Focus a tab and report it as the new selection. The roving tabindex is
   * rewritten here rather than left to render, so keyboard focus lands
   * correctly even before the consumer's state update commits. */
  const activate = useCallback(
    (target: HTMLElement | undefined) => {
      if (!target) return;
      for (const other of enabledTabs()) other.tabIndex = other === target ? 0 : -1;
      target.focus();
      const value = target.dataset.value;
      if (value != null) onValueChange(value);
    },
    [enabledTabs, onValueChange],
  );

  return useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const tabs = enabledTabs();
      if (tabs.length === 0) return;

      const [prevKey, nextKey] =
        orientation === "vertical" ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];

      // Index of the focused tab among the enabled ones. -1 when focus sits on
      // a disabled tab, in which case the arrows still work from the start.
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
    [activate, enabledTabs, orientation],
  );
}
