import type { ReactNode, Ref } from "react";
import { panelId, tabId, useTabsContext } from "./Tabs.js";
import styles from "./tabs.module.css";

export interface TabProps {
  /** Pairs this tab with the `TabPanel` of the same value. */
  value: string;
  /** Label — keep it to one or two words. */
  children: ReactNode;
  /** Skipped by arrow navigation and not selectable, but still announced. */
  disabled?: boolean;
  className?: string;
  /** Forwarded ref to the underlying `<button>`. */
  ref?: Ref<HTMLButtonElement>;
}

/** One `role="tab"` (D67). Renders a real `<button>`.
 *
 * `disabled` sets `aria-disabled` rather than the `disabled` attribute, so the
 * tab stays discoverable to assistive tech while being skipped by roving
 * navigation — the same choice MenuItem made in D53. */
export function Tab({ value, children, disabled = false, className, ref }: TabProps) {
  const ctx = useTabsContext("Tab");
  const selected = ctx.value === value;

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={tabId(ctx.idPrefix, value)}
      data-psi-tab
      data-value={value}
      aria-selected={selected}
      aria-controls={panelId(ctx.idPrefix, value)}
      aria-disabled={disabled || undefined}
      // Roving tabindex: the selected tab is the list's single stop.
      tabIndex={selected ? 0 : -1}
      className={[styles.tab, className].filter(Boolean).join(" ")}
      onClick={() => {
        if (!disabled) ctx.onValueChange(value);
      }}
    >
      {children}
    </button>
  );
}
