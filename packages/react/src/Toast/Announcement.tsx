import type { ReactNode } from "react";
import type { ToastPoliteness } from "./Toast.js";

export interface AnnouncementProps {
  /** Which of ToastRegion's two live wrappers speaks it. @default "polite" */
  politeness?: ToastPoliteness;
  /** The text to announce. */
  children: ReactNode;
}

/** Text for a screen reader only, spoken through ToastRegion (D83).
 *
 * **It is not a live region.** It renders no `role` and no `aria-live`, and
 * outside a ToastRegion it announces nothing — the region's two persistent
 * wrappers are the only live regions, and an Announcement is content for one
 * of them. Do not use it as a second announcer.
 *
 * Use it where an event must be spoken and there is nothing to show: a state
 * change of the object on screen, or field errors the form already displays.
 *
 * `politeness` is not read here. ToastRegion reads it off the element to pick
 * a wrapper, the same way it reads a Toast's.
 *
 * The usual way to render one is `useToast().announce(message)` (D91), which
 * puts it in ToastProvider's region and gives it a lifetime: it leaves one
 * second (the dwell) after it was added, and a later announcement does not
 * remove it early — removing a node just after it was added can cut its
 * speech, and the region's non-atomic wrappers (D90) speak each added node on
 * its own. It never counts against the provider's toast `limit`.
 *
 * Rendered by hand, it is controlled, like Toast: it holds no state and never
 * removes itself, so follow the same rule — remove it after a one-second
 * dwell, not before. To announce the same text again, remove it and render it
 * again with a new `key` — a live region speaks changes, and an unchanged node
 * is not one.
 *
 * It takes no `className`: the one thing a class could do to it is make it
 * visible, and then it is a Toast. */
export function Announcement({ children }: AnnouncementProps) {
  return (
    <div className="psi-sr-only" data-psi-announcement>
      {children}
    </div>
  );
}
