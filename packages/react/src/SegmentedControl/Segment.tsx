import { useContext, useLayoutEffect, useRef } from "react";
import type { ReactNode, Ref } from "react";
import { SegmentedContext } from "./SegmentedControl.js";
import { panelId, tabId } from "../Tabs/Tabs.js";
import styles from "./segmented.module.css";

export interface SegmentProps {
  /** The value this segment selects; inside `Tabs`, pairs it with the `TabPanel` of the same value. */
  value: string;
  /** Label: one or two words. It is the segment's accessible name, whole even when truncated. */
  children: ReactNode;
  /** Not selectable, but still announced. The arrow keys skip it in a radio
   * group, and focus it without selecting it inside `Tabs` (D131). */
  disabled?: boolean;
  className?: string;
  /** Forwarded ref to the underlying `<button>`. */
  ref?: Ref<HTMLButtonElement>;
}

/** One segment of a SegmentedControl (D132): a `<button type="button">` that is
 * `role="radio"` with `aria-checked` on its own, and `role="tab"` with
 * `aria-selected` and `aria-controls` inside `Tabs`.
 *
 * `disabled` sets `aria-disabled` rather than the `disabled` attribute, as
 * `Tab` and `MenuItem` do, so the segment stays discoverable and a click does
 * nothing. The arrow keys skip it in a radio group, as native radios do, and
 * focus it without selecting it in a tab list, as Tabs does (D131). */
export function Segment({ value, children, disabled = false, className, ref }: SegmentProps) {
  const ctx = useContext(SegmentedContext);
  const innerRef = useRef<HTMLButtonElement | null>(null);
  const register = ctx?.register;

  // Tell the container this segment exists, so it can pick the tab stop (D93).
  useLayoutEffect(
    () => register?.({ value, disabled, el: innerRef.current }),
    [register, value, disabled],
  );

  if (!ctx) {
    throw new Error(
      "Psi Segment: must be rendered inside <SegmentedControl>, which owns the " +
        "selected value, the roles and the keyboard.",
    );
  }

  const selected = ctx.value === value;
  const inTabs = ctx.mode === "tabs";

  const setRef = (node: HTMLButtonElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <button
      ref={setRef}
      type="button"
      role={inTabs ? "tab" : "radio"}
      id={inTabs ? tabId(ctx.idPrefix, value) : undefined}
      aria-selected={inTabs ? selected : undefined}
      aria-checked={inTabs ? undefined : selected}
      aria-controls={inTabs ? panelId(ctx.idPrefix, value) : undefined}
      aria-disabled={disabled || undefined}
      data-psi-segment
      data-value={value}
      tabIndex={ctx.tabStop === value ? 0 : -1}
      className={[styles.segment, className].filter(Boolean).join(" ")}
      onClick={() => {
        if (!disabled) ctx.onValueChange(value);
      }}
    >
      <span className={styles.label}>{children}</span>
    </button>
  );
}
