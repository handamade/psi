# A filter row whose fields can show an error: `Toolbar` gains `align="start"`, Field gains a label-height token, `filter-form` aligns on its controls (D92)

Date: 2026-10-08. Status: **Implemented** on branch `d92-filter-form-error-line`.

Provenance: the third item of the Psi 0.22 portal handoff (brief D92,
`~/Projects/dku/psi-handoffs/2026-10-07-psi-0.22-portal-handoff.md`); the plan
is `docs/superpowers/plans/2026-10-08-psi-0.22-plan.md`, sections 1.2 and 2.3
and Task 4. When the backend rejects a filter value, the portal has nowhere
to show the error at its field: the `filter-form` row forbids one.

## What's there today

Measured on `main` at `6cda910` (D90).

1. **`filter-form` is end-aligned, and end alignment forbids a message
   line.** The pattern renders `<Toolbar as="form" align="end">` of `Field`s
   and a *Find* `Button`. `align="end"` sets `align-items: flex-end`, which
   lines up each item's *last* line. A `Field` with an error ends on its
   error line, so its control rises above the others. `Toolbar`'s doc says so
   ("no description or error line under it"), and the pattern's `intent`
   says "Fields in the row carry no description or error line".
2. **The label's height is not a value anyone can read.** A `Field` is a
   grid of label, control and message with `--psi-field-gap` (6px) between
   them. The label is styled with `font: var(--psi-text-14-20-medium)`, a
   `font` shorthand, so its 20px line height is not exposed as a variable.
   The control therefore starts 26px below the `Field`'s top, and nothing in
   the token set says 26.
3. **`--psi-space-*` cannot carry it.** The scale is scoped to gap, padding
   and margin (D46, `psi/token-scopes`) and has no step that means "a label
   line". `toolbar.module.css` may read only `--psi-toolbar-*` and the scale
   families (`psi/component-tokens-only`), so it cannot read a
   `--psi-field-*` token directly either.

## Decisions

- **D92 — A filter row aligns on its controls, and a field's message line
  hangs below its control.**
  - **`Toolbar` `align` gains `"start"`**: `align?: "center" | "end" |
    "start"`, default `center`. `start` adds a class that sets
    `align-items: flex-start`, so every item shares its top edge. A `Field`
    whose label is one line starts its control 26px below that edge, and so
    does every other such `Field`. A direct `button` or `a` child — the
    *Find* button, which has no label — takes `margin-block-start:
    var(--psi-toolbar-action-offset)` and drops onto the same control line.
    A description or error line then hangs below its own control and moves
    no other item. `center` and `end` are unchanged; `end` keeps its
    restriction, and its doc now points to `start` for a row with messages.
  - **New Field token `--psi-field-label-height: 20px`**, the label's line
    box. The label holds it as `min-block-size`, so the token and the
    rendered line are one value. It is a standalone literal, after
    `--psi-toolbar-control-width`: the label's line height lives inside a
    `font` shorthand, and no scale reaches it.
  - **New Toolbar token `--psi-toolbar-action-offset:
    calc(var(--psi-field-label-height) + var(--psi-field-gap))`**, 26px. It
    is derived from `Field`'s own tokens, never restated, so a change to the
    label metrics or the field gap cannot leave the button behind. It is how
    Toolbar CSS reads Field, since `psi/component-tokens-only` admits only
    the component's own prefix. It binds a margin, which `psi/token-scopes`
    allows, because the token carries no `-bg`/`-fg`/`-border` segment and is
    unscoped.
  - **`filter-form` is `align: "start"`.** Its `intent` drops "Fields in the
    row carry no description or error line" and says that the error line is
    the `Field`'s own, with its usual `aria-describedby` wiring, and that
    every label in the row must be one line.

  **Why option (a), aligning on the controls.** The handoff offered two
  options:

  - **(a) Align on the controls and let messages hang below.** Taken.
  - **(b) A reserved message line in every `Field`, keeping `align="end"`.**
    Rejected. It needs the same offset token as (a), because *Find* has no
    label and no message. With every `Field` ending on its reserved line,
    *Find*'s bottom edge would sit one message line plus the field gap
    below the controls. So (b) saves nothing, and it adds a permanent blank
    line under every filter row, error or not.

  (a) also lifts D87's restriction, so a description is now allowed in a
  filter row too. It adds a value instead of changing one, so every existing
  consumer of `center` or `end` renders as before.

  Weighed and not taken:

  - **`align-items: baseline`.** It looks like the CSS answer and is not. A
    `Select` and an `Input` do not share a baseline, and the button's label
    sits on a third. The controls would line up on their text, not their
    boxes.
  - **The offset in `--psi-space-*` (a 26px margin from the scale).** The
    scale has no 26, and a scale step would restate the label metrics
    instead of deriving from them, so the two could drift silently.
  - **Reading `--psi-field-*` from `toolbar.module.css`.** Blocked by
    `psi/component-tokens-only`, and rightly: the Toolbar token is the one
    place a consumer overrides the offset.
  - **Offsetting every non-`Field` child, not only `button` and `a`.** A
    `Tag` or a bare `Input` in a start-aligned row has no label either. But
    it is not what `filter-form` composes, and a broad selector would move
    content no one has measured. The selector names what the pattern holds.

## Costs

- **Every label in the row must be one line.** A label that wraps is 40px
  tall, so its control starts 20px below the others, and nothing warns. In
  a `Toolbar` that wraps (D52), a narrow viewport can wrap a label. Keep
  filter labels short. The pattern's `intent`, the `Toolbar` doc and
  `llms.txt` all say so.
- **The offset is coupled to `Field`'s label metrics.** That coupling is why
  one Field token, `--psi-field-label-height`, feeds both the label's
  `min-block-size` and the Toolbar offset. The label's `font` and the token
  must still change together: the font shorthand cannot be read, so a
  larger label font with the token left at 20px would push the controls down
  while *Find* stays put.
- **The `calc()` resolves where it is declared.** Component tokens are
  declared on `:where(:root, [data-psi-theme])`. Retuning
  `--psi-field-label-height` or `--psi-field-gap` there moves the button too.
  Retuning either on a narrower scope also needs `--psi-toolbar-action-offset`
  set on that scope, because a custom property inherits its computed value.

## Verification

- **Tests first.** Each went red before its change, on assertion:
  - `toolbar-tokens.test.ts` (new): `--psi-toolbar-action-offset` is
    exactly the `calc()` above, references only `--psi-field-label-height`
    and `--psi-field-gap`, and both exist in `fieldVars`.
  - `field-tokens.test.ts`: `fieldVars` includes `label-height: 20px`, and
    the emitted CSS declares it.
  - `Toolbar.test.tsx`: `align="start"` sets the start class and not the
    end one. The rule `.alignStart` sets `align-items: flex-start`, and
    `.alignStart > :is(button, a)` binds `margin-block-start` to the offset.
    A pin of the default, `center` and `end` class lists was green before and
    after, which is its purpose.
  - `Field.test.tsx`: `.label` holds `min-block-size:
    var(--psi-field-label-height)`.
  - `seed-patterns.test.ts`: `filter-form` composes `align: "start"`, its
    preset renders `align="start"`, and its `intent` states the error line
    and the one-line labels and no longer forbids a message line.
  - `a11y.axe.test.tsx`: a case beside D87's, *Toolbar as a filter form with
    a field in error (D92)*, with `error="Pick a status."` on the `Status`
    `Field`, passes axe. A second test finds `combobox "Status"` and asserts
    that its `aria-describedby` is the error line's id, that its accessible
    description is "Pick a status.", and that it is `aria-invalid`. Both were
    green before the change: they guard the `Field` wiring D92 consumes
    unchanged.
- **Real browser.** `filter-form.interaction.spec.ts` gains a test on the
  new story *Filter form with a field in error*: the three controls and
  *Find* share one top and one bottom edge exactly (no tolerance), and the
  error line's top is at or below its `Select`'s bottom. With the offset
  rule removed, *Find*'s bottom measured 64px against the controls' 90px,
  so the test fails. With the rule, it passes. The full `@interaction` suite
  passes against a Storybook built from this tree.
- **No existing rendering moves**, measured with a throwaway probe against
  the same build, which wrote no baseline:
  - The `components-toolbar--filter-form` and `patterns-presets--filter-form`
    stories, now start-aligned, are pixel-identical in light and ember to
    the same page with the class switched back to end-aligned.
  - No `Field` label in any story is shorter than 20px without the new
    `min-block-size`, so the rule changes no label's height.
- **The five gates** of `CLAUDE.md` green locally: build, docs drift, the
  full test suite, lint, promo build and the site gate. `vr` is CI-only.

## Consequences

- **Visual regression: one new story, nothing else.**
  `components-toolbar--filter-form-with-a-field-in-error` needs baselines in
  light and ember from CI's render. The `filter-form` stories change their
  markup class but not their pixels. Any other diff is a defect to explain,
  not to refresh. `vr` allows 0 pixels (D89).
- **The portal's rejected filter shows at its field.** `UIC-10` sets `error`
  on the `Field` and keeps `align="start"`. The handoff's §8 row 1 closes.
- **An existing `filter-form` consumer copied `align="end"`** from the 0.21
  preset. It keeps working and keeps its restriction. To show an error, it
  moves to `start`.
- **Docs.** The `Toolbar` `align` doc comment (and `docs/Toolbar.md`,
  generated from it), the `filter-form` pattern's `intent`, the guidance
  rule (and every generated `docs/*.md` that carries it), and
  `packages/react/llms.txt`.
