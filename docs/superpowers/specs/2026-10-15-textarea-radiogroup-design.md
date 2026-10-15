# Two more form controls: Textarea and RadioGroup (D104)

Date: 2026-10-15. Status: **Implemented** on branch `d104-textarea-radiogroup`.

Provenance: tier 2 of the Psi 0.22 portal handoff (its proposed "D98",
renumbered). The brief: "New `Textarea`, with optional minimum and maximum
length and a visible counter that is not a live region, and new `RadioGroup`
on `Field`'s group mode. Both join a `Field` through `useFieldControl`, as D84
set up." The portal's later forms need both. No portal spec names a screen
yet, so the user chose to build them now on the brief's word (2026-10-15).

The number is the first free `## Decisions` entry when this branch started.
D101–D103 are claimed by their open PRs.

## What's there today

1. **No multi-line text control.** A consumer writes a raw `<textarea>`, which
   gets no Psi styling and no `Field` wiring.
2. **No radio control.** `Checkbox` and `Switch` are the only choice controls.
   `Field group` already renders a `<fieldset>` and `<legend>` for "several
   self-labeled controls" and makes its message describe the whole group.
3. **`Field` wires its control through `FieldContext`** (D49, D84): `id`,
   `labelId` (not in group mode), `describedBy`, `invalid`, `required`.

## Decisions

- **D104 — `Textarea` is the `Input` recipe on a `<textarea>`, with a visible,
  non-live counter. `RadioGroup` and `Radio` are native radios that share a
  name, styled like `Checkbox`, and fit `Field group`.**

  **`Textarea`**
  - **A styled native `<textarea>`.** It has the input's border, radius, focus
    ring (inset, D82), error and disabled states, and the 32px value
    typography. `rows` defaults to 3, `resize: vertical`. It has **no `size`
    prop**: Psi's sizes are control heights, and a multi-line field's height
    is its rows.
  - **`Field` wiring is the `Input`'s**: `id`, `aria-describedby`,
    `aria-invalid` and `required` come from `FieldContext`. A caller's own
    `aria-describedby` is joined, not replaced.
  - **`minLength` and `maxLength` are the native attributes.** The browser
    enforces `maxLength` while typing and reports `minLength` through
    constraint validation. Psi adds no validation of its own.
  - **The counter.** With `maxLength`, a line under the control shows
    `{length} / {maxLength}`, right-aligned in the secondary foreground.
    `showCounter={false}` hides it. It is **not a live region**: a
    character count spoken on every keystroke is noise. It has an id that
    joins the textarea's `aria-describedby`, so it is read with the field on
    focus, followed by a visually hidden "characters". The count follows the
    value whether the textarea is controlled (`value`) or not
    (`defaultValue` and typing).

  **`RadioGroup` and `Radio`**
  - **Native `<input type="radio">`, one `name` per group.** The browser
    supplies the radio group's keyboard: Tab enters on the checked radio (or
    the first), and the arrows move and select. Psi writes no keyboard code.
  - **`RadioGroup`** takes `name` (generated when absent), `value` or
    `defaultValue`, `onValueChange(value)`, `disabled`, and
    `orientation` (`"vertical"` by default, or `"horizontal"`). It renders a
    `div` that lays its radios out (8px apart in a column, 16px in a row), and gives each radio
    the group's name, the checked state, `required` and `aria-invalid`.
  - **Its accessible name depends on where it sits.** Inside `Field group`
    the `<fieldset>` and `<legend>` already form and name the group, so
    `RadioGroup` adds no role. Standalone, it renders `role="radiogroup"` and
    needs `aria-label` or `aria-labelledby`. `FieldContext` gains a `group`
    flag so `RadioGroup` can tell the two apart.
  - **`Radio`** takes `value`, `children` (its label) and `disabled`. Like
    `Checkbox`, it is a `<label>` around a visually hidden input and a 16px
    indicator: a circle with a 1px neutral border, which when checked fills
    with the accent and shows a 6px dot in `fg-on-accent`. That is the
    checkbox's checked pair (`fg-on-accent` on `fill-accent`), already
    gated, so no contrast pair is added. The focus ring is the shared one.
  - **Required and invalid come from the `Field`.** Every radio in the group
    gets `required` when the Field is required, which is how native radio
    groups express it. Every radio gets `aria-invalid` when the Field has an
    error.

  **Tokens.** `--psi-textarea-*` aliases the input's values (bg, fg,
  placeholder, border, hover, error, focus ring, radius), the 32px value ramp
  (padding, font) and a `counter-fg` of `fg-secondary`. `--psi-radio-group-*`
  serves both RadioGroup and Radio, which share one module and so one prefix,
  and aliases the checkbox's (fg, circle bg and border, checked fill, dot,
  focus ring).
  Every value is an existing gated semantic, so the pinned contrast-pair count
  does not move.

  **A pattern that demands both: `feedback-form`.** A form that asks for a
  category (a required `RadioGroup` in `Field group`) and a description (a
  `Textarea` in a `Field` with a `maxLength` counter), then submits. It is
  the 24th pattern. D100 holds the overview envelope through 32.

  **Why this changes no default.** Three new components. Nothing existing
  changes except `FieldContextValue`, which gains an optional `group` flag.

  Weighed and not taken:

  - **A `size` prop on `Textarea`.** Psi's size names a height, and rows set
    a textarea's height.
  - **A live counter, or a polite announcement near the limit.** The brief
    rules out a live region. A consumer who wants an announcement at the
    limit uses the announcer.
  - **An `options` array on `RadioGroup`.** Compound children match
    `Menu`/`MenuItem` and `Tabs`/`Tab`, and let a radio carry rich label
    content.
  - **Roving tabindex in JS.** Native radios with one name already do it.
  - **`role="radiogroup"` inside `Field group` too.** A group inside a group,
    both named by the same legend, would be announced twice.

## Consequences

- 50 components (Textarea, RadioGroup, Radio) and 24 patterns. Every prose
  count moves with them.
- **Expected VR movement:** only the new stories and the `feedback-form`
  preset.

## Verification

- **Tests first**, red before the components existed, then on assertion:
  - `Textarea`: in a `Field` it gets `id`, `aria-describedby`,
    `aria-invalid` and `required`; a caller's `aria-describedby` is joined.
    With `maxLength={10}` the counter reads `0 / 10`, then `3 / 10` after
    typing, both uncontrolled and controlled. The counter is not a live
    region, and its id is in the textarea's `aria-describedby`.
    `showCounter={false}` hides it, and there is no counter without
    `maxLength`.
  - `RadioGroup`: the radios share one name. Clicking one calls
    `onValueChange` with its value, and in a controlled group the checked
    radio follows `value`. Standalone, it is a `radiogroup` named by its
    `aria-label`. Inside `Field group` it has no role, and the fieldset is
    named by the legend. A required, invalid Field makes every radio
    `required` and `aria-invalid`. `disabled` on the group disables every
    radio.
  - Token tests for both families (written after the token files, so they
    pin values rather than drive them), the three pinned pattern lists, the
    slots list.
  - `Textarea` declares `minLength` and `maxLength` itself: measured, the
    manifest lists only declared props, so the pattern could not use an
    inherited one.
  - `a11y.axe.test.tsx`: a `Textarea` in a `Field` with a counter, a
    standalone `RadioGroup`, and a `RadioGroup` in `Field group` with an
    error all pass axe.
- **The envelope**, measured with 24 patterns: 8 components, 5767 of 6000
  bytes. The floor holds through 32 and breaks at 33 with realistic ids.
