import { useLayoutEffect, useRef } from "react";
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
  const innerRef = useRef<HTMLButtonElement | null>(null);
  const { registerTab } = ctx;

  const setRef = (node: HTMLButtonElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  // Tell Tabs this tab exists, so it can pick the list's tab stop (D93).
  useLayoutEffect(
    () => registerTab({ value, disabled, el: innerRef.current }),
    [registerTab, value, disabled],
  );

  return (
    <button
      ref={setRef}
      type="button"
      role="tab"
      id={tabId(ctx.idPrefix, value)}
      data-psi-tab
      data-value={value}
      aria-selected={selected}
      aria-controls={panelId(ctx.idPrefix, value)}
      aria-disabled={disabled || undefined}
      // Roving tabindex: one stop for the list. Tabs decides which tab holds it
      // (D93): the selected one, or the first enabled one when `value` matches
      // no enabled tab.
      tabIndex={ctx.tabStop === value ? 0 : -1}
      className={[styles.tab, className].filter(Boolean).join(" ")}
      onClick={() => {
        if (!disabled) ctx.onValueChange(value);
      }}
    >
      {children}
    </button>
  );
}
