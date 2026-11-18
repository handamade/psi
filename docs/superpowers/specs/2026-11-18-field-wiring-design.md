# A Field wires every control the same way (D135)

Date: 2026-11-18. Status: **Approved**, branch `claude/d135-field-wiring-011d68`.

Provenance: three requests about how `Field` reaches the control it wraps, each
of which a consumer works around today.
1. Whether a caller's `id` or `aria-invalid` beats the Field's. The D125 spec
   recorded the question and left it for a decision of its own.
2. `Checkbox` and `Switch` take nothing from a non-group `Field`.
3. `Toolbar`'s control width misses a control that sits in a `Field`.

The number was allocated by the coordinating session. D134 (`Combobox`) and D136
(`Dialog`, `Toast`) are held by branches in flight at the same time. D135 was
checked free on every local and `origin` branch and in the open PRs on
2026-11-18.

## What's there today

Measured in Chromium (Playwright's bundled build), reading the accessibility
tree over CDP, on markup rendered by the real components.

1. **A caller's `id`, `aria-invalid` and `required` beat the Field's.**
   - `Input`, `Select` and `Textarea` set the Field's values, then spread the
     caller's props over them. Only `aria-describedby` is merged.
   - `<Field label="Email" error="Not an address"><Input id="email"
     aria-invalid={false} /></Field>` measures:
     - name `""`: the `<label for>` points at an id no element has;
     - invalid `false`, with the error on screen;
     - description "Not an address", because the description is merged.
   - The same Field without the caller's props measures name "Email", invalid
     `true`.
   - This has been deliberate since the Field's first plan. D108 extended it to
     `Checkbox`: "a consumer's own `aria-invalid` on the checkbox still wins, as
     every other passed prop does". It was tested, but no use for it was ever
     written down.
2. **`Checkbox` reads `Field` only in group mode, and `Switch` not at all.**
   - D108 decided that a single checkbox "does not sit in a non-group Field".
     It does: a single checkbox with an error ("You must accept the terms"),
     or a setting under a heading-like label, needs the Field's message line.
   - `<Field label="Notifications" error="Choose one" required>` around
     `<Checkbox>Email me weekly</Checkbox>` measures name "Email me weekly", no
     description, invalid `false`. The error is on screen and nowhere in the
     tree. The Field's `<label for>` points at nothing. `Switch` measures the
     same.
   - The consumer's workaround spreads `useFieldControl()` onto the box. That
     measures description "Choose one" and invalid `true`, but name
     "Notifications": the hook's `aria-labelledby` replaces the box's own label,
     so "Email me weekly" is lost.
3. **`--psi-toolbar-control-width` reaches only a bare control.**
   - `.toolbar > input`, `.toolbar > select` and (D130)
     `.toolbar > [data-psi-combobox]` take the token, 200px.
   - The token's own comment says Field-wrapped controls are "unaffected" on
     purpose: a Field's flex basis comes from its content.
   - Measured on this machine:

     | Preset | Controls | Widths (px) |
     | --- | --- | --- |
     | `filter-toolbar` | bare `Input`, bare `Select` | 200, 200 |
     | `filter-form` | `Input`, `Select`, each in a top-labelled `Field` | 172, 79.6 |
     | `date-range-filter` | two date `Input`s, each in a top-labelled `Field` | 141, 141 |
     | `table-pagination`, `cursor-pagination` | "Rows per page" `Select` in a `labelPosition="start"` `Field` | 58 |

   - So the labelled form of a filter row is ragged, while its unlabelled form
     is even.

## Decisions

- **D135 — inside a `Field`, the Field's wiring wins; `Checkbox` and `Switch`
  take it as `Input` and `Select` do; and the toolbar's control width reaches
  the control of a top-labelled `Field`.**

  **1. The Field's wiring wins over a caller's props.** One rule for every
  native control Psi writes (`Input`, `Select`, `Textarea`, `Checkbox`,
  `Switch`): a caller can add to the wiring, never undo it.
  - **`id`: the Field's.** It is the only id the `<label for>` points at, so
    a caller's id silently strips the control's name (measured above).
    - A caller who needs a known id sets it on the Field: `htmlFor="email"`
      has always existed for this, and the Field passes it down.
    - In development the control warns once when a caller's `id` differs from
      the Field's, and names `htmlFor`. A control used outside a Field keeps
      its caller's id, as today.
  - **`aria-invalid`: `true` while the Field has an error,** whatever the
    caller passes. While it has none, the caller's value stands, so a caller can
    still mark a control invalid on its own.
    - The error is on screen and describes the control. A control that says
      it is valid beside it contradicts what a sighted user sees.
  - **`required`: `true` while the Field is required,** whatever the caller
    passes; otherwise the caller's value. Not in the request, but it is the same
    line of code and the same defect: the label shows the asterisk or the
    required word, so the control must say it too.
  - **`aria-describedby`:** unchanged. The Field's message comes first, then the
    `Textarea` counter, then the caller's ids.
  - **In a group Field** a `Checkbox` (and now a `Switch`) still takes only
    `aria-invalid`, and the Field's now wins there too. This reverses one
    sentence of D108: a caller's `aria-invalid={false}` on a box in an invalid
    group no longer clears it.
    - D108 tested that `false` won but named no use for it.
    - The D125 spec raised it as a reason the answer might differ for the two
      props. It does not differ: the group's error is on screen for every box
      in it, so a caller who means one box only puts the error on that box's
      own Field.
  - **Why the Field, and not the caller.** Both directions lose something.
    - Caller-wins loses the label silently, which is an accessibility failure
      that the consumer sees only in a screen reader.
    - Field-wins loses a caller's id, which shows at once (a selector or a test
      that no longer matches) and is warned about.
    - The consumer refuses these props on its own text fields today, so it has
      already chosen this.
  - **Not taken:**
    - *Caller-wins with a development warning only.* The label stays
      disconnected in production.
    - *The control's id flows up to the Field's label.* The label renders
      before the control. Doing this needs state and a second render, and the
      server-rendered `for` would not match the client's.
    - *A different rule for `aria-invalid` than for `id`.* Neither prop has a
      use for undoing the Field (above).
  - **Not changed here:** `Combobox` sets the Field's `aria-invalid` over the
    caller's already, but still lets a caller's `id` win. D134 owns
    `Combobox` in a parallel branch, so it follows this rule in a follow-up.
    `useFieldControl` returns props for the caller to spread, so the order is
    the caller's to choose, as before.

  **2. `Checkbox` and `Switch` in a non-group Field take its wiring:** the
  Field's `id`, its message in `aria-describedby`, `aria-invalid` while it has
  an error, and `required` while it is required.
  - **No `aria-labelledby`.** The box keeps its own `<label>` and also gets the
    Field's `<label for>`. A labelable element with two labels is named by both,
    in DOM order. Measured with the wiring applied by hand:
    - Field label "Notifications" around "Email me weekly": name "Notifications
      Email me weekly", description "Choose one", invalid `true`.
    - A Field with no label around "I accept the terms": name "I accept the
      terms", description "You must accept the terms", invalid `true`.
  - **`required` in a non-group Field means this box must be ticked.** That is
    the native meaning, and it is what "I accept the terms" needs. In a group
    it is still not set, as D108 decided.
  - **Clicking the Field's label toggles the box,** as `<label for>` does for
    any control.
  - **An unchecked box in error draws D108's red outline,** because that rule
    keys on `[aria-invalid="true"]`. `Switch` has no error drawing of its own:
    its error shows on the message line only.
  - **`Switch` reads `Field` exactly as `Checkbox` does,** in a group too: an
    invalid group Field makes it `aria-invalid`.
  - The consumer's `useFieldControl()` spread onto a box can go, and with it
    the lost name.

  **3. `--psi-toolbar-control-width` reaches the control of a top-labelled
  Field that is a direct `Toolbar` child,** unless that Field sets
  `controlWidth`.
  - `Field` writes `data-psi-field` on its root, as `Combobox` writes
    `data-psi-combobox`.
  - The Toolbar rule:
    `.toolbar > [data-psi-field]:not([data-control-width]):not([data-label-position]) > :is(input, select, [data-psi-combobox])`.
    - It takes the same three controls the bare rule takes, so a `Checkbox`,
      a `Switch`, a group, a `Textarea` and a `useFieldControl` element in a
      Field are untouched, as they are bare.
    - The bare rule is unchanged, so a bare `Combobox` keeps D130's width.
  - **`controlWidth` replaces the token; the token is the default** (the row's
    question). A Field with `controlWidth` is excluded by name, not by the
    specificity contest D125's comment describes.
  - **Only a top-labelled Field.** Its label sits above the control, so the
    Field is a filter column, as in `filter-form` and `date-range-filter`. It
    now matches the bare filter.
    - A `labelPosition="start"` Field in a toolbar is a label-and-value pair,
      such as "Rows per page" beside a pager (D115). It stays as wide as its
      content: the pager presets' page-size `Select` stays 58px, not 200.
    - `controlWidth` sizes either when wanted.
  - **The Field grows with its control.** The Field is a flex item with no
    width of its own, so it is as wide as the wider of its label and its
    control, as D125 has it for `controlWidth`. A label longer than 200px
    still widens the Field, and the control stays 200.
  - **What moves:** `filter-form` 172 and 79.6 → 200 and 200, and
    `date-range-filter` 141 and 141 → 200 and 200. So do the `Toolbar` stories
    built the same way (`FilterForm`, `FilterFormWithAFieldInError`,
    `AlignEnd`) and any consumer row of top-labelled Fields.
  - **Not taken:**
    - *Every Field in a toolbar, start-labelled too.* Both pager presets'
      page-size selects would grow from 58 to 200 px, and so would every
      consumer pager built from them.
    - *The presets set `controlWidth` and the docs say the token covers bare
      controls only* (the row's second option). Every consumer row of labelled
      filters would still be ragged until it set widths itself, which is the
      workaround the request removes.
    - *Size the Field instead of its control.* A label longer than 200px would
      wrap, which breaks `align="start"`'s one-line-label contract (D92).

## Verification

- **Tests first**, red before the change, on assertion:
  - `Field.test.tsx` (precedence): inside a Field, `Input`, `Select` and
    `Textarea` take the Field's `id` over a caller's, `aria-invalid="true"`
    over a caller's `false` while the Field has an error, and `required` over
    a caller's `false`.
    - A caller's `aria-invalid` and `required` stand while the Field sets
      neither.
    - `htmlFor` still names the id.
    - Outside a Field, the caller's props pass through.
    - A dev warning fires once for a differing caller `id`, and not for a
      matching one.
  - `Field.test.tsx`: the root carries `data-psi-field` in every mode.
  - `Checkbox.test.tsx` and `Switch.test.tsx`, in a non-group Field: named by
    the Field's label and its own text, described by the message,
    `aria-invalid` and `required` from the Field. In a group Field: invalid
    only, never `required`, and the Field's `aria-invalid` beats a caller's
    `false` (D108's test, reversed).
  - `Toolbar.test.tsx`: the module carries the Field rule with its two
    exclusions, and the bare rule unchanged.
- **`toolbar-control-width.interaction.spec.ts` (`@interaction`), Chromium:**
  - `filter-toolbar` stays 200 and 200;
  - `filter-form` and `date-range-filter` measure 200 for each control;
  - the pager presets' page-size `Select` keeps its natural width;
  - a `controlWidth` Field in a Toolbar row keeps its step.
- **`field-wiring.interaction.spec.ts` (`@interaction`), Chromium:** the new
  `Checkbox` story "In a Field" exposes the box named "Notifications Email me
  weekly", described by the Field's error, and invalid.
- `a11y.axe.test.tsx`: a `Checkbox` and a `Switch` in an invalid, labelled,
  non-group Field pass axe.
- Docs: `Field`, `Checkbox`, `Switch`, `Input`, `Select`, `Textarea` and
  `Toolbar` prop docs; `a11y-meta.ts`; `packages/react/llms.txt`;
  `guidance.ts`; the toolbar token's comment.
- `vr`: the presets and `Toolbar` stories above move, and a new `Checkbox`
  story joins. CI's renders go to the user before any baseline is committed.

## Follow-ups

- `Combobox`: a caller's `id` still beats the Field's (D134 owns the file in
  parallel). It also drops a caller's own `aria-invalid` while the Field is
  valid, which the other controls keep.
- `RadioGroup` in a non-group `Field` takes no name: the Field's `<label for>`
  points at nothing, because a `radiogroup` div is not labelable. It needs
  `aria-labelledby` and the message, as P137 did for the boxes.
- `Switch` draws no error state, so a `Switch` in error shows it on the
  message line only.
