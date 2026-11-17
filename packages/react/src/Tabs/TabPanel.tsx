import type { ReactNode, Ref } from "react";
import { TabsContext, panelId, tabId, useTabsContext } from "./Tabs.js";
import styles from "./tabs.module.css";

export interface TabPanelProps {
  /** Pairs this panel with the `Tab` of the same value. */
  value: string;
  /** The view for this tab. Rendered even when unselected, then `hidden`. */
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the panel element. */
  ref?: Ref<HTMLDivElement>;
}

/** One `role="tabpanel"` (D67).
 *
 * Every panel renders; unselected ones carry `hidden`. Returning null instead
 * would leave `aria-controls` on every unselected tab pointing at an element
 * that does not exist, and would throw away DOM state — a half-filled form in
 * a panel would lose its values on each tab switch. The cost is a heavier DOM
 * when panels are large; the answer to that is rendering less inside the
 * panel, not unmounting it behind the consumer's back.
 *
 * `tabIndex={0}` because a panel whose content has no focusable element would
 * otherwise be unreachable by keyboard.
 *
 * The panel's content does not see its Tabs (D132): it renders under an empty
 * TabsContext. Content is not part of the tab set, and a SegmentedControl in a
 * panel must not take itself for this tab set's tab list. */
export function TabPanel({ value, children, className, ref }: TabPanelProps) {
  const ctx = useTabsContext("TabPanel");
  const selected = ctx.value === value;

  return (
    <div
      ref={ref}
      role="tabpanel"
      id={panelId(ctx.idPrefix, value)}
      aria-labelledby={tabId(ctx.idPrefix, value)}
      hidden={!selected}
      tabIndex={0}
      className={[styles.panel, className].filter(Boolean).join(" ")}
    >
      <TabsContext.Provider value={null}>{children}</TabsContext.Provider>
    </div>
  );
}
