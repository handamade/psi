import { Children, isValidElement, useEffect, useRef } from "react";
import type { ReactNode, Ref } from "react";
import { Toast } from "./Toast.js";
import type { ToastVariant } from "./Toast.js";
import styles from "./toast.module.css";

export type ToastPlacement = "top-start" | "top-end" | "bottom-start" | "bottom-end";

export interface ToastRegionProps {
  /** Corner the stack occupies. @default "bottom-end" */
  placement?: ToastPlacement;
  /** Accessible name for the region. @default "Notifications" */
  "aria-label"?: string;
  /** The toast stack — `Toast` elements, routed to a live wrapper by variant. */
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the region element. */
  ref?: Ref<HTMLDivElement>;
}

const ASSERTIVE: ReadonlySet<ToastVariant> = new Set<ToastVariant>(["warning", "danger"]);

/** True when this child is a Toast whose variant interrupts. Anything that is
 * not a Toast element falls through to polite — the region must not throw on
 * unexpected children. */
function isAssertive(child: ReactNode): boolean {
  if (!isValidElement(child) || child.type !== Toast) return false;
  const { variant } = child.props as { variant?: ToastVariant };
  return ASSERTIVE.has(variant ?? "neutral");
}

/** The positioned live region that holds the toast stack (D64).
 *
 * Two things here are load-bearing and both look like details:
 *
 * 1. **The two live wrappers are always rendered**, empty queue included. A
 *    live region announces mutations to a subtree that already existed; a
 *    wrapper that mounts together with its first toast reads as a new subtree,
 *    and that first toast is never announced.
 *
 * 2. **`popover="manual"`, not `"auto"`.** Manual puts the region in the
 *    native top layer without light dismiss. The top layer is required because
 *    Dialog uses showModal() — also top layer — so a fixed region at
 *    --psi-z-overlay would paint *under* the modal backdrop, hiding the
 *    confirmation for the action a user just took inside a dialog. And `auto`
 *    would be dismissed by the very click that raised the toast.
 *
 * Routing reads `variant` off each child, the same Children.map technique
 * Table uses for select-all injection.
 *
 * Consequence of the split, visible in the `InRegion` VR baseline: the stack is
 * grouped by politeness, not strictly chronological — every assertive toast
 * sorts below every polite one regardless of arrival order. Chronological order
 * is preserved *within* each group. Keeping it exact across both would mean one
 * live region with a politeness that changes per message, which is the thing
 * the two wrappers exist to avoid. Accepted: at `limit` 3 the grouping reads as
 * severity ordering, and the newest toast still lands nearest the screen edge
 * within its group. */
export function ToastRegion({
  placement = "bottom-end",
  "aria-label": ariaLabel = "Notifications",
  children,
  className,
  ref,
}: ToastRegionProps) {
  const innerRef = useRef<HTMLDivElement | null>(null);

  const setRef = (node: HTMLDivElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    // Manual popovers never close themselves, so this runs once and the region
    // stays in the top layer for the lifetime of the tree.
    el.showPopover?.();
    return () => {
      el.hidePopover?.();
    };
  }, []);

  const items = Children.toArray(children);
  const assertiveItems = items.filter(isAssertive);
  const politeItems = items.filter((c) => !isAssertive(c));

  // No re-stacking on queue change, deliberately. An earlier implementation
  // called hidePopover()+showPopover() whenever the stack changed, on the
  // theory that the top layer is insertion-ordered and a Dialog opened after
  // the region would cover it. Measured in Chromium
  // (apps/storybook/vr/toast.interaction.spec.ts): re-showing changes nothing,
  // because what blocks a toast under an open modal is not paint order but
  // `inert` — showModal() makes everything outside the dialog subtree
  // non-hit-testable, and no top-layer shuffling escapes that. The toast is
  // still *painted* above the backdrop and still announced; it just cannot be
  // clicked until the dialog closes. Re-showing only added churn.

  return (
    <div
      ref={setRef}
      popover="manual"
      aria-label={ariaLabel}
      data-placement={placement}
      data-psi-toast-region
      className={[styles.region, className].filter(Boolean).join(" ")}
    >
      <div role="status" aria-live="polite" className={styles.live}>
        {politeItems}
      </div>
      <div role="alert" aria-live="assertive" className={styles.live}>
        {assertiveItems}
      </div>
    </div>
  );
}
