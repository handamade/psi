import { useLayoutEffect, useRef } from "react";
import type { ReactNode, Ref } from "react";
import { panelId, tabId, useTabsContext } from "./Tabs.js";
import styles from "./tabs.module.css";

export interface TabProps {
  /** Pairs this tab with the `TabPanel` of the same value. */
  value: string;
  /** Label — keep it to one or two words. */
  children: ReactNode;
  /** Reachable by the arrow keys and announced, but never selected (D131). */
  disabled?: boolean;
  className?: string;
  /** Forwarded ref to the underlying `<button>`. */
  ref?: Ref<HTMLButtonElement>;
}

/** One `role="tab"` (D67). Renders a real `<button>`.
 *
 * `disabled` sets `aria-disabled` rather than the `disabled` attribute, so the
 * tab stays focusable and discoverable to assistive tech — the same choice
 * MenuItem made in D53. Since D131 the arrow keys reach it too; it takes
 * focus but never the selection. */
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
    () => registerTab?.({ value, disabled, el: innerRef.current }),
    [registerTab, value, disabled],
  );

  // The keyboard writes tabIndex straight to the DOM (useTabsKeyboard), so a
  // disabled tab it focused (D131) keeps a DOM 0 that its unchanged prop never
  // overwrites; a later click elsewhere would leave two stops. Whenever the
  // stop moves, every tab re-takes its own (D132).
  const stop = ctx.tabStop ?? ctx.value;
  useLayoutEffect(() => {
    if (innerRef.current) innerRef.current.tabIndex = stop === value ? 0 : -1;
  }, [stop, value]);

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
      // no tab. A provider without `tabStop` leaves it to `value`.
      tabIndex={(ctx.tabStop ?? ctx.value) === value ? 0 : -1}
      className={[styles.tab, className].filter(Boolean).join(" ")}
      onClick={() => {
        if (!disabled) ctx.onValueChange(value);
      }}
    >
      {children}
    </button>
  );
}
