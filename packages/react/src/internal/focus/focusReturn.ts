// packages/react/src/internal/focus/focusReturn.ts
import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

/** D147: what a hand-back tells the consumer, through `onFocusReturn`.
 * Focusing your own element inside the handler takes over; `preventDefault()`
 * alone leaves focus where it is. See the Focus guide. */
export interface FocusReturnEvent<R extends string = string> {
  /** Where Psi is about to put focus; null when Psi has no target. On Dialog,
   * the element the platform has already focused. */
  readonly target: HTMLElement | null;
  /** Why focus is being handed back. */
  readonly reason: R;
  /** Psi will not move focus. A no-op on Dialog, whose move the platform has
   * already made. */
  preventDefault(): void;
  readonly defaultPrevented: boolean;
}

/** D147, the one rule: Psi moves focus only when focus is lost. True when the
 * active element is `departing` or inside it; with `includeNowhere` (the
 * default) also when it is null, <body>, <html> or disconnected. A container
 * that is still in the document passes `includeNowhere: false`, so that focus
 * a click put on <body> is not pulled back. */
export function isFocusLost(
  departing: Element | null,
  { includeNowhere = true }: { includeNowhere?: boolean } = {},
): boolean {
  const doc = departing?.ownerDocument ?? document;
  const active = doc.activeElement;
  const nowhere = !active || active === doc.body || active === doc.documentElement || !active.isConnected;
  if (nowhere) return includeNowhere;
  return departing != null && departing.contains(active);
}

export function createFocusReturnEvent<R extends string>(
  target: HTMLElement | null,
  reason: R,
): FocusReturnEvent<R> {
  let prevented = false;
  return {
    target,
    reason,
    preventDefault() {
      prevented = true;
    },
    get defaultPrevented() {
      return prevented;
    },
  };
}

export interface HandBackOptions<R extends string> {
  /** The element that held focus and is leaving (removed, hidden or disabled). */
  departing: Element | null;
  /** @default true. See isFocusLost. */
  includeNowhere?: boolean;
  /** Where focus may go, best first. The first non-null one is the event's target. */
  candidates: ReadonlyArray<HTMLElement | null | undefined>;
  reason: R;
  onFocusReturn?: (event: FocusReturnEvent<R>) => void;
}

/** D147: hand focus back when it is lost, letting the consumer see, decline or
 * redirect the move. Returns the candidate that took focus, or null. */
export function handBackFocus<R extends string>({
  departing,
  includeNowhere = true,
  candidates,
  reason,
  onFocusReturn,
}: HandBackOptions<R>): HTMLElement | null {
  if (!isFocusLost(departing, { includeNowhere })) return null;
  const list = candidates.filter((el): el is HTMLElement => el != null);
  const event = createFocusReturnEvent(list[0] ?? null, reason);
  onFocusReturn?.(event);
  if (event.defaultPrevented || !isFocusLost(departing, { includeNowhere })) return null;
  const doc = departing?.ownerDocument ?? document;
  for (const el of list) {
    el.focus();
    if (doc.activeElement === el) return el;
  }
  return null;
}

/** D147: a ref that always holds the latest render's value, for a handler read
 * from an effect or an observer that outlives the render that set it. */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
