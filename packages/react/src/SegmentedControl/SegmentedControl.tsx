import { createContext, useContext, useMemo, useRef } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactNode, Ref } from "react";
import { TabsContext } from "../Tabs/Tabs.js";
import { useRovingStop } from "../Tabs/useRovingStop.js";
import type { RovingEntry } from "../Tabs/useRovingStop.js";
import { useTabsKeyboard } from "../Tabs/useTabsKeyboard.js";
import styles from "./segmented.module.css";

export type SegmentedControlSize = 24 | 32 | 40;

/** What a SegmentedControl gives its Segments (D132). */
export interface SegmentedContextValue {
  /** `"tabs"` inside `Tabs`, `"radio"` on its own. */
  mode: "radio" | "tabs";
  value: string;
  onValueChange: (value: string) => void;
  /** The value of the segment that holds the control's one tab stop (D93). */
  tabStop: string;
  register?: (entry: RovingEntry) => () => void;
  /** Tabs' id prefix, so a segment and its TabPanel find each other. Empty in radio mode. */
  idPrefix: string;
}

export const SegmentedContext = createContext<SegmentedContextValue | null>(null);

export interface SegmentedControlProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "role" | "onChange" | "defaultValue"> {
  /** The selected segment's value (controlled). Required on its own. Inside
   * `Tabs`, leave it out: Tabs owns the value. A value that matches no segment
   * selects nothing; the first enabled segment takes the tab stop. */
  value?: string;
  /** Fires with the newly selected value; the consumer flips `value`. Required
   * on its own; leave it out inside `Tabs`. */
  onValueChange?: (value: string) => void;
  /** Outer height in px, matching a Button of the same size. @default 32 */
  size?: SegmentedControlSize;
  /** Stretch to the container and give every segment an equal share. Without
   * it the control is as wide as its labels, and truncates them when its
   * container is narrower. @default false */
  fill?: boolean;
  /** Accessible name for the group: the radio group, or the tab list inside `Tabs`. */
  "aria-label"?: string;
  /** Id of the element that names the group, in place of `aria-label`. */
  "aria-labelledby"?: string;
  /** Two to four `Segment`s. */
  children: ReactNode;
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement>;
}

/** A pill of 2–4 segments, one selected (D132). Two jobs, chosen by where it
 * renders rather than by a prop:
 *
 * - **On its own** it is a radio group for a setting that applies at once
 *   (Light / Dark / System): `role="radiogroup"`, segments are `role="radio"`.
 *   `value` and `onValueChange` are required.
 * - **Inside `Tabs`** it is the tab list, in place of `TabList`, switching the
 *   `TabPanel`s (Map / Trace): `role="tablist"`, segments are `role="tab"` with
 *   `aria-controls`. `Tabs` owns the value.
 *
 * One tab stop; the arrow keys move and select (both axes as a radio group,
 * Left/Right as a tab list), Home and End jump. A disabled segment is skipped
 * in a radio group, and focused but not selected in a tab list (D131). Controlled only. A form value
 * is a `RadioGroup`, not this: it submits nothing. */
export function SegmentedControl({
  value,
  onValueChange,
  size = 32,
  fill = false,
  children,
  className,
  onKeyDown,
  ref,
  ...rest
}: SegmentedControlProps) {
  const tabs = useContext(TabsContext);
  const inTabs = tabs !== null;
  const own = useRovingStop(value ?? "", "SegmentedControl", "segment");
  const innerRef = useRef<HTMLDivElement | null>(null);

  const select = inTabs ? tabs.onValueChange : onValueChange;
  const handleKeyDown = useTabsKeyboard({
    listRef: innerRef,
    orientation: inTabs ? "horizontal" : "both",
    onValueChange: (v) => select?.(v),
    itemSelector: "[data-psi-segment]",
    // A radio group skips a disabled segment, as native radios do; a tab list
    // reaches it without selecting it, as Tabs does (D131).
    skipDisabled: !inTabs,
  });

  const ctx = useMemo<SegmentedContextValue | null>(() => {
    if (tabs) {
      return {
        mode: "tabs",
        value: tabs.value,
        onValueChange: tabs.onValueChange,
        tabStop: tabs.tabStop ?? tabs.value,
        register: tabs.registerTab,
        idPrefix: tabs.idPrefix,
      };
    }
    if (value === undefined || onValueChange === undefined) return null;
    return { mode: "radio", value, onValueChange, tabStop: own.tabStop, register: own.register, idPrefix: "" };
  }, [tabs, value, onValueChange, own.tabStop, own.register]);

  // Every hook has run; now the misuse checks (D67's posture: a silent
  // failure would surface far from its cause).
  if (inTabs && (value !== undefined || onValueChange !== undefined)) {
    throw new Error(
      "Psi SegmentedControl: inside <Tabs>, leave out value and onValueChange. " +
        "Tabs owns the selected value, and the segments are its tabs.",
    );
  }
  if (!ctx) {
    throw new Error(
      "Psi SegmentedControl: pass value and onValueChange, or render it inside <Tabs> " +
        "to switch TabPanels. On its own it is a radio group and holds no state of its own.",
    );
  }

  const setRef = (node: HTMLDivElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <div
      {...rest}
      ref={setRef}
      role={inTabs ? "tablist" : "radiogroup"}
      aria-orientation={inTabs ? "horizontal" : undefined}
      data-size={size}
      data-fill={fill || undefined}
      className={[styles.root, styles[`size${size}`], fill && styles.fill, className]
        .filter(Boolean)
        .join(" ")}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e);
        if (!e.defaultPrevented) handleKeyDown(e);
      }}
    >
      <SegmentedContext.Provider value={ctx}>{children}</SegmentedContext.Provider>
    </div>
  );
}
