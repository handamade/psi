import { Children, isValidElement, useEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { Announcement } from "./Announcement.js";
import { Toast } from "./Toast.js";
import type { ToastPoliteness, ToastVariant } from "./Toast.js";
import { handBackFocus, isFocusLost, useLatestRef } from "../internal/focus/focusReturn.js";
import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";
import styles from "./toast.module.css";

export type ToastPlacement = "top-start" | "top-end" | "bottom-start" | "bottom-end";

/** Why ToastRegion hands focus back (D147). */
export type ToastFocusReturnReason = "toast-removed";

/** The region is a `region` landmark (D90), named by `aria-label` — a name on a
 * role-less `div` is prohibited by ARIA — and `role` is not overridable. */
export interface ToastRegionProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Corner the stack occupies. @default "bottom-end" */
  placement?: ToastPlacement;
  /** Called when the toast that held focus is removed and Psi is about to hand
   * focus on (D147): `event.target` is where it is going. Focus your own
   * element in the handler to take over, or call `preventDefault()` to leave
   * focus where it is. Not called when focus had already gone elsewhere. See
   * the Focus guide. */
  onFocusReturn?: (event: FocusReturnEvent<ToastFocusReturnReason>) => void;
  /** Accessible name for the region landmark. @default "Notifications" */
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

const TOAST = "[data-psi-toast]";
const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function toastsIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TOAST));
}

/** A toast's dismiss button, else its first focusable control. */
function controlIn(toast: HTMLElement): HTMLElement | null {
  return (
    toast.querySelector<HTMLElement>("[data-psi-toast-dismiss]:not(:disabled)") ??
    toast.querySelector<HTMLElement>(FOCUSABLE)
  );
}

/** D136, step 1: a control in the toast now at the lost one's position (the
 * new last, if it was last), passing over toasts with nothing to focus —
 * forward first, then back. `before` is the stack as it was before the
 * removal; position counts the toasts ahead of the lost one that survived. */
function nextControl(before: HTMLElement[], now: HTMLElement[], lost: HTMLElement): HTMLElement | null {
  if (now.length === 0) return null;
  const lostToast = before.find((t) => t.contains(lost)) ?? null;
  let start: number;
  if (lostToast?.isConnected) start = now.indexOf(lostToast);
  else if (lostToast) start = before.slice(0, before.indexOf(lostToast)).filter((t) => t.isConnected).length;
  else start = now.length - 1;
  start = Math.min(Math.max(start, 0), now.length - 1);
  const order = [...now.slice(start), ...now.slice(0, start).reverse()];
  for (const toast of order) {
    const control = controlIn(toast);
    if (control) return control;
  }
  return null;
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
 * exposed. The region's own attributes always win — `role` included.
 *
 * **The region is a landmark, and the wrappers speak only what is new (D90).**
 * `role="region"` makes the `aria-label` legal (a name on a role-less `div` is
 * prohibited) and gives the stack a place in the landmark list. Both wrappers
 * set `aria-atomic="false"` explicitly: `role="status"` and `role="alert"`
 * carry an implicit `true`, which lets a screen reader re-speak everything
 * already in the wrapper whenever one message is added beside it.
 *
 * **A toast that held focus hands it on when it goes (D136).** To the toast now
 * at its position (its dismiss button, else its first control; the new last
 * if it was last), then, once the stack is empty, back to the element focused
 * before focus entered the region, then to the region itself
 * (`tabindex="-1"`). A pointer dismissal goes back first: a mouse user who
 * clicked an X is leaving the stack, and focus left in it would hold the
 * provider's timers paused. Focus the user moved elsewhere is left alone.
 * `onFocusReturn` sees the move, and can take it over or decline it (D147). */
export function ToastRegion({
  placement = "bottom-end",
  "aria-label": ariaLabel = "Notifications",
  children,
  onFocusReturn,
  className,
  ref,
  ...rest
}: ToastRegionProps) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const onFocusReturnRef = useLatestRef(onFocusReturn);

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

  // D136: a toast that held focus must not drop it to the page when it goes.
  // A MutationObserver sees every removal, whoever made it — a dismiss, a
  // timer, eviction past the limit, clear(), or a stack composed by hand — as
  // Menu's does for its items (D131). It acts only when the element that held
  // focus is gone and focus has gone nowhere else. See handOffFocus below.
  useEffect(() => {
    const root = innerRef.current;
    if (!root) return;
    let snapshot = toastsIn(root);
    // The element in the region that holds focus, while it does.
    let held: HTMLElement | null = null;
    // The element focused before focus entered the region, while focus is in it.
    let cameFrom: HTMLElement | null = null;
    // Whether the last input inside the region was a pointer press.
    let byPointer = false;

    const onFocusIn = (event: FocusEvent) => {
      const from = event.relatedTarget;
      if (from instanceof HTMLElement && !root.contains(from)) cameFrom = from;
      held = event.target as HTMLElement;
    };
    const onFocusOut = (event: FocusEvent) => {
      const to = event.relatedTarget;
      if (to instanceof Node) {
        if (!root.contains(to)) held = cameFrom = null;
        return;
      }
      // Focus to nothing: a blur, or (in Chromium) the focused node being
      // removed, which fires focusout while it is still connected. By the
      // next microtask a removed node is disconnected; a blurred one is not.
      const el = event.target as HTMLElement;
      queueMicrotask(() => {
        if (held === el && el.isConnected) held = cameFrom = null;
      });
    };
    const onPointerDown = () => {
      byPointer = true;
    };
    const onKeyDown = () => {
      byPointer = false;
    };

    const observer = new MutationObserver(() => {
      const before = snapshot;
      snapshot = toastsIn(root);
      if (!held || held.isConnected) return;
      const lost = held;
      held = null;
      // D147: focus went somewhere else first (a consumer moved it during its
      // own commit). Forget the region's state, so a later toast finds nothing
      // to hand back and cannot steal focus.
      if (!isFocusLost(lost)) {
        cameFrom = null;
        return;
      }
      const back = cameFrom?.isConnected ? cameFrom : null;
      const next = byPointer && back ? null : nextControl(before, snapshot, lost);
      const focused = handBackFocus({
        departing: lost,
        candidates: [next, back, root],
        reason: "toast-removed",
        onFocusReturn: onFocusReturnRef.current ?? undefined,
      });
      if (focused === back) cameFrom = null;
    });

    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("keydown", onKeyDown);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("keydown", onKeyDown);
      observer.disconnect();
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
      role="region"
      // D136: focusable by script only — the last place a removed toast's
      // focus can go. Never in the Tab order.
      tabIndex={-1}
      popover="manual"
      aria-label={ariaLabel}
      data-placement={placement}
      data-psi-toast-region
      className={[styles.region, className].filter(Boolean).join(" ")}
    >
      <div role="status" aria-live="polite" aria-atomic="false" className={styles.live}>
        {politeItems}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="false" className={styles.live}>
        {assertiveItems}
      </div>
    </div>
  );
}
