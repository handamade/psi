import { createContext, useContext, useId, useMemo } from "react";
import type { ReactNode, Ref } from "react";
import styles from "./tabs.module.css";

export type TabsOrientation = "horizontal" | "vertical";

export interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  orientation: TabsOrientation;
  /** Stable per-instance prefix, so two tab sets on one page never collide. */
  idPrefix: string;
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
  /** Controlled selected tab, matched against each `Tab`/`TabPanel` value. */
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

  const ctx = useMemo<TabsContextValue>(
    () => ({ value, onValueChange, orientation, idPrefix }),
    [value, onValueChange, orientation, idPrefix],
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
