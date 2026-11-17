import { useCallback, useEffect, useMemo, useState } from "react";

/** What an item tells its container, so the container can pick the stop. */
export interface RovingEntry {
  value: string;
  disabled: boolean;
  /** For document-order sorting; set by the time the layout effect runs. */
  el: HTMLElement | null;
}

/** The roving tab stop of a single-select list (D93), shared by `Tabs` and a
 * standalone `SegmentedControl` (D132).
 *
 * The decision lives in the container, not the item, because only the
 * container sees every registered item and `value` together. Before any item
 * has registered (the server render, the first client render) it falls back to
 * `value` itself, which keeps SSR output unchanged for a value that matches.
 *
 * The fallback applies only when `value` names no registered item. A selected
 * item that is disabled keeps the stop (disabled items stay focusable, via
 * aria-disabled, and the stop belongs to the active item). When every item is
 * disabled the first one takes it, so the list never has zero stops.
 * Development builds warn when `value` matches nothing. */
export function useRovingStop(value: string, component: string, noun: string) {
  const [entries, setEntries] = useState<RovingEntry[]>([]);

  const register = useCallback((entry: RovingEntry) => {
    setEntries((prev) => [...prev, entry]);
    return () => setEntries((prev) => prev.filter((e) => e !== entry));
  }, []);

  const { tabStop, unmatched } = useMemo(() => {
    if (entries.length === 0) return { tabStop: value, unmatched: false };
    if (entries.some((e) => e.value === value)) return { tabStop: value, unmatched: false };
    const ordered = [...entries].sort((a, b) =>
      a.el && b.el && a.el !== b.el
        ? a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1
        : 0,
    );
    const first = ordered.find((e) => !e.disabled) ?? ordered[0];
    return { tabStop: first.value, unmatched: true };
  }, [entries, value]);

  useEffect(() => {
    if (!unmatched || process.env.NODE_ENV === "production") return;
    console.warn(
      `${component}: value "${value}" matches no ${noun}; the first enabled ${noun} takes the tab stop.`,
    );
  }, [unmatched, value, component, noun]);

  return { tabStop, register };
}
