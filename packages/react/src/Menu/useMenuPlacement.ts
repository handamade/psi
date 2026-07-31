import { useEffect } from "react";
import type { RefObject } from "react";
import type { Placement } from "./Menu.js";

/** True when the browser can place the popover declaratively. Above this
 * floor the hook is inert and CSS does all the work. */
function supportsAnchor(): boolean {
  return typeof CSS !== "undefined" && CSS.supports("anchor-name", "--x");
}

interface Options {
  popoverRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLDivElement | null>;
  open: boolean;
  placement: Placement;
  anchorName: string;
}

/** Placement for Menu (D53). Above the anchor floor this hook only declares
 * anchor-name / position-anchor and lets CSS position the popover. Below it,
 * a top-layer element's containing block is the viewport — there is no
 * declarative way to place it near its trigger — so this sets `inset` from
 * the trigger rect and keeps it current. That branch is dead code above the
 * anchor floor and is deletable outright once the floor rises. */
export function useMenuPlacement({ popoverRef, triggerRef, open, placement, anchorName }: Options) {
  // Declare the anchor relationship. Harmless where unsupported.
  useEffect(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;
    trigger.style.setProperty("anchor-name", anchorName);
    popover.style.setProperty("position-anchor", anchorName);
  }, [popoverRef, triggerRef, anchorName]);

  // Fallback branch: only below the anchor floor.
  useEffect(() => {
    if (!open || supportsAnchor()) return;
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;

    const place = () => {
      const rect = trigger.getBoundingClientRect();
      const below = placement.startsWith("bottom");
      const alignEnd = placement.endsWith("end");
      // getBoundingClientRect() is always physical, but "-start"/"-end" are
      // logical: "-start" pins the left edge in LTR and the right edge in
      // RTL; "-end" is the mirror. Read direction off the trigger (the
      // natural place to ask, since it's the element the menu is anchored
      // to) and flip which physical edge we pin accordingly.
      const rtl = getComputedStyle(trigger).direction === "rtl";
      const pinRight = alignEnd !== rtl;
      popover.style.position = "fixed";
      popover.style.top = below ? `${rect.bottom}px` : "";
      popover.style.bottom = below ? "" : `${window.innerHeight - rect.top}px`;
      popover.style.left = pinRight ? "" : `${rect.left}px`;
      popover.style.right = pinRight ? `${window.innerWidth - rect.right}px` : "";
    };

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, placement, popoverRef, triggerRef]);
}
