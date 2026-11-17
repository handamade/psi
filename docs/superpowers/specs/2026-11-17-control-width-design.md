# The width of a form control, and of a stacked form (D125)

Date: 2026-11-17. Status: **Approved**, branch `d125-control-width`.

Provenance: a request to size a form control to the value it holds, and to stop
a stacked form from running the full width of a page's main column. D115 left
the first half open on purpose ("How wide a control should be is a separate
question that this decision does not settle"). D115 also left the `error` slot
as a follow-up, which this decision takes.

The number was allocated by the coordinating session. D123 and D124 are held by
other branches in flight at the same time.

## What's there today

1. **A control fills its container, and nothing sets it narrower.**
   - `Input`, `Select` and `Textarea` each declare `width: 100%`.
   - `Field` is a one-column grid with no width of its own, so a control under a
     label is as wide as the Field.
   - Neither the components nor the tokens offer another width. A caller can
     only pass a `className` or an inline `style`, which the house rules
     discourage.
2. **A stacked form is as wide as its column.**
   - `FieldStack` (D115) is a block grid that fills its container.
   - In an `AppShell` main column the container is the page: a display-name
     `Input` in a stacked form measures 768px.
3. **Inside a `Toolbar` row, a Field's control takes its natural width.**
   - A Field in a flex row is sized by its content.
   - An `Input`'s `width: 100%` then resolves against that content size, which
     comes from the browser's default `<input>` width.
   - This is how the `filter-form` pattern lays out its controls, and it reads
     well.
   - A bare `Input` or `Select` directly in a `Toolbar` takes
     `--psi-toolbar-control-width` (200px, D77).
4. **Two precedents for widths.**
   - `Dialog`'s `width={400 | 560 | 720}` is pixel-true px literals in its CSS
     module.
   - `--psi-field-label-max-width` (240px) and `--psi-toolbar-control-width`
     (200px) are standalone px literals in tokens, because the space scale is
     scoped to gaps and padding.
5. **`Field`'s `error` is not a slot.** `Field/slots.json` lists `label`, `body`
   and `description`. A pattern can fill a description but not an error (D115
   follow-up).

## Decisions

- **D125 — a Field sets its control's width from a px scale, and a FieldStack
  has a maximum width.**

  **`Field controlWidth`**
  - `controlWidth?: 80 | 120 | 160 | 240 | 320 | 480`, in px. Without it,
    nothing changes: the control fills the Field.
  - The steps are pixel-true literals, following the `Dialog` `width`
    precedent.
    - They are not tokens. A token named for 240 that a theme set to 300 would
      no longer be pixel-true, and a width is a layout choice made per field,
      not a theme's.
    - The scale counts px, not characters (`ch`), by the house rule that sizes
      are px numbers.
  - Field writes `data-control-width="<step>"` on its root, beside D115's
    `data-label-position` (the layout attributes are spread after the caller's
    props, so the prop wins). The CSS module sizes every
    direct child that is not the label or the message line:
    `inline-size: <step>px; max-inline-size: 100%`.
    - That child is whatever the Field wraps: an `Input`, a `Select`, a
      `Textarea` (or, with a counter, the `Textarea`'s wrapper, so the counter
      lines up with it), or a control built on `useFieldControl`.
    - The selector `.field[data-control-width="<step>"] > :not(.label):not(.message)`
      has specificity (0,4,0), so it beats the controls' own `width: 100%` (0,1,0) and
      `Toolbar`'s `> input` rule (0,1,1).
    - `max-inline-size: 100%` lets a control shrink where its column is
      narrower than the step: a stack below 480px, a dialog, a phone.
    - So that it can, a Field with `controlWidth` sets its own track to `minmax(0, 1fr)` (`auto minmax(0, 1fr)` in the `start` position): an `auto` track would grow to the control's width and the clamp would never bite. Found by the Chromium layout check.
  - The label and the message line keep the Field's width. An error under a
    120px control does not wrap at 120px.
  - The props doc (JSDoc, so the generated docs) and `llms.txt` carry the
    measured counts as prose, not a table: at size 32 about 7/12/17/26/36/55
    digits or 9/14/20/32/44/67 characters; at size 40, 5/10/14/22/31/48 digits;
    a Select 2–3 fewer. Measured in Chromium with the default system font
    stack. It reads, for example, "an ICCID's 20 digits fit 240 at size 32",
    so a caller picks a step from the value it expects.
  - **With D115's `labelPosition`:**
    - In the `start` position the control sits in column 2 at its width, at the
      start of the column. The message line under it spans the whole column.
    - In a `FieldStack` below 480px, where the label returns above the control,
      the control keeps its width unless the column is narrower.
  - **In a group Field** (`group`), the prop sizes each direct child: the
    RadioGroup, or each Checkbox or Switch placed directly in it. The docs say
    it is meant for a Field with one control.
  - **In a `Toolbar` row**, a Field with `controlWidth` is as wide as its
    control, its label or its message line, whichever is widest. A row can narrow one field, a page
    size `Select` say, without a new pattern.

  **The stacked form's maximum width**
  - A new token, `--psi-field-stack-max-width`: `640px`.
    - A standalone literal, like `--psi-field-label-max-width`.
    - Not a colour, so it enters no contrast gate.
  - `FieldStack` binds it as `max-inline-size`. Every `FieldStack` is capped by
    default.
    - A theme can retune it in `componentOverrides`.
    - A caller can set the variable on a scope, `none` included, to lift the cap
      for one form.
  - The stack still fills its container up to the cap and sits at its start, so
    D115's size container and its 480px query are unchanged.
  - In a `start` stack, the label column (at most 240px) and the 12px gap leave
    at least 388px for the controls.

  **`filter-form` is unchanged.** Its controls keep their natural width in a
  `Toolbar`. A filter that needs to be narrower sets `controlWidth` on its
  Field.

  **`error` becomes a slot of `Field`.** `Field/slots.json` gains
  `{ "name": "error", "accepts": {}, "cardinality": "0..1", "order": 4 }`. A
  pattern's non-body slot renders as the prop of the same name, so a pattern can
  now fill a Field's error.

  **What this changes.**
  - Every `FieldStack` wider than 640px is now 640px wide. Its controls narrow
    with it, and the `vr` baselines that show one move.
  - Nothing else changes until a caller sets `controlWidth`.

  Weighed and not taken:

  - **A scale by character count (`ch`).**
    - It fits a value directly and follows the control's font across sizes.
    - Its names would not be pixel-true, against the house rule.
    - The measured table carries the character counts instead.
  - **A `width` prop on `Input`, `Select` and `Textarea`.**
    - It would work for a control outside a Field.
    - It changes three components and gives a `useFieldControl` control
      nothing.
    - A bare control in a `Toolbar` already has `--psi-toolbar-control-width`.
  - **An opt-in `maxWidth` on `FieldStack` instead of a default cap.** Nothing
    would move, but the 768px form would stay the default.
  - **A `Field`-wins rule for a caller's `id` and `aria-invalid`.**
    - This was the other extra offered with this request. It does not fit this
      change to `Field`'s width, and it is recorded here so it is not lost.
    - Today the *caller's* `id` and `aria-invalid` on `Input`, `Select` and
      `Textarea` win: the controls set the Field's values before spreading
      their props. This has been deliberate since the Field's first plan.
    - The open question, from the 0.22 plan, is the reverse: should the
      Field's wiring win, since a caller's `id` disconnects the `<label for>`
      without a warning? D104's Checkbox relies on an explicit
      `aria-invalid={false}` winning, so the answer may differ for the two
      props.
    - It needs a decision of its own.

## Verification

- **Tests first**, red before the change, on assertion:
  - `Field.test.tsx`:
    - each step writes `data-control-width` on the root;
    - no attribute without the prop;
    - the CSS module's rule for each step sets `inline-size` to the step and
      `max-inline-size: 100%` on `> :not(.label):not(.message)`;
    - a `start` Field and a group Field carry the attribute too.
  - `FieldStack.test.tsx`: the module binds `max-inline-size` to
    `var(--psi-field-stack-max-width)`.
  - `packages/tokens`: `--psi-field-stack-max-width` resolves to `640px` in
    every theme.
  - `seed-patterns.test.ts`: `Field`'s slots are `label`, `body`, `description`
    and `error`.
  - A preset test: a pattern node that fills `error` renders it as the Field's
    `error` prop.
- **In a browser:**
  - each step at sizes 32 and 40, measured for the digits and the characters
    that fit (the docs table);
  - a `start` Field and a `start` `FieldStack` at 640 and at 400 wide, with the
    control at its step and clamped below it.
- **Stories:**
  - `Field` "Control width": the six steps, label on top and at the start.
  - `FieldStack` "Capped": a stack in a wide container, at 640.
  - The new stories' baselines and any moved baseline come from CI's
    `vr-baselines` artifact and are shown to the user before they are
    committed.
- **Docs:**
  - `Field` and `FieldStack` props docs;
  - a site example for `controlWidth`;
  - a `minor` changeset.
- **The five gates:** `pnpm build && node tools/check-docs-drift.mjs && pnpm test
  && pnpm lint && pnpm --dir apps/site build && CI=1 pnpm test:site`.

## Follow-ups

- The `id` / `aria-invalid` precedence between a caller and a `Field`, as
  framed above, needs its own decision.
- A Field inside a wrapper element in a `start` FieldStack still matches D115's
  subgrid rule (`.field[data-in-stack="start"][data-label-position="start"]`).
  Its parent is not a grid, so Chromium falls back to auto columns, and that
  later rule also overrides D125's `auto minmax(0, 1fr)` track. A sized control
  in such a Field does not shrink when the stack is 480px or wider but narrower
  than label + 12 + step (measured: a 480 step in a 300px wrapper renders 480).
  A fix verified in Chromium scopes the subgrid rule to the stack's direct
  children:
  `:where([data-label-position="start"]:not(.field)) > .field[data-in-stack="start"][data-label-position="start"]`
  (`:where` keeps (0,3,0), so the container-query rule still wins). It changes
  a D115 rule, so it gets its own decision.
