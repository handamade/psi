import { Children, isValidElement, useEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { Announcement } from "./Announcement.js";
import { Toast } from "./Toast.js";
import type { ToastPoliteness, ToastVariant } from "./Toast.js";
import styles from "./toast.module.css";

export type ToastPlacement = "top-start" | "top-end" | "bottom-start" | "bottom-end";

export interface ToastRegionProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Corner the stack occupies. @default "bottom-end" */
  placement?: ToastPlacement;
  /** Accessible name for the region. @default "Notifications" */
  "aria-label"?: string;
  /** The stack — `Toast` and `Announcement` elements, each routed to a live
   * wrapper by its `politeness`, or by a Toast's variant when it names none. */
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the region element. */
  ref?: Ref<HTMLDivElement>;
}

const ASSERTIVE: ReadonlySet<ToastVariant> = new Set<ToastVariant>(["warning", "danger"]);

/** True when this child belongs in the assertive wrapper. A Toast or an
 * Announcement that names its `politeness` decides for itself (D83); a Toast
 * that does not falls back to its variant (D64). Anything else is polite —
 * the region must not throw on unexpected children. */
function isAssertive(child: ReactNode): boolean {
  if (!isValidElement(child)) return false;
  if (child.type !== Toast && child.type !== Announcement) return false;
  const { politeness, variant } = child.props as {
    politeness?: ToastPoliteness;
    variant?: ToastVariant;
  };
  if (politeness !== undefined) return politeness === "assertive";
  return child.type === Toast && ASSERTIVE.has(variant ?? "neutral");
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
 * Routing reads `politeness`, then `variant`, off each child — the same
 * Children.map technique Table uses for select-all injection. `politeness`
 * wins (D83): the owner of an announcement knows what kind of event it is,
 * and tone is only the default.
 *
 * Consequence of the split, visible in the `InRegion` VR baseline: the stack is
 * grouped by politeness, not strictly chronological — every assertive toast
 * sorts below every polite one regardless of arrival order. Chronological order
 * is preserved *within* each group. Keeping it exact across both would mean one
 * live region with a politeness that changes per message, which is the thing
 * the two wrappers exist to avoid. Accepted: at `limit` 3 the grouping reads as
 * severity ordering, and the newest toast still lands nearest the screen edge
 * within its group.
 *
 * Remaining HTML attributes, `data-*` included, are spread onto the root
 * element (D83). That is how an application marks the region
 * `data-react-aria-top-layer`, so that a React Aria overlay — which hides
 * everything outside itself with `aria-hidden` — leaves the two live regions
 * exposed. The region's own attributes always win. */
export function ToastRegion({
  placement = "bottom-end",
  "aria-label": ariaLabel = "Notifications",
  children,
  className,
  ref,
  ...rest
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
      // Spread first, so nothing passed in can displace the attributes below.
      {...rest}
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
