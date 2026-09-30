# Required in text, and custom controls join a Field: `requiredText` and `useFieldControl` (D84)

Date: 2026-09-30. Status: **Implemented** on branch `d84-field-required`.

Provenance: the third item of the Psi 0.21 portal handoff
(`docs/superpowers/plans/2026-09-30-psi-0.21-portal-handoff.md`, brief D84).
Two of the portal's rules: required fields are marked in text, not by a glyph
alone; and its combo box and date-time picker are built on React Aria, outside
Psi, yet must sit in a `Field` with the same label, description, error and
required wiring `Input` gets.

## What's there today

1. **`Field` marks a required field with an `aria-hidden` asterisk only**
   (`Field.tsx:73-77`), coloured `--psi-field-marker-fg` (danger). There is no
   way to show a word instead.
2. **The programmatic signal is the control's `required` attribute**, which
   `Input` and `Select` read from `FieldContext` (`Input.tsx:57`,
   `Select.tsx:61`), together with `id`, `aria-describedby` and
   `aria-invalid`.
3. **`FieldContext` is exported from `Field.tsx:17` but not from the package
   index.** A control built outside Psi cannot reach the wiring at all: its
   label points nowhere, its error is not described, and it is not marked
   invalid or required.
4. **`--psi-fg-tertiary` is the one foreground the contrast matrix does not
   gate** (D76 found it at 2.84:1 on the promo site). It is not a colour for a
   word that must be read.

## Decisions

- **D84 — A required field can say so in a word, and a control Psi did not
  write can join a Field.**
  - **`Field` gains `requiredText?: string`.** With `required`, the label
    shows that text after the label — for example *(Required)* — instead of
    the asterisk. Without `required`, it renders nothing, as the asterisk
    does. It is visible and `aria-hidden`, because the control carries the
    programmatic signal (`required` or `aria-required`), and a screen reader
    that heard both would say "required" twice.
    - It is set in the label's font at regular weight, in a new token
      `--psi-field-required-text-fg` bound to `--psi-fg-secondary`: the
      label's own colour, gated at 4.5 on every surface. Not the asterisk's
      danger red, which is a glyph's colour and would make every required
      label read as an error. Not `--psi-fg-tertiary`, for the reason in
      item 4.
  - **`useFieldControl()` is exported.** Inside a `Field` it returns the props
    a custom control spreads onto its focusable element:

    ```ts
    { id, "aria-labelledby", "aria-describedby", "aria-invalid", "aria-required", required }
    ```

    each present only when the Field supplies it (`aria-invalid` and the two
    required flags are `true` or absent, never `false`). Outside a `Field` it
    returns `{}`. The consumer's element must carry a role that admits
    `aria-required` (`combobox`, `textbox`, `listbox`, …), which any control
    worth a Field already does.
    - **`aria-labelledby` is not in the brief.** It is there because the
      first version without it was looked at in a browser: the stand-in
      combobox rendered as `combobox [invalid]` with no name. A `<label for>`
      names only a labelable element — `input`, `select`, `textarea`,
      `button` — and a custom control is usually a `div`. So the Field's
      `<label>` now carries an id (`<id>-label`), `FieldContext` exposes it as
      `labelId`, and the hook hands it over. With it the same tree reads
      `combobox "Airline" [invalid]`. `Input` and `Select` are labelable and
      unchanged.
    - It is the same wiring `Input` and `Select` do by hand, expressed once.
      They are not rewritten onto it here: they also merge the consumer's own
      `id`, `required` and `aria-describedby`, and changing their DOM was not
      in the brief.
  - **`FieldContext` and `FieldContextValue` are exported too**, for a
    control that needs the raw values (`invalid`, say, to style itself)
    rather than the props.
  - **Group mode is unchanged**: `aria-required` is not valid on a fieldset's
    `group` role. A later radio group carries it on its own `radiogroup`.
  - **New pattern `required-field`**: a `Field` with `required` and
    `requiredText`, a description, and an `Input`. `settings-form-row` stays
    as it is: it is group mode, where none of this applies. 35 components,
    15 patterns.

## Verification

- **Tests first**, each red before its change:
  - the token, on the missing key;
  - `requiredText`: the word in the label, `aria-hidden`, no asterisk, and
    the control still `required` (red on assertion); nothing without
    `required`;
  - the hook, red on the missing module, then 3 tests: the full wiring under
    `error` + `required`, flags absent (not `false`) without them, `{}`
    outside a Field. The accessible-name assertions were added after the
    browser check above and went red on the version without
    `aria-labelledby`;
  - the pattern, on the missing `required-field`.
- **Regression.** No existing Field, Input or Select test was edited. The one
  DOM change to an existing render is an `id` on the Field's `<label>`.
- **In a browser** (Chromium 149, built Storybook), the accessibility tree of
  the `CustomControl` story: `combobox "Airline" [invalid]`, described by
  *Pick one.*; of `RequiredText`: the textbox is named *Passport number*, the
  word is not in the tree.
- **The D82 sweep caught the story's stand-in** drawing no focus ring, as it
  should: a focusable `div` with inline styles. The stand-in now takes its
  styles from `Field.stories.css`, which binds the focus-ring tokens the way a
  consumer's own control must. That file is story-only and not shipped.
- **The five gates** green: 2326 tests in 94 files (2319 in 93 before), docs
  drift at 35 components and 15 patterns, site gate 9 of 9. Interaction set
  151 of 151.

## Consequences

- **Visual regression: six new baselines, none changed.** `RequiredText`,
  `CustomControl` and the generated `required-field` preset, in light and
  ember, from CI's artifact.
- **Every non-group `Field` label now has an `id`** (`<control id>-label`).
  Nothing reads it but the hook.
- **A custom control is named by the Field only through the hook.** A
  consumer who spreads only `id` gets a `<label for>` that points at a
  non-labelable element and a nameless control. The hook's docs say so.
- **The word is `aria-hidden` by decision.** A screen reader hears "required"
  from the control. A consumer who wants the word spoken as well can put it
  in the `label` itself.
- **The portal** wraps its React Aria combo box and date-time picker in
  `Field` and spreads `useFieldControl()` onto their focusable element, and
  marks required fields with `requiredText`.
