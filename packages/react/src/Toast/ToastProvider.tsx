import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { Announcement } from "./Announcement.js";
import { Toast } from "./Toast.js";
import type { ToastPoliteness, ToastVariant } from "./Toast.js";
import { ToastRegion } from "./ToastRegion.js";
import type { ToastPlacement } from "./ToastRegion.js";
import { ToastContext } from "./useToast.js";
import type { AnnounceOptions, ToastHandle, ToastOptions } from "./useToast.js";

/** How long an announcement stays in its live wrapper, in ms (D91). Long
 * enough for a screen reader to start speaking a node that was added; short
 * enough that the wrapper does not accumulate stale text. The portal ran the
 * same value before Psi owned it. */
const ANNOUNCEMENT_DWELL = 1000;

/** Everything but the provider's own props is forwarded to its ToastRegion
 * (D91) — the same surface ToastRegion takes, so `aria-label`, `ref`,
 * `className` and `data-*` attributes land on the region element. */
export interface ToastProviderProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Max simultaneous toasts; the oldest is evicted first. @default 3 */
  limit?: number;
  /** Auto-dismiss for toasts with no action, in ms. @default 5000 */
  duration?: number;
  /** Auto-dismiss for toasts carrying an action, in ms. An affordance that
   * vanishes before it can be reached is not an affordance. @default 10000 */
  actionDuration?: number;
  /** Corner the stack occupies. @default "bottom-end" */
  placement?: ToastPlacement;
  /** The subtree that may call `useToast()`. The region is rendered alongside it. */
  children: ReactNode;
  /** Accessible name for the region landmark, forwarded to ToastRegion.
   * @default "Notifications" */
  "aria-label"?: string;
  /** Forwarded to the region element. */
  className?: string;
  /** Forwarded ref to the region element. */
  ref?: Ref<HTMLDivElement>;
}

interface QueuedToast {
  id: string;
  variant: ToastVariant;
  message: ReactNode;
  action?: ReactNode;
  politeness?: ToastPoliteness;
  /** Left undefined when show() did not pass one, so Toast keeps its default. */
  statusLabel?: string | null;
  /** Total lifetime for this toast, chosen at show() time. */
  duration: number;
}

/** Speech only: rendered as an Announcement, never counted against `limit`. */
interface QueuedAnnouncement {
  id: string;
  message: ReactNode;
  politeness: ToastPoliteness;
}

interface TimerState {
  handle: ReturnType<typeof setTimeout> | undefined;
  /** ms still owed when the timer was last armed. */
  remaining: number;
  /** Date.now() when it was armed, or undefined while paused. */
  startedAt: number | undefined;
}

/** Owns the toast queue, its auto-dismiss timers, and the single ToastRegion
 * (D65).
 *
 * This is the library's one stateful container, and the exception is
 * deliberately narrow. D50 and D53 rejected internal state for Dialog and Menu
 * because the consumer already owned the state that decided visibility — a
 * menu is open because a user clicked a trigger the consumer rendered. A toast
 * has no such owner: it is created by an outcome, not by a UI state, and it
 * disappears on a timer nobody is watching. The rule that survives is the
 * useful half — presentational components stay controlled (`Toast` still holds
 * nothing), a stateful container may exist when the state has no natural
 * owner, and it must be opt-in.
 *
 * Timers pause while the pointer or focus is inside the region (WCAG 2.2.1),
 * and resume with the time *remaining* rather than a fresh full duration —
 * restarting would let a user hold a toast open indefinitely by jiggling the
 * mouse.
 *
 * **Announcements share the queue, not the limit (D91).** `announce()` adds a
 * speech-only Announcement to the same region — never a live region of its
 * own — and it leaves after a one-second dwell. A later announcement does not
 * remove an earlier one early: removing a node just after it was added can cut
 * its speech, and with non-atomic wrappers (D90) each added node is spoken on
 * its own. Announcements live in their own list, so they never evict a visible
 * toast; their timers live in the same map, so `dismiss`, `clear()` and
 * unmount dispose them as they do a toast's, and they pause with the region.
 *
 * Remaining props go to the ToastRegion (D91): its `aria-label`, a `ref` to the
 * region element, a `className`, and `data-*` attributes such as
 * `data-react-aria-top-layer`. */
export function ToastProvider({
  limit = 3,
  duration = 5000,
  actionDuration = 10000,
  placement = "bottom-end",
  children,
  ...regionProps
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<QueuedToast[]>([]);
  const [announcements, setAnnouncements] = useState<QueuedAnnouncement[]>([]);
  const timers = useRef(new Map<string, TimerState>());
  const pausedRef = useRef(false);
  const seq = useRef(0);
  const idPrefix = useId();

  const remove = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer?.handle !== undefined) clearTimeout(timer.handle);
    timers.current.delete(id);
    // Ids come from one sequence, so the id names one item in one list.
    setToasts((prev) => prev.filter((t) => t.id !== id));
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }, []);

  /** Arm (or re-arm) one toast's timer for `ms`. Paused timers are recorded
   * but not scheduled, so a toast raised while the pointer is already inside
   * the region does not start burning down. */
  const arm = useCallback(
    (id: string, ms: number) => {
      const state: TimerState = pausedRef.current
        ? { handle: undefined, remaining: ms, startedAt: undefined }
        : { handle: setTimeout(() => remove(id), ms), remaining: ms, startedAt: Date.now() };
      timers.current.set(id, state);
    },
    [remove],
  );

  const show = useCallback(
    ({ variant = "neutral", message, action, politeness, statusLabel }: ToastOptions): string => {
      const id = `${idPrefix}-${seq.current++}`;
      const lifetime = action != null ? actionDuration : duration;

      setToasts((prev) => {
        const next = [
          ...prev,
          { id, variant, message, action, politeness, statusLabel, duration: lifetime },
        ];
        // Evict oldest-first past the limit, disposing their timers as we go.
        while (next.length > limit) {
          const evicted = next.shift()!;
          const timer = timers.current.get(evicted.id);
          if (timer?.handle !== undefined) clearTimeout(timer.handle);
          timers.current.delete(evicted.id);
        }
        return next;
      });

      arm(id, lifetime);
      return id;
    },
    [actionDuration, arm, duration, idPrefix, limit],
  );

  const announce = useCallback(
    (message: ReactNode, { politeness = "polite" }: AnnounceOptions = {}): string => {
      const id = `${idPrefix}-${seq.current++}`;
      // Its own list: the eviction loop in show() never sees it (D91).
      setAnnouncements((prev) => [...prev, { id, message, politeness }]);
      arm(id, ANNOUNCEMENT_DWELL);
      return id;
    },
    [arm, idPrefix],
  );

  const clear = useCallback(() => {
    for (const timer of timers.current.values()) {
      if (timer.handle !== undefined) clearTimeout(timer.handle);
    }
    timers.current.clear();
    setToasts([]);
    setAnnouncements([]);
  }, []);

  const pause = useCallback(() => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    for (const [id, timer] of timers.current) {
      if (timer.handle === undefined) continue;
      clearTimeout(timer.handle);
      const elapsed = timer.startedAt === undefined ? 0 : Date.now() - timer.startedAt;
      timers.current.set(id, {
        handle: undefined,
        remaining: Math.max(0, timer.remaining - elapsed),
        startedAt: undefined,
      });
    }
  }, []);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    for (const [id, timer] of timers.current) {
      if (timer.handle !== undefined) continue;
      timers.current.set(id, {
        handle: setTimeout(() => remove(id), timer.remaining),
        remaining: timer.remaining,
        startedAt: Date.now(),
      });
    }
  }, [remove]);

  // A provider torn down with toasts in flight must not fire into a dead tree.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) {
        if (timer.handle !== undefined) clearTimeout(timer.handle);
      }
      pending.clear();
    };
  }, []);

  const handle = useMemo<ToastHandle>(
    () => ({ show, announce, dismiss: remove, clear }),
    [show, announce, remove, clear],
  );

  return (
    <ToastContext.Provider value={handle}>
      {children}
      <div
        onPointerEnter={pause}
        onPointerLeave={resume}
        onFocusCapture={pause}
        onBlurCapture={resume}
      >
        <ToastRegion {...regionProps} placement={placement}>
          {toasts.map((t) => (
            <Toast
              key={t.id}
              variant={t.variant}
              action={t.action}
              politeness={t.politeness}
              statusLabel={t.statusLabel}
              onDismiss={() => remove(t.id)}
            >
              {t.message}
            </Toast>
          ))}
          {announcements.map((a) => (
            <Announcement key={a.id} politeness={a.politeness}>
              {a.message}
            </Announcement>
          ))}
        </ToastRegion>
      </div>
    </ToastContext.Provider>
  );
}
