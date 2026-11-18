# Popup layers out of Menu, and a Menu that scrolls, keeps focus and reaches disabled items (D131)

Date: 2026-11-17. Status: **Accepted**, building on branch
`claude/d131-popup-layers-menu-b4673f`.

Provenance: step 1 of two for the `Combobox` (D130,
`2026-11-17-combobox-design.md`). D130 moves `Menu`'s popup and placement code
into internal layers a Combobox can share, and leaves Menu's open defects to a
follow-up that "can now borrow the Combobox's answers". This document records
that move under D130's name, and decides the defects and a shared token for a
popup's maximum height under D131. Step 2, the Combobox itself, builds on both.

**The number.** D131 was checked free on every local branch, every branch on
`origin` and every open PR on 2026-11-17, before writing. D129 belongs to an
outside branch, D130 to the Combobox. **Check again when the PR opens.**

## What's there today

Measured in this worktree's Storybook build, Chromium 149 (Playwright), on the
0.32.0 code.

1. **A long Menu runs off the screen.** `.menu` sets no maximum height. With
   40 items added to `Components/Menu`, `Default`, in a 1024 × 768 window:
   43 items, each 36px; the menu was **1,567px tall, from 4 to 1,571px**. The
   popover's own `overflow: auto` never takes effect, because nothing limits
   the height, and the page doesn't scroll a top-layer element: the items
   below 768px can't be reached with the mouse.
2. **Removing the focused item drops focus to the page.** With `Duplicate`
   focused, removing it left `document.activeElement` on `BODY`. The menu
   stayed open, and Arrow Down did nothing, because the keyboard handler sits
   on the menu and focus had left it. Esc then reached the platform's close
   watcher, which closes an auto popover and reports `"outside"`: the wrong
   reason (D50).
3. **The arrow keys skip a disabled item.** In `WithDisabledItem` (Edit,
   Archive disabled, Delete), Arrow Down from Edit went Edit → Delete → Edit.
   `useMenuKeyboard` builds its list from
   `[data-psi-menu-item]:not([aria-disabled="true"])`, so Home, End, typeahead
   and the open focus skip it too. `MenuItem` renders `aria-disabled` rather
   than `disabled` precisely so the item stays discoverable (D53), and then the
   keyboard hides it anyway.
4. **`Tabs` does the same.** `useTabsKeyboard` filters `aria-disabled` tabs out
   of the arrows and Home/End, while `Tab` keeps them focusable "to be
   announced" (D67). A disabled tab is reachable only as the selected tab
   (D93).
5. **No token sets a popup's maximum height.** One outside consumer gives its
   own popup `calc(var(--psi-input-32-height) * 8)` (256px) beside a gap row
   that asks Psi for a token. D130 gives the Combobox
   `--psi-combobox-popup-max-height: 320px`, a literal of its own.
6. **The layers.** `Menu.tsx` holds the `open` ↔ `showPopover()` sync and the
   dismissal reporting (D50, D58). `useMenuPlacement.ts` sets the anchor and,
   below the anchor floor, places the popup from the trigger's rect. Neither
   knows anything Menu-specific apart from its placement type.
7. **The platform, measured.** In Chromium 149, `anchor-name`, `anchor-size()`
   and `position-try-fallbacks` with named `@position-try` rules are all
   supported. **`max-height` inside a `@position-try` rule is ignored:** a try
   `{ max-height: 100px }` never applied, in a Psi menu or in a bare test page,
   while `{ height: 100px }` did. `min-height` applies too.

## Best practice consulted

| Source | What it says | Psi |
| --- | --- | --- |
| W3C ARIA Authoring Practices, "Developing a Keyboard Interface", *Focusability of disabled controls* | Disabled menu items, tabs, listbox options and tree items are recommended to stay focusable, so a user can learn they exist. | **Agrees.** Menu and Tabs make disabled items reachable by every navigation key; activation stays refused. |
| APG Menu Button and Tabs patterns | Opening a menu focuses its first item; arrows wrap. With automatic activation, focusing a tab selects it. | **Agrees**, with the one exception the first row implies: a disabled tab takes focus but not the selection. |
| D130, Combobox keyboard | Disabled options are reachable. When the list changes, the highlight stays on the same option; otherwise it moves to the first; it is cleared if the list is empty. | **Agrees** on reachability and on keeping by identity. **Differs** on the fallback (see D131): a combobox list changes because the user typed, so the first match is the best guess; a menu item disappears under the user's focus, so its neighbour is where they were. |

## Decisions

### The move, under D130

D130 counts this as part of its build ("Menu moves onto the first two with no
change in behaviour"). It is recorded here and not decided again.

- **`packages/react/src/internal/popup/useAnchoredPopup.ts`.** Takes
  `{ popoverRef, anchorRef, open, mode, onDismiss }`, returns the popover's
  `popover` attribute and its `onToggle` handler.
  - Keeps `open` in sync with `showPopover()` / `hidePopover()`.
  - Stays quiet on a close the consumer drove (D50), and reports a dismissal
    only for a popup that is open by its own prop (D58).
  - `mode: "auto"`: the platform's light dismiss, reported as
    `onDismiss("outside")` from `toggle`, as Menu does today.
  - `mode: "manual"`: no platform dismissal. While open, a `pointerdown`
    outside both the popup and the anchor reports `onDismiss("outside")`. Esc
    and Tab belong to the component's own keyboard, as D130 says.
- **`packages/react/src/internal/popup/usePopupPlacement.ts`**, today's
  `useMenuPlacement` renamed. `PopupPlacement` is the four-value union;
  `MenuPlacement` stays exported as its alias.
  - **`matchWidth`**: the popup is at least as wide as its anchor. Where
    `anchor-size()` is supported that is `min-inline-size: anchor-size(width)`;
    elsewhere the JS fallback sets it from the anchor's measured width and keeps
    it current on scroll and resize. Menu doesn't use it.
- `internal/listbox/useActiveOption` stays in step 2: nothing in Menu needs it.
- Menu's existing unit tests, `menu.interaction.spec.ts` and every Menu `vr`
  baseline stay green with no change for the move. The one test that changes
  is the keyboard test that asserted D131's defect 3.

### D131 — Menu scrolls inside a shared popup cap, keeps focus when its item goes, and reaches disabled items; Tabs reaches disabled tabs

**A shared token for a popup's maximum height**
- **`--psi-popup-max-height: 320px`**, in a new token-only family, `popup`,
  like `surface` (D51) and `control` (D54). Nothing binds it directly; each
  popup aliases it, so a theme retunes every popup in one line and can still
  override one.
  - Menu: **`--psi-menu-max-height: var(--psi-popup-max-height)`**.
  - Combobox (step 2): `--psi-combobox-popup-max-height:
    var(--psi-popup-max-height)`. **This amends D130's token line**, which gave
    the Combobox a literal 320px of its own.
- **320px**, D130's value: about 8.7 rows of 36px, so a cut-off ninth row
  shows that the list scrolls. The outside consumer's 256px (8 × 32) shows
  7.1 of the same 36px rows. It can bind the token, or alias it to its own
  value.
- Not a colour, so no contrast pair. The key has no `-bg`/`-fg`/`-border`
  suffix, so the scope gate leaves it unscoped, as it does
  `--psi-field-stack-max-width` (D125).

**Menu's maximum height**
- `.menu` takes `max-block-size: var(--psi-menu-max-height)`. The popover's
  `overflow: auto` then scrolls it.
- **A menu taller than the room on both sides** of its trigger opens on the
  side with more room and fills it, rather than overflowing the window:
  - Two last fallbacks, after today's flips: `--psi-menu-fit` and
    `--psi-menu-fit flip-block`.
  - `@position-try --psi-menu-fit` sets `height` to the area less the margin,
    padding and border, and `min-height` to half the room the trigger leaves,
    so the try fits only on the larger side. It uses `height` because
    Chromium ignores `max-height` in a try (finding 7). Only a menu that
    already overflows both sides reaches it, so `height` never stretches one.
  - Measured with 40 items: a trigger at 330 in a 500px window opens above,
    4–326; at 40 in a 400px window, below, 76–396; short menus open exactly
    where they did.
- **Below the anchor floor** the JS fallback, which doesn't flip, caps the
  popup's `max-block-size` at the room on its own side, whenever that is less
  than the CSS cap.
- **The focused item stays in view:** focus moves with `focus()`, which
  scrolls the item into view, so arrowing, Home, End and typeahead keep it
  visible. Pinned by a real-browser test.

**Focus when the focused item is removed**
- **Kept by identity.** A re-render that keeps the focused item's element keeps
  its focus; React does that for a stable `key`, and Menu adds nothing.
- **Otherwise, its neighbour.** When the focused item leaves the DOM and focus
  has fallen to the page (not to something the user chose), Menu focuses the
  item now at the same position, or the last item if it was the last.
- **An emptied menu focuses itself.** The menu element takes
  `tabindex="-1"` and the menu focus ring, so Esc and Tab still reach Menu's
  keyboard and report `"esc"` and `"tab"`, not `"outside"`.
- A `MutationObserver` on the open menu watches for the removal; Menu records
  the focused item and its position on `focusin`.

**Disabled items reachable**
- **Menu:** a disabled item is an item for every navigation key: Arrow Up and
  Down, Home, End, typeahead, and the focus on open, so a menu whose first
  item is disabled opens on it. It can't be activated: its click does nothing
  and reports nothing, as today. The roving tabindex covers it.
- **Tabs, the same rule:** the arrows and Home/End reach a disabled tab and
  give it focus and the tab stop, but not the selection. `onValueChange` isn't
  called, so the panel stays on the selected tab. The next arrow moves on from
  the disabled tab. It applies cleanly: nothing else in Tabs depends on the
  skip.

**What doesn't change**
- Menu's API, dismissal reasons, controlled-only contract, placement and look:
  every existing Menu story renders as before.
- `MenuText` and `MenuSeparator` stay out of navigation (D99).

## Tests and gates

- **Unit (vitest, jsdom):**
  - `useAnchoredPopup`: `manual` sets `popover="manual"`; a `pointerdown`
    outside reports `"outside"`, one in the popup or the anchor doesn't, nor one
    while closed; a consumer-driven close stays silent.
  - `usePopupPlacement`: `matchWidth` on both branches; the fallback's height
    cap only when the room is under the CSS cap.
  - `useMenuKeyboard`: arrows, Home/End, typeahead and the open focus reach a
    disabled item; Enter on it reports nothing.
  - `Menu`: removing the focused item focuses its neighbour, the previous item
    when it was last, the menu when it was the only one; focus the user moved
    elsewhere isn't taken back.
  - `useTabsKeyboard`: arrows and Home/End reach a disabled tab without
    selecting it, and move on from it.
  - Tokens: `--psi-popup-max-height` and `--psi-menu-max-height` emitted.
- **Real browser (`@interaction`, Chromium, no screenshots):**
  - `menu.interaction.spec.ts`: a long menu stops at the cap and scrolls, End
    and the wrap keep the focused item inside the menu's box; a long menu in a
    short window fits the window, on the larger side; removing the focused item
    moves focus as above, and Esc in an emptied menu reports `"esc"`; Arrow Down
    reaches the disabled item and Enter there leaves the menu open.
  - `tabs.interaction.spec.ts`: Arrow Right reaches the disabled tab, focuses
    it, and leaves the selection.
- **Stories:** `Components/Menu`, `LongMenu` and `RemovingItems`. Their `vr`
  baselines come from CI's render, shown to the user before they're committed.
  Every other baseline stays as it is.
- **Five gates, then CI's `vr`:**

  ```bash
  pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && CI=1 pnpm test:site
  ```

## What this changes

- `@handamade/psi-tokens`: new `--psi-popup-max-height` (320px) and
  `--psi-menu-max-height`.
- `@handamade/psi-react`:
  - a Menu longer than 320px scrolls, and fits the window;
  - removing the focused item keeps focus in the menu;
  - the keyboard reaches disabled menu items and tabs;
  - internals move into `internal/popup/` with no visible change.
- `a11yMeta` for Menu, MenuItem, TabList and Tab, so the generated docs say
  what the keys do now.

## What step 2 reuses

- `useAnchoredPopup` in `manual` mode, with its outside-`pointerdown`
  dismissal.
- `usePopupPlacement` with `matchWidth`, and the fallback's height cap.
- `--psi-popup-max-height` through an alias, and the `@position-try` recipe
  for a popup taller than the room on both sides.
- The disabled rule, and keep-by-identity for a changing list.

## Follow-ups

- **A Menu `vr` story in a short window** would pin the fit try in pixels; the
  interaction spec pins it by geometry today.
- **A shared CSS home for the fit try.** Step 2 copies the `@position-try`
  recipe into the Combobox's stylesheet. A third popup would justify a shared
  internal stylesheet.
