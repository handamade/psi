# Focus return: a Dialog removed while open, and a dismissed toast that held focus (D136)

Date: 2026-11-18. Status: **Accepted**, building on branch
`claude/d136-focus-return-fee43a`.

**The number.** D136 was checked free on every local branch, every branch on
`origin` and every open PR on 2026-11-18, before writing. D134 (the Combobox
follow-up) and D135 (Field wiring) belong to sessions running beside this
one. **Check again when the PR opens.**

## What's there today

Measured in this worktree's Storybook build, Chromium 149 (Playwright), on the
0.34.0 code. Both stories and both specs are new in this change, written to
fail first.

1. **The platform restores focus on `close()` only.** A bare page: a button
   focused, a `<dialog>` appended and `showModal()`-ed (focus moves to its
   first button), then the dialog removed. `document.activeElement` is
   **`BODY`** at once and stays there. The same dialog closed with `close()`
   first returns focus to the button.
2. **`Dialog` inherits that.** `Components/Dialog`, `RemovedWhileOpen` renders
   `{open && <Dialog open onClose={() => setOpen(false)} … />}`, the shape
   most consumers write. Opened with Enter on "Edit profile", then:
   - Escape → `onClose("esc")` → the consumer drops the element → focus on
     **`BODY`**.
   - The footer's Save, which sets `open` to false → focus on **`BODY`**.

   `Dialog`'s effect calls `close()` when `open` turns false while mounted,
   and nothing when the component unmounts with the dialog open. Every
   dismissal in this shape is a removal.
3. **A removed focused element fires `focusout` first.** In Chromium, removing
   a focused button dispatches `blur` and `focusout` with `relatedTarget:
   null` while the node is still connected; focus then sits on `BODY`. Firefox
   fires nothing on removal. Code that waits for a `focusout` to learn that
   focus left cannot tell a removal from a blur to nothing.
4. **`Toast`: dismissing the focused toast drops focus to the page.**
   `Feedback/Toast`, `DismissFocused`: a `ToastProvider` with timers out of
   reach, and a "Save draft" button that raises one neutral toast per press.
   - Two toasts, Tab into the first's dismiss button, Enter → **`BODY`**.
   - Three toasts, focus on the third (last) dismiss, Enter → **`BODY`**.
   - Three toasts (the limit), focus on the first, a fourth raised without
     moving focus: the first is evicted → **`BODY`**. That is the queue
     removing a focused toast by itself, as a timer would.
5. **Where Tab goes from `BODY`.** Chromium keeps the sequential focus
   navigation starting point where the removed node was, so the next Tab
   still lands near the toasts. A screen reader has no such memory: the
   virtual cursor goes to the top of the page, and the user hears nothing to
   say the toast is gone.

## Best practice consulted

- **HTML.** The dialog's "previously focused element" is restored by the
  close steps. Removing an open dialog runs the removing steps, which take it
  out of the top layer and restore nothing.
- **React Aria, `useToastRegion`** (read on `main`, 2026-11-18). A focused
  toast that is removed hands focus to a neighbouring toast; in pointer
  modality it goes to the element focused before the region instead,
  "otherwise auto-dismiss timers will appear stuck". When the visible toasts
  reach zero, focus returns to that element. The region has `tabIndex={-1}`.
- **Radix Toast.** Closing a focused toast focuses the viewport (the region,
  `tabIndex={-1}`); F8 moves focus to it.
- **D131, `Menu`.** A removed focused item hands focus to the item now at its
  position, or the new last; an emptied menu focuses itself. A
  `MutationObserver` on the popup sees the removal, and only acts when focus
  was in the removed node and has not gone elsewhere.

## Decisions

### D136 — A Dialog removed while open closes first, so focus returns to its opener; a toast that held focus hands it to the toast at its position, then back to where it came from

**Dialog (P114's defect)**
- Unmounting a `Dialog` whose `<dialog>` is open calls `close()` on it from a
  layout-effect cleanup. React runs a component's layout cleanups before it
  removes that component's host nodes, so `close()` runs on a connected
  dialog, and the platform's own restore moves focus to the opener.
  - Why the platform's restore, not a stored ref: it already knows the
    opener, skips one that is gone or disabled, and is the same path the
    controlled close (`open={false}`) takes. One rule, two routes.
  - `close()` fires a `close` event; `Dialog` reports no reason for it, as on
    the controlled close (D50). `onClose` is not called: the consumer removed
    the dialog, so there is nothing to report.
  - The scroll lock is released by its own effect's cleanup, as before.
  - Under `<StrictMode>`, the simulated unmount closes the dialog and the
    re-run of the open effect shows it again. A hidden `<Activity>` closes
    it too, which a modal that is no longer visible needs.
- **Nothing else changes.** `open={false}` still closes in the open effect;
  `initialFocus` (D101) still wins after `showModal()`.

**Toast (P151's defect)**
- `ToastRegion` owns the rule, because both routes run through it: the
  `ToastProvider` queue (dismiss, timer, eviction, `clear()`, `dismiss(id)`)
  and a stack composed by hand. It watches its own subtree with a
  `MutationObserver`, as Menu does (D131), and acts only when the element that
  held focus is no longer connected and focus has not gone anywhere else (it
  is on `BODY` or nothing).
- **Where focus goes**, in order:
  1. **The toast now at the removed one's position**, or the new last if it
     was last: its dismiss button, else its first focusable control. Toasts
     with nothing focusable are passed over, forward first, then back.
     "Position" is DOM order across the region's two live wrappers, counted
     from the stack as it was before the removal.
  2. **The element that had focus before focus entered the region**, when no
     toast is left to take it. Skipped if it is gone or no longer focusable.
  3. **The region itself** (`tabindex="-1"`), when both are missing. The
     region is a named landmark, so a screen reader says where the user is,
     and the next Tab continues from the stack's place in the page.
- **A pointer dismissal goes to step 2 first.** If the last input inside the
  region before the removal was a `pointerdown`, focus returns to the element
  before the region when there is one, and only otherwise follows the order
  above. A mouse user who clicked a toast's X is leaving the stack; leaving
  focus in the next toast would hold every timer paused (WCAG 2.2.1 pause on
  focus) after the pointer has gone. React Aria makes the same split for the
  same reason.
- **Why the next toast for the keyboard, and not straight back.** A keyboard
  user reaches the stack by Tab, at the end of the page. Sending them back to
  where they came from after each dismissal makes clearing three toasts three
  long trips. The next toast keeps them where they chose to be, and the stack
  empties into the element they left: step 2 is the "where they came from" the
  row asks about, just not before the stack is done. Same position, then the
  new last, is D131's rule, so Menu and the stack behave alike.
- **Why not a landmark first.** The outside consumer moves focus to the page's
  `h1`. That works for its pages and is a guess for anyone else's: Psi doesn't
  know a page's headings. The region is the one landmark Psi owns, and it is
  only the last resort.
- **Remembering the way in.** A `focusin` inside the region whose
  `relatedTarget` is outside it records that element. A `focusin` with no
  `relatedTarget` that enters the region (from nothing) records nothing.
  Focus leaving to another element forgets the toast that had focus; a
  `focusout` to nothing forgets it too, unless the toast is disconnected by
  the next microtask, which is how a removal (finding 3) is told apart from a
  blur.
- **The dismiss button is marked** `data-psi-toast-dismiss`, so step 1 can
  find it without reading its label. No visual change.
- **The region's focus shows a ring** on `:focus-visible`, as an emptied
  Menu's does (D131): `--psi-toast-focus-ring`, bound to
  `--psi-border-focus` like Menu's ring (D82), so no new contrast pair. A
  ring-less focus was the first draft; the house `psi/focus-ring` lint
  rejects it, and rightly: a sighted keyboard user would not see where focus
  went.

**What this does not change**
- The provider's pause and resume (P153's defect: one flag for pointer and
  focus) are untouched. With this rule, focus that leaves a toast either
  lands in another toast (still paused, correctly) or leaves the region as
  the stack empties, so no timer is left paused by it in Chromium. In Firefox,
  which fires no `focusout` on removal, the provider's flag can still stay
  set; that belongs to P153.
- Toast order, politeness routing (D83), announcements (D91) and the top
  layer (D64) are unchanged.

## Tests and gates

- **Real browser, reproduced before the fix** (both fail on `BODY` today):
  - `apps/storybook/vr/dialog-focus.interaction.spec.ts`: Escape, and a footer
    button, on `RemovedWhileOpen` return focus to "Edit profile"; the scroll
    lock is released.
  - `apps/storybook/vr/toast-focus.interaction.spec.ts` on `DismissFocused`:
    Enter on the first of two → the second's dismiss → Enter → "Save draft";
    the last of three → the new last; a focused toast evicted by a fourth →
    the toast now first; a mouse click on the first of two → "Save draft".
- **Unit (jsdom)**:
  - `Dialog`: unmounting while open calls `close()` while the element is
    still connected, and does nothing when it is already closed.
  - `ToastRegion`, composed by hand: same position; new last; a toast with no
    controls passed over; the stack emptied → the element before the region;
    that element gone → the region; focus moved elsewhere first → left alone;
    pointer dismissal → the element before the region.
  - `ToastProvider`: `dismiss(id)` on the focused toast hands focus on.
- Two new stories, so four new `vr` baselines (light and ember). Each shows
  the opener alone. CI's renders go to the user before they are committed.
- All five gates: `pnpm build && node tools/check-docs-drift.mjs && pnpm test
  && pnpm lint && pnpm --dir apps/site build && CI=1 pnpm test:site`.

## What this changes

- **P114**: `{open && <Dialog open />}` returns focus to the opener on every
  dismissal. The consumer's own restore ("Removed while open") can go.
- **P151**: a dismissed, evicted or timed-out toast that held focus hands it
  to the next toast, then back to where the user was. The consumer's move to
  the page's `h1` ("A removed toast") can go; focus now lands on the opener
  instead, or on the region when the opener is gone.
- One new attribute in the DOM (`data-psi-toast-dismiss`), one on the
  region (`tabindex="-1"`) and one token (`--psi-toast-focus-ring`). No new
  props.

## Follow-ups

1. **P153**, unchanged here: the provider's single pause flag; Firefox's
   missing `focusout` on removal can leave it set.
2. **P165**, `Tag`'s dismiss: the same question of where focus goes, with
   the same answer available (the next tag, then where the user came from).
3. **`Banner`'s dismiss** may drop focus the same way; not measured here.
