# A menu holds a line of text that is not an action (D99)

Date: 2026-10-15. Status: **Implemented** on branch `d99-menu-text`.

Provenance: the fifth item of the Psi 0.23 portal handoff
(`psi-handoffs/2026-10-14-psi-0.23-portal-handoff.md`, brief N2). The portal's
account menu must show a read-only build identifier when its configuration
carries one, and `Menu` has no part for a line of text. The portal shows it
nowhere today.

The number is the first free `## Decisions` entry when this branch started
(D98 was the highest).

## What's there today

1. **`Menu` is one element.** The popover element *is* the `role="menu"`
   element (`Menu.tsx`), and its documented children are `MenuItem`
   (`role="menuitem"`, a real `<button>`) and `MenuSeparator`
   (`role="separator"`).
2. **The keyboard hook already ignores anything that is not an item.** It
   collects `[data-psi-menu-item]:not([aria-disabled="true"])` for the
   arrows, Home, End and typeahead (`useMenuKeyboard.ts`).
3. **There is no part for text,** and `MenuProps` declares only
   `aria-label` among the ARIA props, so a consumer cannot type an
   `aria-describedby` on the menu.

## Where the line sits in the accessibility tree

The brief asks that this be settled before any code. Two places are
possible: inside the `role="menu"` element, or outside it but inside the
popover. Each was measured, in five variants, on Chromium 149 (Playwright
1.61.1) with axe-core 4.12.1. The measurements read both the computed
accessibility tree (CDP `Accessibility.getFullAXTree` and Playwright's
`ariaSnapshot`) and axe's violations and incomplete results:

| Variant | axe (menu rules) | Line in the AX tree | Menu description |
| --- | --- | --- | --- |
| A. Inside the menu, a plain `div` | pass | yes, a `generic` child of the menu | none |
| B. Inside, `role="none"` | pass | yes, `StaticText` child of the menu | none |
| C. Inside, menu `aria-describedby` → the line | pass | yes | "Build 1.4.2" |
| D. Outside the menu, inside the popover | pass | yes, a sibling after the menu | none |
| E. Outside, menu `aria-describedby` → the line | pass | yes | "Build 1.4.2" |

All five pass `aria-required-children` and every other rule: axe does not
count an element with no role as a child the menu forbids. All five expose
the text. So the choice rests on two things. One is what the structure
costs. The other is what a screen reader in a menu's focus mode does, which
these tools cannot show.

**Not checked against a screen reader.** NVDA, JAWS and VoiceOver were not
run in this cycle. What is known from how menus work: once a menu is open,
focus sits on a `menuitem`, and the arrows move only between items, so in
focus mode a screen reader does not land on the line in any variant. It is
reached by browse mode or the VoiceOver cursor. A menu description
(variants C and E) is the one thing a screen reader may speak on entering
the menu, and whether it does differs by screen reader. The portal should
run its own screen-reader check on the account menu.

## Decisions

- **D99 — A new part, `MenuText`, renders a line of text inside the
  `role="menu"` element. It has no role, it is never focused, and the
  keyboard skips it. `Menu` declares `aria-describedby`, so a consumer can
  make the line the menu's description.**
  - **Placement: inside the menu (variant A).** It passes axe, the line is
    in the tree as a child of the menu it belongs to, and it costs no
    structural change. Variant D (outside) would need the popover and the
    `role="menu"` element to become two elements. That changes the DOM of
    every `Menu`, moves `role`, `aria-label` and the forwarded props off the
    element that `ref` points at today, and gains nothing measured: D
    exposes the line no better than A.
  - **`<div data-psi-menu-text>` with no role.** It is not `role="none"`:
    a `div` has no semantics to remove, and A and B behave the same. It is
    never `aria-hidden`, because the build identifier exists to be read.
    `MenuText` takes `children` and an optional `id`.
  - **The keyboard skips it with no change to the hook.** The hook selects
    `[data-psi-menu-item]`, which `MenuText` does not carry. Arrows, Home,
    End and typeahead never reach it, and a typeahead letter that matches
    its text moves nothing.
  - **Not described by default; one prop to opt in.** `MenuProps` gains
    `"aria-describedby"?: string`, forwarded to the menu like `aria-label`.
    Give `MenuText` an `id` and pass that id, and the line becomes the
    menu's description (variant C). It is not automatic. A build identifier
    spoken every time the account menu opens is noise for most users, and
    whether it is spoken at all varies by screen reader. The consumer
    decides.
  - **Look: the menu's padding, secondary text.** `.text` takes the item's
    padding (8px by 12px) and the menu's font, and its colour is a new token,
    `--psi-menu-text-fg` = `--psi-fg-secondary`, so it reads as information
    rather than an action. `fg-secondary` on the menu surface
    (`bg-secondary`) is already gated at 4.5:1 in every theme, so no
    contrast pair is added. It has no hover or active state and a default
    cursor.

  **Why this changes no default.** `MenuText` is a new part, and nothing
  renders it unless a consumer does. `aria-describedby` is a new optional
  prop that was already forwarded at runtime through the rest spread; only
  its type is new.

  **A pattern that demands it: `account-menu`.** The house rule is that a
  new component needs a pattern that demands it, and the user chose a new
  pattern over extending `row-actions` (2026-10-15). An account menu opens
  from a ghost `Button` that shows the signed-in user's name. It holds the
  account's actions, a separator, *Sign out*, a second separator, and a
  `MenuText` line last. *Sign out* is `neutral`, not `danger`: signing out
  destroys nothing, and `danger` is for destructive actions only (house
  rule). This is pattern 23, which the D61 envelope still allows
  (verification below). It is also the last pattern the envelope allows
  before the budget decision, so the next new pattern waits for that
  decision.

  Weighed and not taken:

  - **Outside the menu, inside the popover (D, E).** It changes every
    `Menu`'s DOM for no measured gain (above).
  - **A disabled `menuitem`.** A screen reader would reach it with the
    arrows and announce it, but as an unavailable action, which it is not.
    The brief rules it out.
  - **Describe the menu by the line automatically.** That needs `MenuText`
    to register its id with `Menu` through context, and it would speak the
    line on every open in the screen readers that read descriptions. The
    opt-in prop gives the same result when a consumer wants it.
  - **`role="note"` or `role="status"`.** `status` is a live region, and the
    line is not news. `note` is not a child a `menu` may own: measured, axe
    reports `aria-required-children` for it.
  - **Extend `row-actions` with the line.** Not taken by the user's choice.
    A read-only line does not belong to a row's actions.

## Consequences

- A menu can carry a line of information, last or anywhere between groups.
  It is visible, it is in the accessibility tree, and the keyboard never
  stops on it.
- 47 components and 23 patterns. Every prose count moves with them.
- **Expected VR movement:** the new `Menu/WithText` story and the new
  `account-menu` preset story only.

## Verification

- **Tests first**, red before the change, on assertion:
  - `Menu.test.tsx`: a `MenuText` renders inside the `role="menu"` element
    with no role and no `aria-hidden`. Arrow Down from the last item wraps
    to the first item, not to the line. End focuses the last *item*.
    Typeahead on the line's first letter does not move focus to it. An
    `aria-describedby` on `Menu` reaches the menu element.
  - `a11y.axe.test.tsx`: an open menu holding items, a separator and a
    `MenuText` passes axe.
  - `menu-tokens`: `text-fg` aliases `--psi-fg-secondary`.
  - The pattern tests: `account-menu` has no gaps and a preset that renders
    `<MenuText>`.
- **The envelope.** `measure-overview-envelope.ts` is run with 23 patterns.
  The component floor of 8 must still hold.
