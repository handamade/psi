import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";
import type { ReactNode, Ref } from "react";
import styles from "./tabs.module.css";

export type TabsOrientation = "horizontal" | "vertical";

export interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  orientation: TabsOrientation;
  /** Stable per-instance prefix, so two tab sets on one page never collide. */
  idPrefix: string;
  /** The value of the one tab that holds the list's tab stop (D93). Equal to
   * `value` when `value` names a registered tab, disabled or not; otherwise
   * the first enabled tab in document order (the first tab when all are
   * disabled), so a `value` that matches nothing still leaves the list
   * reachable. `Tab` reads this rather than recomputing it. Optional: a
   * hand-written provider that omits it gets `value`, as before D93. */
  tabStop?: string;
  /** Called by each `Tab` from a layout effect; returns the unregister.
   * Optional for the same reason as `tabStop`. */
  registerTab?: (entry: TabEntry) => () => void;
}

/** What a `Tab` tells its `Tabs`, so the provider can pick the tab stop. */
export interface TabEntry {
  value: string;
  disabled: boolean;
  /** For document-order sorting; set by the time the layout effect runs. */
  el: HTMLElement | null;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

/** Throws rather than returning a default: a `Tab` outside `Tabs` would
 * silently render an unwired, unselectable button, and the failure would
 * surface far from its cause. */
export function useTabsContext(component: string): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error(
      `Psi ${component}: must be rendered inside <Tabs>. Tabs owns the selected ` +
        `value, the orientation and the ids that wire aria-controls and ` +
        `aria-labelledby together.`,
    );
  }
  return ctx;
}

export interface TabsProps {
  /** Controlled selected tab, matched against each `Tab`/`TabPanel` value. A
   * value that matches no tab selects nothing, and the first enabled
   * tab holds the list's tab stop (D93); development builds warn. */
  value: string;
  /** Fires with the newly selected value; the consumer flips `value`. */
  onValueChange: (value: string) => void;
  /** Axis of the tab list, which also picks the arrow keys. @default "horizontal" */
  orientation?: TabsOrientation;
  /** A `TabList` and one `TabPanel` per tab. */
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the wrapper `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

/** Tab set root (D67) — holds no selection state of its own, following D50,
 * D53 and D62: `value` and `onValueChange` are required and there is no
 * `defaultValue`.
 *
 * Values are strings rather than indices because an index breaks the moment a
 * tab is inserted, and real tab sets map to ids. `Tab` and `TabPanel` pair by
 * value, so their source order need not match.
 *
 * Activation is automatic: arrow keys move focus and selection together. That
 * is the APG default where panel content is already available, and manual
 * activation is deliberately not offered as a mode — a consumer for whom
 * activating a panel is expensive already controls what the panel renders. */
export function Tabs({
  value,
  onValueChange,
  orientation = "horizontal",
  children,
  className,
  ref,
}: TabsProps) {
  const idPrefix = useId();
  const [tabs, setTabs] = useState<TabEntry[]>([]);

  const registerTab = useCallback((entry: TabEntry) => {
    setTabs((prev) => [...prev, entry]);
    return () => setTabs((prev) => prev.filter((t) => t !== entry));
  }, []);

  // D93: the tab-stop decision lives here, not in `Tab`, because only the
  // provider sees every registered tab and `value` together. Before any tab
  // has registered (the server render, the first client render) fall back to
  // `value` itself, which is what `Tab` did before and what keeps SSR output
  // unchanged for a value that matches.
  //
  // The fallback applies only when `value` names no registered tab. A selected
  // tab that is disabled keeps the stop (disabled tabs stay focusable, via
  // aria-disabled, and the stop belongs to the active tab). When every tab is
  // disabled the first one takes it, so the list never has zero stops.
  const { tabStop, unmatched } = useMemo(() => {
    if (tabs.length === 0) return { tabStop: value, unmatched: false };
    if (tabs.some((t) => t.value === value)) return { tabStop: value, unmatched: false };
    const ordered = [...tabs].sort((a, b) =>
      a.el && b.el && a.el !== b.el
        ? a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1
        : 0,
    );
    const first = ordered.find((t) => !t.disabled) ?? ordered[0];
    return { tabStop: first.value, unmatched: true };
  }, [tabs, value]);

  useEffect(() => {
    if (!unmatched || process.env.NODE_ENV === "production") return;
    console.warn(
      `Tabs: value "${value}" matches no tab; the first enabled tab takes the tab stop.`,
    );
  }, [unmatched, value]);

  const ctx = useMemo<TabsContextValue>(
    () => ({ value, onValueChange, orientation, idPrefix, tabStop, registerTab }),
    [value, onValueChange, orientation, idPrefix, tabStop, registerTab],
  );

  return (
    <TabsContext.Provider value={ctx}>
      <div
        ref={ref}
        className={[styles.tabs, className].filter(Boolean).join(" ")}
        data-orientation={orientation}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/** Ids are derived from the value so a tab and its panel find each other
 * without the consumer wiring anything, and stay unique across tab sets. */
export function tabId(prefix: string, value: string): string {
  return `${prefix}tab-${value}`;
}

export function panelId(prefix: string, value: string): string {
  return `${prefix}panel-${value}`;
}
