import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Toast } from "./Toast.js";
import type { ToastVariant } from "./Toast.js";
import { ToastRegion } from "./ToastRegion.js";
import type { ToastPlacement } from "./ToastRegion.js";
import { ToastContext } from "./useToast.js";
import type { ToastHandle, ToastOptions } from "./useToast.js";

export interface ToastProviderProps {
  /** Max simultaneous toasts; the oldest is evicted first. @default 3 */
  limit?: number;
  /** Auto-dismiss for toasts with no action, in ms. @default 5000 */
  duration?: number;
  /** Auto-dismiss for toasts carrying an action, in ms. An affordance that
   * vanishes before it can be reached is not an affordance. @default 10000 */
  actionDuration?: number;
  /** Corner the stack occupies. @default "bottom-end" */
  placement?: ToastPlacement;
  children: ReactNode;
}

interface QueuedToast {
  id: string;
  variant: ToastVariant;
  message: ReactNode;
  action?: ReactNode;
  /** Total lifetime for this toast, chosen at show() time. */
  duration: number;
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
 * mouse. */
export function ToastProvider({
  limit = 3,
  duration = 5000,
  actionDuration = 10000,
  placement = "bottom-end",
  children,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<QueuedToast[]>([]);
  const timers = useRef(new Map<string, TimerState>());
  const pausedRef = useRef(false);
  const seq = useRef(0);
  const idPrefix = useId();

  const remove = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer?.handle !== undefined) clearTimeout(timer.handle);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
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
    ({ variant = "neutral", message, action }: ToastOptions): string => {
      const id = `${idPrefix}-${seq.current++}`;
      const lifetime = action != null ? actionDuration : duration;

      setToasts((prev) => {
        const next = [...prev, { id, variant, message, action, duration: lifetime }];
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

  const clear = useCallback(() => {
    for (const timer of timers.current.values()) {
      if (timer.handle !== undefined) clearTimeout(timer.handle);
    }
    timers.current.clear();
    setToasts([]);
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
    () => ({ show, dismiss: remove, clear }),
    [show, remove, clear],
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
        <ToastRegion placement={placement}>
          {toasts.map((t) => (
            <Toast key={t.id} variant={t.variant} action={t.action} onDismiss={() => remove(t.id)}>
              {t.message}
            </Toast>
          ))}
        </ToastRegion>
      </div>
    </ToastContext.Provider>
  );
}
