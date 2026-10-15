# A tooltip you can move onto (D105)

Date: 2026-10-15. Status: **Implemented** on branch `d105-tooltip-hoverable`.

Provenance: the UI polish triage after 0.26.0 (candidate B.6), carried as
known debt since the 0.22 handoff. WCAG 1.4.13 (Content on Hover or Focus)
asks that content shown on hover be *hoverable*: the pointer can move onto it
without it disappearing. `Tooltip` already meets the other two clauses: it is
*dismissable* (Escape) and *persistent* (it stays until hover or focus ends).

The number is the first free `## Decisions` entry when this branch started.
D104 was the highest claimed. "D105" had been used informally for a held
ProgressBar / Disclosure / FileUpload item, but was never claimed by a spec.

## What's there today

1. **The hover handlers sit on the trigger.** `Tooltip` clones its child with
   `onMouseEnter` and `onMouseLeave`. The bubble is a sibling of the trigger,
   not a descendant, so the pointer leaving the trigger for the bubble fires
   the trigger's `mouseleave`, and the bubble closes.
2. **The bubble ignores the pointer.** `.tooltip` sets `pointer-events: none`,
   so even a handler on the bubble would never see the pointer.
3. **There is a gap.** Each placement keeps a `--psi-space-4` margin between
   trigger and bubble, outside both boxes.

Measured in Chromium against the built Storybook (`components-tooltip--top`):
hover the trigger, wait for the bubble, move the pointer onto it in 8 steps.
The bubble is gone.

## Decisions

- **D105 — `Tooltip`'s hover handling moves to its wrapper, and the bubble
  takes the pointer, with a transparent bridge over the gap.**
  - **The wrapper owns hover.** `onMouseEnter` and `onMouseLeave` move from the
    cloned trigger to the wrapping `<span>`, which contains both the trigger
    and the bubble. Moving from one to the other stays inside the wrapper, so
    nothing leaves. Leaving both still closes at once, as before.
  - **The child's own mouse handlers are untouched.** The trigger is no
    longer cloned with mouse handlers, so a child's `onMouseEnter` and
    `onMouseLeave` run natively instead of through Psi's chaining. Focus and
    blur stay on the trigger: focus is the trigger's, not the wrapper's.
  - **The bubble takes the pointer.** `pointer-events: none` goes.
  - **A bridge.** `.tooltip::before` is an absolutely positioned, transparent
    box covering the `--psi-space-4` gap on the trigger side, one rule per
    placement. It is part of the bubble, so the pointer crossing the gap is
    still inside the wrapper. It paints nothing.
  - **The 150ms open delay stays,** and focus still opens at once.

  **Why this changes no pixel.** The bubble's box, margin, colours and text are
  unchanged; the bridge is transparent; `pointer-events` and the cursor are not
  captured by a screenshot. Every Tooltip VR baseline should hold at 0
  differing pixels.

  Weighed and not taken:

  - **A close delay instead of a bridge.** A grace period (say 100ms) would
    also let the pointer cross the gap, but a slow pointer loses it, and every
    close becomes asynchronous. The bridge is geometric and exact.
  - **Remove the gap.** It would move every Tooltip baseline for no gain the
    bridge does not already give.
  - **Handlers on the bubble too.** Unneeded once the wrapper owns hover, and
    two enter/leave sources would race.

## Consequences

- Text in a tooltip can be read with a screen magnifier that follows the
  pointer, which is the user 1.4.13 protects.
- A bubble now covers what is under it for the pointer as well as visually.
  It is short-lived and small, and it closes when the pointer leaves it.

## Verification

- **Tests first**, red before the change, on assertion, in `Tooltip.test.tsx`:
  - The bubble stays open when the pointer moves from the trigger onto it.
  - It closes when the pointer leaves both.
  - A child's own `onMouseEnter` still runs, and its hover still opens the
    bubble.
  - The module no longer sets `pointer-events: none` on `.tooltip`, and each
    placement has a `::before` bridge the size of the gap.
- **`tooltip.interaction.spec.ts` (`@interaction`)**: in Chromium, hover the
  trigger, move onto the bubble in steps, and the bubble is still visible for
  every placement; move away, and it is gone.
- VR: no baseline moves.
