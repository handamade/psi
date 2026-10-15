# A menu with the full menu-button keyboard (D102)

Date: 2026-10-15. Status: **Implemented** on branch `d102-menu-button-keyboard`.

Provenance: tier 2 of the Psi 0.22 portal handoff (its proposed "D96",
renumbered), which also closes the 0.23 handoff's N6. The portal records it as
`gap-menu-tab` (components.md:439): "`Menu` does nothing on *Tab*: focus
leaves the menu and the menu stays open over the page."

The number is the first free `## Decisions` entry when this branch started.
D101 (the dialog's initial focus) is claimed by its open PR.

## What's there today

1. **The trigger carries `aria-haspopup` and `aria-expanded` only.**
   `Menu` clones it with those two. It has no `aria-controls`, so assistive
   technology cannot tell which element the button opens.
2. **The arrows work only inside an open menu.** *Arrow Down* and *Arrow Up*
   on the focused trigger do nothing (`useMenuKeyboard.ts` handles keys on
   the popover only). *Enter* and *Space* open it, because they click the
   trigger, which runs the consumer's `onClick`.
3. ***Tab* leaves an open menu open.** Focus moves on to the next control,
   and the menu stays painted over the page until a click outside dismisses
   it.
4. **`Menu` is controlled-only (D50).** It never opens or closes itself. It
   *reports* a dismissal through `onClose(reason)`, with
   `reason` one of `"esc" | "outside" | "item-select"`.

## Decisions

- **D102 — The trigger names the menu it controls, *Arrow Down* and *Arrow
  Up* on a closed trigger open the menu on its first or last item, and
  *Tab* reports a dismissal with a new reason, `"tab"`.**
  - **`aria-controls`.** The menu element gets an id (generated, or the
    `id` a consumer passes), and the trigger's clone gets
    `aria-controls` with it, beside `aria-haspopup` and `aria-expanded`.
  - **Arrows on a closed trigger click it.** `Menu` cannot open itself, so
    on *Arrow Down* or *Arrow Up* while `open` is false it calls `click()`
    on the trigger's focusable node, the same activation *Enter* and *Space*
    already perform. The consumer's `onClick` runs and flips `open`, and no
    new prop is needed. *Arrow Down* lands on the first enabled item, as
    opening already does. *Arrow Up* lands on the last: `Menu` records which
    end was asked for, and the open effect reads it once. The keys are
    handled on the trigger's wrapper, so a consumer's own `onKeyDown` on the
    trigger still runs. A disabled trigger does not fire `click`, so the
    arrows do nothing there, as a click would.
  - **`"tab"`: *Tab* (and *Shift Tab*) inside an open menu reports
    `onClose("tab")`** and does not prevent the default, so focus moves on
    to the next control in document order as the browser would move it. The
    consumer flips `open`. Focus is no longer inside the menu by then, so the
    existing close effect does not pull it back to the trigger. That rule,
    written for a light dismiss, holds here unchanged.

  **Why this is a fix.** The WAI-ARIA menu button pattern asks for all three,
  and the portal's action-menu guarantee and its `gap-menu-tab` row ask for
  *Tab*. A menu left open after focus has left it is a defect, not a
  behaviour to keep.

  **The one compatibility cost: `onClose`'s reason union widens to
  `"esc" | "outside" | "item-select" | "tab"`.** A consumer that writes
  `onClose={(reason) => …}` or ignores the reason is unaffected. One that
  switches exhaustively over the reason gets a type error at the new case,
  which is the point: it now has a dismissal to handle. A consumer that
  declares the old union on its own handler's parameter gets a type error
  too. Measured: this repo's promo Playground was such a consumer and failed
  the build. The union is therefore exported as `MenuCloseReason`, so an
  annotated handler names the type instead of restating it, and the next
  reason reaches it without an edit. It is a minor version under 0.x.

  Weighed and not taken:

  - **A new `onOpenRequest(focus)` prop.** It is the more explicit API, but it
    makes every consumer wire a second callback to get keys that *Enter*
    already gets through `onClick`. Clicking the trigger reuses the wiring
    every Menu already has.
  - **Report *Tab* as `"outside"`.** That reason means "the platform already
    hid the popover", and a consumer may rely on it. *Tab* closes nothing by
    itself, so it gets its own name.
  - **Close on focus leaving the popover (`focusout`).** It would also fire
    on a click inside a nested control and when the window loses focus. The
    key is the user's intent, and it is the brief.
  - **Move focus to the trigger on *Tab*.** The pattern lets focus continue
    to the next control. Pulling it back would undo the user's *Tab*.

## Consequences

- A keyboard user can open a menu from its button with the arrows, and
  leave it with *Tab* without leaving it painted over the page.
- `gap-menu-tab` closes on the portal side after the pin. Its handler
  already sets `open` to false on every reason.

## Verification

- **Tests first**, red before the change, on assertion:
  - The trigger has `aria-controls` equal to the menu element's id, and a
    consumer `id` on `Menu` is kept.
  - *Arrow Down* on a closed trigger opens a controlled menu (its `onClick`
    runs) with focus on the first enabled item. *Arrow Up* opens it on the
    last enabled item.
  - *Arrow Down* on the trigger of an open menu does not click it again.
  - *Tab* and *Shift Tab* on an item report `onClose("tab")` and do not
    prevent the default. After the consumer closes, focus is not moved back
    to the trigger.
  - Regression guards: *Escape*, item selection, light dismiss and the
    roving keys are unchanged.
- `apps/storybook/vr/menu.interaction.spec.ts` gains a browser case: *Arrow
  Down* on the trigger opens the menu on the first item, and *Tab* closes it
  with focus on the next control.
