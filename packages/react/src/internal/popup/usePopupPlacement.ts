import { useEffect } from "react";
import type { RefObject } from "react";

/** Where a popup sits against its anchor. "-start" and "-end" are logical:
 * "-start" lines the popup up with the anchor's inline-start edge. */
export type PopupPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

/** True when the browser can place the popover declaratively. Above this
 * floor the placement is CSS's and the fallback branch below is inert. */
function supportsAnchor(): boolean {
  return typeof CSS !== "undefined" && CSS.supports("anchor-name", "--x");
}

/** True when `anchor-size()` is usable in a sizing property. */
function supportsAnchorSize(): boolean {
  return typeof CSS !== "undefined" && CSS.supports("min-inline-size", "anchor-size(width)");
}

interface Options {
  popoverRef: RefObject<HTMLElement | null>;
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  placement: PopupPlacement;
  anchorName: string;
  /** Make the popup at least as wide as its anchor (D130). */
  matchWidth?: boolean;
}

/** The block-axis margin, padding and border of an element, in px: what sits
 * between its content box and the edge of the room it is placed in. */
function blockChrome(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  const px = (v: string) => Number.parseFloat(v) || 0;
  return (
    px(cs.marginTop) + px(cs.marginBottom) +
    px(cs.paddingTop) + px(cs.paddingBottom) +
    px(cs.borderTopWidth) + px(cs.borderBottomWidth)
  );
}

/** Placement for an anchored popup (D53; moved out of Menu by D130).
 *
 * Above the anchor floor this hook only declares anchor-name /
 * position-anchor and lets CSS position the popover. Below it, a top-layer
 * element's containing block is the viewport — there is no declarative way to
 * place it near its anchor — so this sets `inset` from the anchor's rect and
 * keeps it current. That branch is dead code above the anchor floor and is
 * deletable outright once the floor rises.
 *
 * The fallback doesn't flip. It does keep the popup inside the window on its
 * own side (D131): when the room there is less than the popup's CSS
 * `max-block-size`, it caps the popup at the room.
 *
 * `matchWidth` (D130): `min-inline-size: anchor-size(width)` where
 * `anchor-size()` is supported, the anchor's measured width elsewhere. */
export function usePopupPlacement({
  popoverRef,
  anchorRef,
  open,
  placement,
  anchorName,
  matchWidth = false,
}: Options) {
  // Declare the anchor relationship. Harmless where unsupported.
  useEffect(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;
    anchor.style.setProperty("anchor-name", anchorName);
    popover.style.setProperty("position-anchor", anchorName);
  }, [popoverRef, anchorRef, anchorName]);

  // The declarative width, where anchor-size() exists.
  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover || !matchWidth || !supportsAnchorSize()) return;
    popover.style.setProperty("min-inline-size", "anchor-size(width)");
    return () => {
      popover.style.removeProperty("min-inline-size");
    };
  }, [popoverRef, matchWidth]);

  // Fallback branch: below the anchor floor, and for matchWidth where
  // anchor-size() is missing.
  useEffect(() => {
    const placeByScript = !supportsAnchor();
    const sizeByScript = matchWidth && !supportsAnchorSize();
    if (!open || (!placeByScript && !sizeByScript)) return;
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const place = () => {
      const rect = anchor.getBoundingClientRect();
      if (sizeByScript) popover.style.minInlineSize = `${rect.width}px`;
      if (!placeByScript) return;

      const below = placement.startsWith("bottom");
      const alignEnd = placement.endsWith("end");
      // getBoundingClientRect() is always physical, but "-start"/"-end" are
      // logical: "-start" pins the left edge in LTR and the right edge in
      // RTL; "-end" is the mirror. Read direction off the anchor (the
      // natural place to ask, since it's the element the popup is anchored
      // to) and flip which physical edge we pin accordingly.
      const rtl = getComputedStyle(anchor).direction === "rtl";
      const pinRight = alignEnd !== rtl;
      popover.style.position = "fixed";
      popover.style.top = below ? `${rect.bottom}px` : "";
      popover.style.bottom = below ? "" : `${window.innerHeight - rect.top}px`;
      popover.style.left = pinRight ? "" : `${rect.left}px`;
      popover.style.right = pinRight ? `${window.innerWidth - rect.right}px` : "";

      // D131: keep the popup inside the window on its own side. Read the CSS
      // cap with the inline one cleared, so a previous pass doesn't stick.
      popover.style.maxBlockSize = "";
      const cssCap = Number.parseFloat(getComputedStyle(popover).maxHeight);
      const room = (below ? window.innerHeight - rect.bottom : rect.top) - blockChrome(popover);
      if (Number.isFinite(cssCap) && room < cssCap) {
        popover.style.maxBlockSize = `${Math.max(0, room)}px`;
      }
    };

    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, placement, matchWidth, popoverRef, anchorRef]);
}
