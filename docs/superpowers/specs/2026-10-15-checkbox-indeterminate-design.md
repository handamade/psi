# An indeterminate checkbox you can see (D103)

Date: 2026-10-15. Status: **Implemented** on branch `d103-checkbox-indeterminate`.

Provenance: tier 2 of the Psi 0.22 portal handoff (its proposed "D97",
renumbered). A "select all" checkbox over a list where some rows are selected
must show a third state, and `Checkbox` has none.

The number is the first free `## Decisions` entry when this branch started.
D101 and D102 are claimed by their open PRs.

## What's there today

1. **No `indeterminate`.** The mixed state is a DOM *property*
   (`input.indeterminate`), with no HTML attribute. React has no prop for it,
   so a consumer must hold a ref and set it in an effect.
2. **Nothing draws it.** Even when a consumer sets the property, the
   indicator styles only `:checked`. A mixed checkbox looks unchecked, or
   checked if `checked` is also true.
3. **The checkmark's colours are gated.** `check-fg` (`fg-on-accent`) on
   `box-bg-checked` (`fill-accent`) is the pair `contrast-matrix.ts` already
   gates at 4.5:1 for Button, IconButton, Tag and the checkbox's check.

## Decisions

- **D103 — `Checkbox` takes `indeterminate`, which sets the DOM property, and
  the indicator draws a dash in the checked colours.**
  - **`indeterminate?: boolean`, unset by default.** When the prop is passed,
    a layout effect writes `input.indeterminate` from it on *every* render,
    not only when it changes. A click clears the property in the browser
    before the consumer re-renders, so a dependency-keyed effect would leave
    the DOM out of step whenever the prop stays `true` across a click. When
    the prop is absent, the property is left alone. That matters, measured:
    the first version defaulted to `false`, and writing `false` on every
    render would have wiped the state any consumer had set through the ref,
    the only way to get it before D103. Psi's own `TableSelectAllCell` was
    such a consumer. A test now pins it. The forwarded `ref` still reaches
    the input; `Checkbox` merges it with its own.
  - **`TableSelectAllCell` moves onto the prop.** It passes
    `indeterminate={some && !all}` instead of setting the property in an
    effect keyed on `[some, all]`, which would also have gone stale after a
    click.
  - **The platform exposes the state.** A native checkbox with
    `indeterminate` is exposed as mixed (`aria-checked="mixed"` in the
    accessibility tree) without any ARIA from Psi, so none is written.
  - **The dash.** `.input:indeterminate + .indicator` takes the checked fill
    and border. Its `::after` is an 8 by 2px bar in `check-fg`, replacing the
    rotated check. The rules come after the `:checked` ones, so a box that is
    both checked and indeterminate shows the dash, as the platform's own
    checkbox does.
  - **No new contrast pair.** The dash uses exactly the checkmark's
    colours, already gated. The brief asked for a pair in
    `contrast-matrix.ts`; the existing one covers it, and adding a duplicate
    would only move the pinned pair count.

  **Why this changes no default.** `indeterminate` is a new optional prop.
  Absent, it writes nothing, so a checkbox and any ref-based workaround
  behave as before.

  Weighed and not taken:

  - **`checked="mixed"`, a tri-state `checked`.** It would change the type of a
    native prop every consumer passes today.
  - **`aria-checked="mixed"` on the input.** ARIA on a native checkbox
    contradicts its own state when the property is not set too. The property
    is the source the platform maps.
  - **Set the property only when the prop changes.** It goes stale after a
    click (above).

## Consequences

- A "select all" checkbox can show some-but-not-all with one prop. Clicking
  it fires `onChange` as usual, and the consumer decides the next state.

## Verification

- **Tests first**, red before the change, on assertion, in `Checkbox.test.tsx`:
  - `indeterminate` sets the DOM property, and `false` clears it.
  - After a click clears the property, a re-render with the prop still
    `true` restores it.
  - The forwarded ref is still the input.
  - Without the prop, a state set through the ref survives a re-render. This
    case was red against the first version, which defaulted to `false`.
  - Table's select-all tests stay green on the prop.
  - The module draws the dash: `.input:indeterminate + .indicator::after`
    is an 8 by 2px bar, and its rule comes after the `:checked` one.
- `a11y.axe.test.tsx`: an indeterminate checkbox passes axe.
- A story, `Indeterminate`, and its VR baselines from CI.
