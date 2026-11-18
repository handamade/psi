# Combobox follow-up: Escape that keeps a value, honest expanded state, and three caller hooks (D134)

Date: 2026-11-18. Status: **Accepted**, built. Branch
`d134-combobox-followup`.

Provenance: a review of `Combobox` (D130, shipped in 0.34.0) against a
consumer's combo box found two defects and three missing hooks. This decision
takes all five as one follow-up. Line numbers below are
`packages/react/src/Combobox/Combobox.tsx` at `0016b14`.

**The number.** D132 (segmented control) and D133 (homepage) are on `main`.
At spec time no local branch, `origin` branch or open PR mentions D134.
**Check again when the PR opens.**

## What's there today

1. **Two Escapes delete a picked value (single-select).**
   - In an open list, Escape closes it and keeps the edited text (360-363).
   - With the list closed, Escape clears any text (364-369), the picked label
     included.
   - The next blur sees empty text and commits `null` (393-394).
   - So "type, Escape, Escape, Tab" turns a picked city into no city. APG's
     example allows a closed Escape to clear the text. It doesn't say that
     clearing the text should delete the value, and here it does.
2. **Enter with edited text and nothing highlighted.**
   - With the list open, it does nothing and keeps the list open (352-357).
   - With the list closed, it is the native Enter and submits the form. The
     edited text is on screen, but the old value goes out (hidden input).
3. **`aria-expanded` says a hidden listbox is open.**
   - With no match, the listbox is `hidden` (548), but the input keeps
     `aria-expanded="true"` (474).
   - `aria-controls` names the hidden listbox (475).
   - The status line ("No matches", "Loading…") is in no `aria-describedby`.
     Focus never leaves the input, so a screen reader reaches the line only
     through the live region.
4. **Every Combobox speaks through its own polite live region** (593-595). No
   prop turns it off. An app that sends every announcement through one
   announcer hears each line twice. `Field` solved the same problem with
   `announce={false}` (D81).
5. **The picked label comes only from `options`** (213-217). A value that was
   never in `options` shows as its raw string. A preset id past the first page
   of a server-read list shows as `"c-4182"` until that page loads. The text
   follows a *value* change only (228-237), so a label that arrives later for
   the same value never reaches the input.
6. **The open state is internal** (240), by D130's choice. A caller that owns
   the list (`filter={false}`) can't hold it closed. For example, when its
   last read failed, it wants to show an error in the Field instead of an
   empty popup.

## Measured

- **The defects, in Chromium.** These ran against the 0.34.0 build before
  any fix (`combobox.interaction.spec.ts`).
  - Single-select showing "Lisbon": type "x", press Escape, Escape, then Tab.
    - The input read `"Lisbonx"`, then `""`, then `""`.
    - The blur committed `null`.
    - The D134 spec failed on the first expectation: "Lisbonx", not
      "Lisbon".
  - Type "qq":
    - the listbox was `hidden`;
    - the input still read `aria-expanded="true"`;
    - the spec failed on `aria-expanded`.

  Both specs pass after the fix.
- **Bundle cost.** `Combobox` and its internal imports re-bundled from
  source (esbuild 0.28.1, minified, CSS left out, React external, `gzip -9`).
  - Before (`origin/main`): 11,970 B minified, 4,566 B gzip.
  - After: 12,500 B minified, 4,798 B gzip.
  - The cost is **+232 B gzip**.

## Decisions

### D134 — Combobox: Escape restores and Enter settles; `aria-expanded` follows the listbox; `announce`, `valueLabel`, and a caller-held `open`

**1. Escape cancels an edit; Enter and blur settle it (single-select).**

Two words for the rules below:
- The **shown label** is what the input shows when nobody is typing: the
  picked option's label, or empty with no value.
- The text is **edited** when it differs from the shown label.

| Key | List open | List closed |
| --- | --- | --- |
| Escape | Closes the list and **restores the shown label**. Stops propagation. | Edited: **restores the shown label**, stops propagation. Not edited: does nothing, so it reaches a surrounding `Dialog`. |
| Enter, an option highlighted | Picks it (unchanged). | n/a: a closed list highlights nothing. |
| Enter, nothing highlighted | **Settles the text** and closes the list. Never submits. | Edited: **settles the text** and doesn't submit. Not edited: native, so it submits a form. |

- **To settle** is what blur already does:
  - emptied text clears the value to `null`;
  - any other edited text goes back to the shown label.

  Enter now settles the same way, so blur and Enter agree.
- **Escape never clears a value.** To clear one, empty the text and leave the
  field, or use `clearable`. Escape now means "cancel this edit", in every
  state.
- **Multi-select is unchanged.** Its text is only a search: the values are the
  Tags, and blur never commits it. Escape and Enter there keep D130's
  behaviour.
- **This changes behaviour a consumer could rely on.**
  - Escape on a closed single-select no longer empties the text.
  - Enter on edited text no longer submits the form.
  - The changeset says both.

APG's editable-combobox example clears the text on a closed Escape. APG marks
that as optional, and it is the step that loses the value here. The
consumer's own rule and MUI's default (`clearOnEscape` off) both keep the
value.

**2. `aria-expanded` is true only while a listbox shows; the status line describes the input.**

- **`aria-expanded`** is true only while the popup is open *and* the listbox
  has options. The input and the chevron button both follow this. With "No
  matches", or "Loading…" with no options, the popup still shows its line,
  but `aria-expanded` is false.
- **`aria-controls` still names the listbox** in every state.
  - The element always exists.
  - ARIA 1.2 and axe require `aria-controls` only while the combobox is
    expanded.
  - Dropping it while collapsed would change every closed story's DOM for no
    gain.
- **`aria-describedby`** names the status line while the popup is open and the
  line shows. It also names the "more" line ("Showing 50 of 812…") while that
  shows. Both are lines outside the listbox, and focus never reaches them:
  arrowing moves through options only.
  - The ids are added after the Field's own description, so a Field's message
    is read first.
  - A line that isn't showing is never referenced, because a hidden element
    still contributes its text when an `aria-describedby` names it.
- The listbox stays in the tree with `hidden` while it is empty, as D130 had
  it, and `aria-busy` while loading.
- **Not taken here:**
  - the loading line only when there are no options;
  - a separate line for empty text ("No options") apart from "No matches".

  Those are behaviour changes nobody has accepted.

**3. `announce?: boolean`, default `true`.**

- With `false`, the Combobox renders no live region. The visible status lines
  stay, and so does their place in `aria-describedby`.
- The name and the default follow `Field`'s `announce` (D81). An app with one
  announcer of its own sets it on both.
- **Not added: a callback that hands each line to the caller.**
  - A caller that owns the list (`filter={false}`) knows its counts, its
    loading state and its no-match state already.
  - A caller using the built-in filter doesn't know the filtered count.
    That's a follow-up if a consumer needs it.

**4. `valueLabel?: string`: the picked value's label when the options don't hold it (single-select).**

- **Where the label comes from, in order:**
  1. the current `options`;
  2. a label the Combobox has seen for that value, now including
     `valueLabel`;
  3. the raw value.

  The options always win: `valueLabel` is for a value the list doesn't hold,
  such as a preset value past the first page, or a list that hasn't loaded
  yet.
- **`valueLabel` belongs to the value that was current when it changed.**
  - A new `valueLabel` is stored as the label of the value picked at that
    moment.
  - Passing the same string again stores nothing.
  - This keeps a stale label from leaking onto the next pick. Example: an
    uncontrolled Combobox seeded with `defaultValue="c-4182"
    valueLabel="Acme GmbH"`. The user then picks "Berlin" from the list.
    "Berlin" comes from the options, and "Acme GmbH" stays attached to
    `c-4182`, never to `ber`.
- **A label that arrives later is shown.**
  - When the shown label changes while the text is not edited, the text
    follows it. That covers a `valueLabel` arriving after the value, or an
    options page that finally holds the value.
  - Edited text is never overwritten.
- **Single-select only.**
  - `ComboboxMultipleProps` gets `valueLabel?: never`.
  - A multi-select's Tags show labels from the options and the labels seen,
    as before.
  - A label map for several preset values is a follow-up.

**5. `open?: boolean` and `onOpenChange?: (open: boolean) => void`. This reverses part of D130.**

D130 kept the open state internal on purpose: "the list opens and closes with
typing, which a caller shouldn't have to wire". That reason still holds for
nearly every use, so **uncontrolled stays the default**, and nothing has to be
wired. What D130 didn't foresee is a caller-owned list whose state the
Combobox can't see. When a read fails, the caller has no options to show and
an error to show instead. The popup should stay closed whatever would open it
(typing, the arrows, the chevron), and open again only when the caller says
so. Only the caller knows that, so the caller needs a way to hold it.

- **Uncontrolled** (`open` undefined): exactly D130's behaviour.
  `onOpenChange`, if passed, reports each change after it happens, so a
  caller can watch the list without holding it.
- **Controlled** (`open` defined): the list shows exactly while `open` is
  true and the Combobox is not `disabled`.
  - Everything that would open or close it calls `onOpenChange(next)`
    instead, and nothing changes until the caller passes the new `open`.
  - Things that ask to open: typing, Arrow Down and Up, the chevron.
  - Things that ask to close: a pick, Escape, Alt + Up, Tab, blur, an outside
    pointerdown, and Enter that settles.
  - Typing while the caller holds the list closed asks again at each
    keystroke.
  - The caller can also open the list itself. The Combobox doesn't move
    focus when that happens.
- **Echoes and repeats.** `onOpenChange` is never called for a change the
  caller made through the prop. It's never called with the value already in
  effect.
- **Everything else keeps working while the list is held closed.** The text
  edits, Escape restores, and Enter and blur settle (point 1). So a failed
  read never leaves a half-typed value behind.
- **Rejected: a narrower `suppressOpen` prop.** It would cover only the failed
  read, while `open` and `onOpenChange` also let a caller open the list when a
  read lands, or watch it. The pair is also the shape `Menu` (D50) and
  `Dialog` use. Unlike `Menu`, the pair here is optional.

**What this does to the held requests.** Neither one becomes trivial.
- **A switch for the automatic highlight**, on typing and when the options
  change, becomes cheaper. Enter with nothing highlighted now settles instead
  of doing nothing. That is the rule such a switch needs: Enter after typing
  would revert instead of picking.
- **A reason argument on `onInputChange`** is already cheap. Every text change
  goes through one `writeText`, called from a handful of places, and each
  knows its reason. This decision adds one: the text following a label that
  arrived later. A reason union would need a word for that.

## Tests and gates

- **Unit (vitest, jsdom), test-first:**
  - Escape open: restores, and stops propagation.
  - Escape closed: restores edited text; does nothing when not edited.
  - "Escape, Escape, blur" keeps the value.
  - Enter with nothing highlighted, open: reverts, or clears on empty text,
    and closes.
  - Enter closed with edited text: settles and doesn't submit. Not edited: it
    submits.
  - Multi-select unchanged.
  - `aria-expanded` false with no match, and while loading with no options.
  - The status and more lines in `aria-describedby` only while they show.
  - `announce={false}`: no live region.
  - `valueLabel`:
    - preset value;
    - a label arriving late;
    - the options win;
    - no leak onto the next pick;
    - edited text left alone.
  - `open` and `onOpenChange`:
    - uncontrolled reports;
    - controlled held closed through typing, the arrows and the chevron;
    - closes requested and not applied;
    - no echo;
    - `disabled` wins.
  - A type test: `valueLabel` is rejected with `multiple`.
- **Real browser (`combobox.interaction.spec.ts`, Chromium, no screenshots):**
  - both defects, written and run red before the fix;
  - Escape in a Dialog, restoring a picked value without closing the Dialog;
  - a failed read held closed through typing, Arrow Down and the chevron,
    with Enter settling;
  - a preset value shown by `valueLabel`.
- **Stories.** Two new closed-state stories:
  - `PresetLabel`: `valueLabel` on a caller-owned list;
  - `ReadFailed`: `open` held closed, with a Field error.

  They are new `vr` baselines. As every baseline is, they come from CI's
  render, and the user approves them before they're committed.
- **Docs:**
  - the props' JSDoc;
  - the `a11yMeta` keyboard rows for Escape and Enter, and its notes;
  - `llms.txt`'s Combobox section ("There is **no `open` prop**" changes).
- **A changeset** that names the two behaviour changes.
- **All five gates,** then CI's `vr`.

## As built (2026-11-18)

- **The ids.** The status line and the "more" line get stable ids
  (`psi-combobox-<id>-status`, `-more`). The input names them while the popup
  is open and the line shows, after the Field's description and any
  `aria-describedby` the caller passed.
- **Requests made while a hold is on.** The `ReadFailed` story's first
  version stored every `onOpenChange(true)` in its own state while the read
  was failed. When the read recovered, the list opened by itself. The browser
  spec caught it. The story now drops requests while the read is failed, and
  `open`'s JSDoc and `llms.txt` say to do the same.
- **The story's button.** The same spec showed that "Try again" inside a
  `<form>` needs `type="button"`. `Button` keeps the native default
  (`submit`), so an implicit submit from Enter clicked it.
- **The chevron turns on the popup, not on `aria-expanded`.**
  - D130's CSS rotated it with `.toggle[aria-expanded="true"]`.
  - With point 2, the "No matches" popup left the chevron pointing down: CI's
    `vr` measured 24 px on `open-no-matches`, in light and ember.
  - The toggle now carries `data-open` while the popup is open, and the
    rotation is keyed on that. Every existing baseline stays as it was.
- **One function settles.** Blur, open Enter with nothing highlighted, and
  closed Enter on edited text all call it. Escape writes the shown label
  directly.
- **The stories.**
  - `PresetLabel`: a caller-owned list of five with item 37 picked, named by
    `valueLabel`, with a "more" line.
  - `ReadFailed`: a form with a Field error, `open={false}` while the read
    is failed, and "Try again".

  Both are closed states, so each adds two `vr` baselines (light and ember).
  The repo's shared focus-ring and font specs ran on both and passed.
- **The type fixture** (`scripts/type-fixtures/combobox-select.tsx`):
  - rejects `valueLabel` with `multiple`;
  - accepts `open`, `onOpenChange` and `announce` on both.

## What this changes

`@handamade/psi-react` only. `Combobox` gains `announce`, `valueLabel`,
`open` and `onOpenChange`. Its single-select Escape and Enter change as
described in point 1, and `aria-expanded` and `aria-describedby` change as in
point 2. Tokens, CSS and the other components are untouched.

## Follow-ups

- A callback that hands each spoken line to the caller, for a built-in-filter
  Combobox under an app's own announcer.
- A label map for several preset values in multi-select.
- `defaultOpen`, if a caller wants the list open on mount without holding it.
- **Not changed here:** emptying the text highlights the first option (the
  automatic highlight), so Enter on emptied text with the list open picks that
  option instead of clearing. That belongs with the held highlight switch.
