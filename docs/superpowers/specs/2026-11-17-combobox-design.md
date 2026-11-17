# A Combobox: search a list and pick one or several (D130)

Date: 2026-11-17. Status: **Proposed**, not accepted for building. Branch
`docs/d130-combobox-spec`.

Provenance: Psi has no way to pick from a long list by typing, and no working
multi-select. `Select` wraps a native `<select>`: it can't search, and
`<Select multiple>` renders a broken listbox (see "What's there today"). The
component gap analysis
(`docs/research/2026-10-29-component-gap-analysis.md`) ranks Combobox 12th by
benchmark frequency and names a Popover as its foundation. A scan of the
previous product's admin screens counted about 84 searchable selects, 27 plain
ones, 11 multi-selects (most with removable chips) and 39 clearable fields.
Search is the gap; looks are not.

Nothing outside Psi waits on this. The one known external consumer plans its
own combobox on React Aria. Inside the repo, the docs site's search
(`apps/site/src/components/SearchDialog.tsx`) is the nearest relative. It shares
the keyboard model but not the component (see D130, "The docs site's search").

This document settles the design. It holds no implementation and no plan.
Building it needs a separate go-ahead, and then a plan.

**The number.** The coordinating session allocated D129. A re-check before
writing found D129 already claimed. The local branch `d129-mcp-expansion`
carries an approved MCP spec under a `### D129` heading, committed earlier the
same day. This spec takes D130, the next number that is not claimed on any
local branch or on `origin`. D127 and D128 merged as #177 and #176. **Check
again when the PR opens.**

## What's there today

1. **`Select` is a native `<select>`** (`packages/react/src/Select/Select.tsx`).
   - Psi styles the closed box; the browser or the OS draws the open list.
     Tokens can't reach that list, and a story can show only the closed state.
   - `size` is Psi's height in px (24, 32, 40, 48) and takes the place of the
     native `size` attribute, which sets the row count.
2. **`<Select multiple>` is broken.** `SelectProps` extends
   `SelectHTMLAttributes`, so `multiple` reaches the `<select>`.
   - The box keeps its fixed height. With 6 options, a 32px box showed about
     1.5 rows in a scroll area, with the chevron drawn over the list.
   - A caller can't make it taller, because the native `size` is taken.
   - Nothing in Psi or its known consumers uses it.
3. **`Menu` already owns a popup on the native Popover API**
   (`packages/react/src/Menu/`, D53, D58, D102). It has three parts:
   - `Menu.tsx` keeps `open` in sync with `showPopover()`/`hidePopover()` and
     reports dismissals without echoing a close the consumer drove (D50, D58).
   - `useMenuPlacement.ts` places the popup with CSS anchor positioning, with a
     JS fallback below the anchor floor.
   - `useMenuKeyboard.ts` moves **real focus** across the items (a roving
     tabindex).
   - The popover is `popover="auto"`.
4. **A combobox can't reuse Menu's keyboard hook, or its `auto` popover.**
   - In a combobox, focus stays in the text input. `aria-activedescendant`
     points at the highlighted option.
   - An `<input>` can't be a popover's invoker on Psi's browser floor (Chrome
     119+, Safari 18+, Firefox 128+): `popovertarget` belongs to buttons. So an
     `auto` popover would light-dismiss on a click in the combobox's own input.
5. **`Tag`'s dismiss button has a fixed name.** `Tag.tsx` renders
   `aria-label="Dismiss"`. Several removable values would all read "Dismiss".
   A Tag is 24px tall (`tag.module.css`).
6. **`Field` already hands its wiring to a control Psi did not write.**
   - `useFieldControl` (D84) gives the id, the label by reference, the message
     line, and the invalid and required flags.
   - `controlWidth` (D125) sizes the Field's direct child from a px scale.
7. **`Toolbar`'s control width reaches only a bare `input` or `select`**
   (`.toolbar > input`, `.toolbar > select`, D77).
8. **The docs site's search** is a `Dialog` holding a `Field` and an `Input`,
   followed by a plain `<ul>` of result links. Arrow keys don't move through
   the results.
9. **Bundle cost, measured** on 2026-11-17 with esbuild: minified, then
   `gzip -9`, with `react`, `react-dom` and `react/jsx-runtime` external. Each
   entry exports only what a combobox needs.

   | What | Version | min | gzip |
   | --- | --- | ---: | ---: |
   | All of `@handamade/psi-react` 0.32.0 (`dist/index.js`, 37 components) | 0.32.0 | 58.0 KB | 17.8 KB |
   | `Menu` + `MenuItem` re-bundled from that dist | 0.32.0 | 10.7 KB | 4.5 KB |
   | `react-aria-components` (`ComboBox`, `Input`, `ListBox`, `ListBoxItem`, `Popover`, `Label`, `Button`) | 1.22.1 | 206.2 KB | 62.3 KB |
   | `react-aria` + `react-stately` hooks (`useComboBox`, `useListBox`, `useOption`, `usePopover`, `useFilter`, `useButton`, `useComboBoxState`) | latest | 154.9 KB | 46.3 KB |
   | `@base-ui/react/combobox` | 1.9.0 | 146.3 KB | 51.9 KB |
   | `@headlessui/react` (`Combobox` parts) | 2.2.10 | 138.0 KB | 46.4 KB |
   | `@ariakit/react` (`Combobox` parts) | 0.4.43 | 132.8 KB | 46.9 KB |
   | `downshift` (`useCombobox`, `useMultipleSelection`) | 9.5.0 | 42.9 KB | 13.6 KB |

   React Aria's combobox alone is 3.5 times all of Psi. `@handamade/psi-react`
   has no runtime dependency today, only peers.

## Best practice consulted

The Design Systems Assistant MCP was queried on 2026-11-17 with ten queries:
- the ARIA 1.2 combobox pattern;
- select-only against editable;
- multi-select chips and tags;
- async loading and empty states;
- popover and listbox positioning;
- how systems split a Popover from a Combobox;
- headless libraries against an in-house build.

Its knowledge base is thin on this component. The Combobox and Autocomplete
entries return as directory listings with no content, and nothing came back on
headless against in-house. What it did return:

| Source cited | What it says | Psi |
| --- | --- | --- |
| W3C ARIA Authoring Practices Guide, patterns index (`w3.org/WAI/ARIA/apg/patterns/`) | Use native HTML first; the ARIA patterns are reference for when nothing native fits. | **Agrees.** `Select` stays native for short fixed lists. Nothing native can search or hold several picked values, so Combobox follows the APG combobox pattern. |
| React Aria docs (`react-aria.adobe.com`) | A ComboBox is a Label, then a Group (an Input and a chevron Button), then a Popover with a ListBox. The same Popover and ListBox also make up Select. The popup takes the trigger's width (`--trigger-width`). A picked option shows a check mark. | **Agrees** on the anatomy, the chevron button, the matched width, the check mark, and one popup layer shared by several components. **Differs**: Psi's layers stay internal for now (see D130, "Foundation"). |
| Radix Primitives (`radix-ui.com/primitives`) | Popover ships as a public primitive of its own, apart from Select. | **Differs, deliberately, for now.** A public Popover brings focus, dialog and nesting questions that a Combobox does not need. It stays a separate decision. |
| designsystems.surf, Chip blueprint | In a multi-select, chips sit near the input with an obvious close control. Selected and unselected chips must look different. | **Agrees** on removable chips by the input: picked values render as `Tag`s inside the control. The selected/unselected look is a selectable chip, which is a separate request this decision doesn't take. |
| Carbon, Search and Loading patterns (`carbondesignsystem.com/patterns/search-pattern/`, `/loading-pattern/`) | Don't dead-end on "No results". Show a loading indicator when a search takes more than a moment. Give the number of results. Tell screen readers when loading or busy. | **Agrees.** A "No matches" line, a `loading` line with `aria-busy`, and a polite count announcement. Carbon's "don't label a search field" doesn't apply: a combobox is a form control and keeps its Field label. |

No result conflicted with the house rules (px sizes, flat variants, no
hard-coded colours).

## Decisions

### D130 — Psi writes its own `Combobox` for searching a list and picking one or several values, on internal popup and list layers moved out of `Menu`

**Scope of the first version**
- **In:**
  - single-select and multi-select;
  - picking from the list only, with the list filtered as the user types;
  - a built-in filter, or the caller's own: with the caller's, async results
    arrive through controlled props, with a `loading` state;
  - a "No matches" line, and a line for a cut-off list;
  - a clear button that is off by default.
- **Waits:**
  - free text that isn't an option, and creating options (2 fields in the
    previous product);
  - grouped options;
  - custom option templates (2 fields);
  - virtualization;
  - an inline list with no popup.

**Build, don't depend**
- Psi writes it, as it wrote `Menu` (D53). `@handamade/psi-react` keeps zero
  runtime dependencies.
- **React Aria was rejected:**
  - 46 to 62 KB gzip, 2.6 to 3.5 times all of Psi;
  - its own state and collection model to wrap;
  - its own popover to reconcile with Psi's top layer.
- **Downshift was rejected:**
  - 13.6 KB, logic only, so it fits Psi's CSS model;
  - but it would be the first runtime dependency, with its upgrade cadence;
  - its popup isn't on the top layer, so Psi would still write the popup;
  - it would leave Psi with two keyboard models: Downshift's, and Menu's.
- An in-house build is estimated at 5 to 7 KB gzip, `Menu` being 4.5.
- **The cost:** Psi owns the keyboard and screen-reader edge cases. The
  real-browser tests below exist to pay for that.
- `appearance: base-select` is not an alternative. It styles a native list but
  adds no search, and it isn't on by default in every engine on Psi's floor.

**Foundation: internal layers, not a public Popover**
- **`internal/popup/useAnchoredPopup`**, moved out of `Menu.tsx`, does three
  things:
  - keeps `open` in sync with `showPopover()`/`hidePopover()`;
  - stays quiet on a close the consumer drove (D50, D58);
  - takes `mode: "auto" | "manual"`.
  - **Menu** uses `auto` with the platform's light dismiss, as today.
  - **Combobox** uses `manual`. It closes on its own on a `pointerdown`
    outside both the control and the popup, on Esc and on Tab.
- **`internal/popup/usePopupPlacement`** is today's `useMenuPlacement` under a
  new name. It gains `matchWidth`: the popup is at least as wide as its anchor.
  - Above the anchor floor that's `min-inline-size: anchor-size(width)`.
  - Where `anchor-size()` is unsupported, the JS fallback sets it from the
    anchor's measured rect.
- **`internal/listbox/useActiveOption`** moves an `aria-activedescendant`
  through a list while focus stays in the input. Its rules are under
  "Keyboard and accessibility".
- **Menu moves onto the first two with no change in behaviour.** That is part
  of this decision's build, not a separate one. It also keeps its own keyboard
  hook, since Menu moves real focus.
- **A public `Popover` stays a future decision.** No separate number is
  claimed. The gap analysis's "foundation" is met by the internal layers; a
  public component would add focus management, dialog semantics and nesting
  rules that a Combobox doesn't need.

**API**

```tsx
interface ComboboxOption {
  /** What onChange reports and a form submits. */
  value: string;
  /** Shown, filtered on and read aloud. */
  label: string;
  /** An optional second line, joined into the option's accessible name. */
  description?: string;
  /** Reachable by arrow key, never picked (aria-disabled). */
  disabled?: boolean;
}

// Single (the default)
<Combobox options={options} value={value} onChange={(value: string | null) => {}} />
// Multi
<Combobox multiple options={options} value={values} onChange={(values: string[]) => {}} />
```

- **Options are data,** not children.
  - Filtering needs each option's text.
  - A caller-owned list arrives as data anyway.
  - `Select` and `Menu` take children because neither filters.
- **Value:** `value`, `defaultValue` and `onChange`, controlled or uncontrolled,
  like the native controls. Values are strings, so a form can submit them.
- **`multiple`** switches the types through a discriminated union: `value`
  becomes `string[]`, and `onChange` reports `string[]`.
- **Text:** `inputValue` and `onInputChange`, for a caller that reads options
  as the user types.
- **`filter`**
  - **The default** is a "contains" match on `label`. It ignores case and
    accents: both sides are NFD-normalised, stripped of combining marks and
    lower-cased in the locale, so "zur" matches "Zürich".
  - **`filter={fn}`** swaps in another `(option, text) => boolean`.
  - **`filter={false}`** hands the list to the caller: Combobox shows `options`
    as given, and filters nothing.
- **The open state is internal.** There's no `open` prop: the list opens and
  closes with typing, which a caller shouldn't have to wire. This departs on
  purpose from Menu's controlled-only rule (D50). Menu opens from a deliberate
  click a consumer already handles; a combobox opens on a keystroke.
- **Single-select picks only from the list.**
  - On blur, text that doesn't match the picked option goes back to that
    option's label.
  - Leaving with the text emptied sets the value to `null`.
- **Multi-select:**
  - picking an option toggles it;
  - the list stays open and the text clears;
  - picked options show a check mark in the list;
  - picked values render as `Tag`s (neutral, subtle) before the input,
    wrapping inside the control's border, which grows from its `size` height;
  - each Tag's remove button is named by `removeLabel`;
  - Backspace in an empty input removes the last value.
- **`loading?: boolean`**
  - a status line (`loadingMessage`, "Loading…") where the list would be;
  - `aria-busy` on the listbox;
  - while a read is in flight, the caller keeps passing the last options, and
    they stay on screen.
- **No matches:** a status line (`emptyMessage`, "No matches") in place of an
  empty list.
- **`moreMessage?: ReactNode`**
  - a line after the listbox, for a cut-off caller-owned list: "Showing 50 of
    812. Keep typing to narrow it.";
  - it sits outside the listbox, because a listbox holds only options.
- **A polite live region** announces the result count after filtering ("5
  results"). It's visually hidden with `.psi-sr-only` (D80).
- **`size?: 24 | 32 | 40 | 48`**, default 32, the heights of `Select`.
  - Multi-select excludes 24, because a 24px Tag doesn't fit inside a 24px
    control.
  - The types enforce it: `multiple: true` narrows `size` to `32 | 40 | 48`.
- **`error`, `disabled`, `placeholder`** work as on `Select`.
- **`name`** writes hidden inputs, one per value in multi-select, so a native
  form submits the values rather than the text.
- **`required`** sets the input's custom validity while the value is empty, so
  native validation and `:invalid` still work.
- **No `variant`,** like `Input` and `Select`.
- **`clearable?: boolean`**, default false.
  - It adds a clear button that empties the value, or every value in
    multi-select, and the text.
  - Like the chevron button, it isn't a Tab stop. Keyboard users clear by
    deleting the text, or with Backspace on the values.
- **Translatable names.** Each is a string prop with an English default,
  following `statusLabel` (D83) and `dismissLabel` (D117):
  - `clearLabel`: "Clear";
  - `toggleLabel`: "Show options", the chevron button;
  - `removeLabel: (label: string) => string`: `` `Remove ${label}` ``;
  - `emptyMessage`: "No matches";
  - `loadingMessage`: "Loading…";
  - `resultsLabel: (count: number) => string`: "1 result" or "N results".
- **`Tag` gains `dismissLabel?: string`**, default "Dismiss", today's name. Same
  name and shape as D117.
- **`ref`** forwards to the `<input>`. `className` goes on the root.

**With the rest of Psi**
- **Inside a `Field`**
  - The input takes the id, label, description, invalid and required wiring,
    as `Select` does (D49).
  - The listbox is named by the Field's label (`aria-labelledby`).
  - The Combobox does it itself; a caller doesn't need `useFieldControl`.
- **`controlWidth` (D125) needs no change.** The Combobox root is the Field's
  direct child, so the step sizes it, and `matchWidth` carries that width to
  the popup.
- **In a `Toolbar`,** a bare Combobox takes `--psi-toolbar-control-width`, as a
  bare `input` or `select` does. Toolbar's rule gains a
  `> [data-psi-combobox]` selector.
  - A Combobox in a Field in a Toolbar sizes as any Field control does there.
    The broader gap, that Toolbar's width misses a control inside a Field, is
    not fixed here.
- **Tokens.** New component tokens, `packages/tokens/src/components/combobox.ts`.
  - **The control:** background, border, border-hover, border-error,
    foreground, placeholder, focus ring, radius, chevron.
  - **The popup:** background, border, radius.
  - **An option:** background on hover and when highlighted, foreground,
    selected check, disabled foreground.
  - **Status line:** foreground.
  - Each maps to the semantic value `Select` (control) or `Menu` (popup and
    option) already uses, so the token build's contrast gate covers them with
    no new formula.
  - **`--psi-combobox-popup-max-height`: `320px`**, a standalone literal like
    D125's `--psi-field-stack-max-width`. Not a colour, so it enters no
    contrast gate.
  - The popup scrolls past it and keeps the highlighted option in view.
- **Right to left from the start.**
  - The chevron and the clear button sit at `inline-end`, with logical
    properties throughout.
  - The chevron is an icon element, not `Select`'s background gradients, so
    `Select`'s right-to-left defect isn't copied.
- **Top layer.** The popup is on the top layer, so a Combobox inside a `Dialog`
  draws above it. That's the same finding D53 recorded for Menu.

**`Select` loses `multiple`**
- `SelectProps` omits `multiple`. The prop's absence is documented in
  `Select`'s JSDoc, pointing at `Combobox`.
- It ships in the same release as Combobox, so the changeset points at a
  component that exists. It narrows the API before 1.0, in the way D60
  narrowed `Input`'s `type` to a union.
- A listbox mode for `Select` (auto height, no chevron, a row-count prop) was
  rejected. It would stretch a native-control wrapper into a second picker
  beside Combobox.

**Picked values and the selectable chip**
- Multi-select reuses the dismissible `Tag` with the new `dismissLabel`.
- A selectable or filter-chip state on `Tag` (a toggle, with a selected look)
  is a different control and is not part of this decision.

**The docs site's search**
- Combobox gets no inline or navigation mode.
- The site's search could later use `useActiveOption` to move through its
  results with the arrow keys while focus stays in the field. That would be
  its own change, in `apps/site`.

### Keyboard and accessibility

From the ARIA 1.2 combobox pattern with list autocomplete.

| Key | Focus in the input, list closed | List open |
| --- | --- | --- |
| Down / Up | Opens the list, highlighting the picked option, or else the first / last | Moves the highlight. Wraps at the ends, as Menu does. Disabled options are reachable. |
| Alt + Down | Opens the list without moving the highlight | No effect |
| Alt + Up | No effect | Closes the list |
| Page Down / Page Up | No effect | Moves the highlight 10 options, stopping at the ends |
| Home / End | Moves the caret (native) | Moves the caret (native): these keys belong to the text |
| Enter | Native: submits a form | Picks the highlighted option without submitting the form. Single-select closes the list; multi-select keeps it open. On a disabled option it does nothing. |
| Esc | Clears the text, if there is any | Closes the list and stops propagation, so a surrounding `Dialog` stays open |
| Tab / Shift + Tab | Moves focus on | Closes the list and moves focus on; picks nothing |
| Backspace, multi-select, empty input | Removes the last value | Removes the last value |
| Typing | Opens the list and filters it; highlights the first match | Filters; highlights the first match |

- **The input** has:
  - `role="combobox"`, `aria-autocomplete="list"`;
  - `aria-expanded`, `aria-controls` naming the listbox;
  - `aria-activedescendant` naming the highlighted option while the list is
    open;
  - `autocomplete="off"`.
- **The popup** holds a `role="listbox"`, with `aria-multiselectable="true"` in
  multi-select. The status line and the "more" line are siblings of the
  listbox, never its children.
- **Options** are `role="option"` with `aria-selected`, and `aria-disabled`
  where disabled.
- **The highlight is visual as well as programmatic.**
  - The highlighted option gets the highlighted background, because real
    focus never leaves the input.
  - The input keeps its focus ring.
- **When the options change** (a new filter, or a read arriving), the
  highlight:
  - stays on the same option, by `value`, if it is still in the list;
  - otherwise moves to the first option;
  - is cleared if the list is empty.

  It never points at an element that's gone.
- **Pointer:**
  - Pressing an option picks it, and its `pointerdown` calls
    `preventDefault()`, so the input never loses focus.
  - The chevron button toggles the list and returns focus to the input.
  - Hovering moves the highlight.
- **Buttons inside the control:**
  - The chevron, the clear button and each Tag's remove button carry
    `tabindex="-1"`, so the Combobox is one Tab stop.
  - Each has an accessible name from the translatable labels.

## Tests and gates for the build

- **Unit tests (vitest, jsdom):**
  - **`useActiveOption`:**
    - wrap at both ends;
    - disabled options reachable;
    - Page Up and Page Down stopping at the ends;
    - keeping the same option when the list changes, falling back to the first,
      and clearing on an empty list.
  - **The default filter:** case and accents ignored, and `filter={false}`.
  - **`Combobox`:**
    - controlled and uncontrolled, single and multi;
    - blur reverting the text in single-select, and emptied text clearing to
      `null`;
    - Backspace removing the last value;
    - hidden inputs for `name`, and `required` validity;
    - the Field wiring;
    - each translatable label, default and custom;
    - the type test that rejects `size={24}` with `multiple`.
  - **`Tag`:** `dismissLabel`, with its default.
  - **`Select`:** a type test that `multiple` is no longer accepted.
  - **axe** on every Combobox story state, through `a11y.axe.test.tsx`.
- **The Menu move proves itself by staying green.** Menu's unit tests,
  `menu.interaction.spec.ts` and every Menu `vr` baseline pass with no change
  to them. A Menu baseline that moves means the extraction changed behaviour,
  and is a bug, not a refresh.
- **Real browser (Playwright `@interaction` specs, Chromium).** These take no
  screenshots, so they pass on macOS too. jsdom's Popover polyfill implements
  neither light dismiss nor the top layer, so none of these can be unit tests.
  A new `apps/storybook/vr/combobox.interaction.spec.ts` checks:
  - a `pointerdown` outside closes the list, and one in its own input doesn't;
  - Esc in a Combobox inside an open `Dialog` closes only the list;
  - Enter on a highlighted option in a `<form>` picks it, and the form doesn't
    submit;
  - Tab closes the list and moves focus on, picking nothing;
  - the popup is at least as wide as the control under `controlWidth`, both on
    the anchor path and with the JS fallback forced;
  - a long list stops at 320px, scrolls, and keeps the highlight in view while
    arrowing;
  - with `loading`, the previous options stay, and `aria-busy` is set;
  - in right to left, the chevron and the clear button sit at the left;
  - a Combobox inside a `Dialog` draws above it.
- **Stories, all taken by `vr`:**
  - sizes 24 to 48;
  - single, multi with wrapping Tags, clearable;
  - loading, no matches, a "more" line;
  - disabled options, error;
  - in a Field with `controlWidth`, and in a `Toolbar`;
  - right to left;
  - a caller-owned list (`filter={false}`);
  - the open-list states, in light and ember.

  `vr`'s budget is 0 pixels (D89). New baselines come from CI's render.
- **Docs and the machine-readable trail:**
  - an `a11yMeta` entry, so the generated docs carry the keyboard table;
  - `packages/react/llms.txt` and the README;
  - guidance intent: "`Select` for a short fixed list; `Combobox` when the list
    is long enough to search, or more than one value is picked";
  - a changeset that also names `Select`'s `multiple` removal and `Tag`'s
    `dismissLabel`.
- **All five gates, then CI's `vr`:**

  ```bash
  pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site
  ```

  `check-docs-drift` will fail until every prose count of components moves
  with the new one.

## What this changes

- Nothing published changes until the build ships.
- When it does:
  - `@handamade/psi-react` gains `Combobox` and its types;
  - `Tag` gains `dismissLabel`;
  - `Select` loses `multiple`;
  - Menu's internals move with no visible change;
  - Toolbar's control-width rule reaches a bare Combobox;
  - the tokens gain the `--psi-combobox-*` set.

## Follow-ups

- **A public `Popover`.** A decision of its own, with focus management, dialog
  semantics and nesting. It would build on `useAnchoredPopup` and
  `usePopupPlacement`.
- **The docs site's search:** arrow-key movement through results with
  `useActiveOption`.
- **Free text and creating options** in Combobox.
- **Grouped options, custom option templates and virtualization** in Combobox.
- **A selectable or filter-chip state on `Tag`.**
- **Menu's own open questions** are untouched by this decision. A Menu with no
  maximum height, a re-render that removes its focused item, and whether its
  arrow keys skip a disabled item can now borrow the Combobox's answers: a
  scroll cap, keeping the highlight by identity, and disabled items reachable.
- **`Select`'s chevron in right to left,** which Combobox avoids by design but
  doesn't fix.
- **`Toolbar`'s control width for a control inside a `Field`.**
