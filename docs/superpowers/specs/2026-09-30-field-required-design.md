# Required in text, and custom controls join a Field: `requiredText` and `useFieldControl` (D84)

Date: 2026-09-30. Status: **In progress** on branch `d84-field-required`.

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
    { id, "aria-describedby", "aria-invalid", "aria-required", required }
    ```

    each present only when the Field supplies it (`aria-invalid` and the two
    required flags are `true` or absent, never `false`). Outside a `Field` it
    returns `{}`. The consumer's element must carry a role that admits
    `aria-required` (`combobox`, `textbox`, `listbox`, …), which any control
    worth a Field already does.
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

To be filled in when implemented. Tests that go red first:

- `requiredText="(Required)"` renders that text inside the label, `aria-hidden`,
  and no asterisk; without `requiredText` the asterisk renders as today;
  `requiredText` without `required` renders neither;
- a test component using `useFieldControl` inside a `Field` with `error` and
  `required` gets the label's `htmlFor` as its `id`, `aria-describedby`
  pointing at the message, `aria-invalid="true"`, `aria-required="true"` and
  `required`; inside a Field with neither, none of the three flags; outside a
  `Field`, an empty object;
- `useFieldControl` and `FieldContext` are importable from the package index;
- the pattern: `seed-patterns.test.ts` red on the missing `required-field`;
- the token: `field-tokens.test.ts` red on the missing key.

## Consequences

To be filled in when implemented.
