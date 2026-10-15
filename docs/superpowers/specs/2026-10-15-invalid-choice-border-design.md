# A checkbox and radio that show they are in error (D108)

Date: 2026-10-15. Status: **Implemented** on branch `d108-invalid-choice-border`.

Provenance: the UI polish triage after 0.26.0 (candidate B.5). An invalid
`Field` around a `RadioGroup` shows its message and sets `aria-invalid`, but
the circles draw no error. Input, Select and Textarea all turn their border to
`--psi-*-border-error`.

The number is the first free `## Decisions` entry when this branch started.
D105 to D107 are claimed by their PRs (#143 merged, #144, #145).

This builds on D106: the border it recolours is `--psi-border-control`.

## What's there today

1. **`Radio` is wired, and draws nothing.** In an invalid `Field`, every radio
   gets `aria-invalid="true"` from the group (D104). The circle's CSS has no
   rule for it.
2. **`Checkbox` is not wired at all.** It reads no `Field` context. The handoff
   for this cycle assumed it set `aria-invalid` like `Radio`; it does not. A
   group of checkboxes in `<Field group error>` shows the message and leaves
   every checkbox valid to assistive technology.
3. **The error colour is already gated.** `fgDanger` on `bgPrimary` and on
   `bgSecondary` is in `wcagAAPairs` at 4.5, so as a border it clears 1.4.11's
   3:1 (6.3 to 8.3 measured).

## Decisions

- **D108 — an unchecked checkbox or radio marked `aria-invalid` draws its
  outline in the danger colour, and `Checkbox` takes `aria-invalid` from an
  invalid group `Field`, as `Radio` does.**
  - **Tokens:** `--psi-checkbox-box-border-error` and
    `--psi-radio-group-circle-border-error`, both `var(--psi-fg-danger)`: the
    value Input, Select and Textarea use for `border-error`.
  - **The rule keys on the attribute,** not on a class:
    `.input[aria-invalid="true"]:not(:checked) + .indicator` (and
    `:not(:indeterminate)` for the checkbox). So a consumer's own
    `aria-invalid` on a standalone `Checkbox` draws it too.
  - **Unchecked only.** A checked box or circle keeps its accent fill and
    border. An error on a choice control nearly always means "pick one" or
    "you must tick this", which is the unchecked state; a red outline on an
    accent fill would read as neither.
  - **`Checkbox` joins an invalid group `Field`:** inside `<Field group>`
    with an `error`, it gets `aria-invalid="true"`. Not `required`: on a
    checkbox, `required` means *this* box must be ticked, which is not what a
    required group of checkboxes means. A consumer's own `aria-invalid` on the
    checkbox still wins, as every other passed prop does.
  - **Only in group mode.** A single checkbox is its own label; it does not sit
    in a non-group `Field`.

  **What this changes.** In an invalid group `Field`: the unchecked radios and
  checkboxes turn red, and checkboxes become `aria-invalid`. Elsewhere: a
  checkbox or radio with `aria-invalid="true"` turns red.

  Weighed and not taken:

  - **An `error` prop on `Checkbox`.** `aria-invalid` is already the native
    attribute the platform and Field speak; a second spelling of it would have
    to be kept in step.
  - **Red on checked controls too.** Above.
  - **A red label.** Input and Select do not colour their value; the message
    line carries the words.

## Consequences

- An invalid choice group looks like an invalid field, and tells assistive
  technology the same for checkboxes as for radios.

## Verification

- **Tests first**, red before the change, on assertion:
  - `Checkbox.test.tsx`: in an invalid group `Field` the checkbox is
    `aria-invalid` and not `required`; in a valid one it is neither; an
    explicit `aria-invalid={false}` wins; the module draws the error outline on
    `[aria-invalid="true"]`, unchecked and not indeterminate.
  - `RadioGroup.test.tsx`: the module draws the error outline on
    `[aria-invalid="true"]`, unchecked.
  - `packages/tokens/__tests__/invalid-choice-border.test.ts`: both
    `*-border-error` keys alias `--psi-fg-danger`.
- **`choice-error.interaction.spec.ts` (`@interaction`)**: in Chromium, an
  unchecked invalid radio and checkbox compute a border colour equal to the
  Field's error message colour, and a checked one keeps the accent.
- `a11y.axe.test.tsx`: an invalid checkbox group passes axe.
- A Checkbox story, `InvalidGroup`, and its baselines; `radiogroup--with-error`
  and `checkbox` stories move as explained in the PR.
