# A dialog that opens on the right control (D101)

Date: 2026-10-15. Status: **Implemented** on branch `d101-dialog-initial-focus`.

Provenance: tier 2 of the Psi 0.22 portal handoff
(`psi-handoffs/2026-10-07-psi-0.22-portal-handoff.md`, the brief it proposed
as "D95"; renumbered because D95 was claimed by the 0.23 handoff's N5). The
portal's dialog guarantee (portal architecture, `guarantee-dialog`) reads:
"*Escape* cancels; the default action of a consequential dialog is
*Cancel*." Psi's `Dialog` can do neither for a confirmation today.

The number is the first free `## Decisions` entry when this branch started
(D100 was the highest).

## What's there today

1. **No initial-focus control.** `showModal()` focuses the first focusable
   descendant. With a title, that is the icon-only *Close dialog* button in
   the header. In a confirmation, the first control the user lands on is not
   *Cancel*.
2. **React's `autoFocus` does not help.** React focuses an `autoFocus` element
   when it mounts and does not write the attribute. The dialog's content
   mounts while the `<dialog>` is closed, so the focus is lost, and
   `showModal()` then picks the first control as before.
3. **`dismissible={false}` couples three things.** It removes the close
   button, swallows *Escape*, and swallows a backdrop click. A confirmation
   that wants no close button therefore also loses *Escape*, which the
   portal's guarantee requires.
4. **The close button is icon-only**, named *Close dialog* by `aria-label`.

## Decisions

- **D101 — `Dialog` takes an `initialFocus` ref, *Escape* gets its own
  setting, and the close button can carry visible text. Every default stays
  as today.**
  - **`initialFocus?: RefObject<HTMLElement | null>`.** After `showModal()`,
    `Dialog` focuses `initialFocus.current` if it is set. That runs on every
    open, after the platform's own focusing, so it wins. Without the prop,
    the platform's choice stands as before. A ref, not a selector or an id,
    because the consumer already holds the element (`<Button ref={cancelRef}>`)
    and a ref cannot point outside the dialog by accident of a duplicate id.
  - **`closeOnEscape?: boolean`, defaulting to `dismissible`.** It decides
    whether *Escape* reports `onClose("esc")`. `dismissible` still governs the
    close button and the backdrop. A consequential confirmation is written
    `<Dialog dismissible={false} closeOnEscape initialFocus={cancelRef}>`: no
    close button, no backdrop dismissal, *Escape* cancels, and focus starts
    on *Cancel*. With the defaults, every existing dialog behaves exactly as
    before. In both cases the platform's own Escape close is still prevented,
    so `open` stays controlled (D50).
  - **`closeLabel?: string`.** When set, the close button is a ghost `Button`
    showing that text instead of the icon-only `IconButton`, and still
    reports `onClose("close-button")`. Without it, the icon button and its
    *Close dialog* name are unchanged.
  - **No backdrop setting.** The portal asks for *Escape*, not for a click
    outside, and a stray click cancelling a consequential dialog is worse
    than a keypress that means "cancel". It follows `dismissible`, as today.

  **Why no default changes.** All three props are new and optional. Their
  absence reproduces today's behaviour: the platform's focus,
  *Escape* following `dismissible`, and the icon-only close button.

  Weighed and not taken:

  - **Rely on `autoFocus`.** It does not work for content mounted inside a
    closed `<dialog>` (above). Making it work would mean writing the native
    attribute through every Psi control. A ref is one prop on `Dialog`.
  - **Split `dismissible` into three booleans.** Only *Escape* has a named
    need. One new setting keeps the umbrella prop meaningful.
  - **Focus the footer's first button by default.** That changes every
    existing dialog, and the right control depends on the dialog: *Cancel*
    for a consequential one, a field for a form.

## Consequences

- A confirmation can start on *Cancel* and still answer *Escape*, as the
  portal's guarantee requires, without a close button.
- `llms.txt` gains the confirmation recipe. The `destructive-confirm`
  pattern is unchanged: its compose tree cannot hold a ref.

## Verification

- **Tests first**, red before the change, on assertion, in `Dialog.test.tsx`:
  - With `initialFocus`, the referenced button has focus after open, and
    after a close and a reopen.
  - `dismissible={false} closeOnEscape`: *Escape* reports `onClose("esc")`,
    there is no close button, and a backdrop click reports nothing.
  - `closeOnEscape={false}` on a dismissible dialog: *Escape* reports
    nothing, and the close button still works.
  - `closeLabel="Close"`: the close button shows the text, is named by it,
    and reports `onClose("close-button")`.
  - Regression guards: the existing tests for the defaults.
- `a11y.axe.test.tsx`: a dialog with a text close button passes axe.
- Two stories, `ConsequentialConfirm` and `TextCloseButton`, and their VR
  baselines from CI.
