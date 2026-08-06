import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { ToastVariant } from "./Toast.js";

export interface ToastOptions {
  /** @default "neutral" */
  variant?: ToastVariant;
  /** The message body. */
  message: ReactNode;
  /** Trailing affordance — a ghost Button. Its presence also selects the
   * longer auto-dismiss (`actionDuration`). */
  action?: ReactNode;
}

export interface ToastHandle {
  /** Queue a toast; returns its id. */
  show: (toast: ToastOptions) => string;
  /** Remove one toast by id. No-op if it has already gone. */
  dismiss: (id: string) => void;
  /** Remove every queued toast. */
  clear: () => void;
}

export const ToastContext = createContext<ToastHandle | null>(null);

/** Imperative handle onto the nearest ToastProvider's queue (D65).
 *
 * Throws rather than returning a no-op when there is no provider: a silent
 * handle would make a missing provider look like a broken toast, and the
 * failure would surface far from its cause. */
export function useToast(): ToastHandle {
  const handle = useContext(ToastContext);
  if (!handle) {
    throw new Error(
      "Psi useToast: no ToastProvider found. Wrap your app (or the subtree that " +
        "raises toasts) in <ToastProvider> — it owns the queue, the auto-dismiss " +
        "timers and the single ToastRegion.",
    );
  }
  return handle;
}
