import { useCallback } from "react";
import type { KeyboardEvent, RefObject } from "react";
import type { TabsOrientation } from "./Tabs.js";

interface Options {
  listRef: RefObject<HTMLDivElement | null>;
  /** The arrow axis. `"both"` (D132) takes Left/Up as previous and Right/Down
   * as next, as the APG radio group does: a standalone SegmentedControl. */
  orientation: TabsOrientation | "both";
  onValueChange: (value: string) => void;
  /** Which descendants are the items. Each needs `data-value`. @default "[data-psi-tab]" */
  itemSelector?: string;
  /** Skip disabled items instead of focusing them (D132): a radio group does,
   * as native radios do. A tab list reaches them (D131). @default false */
  skipDisabled?: boolean;
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
 * is the signal to abstract.
 *
 * SegmentedControl (D132) is not that third caller: it is the same behaviour
 * over different items, so it passes `itemSelector`, and, as a radio group,
 * `orientation: "both"` and `skipDisabled`. */
export function useTabsKeyboard({
  listRef,
  orientation,
  onValueChange,
  itemSelector = "[data-psi-tab]",
  skipDisabled = false,
}: Options) {
  // D131: every tab, disabled or not. The roving tabindex is rewritten over
  // all of them, so a skipped disabled item never keeps a second stop.
  const allTabs = useCallback((): HTMLElement[] => {
    const root = listRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(itemSelector));
  }, [listRef, itemSelector]);

  // The ones the arrows land on: all of them, or the enabled ones (D132).
  const reachableTabs = useCallback(
    (): HTMLElement[] =>
      skipDisabled
        ? allTabs().filter((t) => t.getAttribute("aria-disabled") !== "true")
        : allTabs(),
    [allTabs, skipDisabled],
  );

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
      const tabs = reachableTabs();
      if (tabs.length === 0) return;

      const [prevKeys, nextKeys] =
        orientation === "vertical"
          ? [["ArrowUp"], ["ArrowDown"]]
          : orientation === "both"
            ? [["ArrowLeft", "ArrowUp"], ["ArrowRight", "ArrowDown"]]
            : [["ArrowLeft"], ["ArrowRight"]];

      // Step from the focused item's place among all of them, to the next one
      // the arrows land on. Measured over all items, not the reachable ones,
      // so focus on a skipped disabled item (it can hold the stop when it is
      // selected, D93) still steps the right way (D132). Focus elsewhere
      // starts from the first or the last.
      const all = allTabs();
      const current = all.indexOf(document.activeElement as HTMLElement);
      const step = (dir: 1 | -1): HTMLElement | undefined => {
        if (current === -1) return dir === 1 ? tabs[0] : tabs[tabs.length - 1];
        for (let i = 1; i <= all.length; i++) {
          const candidate = all[(current + dir * i + all.length * i) % all.length];
          if (tabs.includes(candidate)) return candidate;
        }
        return undefined;
      };

      if (nextKeys.includes(e.key)) {
        e.preventDefault();
        activate(step(1));
        return;
      }
      if (prevKeys.includes(e.key)) {
        e.preventDefault();
        activate(step(-1));
        return;
      }

      switch (e.key) {
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
    [activate, allTabs, reachableTabs, orientation],
  );
}
