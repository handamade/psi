# Labels beside their controls: `labelPosition` and `FieldStack` (D115)

Date: 2026-11-13. Status: **Approved design**, not built. Branch `d115-field-label-position`.

Provenance: D49 shipped `Field` with the label above the control and put the other layout out of scope: "Horizontal
(label-left) orientation — revisit on real consumer demand." The demand is here. A consumer's pager puts a
*Rows per page* `Select` in a `Field` beside *Previous* and *Next*, so the label above makes the field taller than the
buttons beside it, and the `table-pagination` and `cursor-pagination` presets build the same row. The user also wants
forms whose labels share one column. The scope was settled with the user on 2026-11-13, question by question; each
choice is recorded under its decision below.

The number is the first free `## Decisions` entry when this branch started. D113 and D114 are claimed by an approved
spec on another branch.

## What's there today

1. **`Field` is a one-column grid** (D49): the label (`<label for>`, or `<legend>` in group mode), then the control,
   then one message line that renders only when there is a message. `gap` is `--psi-field-gap` (6px).
2. **The label's line box is a token** (D92): `--psi-field-label-height`, 20px, held as the label's
   `min-block-size`. `Toolbar align="start"` drops a direct button or link by that height plus the field gap, so it
   meets the controls under one-line labels.
3. **Controls join a `Field` through `FieldContext`**: `Input`, `Select` and `Textarea` read it, `RadioGroup` and
   `Checkbox` read it in group mode (D104, D108), and a third-party control spreads `useFieldControl()` (D84).
4. **`Stack`** (D109) is a flex column with a gap from the space scale; forms use it today to space their fields.
5. **Psi has no container query.** Its one width query is `Card`'s `@media (max-width: 960px)`, a literal equal to
   `breakpoints.md` (D31: breakpoints are build-time constants, because a custom property cannot drive a query).

## Decisions

- **D115 — A `Field` can put its label beside its control (`labelPosition="start"`), alone or in a `FieldStack`
  whose fields share one label column as wide as their longest label.**

  **What the user chose (2026-11-13)**
  - **Both layouts:** a single field inline, for a toolbar or a pager, and a form whose labels line up in one column.
  - **The column's width is its longest label,** capped by a token, rather than a fixed width that every form tunes.
  - **Labels align to the start edge,** and a theme can switch them to the end edge with a token, with no prop.
  - **A narrow form stacks:** below a fixed container width, every label returns above its control.
  - **Groups are included:** a `RadioGroup` or a set of checkboxes in group mode takes the side label too.

  **API**
  - **`Field` gains `labelPosition?: "top" | "start"`.** Without it, a `Field` takes its `FieldStack`'s position, or
    `"top"` outside one. `"top"` is today's layout, unchanged.
  - **New `FieldStack`**, the 53rd component: `labelPosition?: "top" | "start"` (default `"top"`),
    `gap?: 8 | 12 | 16 | 24` (default 16, from the space scale like `Stack`), `children`, and rest props on its
    `<div>`. It holds `Field`s, and may hold other content between them.
  - **With `"top"`, a `FieldStack` is a column of fields** with its gap, like `Stack`: a form that keeps its labels
    above gets the same container as one that moves them.
  - **The `Field`'s own prop wins** over its `FieldStack`'s. The name `FieldGroup` was avoided because
    `<Field group>` already means fieldset mode.
  - **The position reaches a `Field` by context** (a `FieldStackContext` holding the stack's position), not by
    cloning children, so a `Field` wrapped in a component of the consumer's own still lines up.

  **Layout of one `Field` with `labelPosition="start"`, outside a `FieldStack`**
  - The field is a two-column grid: `grid-template-columns: auto auto` and `column-gap: --psi-field-column-gap`. The
    label is in column 1; the control and the message line are in column 2, so a message hangs under its control
    and never under the label.
  - The field is as wide as its label and its control. A 32px `Select` in a pager stays as wide as its options.
  - It never stacks: a single inline field has no container to measure.

  **Layout of a `FieldStack` with `labelPosition="start"`**
  - The stack is a grid of two columns:
    `grid-template-columns: fit-content(var(--psi-field-label-max-width)) minmax(0, 1fr)`. Each `Field` spans both
    columns and lays its parts out on them with `grid-template-columns: subgrid`, so every label in the stack shares
    column 1, which is as wide as the longest label up to the cap. A label longer than the cap wraps.
  - Content in the stack that is not a `Field` spans both columns.
  - A `Field` whose own `labelPosition` is `"top"` spans both columns with its label above, for a long `Textarea`
    say.
  - A `Field` with no label puts its control in column 2, so a lone `Checkbox` lines up with the controls above it.
  - Controls in column 2 stretch to its width, as they stretch under a label above today. How wide a control should
    be is a separate question that this decision does not settle.

  **Alignment inside a row**
  - Each row aligns its label and its control on their **first baseline** (`align-items: baseline`), so the label's
    text sits on the same line as the text in the control at every size (24, 32, 40, 48) with no per-size offset.
    In group mode the legend's text lines up with the first option's label.
  - The plan verifies this for `Input`, `Select` (a `<select>`'s baseline is its value's text), `Textarea`,
    `RadioGroup`, a `Checkbox` group, and a `useFieldControl` combobox built on a `div`, in Chromium, WebKit and
    Firefox. If one of them has no usable baseline, the fallback is to centre the label on a one-line control's
    height, and the plan records which controls take it.
  - The label's text aligns to `--psi-field-label-align` (`text-align`), `start` by default. A theme sets `end` in its
    `componentOverrides` to put each label against its control.

  **Groups**
  - Group mode keeps its `<fieldset>` and `<legend>`, and the legend takes column 1. A browser draws a fieldset's
    first legend on the fieldset's border (the *rendered legend*) and leaves it out of the fieldset's own layout.
    A floated legend is not a rendered legend, and `float` has no effect on a grid item, so a legend with
    `float: inline-start` becomes an ordinary item of the fieldset's grid. The plan proves this in the three engines
    before the CSS is final; if one of them fails, the fallback is a visually hidden `<legend>` that names the group
    and an `aria-hidden` copy of the label in column 1.

  **Narrow containers**
  - A `FieldStack` with `labelPosition="start"` is a size container (`container-type: inline-size`). Below 480px of
    its own width, every `Field` in it returns to the label above its control, and the label column is dropped.
  - 480 is a build-time constant, `containers.fieldStackColumns`, exported from `scales/layout.ts` beside
    `breakpoints` and written as a literal in the CSS, as `Card` writes 960. A test asserts that the two agree. It is
    below `breakpoints.sm` (560) because it measures a form, not the viewport: a form in a 520px dialog keeps its
    column.
  - A size container takes no width from its content, so a `FieldStack` placed where it would shrink to fit, such as
    a flex row, collapses. A `FieldStack` is a block that fills its container; a toolbar uses single `start` fields,
    never a `FieldStack`. `FieldStack`'s docs say so.

  **Tokens** (`--psi-field-*`, in `components/field.ts`)
  - `label-align`: `start`. The label's `text-align`; `end` puts it against its control.
  - `label-max-width`: `240px`. The cap on the label column of a `FieldStack`. A standalone literal, like
    `label-height`, since the space scale is scoped to gaps and padding.
  - `column-gap`: `var(--psi-space-12)`. The gap between the label and its control.
  - None is a colour, so none enters the contrast gates.

  **What does not change**
  - **Accessibility.** The label is still a `<label for>` or a `<legend>`, and the document order is still label,
    control, message, so a screen reader and the Tab order meet the same field. Only the visual position moves.
    Right-to-left needs nothing extra: the grid's columns and `text-align: start` are logical.
  - **`labelPosition="top"`**, the default, renders today's markup and CSS. No current story changes.
  - **`useFieldControl`** returns the same props.

  **`Toolbar` and the presets**
  - A side-label field is as tall as its control, so `Toolbar`'s default `align="center"` lines it up with the
    buttons beside it.
  - **`table-pagination`**: its `Field` takes `labelPosition="start"`; the row stays centred.
  - **`cursor-pagination`**: its `Field` takes `labelPosition="start"`, and the preset drops `align="end"`, which
    existed only to meet the control under a label above.
  - D92's rule is unchanged: in `align="start"` a direct button drops by one label line and the gap. `Toolbar`'s and
    `Field`'s docs say not to put a side-label field in an `align="start"` row, whose offset assumes labels above.

## Architecture

```
packages/react/src/Field/Field.tsx            — labelPosition prop; reads FieldStackContext; data-label-position
packages/react/src/Field/field.module.css     — the start layout, standalone and under a FieldStack
packages/react/src/Field/FieldStack.tsx       — new: the grid, the container, FieldStackContext
packages/react/src/Field/fieldStack.module.css — new
packages/react/src/Field/Field.stories.tsx    — new stories below
packages/react/src/index.ts                   — export FieldStack and its types
packages/tokens/src/components/field.ts       — three tokens
packages/tokens/src/scales/layout.ts          — containers.fieldStackColumns
packages/react/patterns/table-pagination.json, cursor-pagination.json — the presets
packages/tokens/src/guidance.ts               — one steering line
```

`Field` renders `data-label-position="start"` when the resolved position is `start`, and the CSS keys off that
attribute and off the stack's class, so a `Field` needs no knowledge of its column beyond the context's value.

## Testing

- **Unit (RTL).**
  - The label still names the control (`getByLabelText`) in both positions, in and out of a `FieldStack`.
  - `aria-describedby` and `aria-invalid` are unchanged; the message renders after the control.
  - A `Field`'s own `labelPosition` beats its stack's; a `Field` wrapped in a consumer component still reads the
    stack's position.
  - Group mode keeps its `fieldset` and `legend` in the `start` position.
  - A `Field` without a label renders no label element and takes column 2 (its control carries the column class).
  - `labelPosition="top"` renders the same markup as today (a snapshot of a top `Field` before and after).
  - `containers.fieldStackColumns` equals the literal in `fieldStack.module.css`.
- **Axe.** Every new story joins `a11y.axe.test.tsx`.
- **Visual (CI only, `maxDiffPixels: 0`).** New stories:
  - a single `start` field at 24, 32, 40 and 48, with an `Input` and with a `Select`;
  - a `FieldStack` form mixing an `Input`, a `Select`, a `Textarea` taking `"top"`, a `RadioGroup`, a lone
    `Checkbox`, a required field and an error line;
  - a label longer than the 240px cap, which wraps;
  - the form in a 400px container, which stacks;
  - the form under a theme override of `--psi-field-label-align: end`;
  - the form under `dir="rtl"`, Psi's first story that sets a direction;
  - the two presets, re-rendered.
- **Engines.** The floated legend and the baseline row are checked by hand in Chromium, WebKit and Firefox before
  their CSS is final, and the plan records what each engine did.
- **Gates.** All five, with `check-docs-drift` expected to fail on the component count (52 to 53) until every
  document that states it is updated.

## Release

One minor changeset for `@handamade/psi-react` and `@handamade/psi-tokens`: a new component, a new prop that defaults
to today's layout, three tokens and a layout constant. Additive; nothing that renders today changes.

## Out of scope

- **How wide a control should be.** Controls in the `start` layout stretch as they do under a label above.
- **A consumer's own pager.** The presets change; a consumer that composed the row itself moves on its own.
- **Figma.** The assessment file is regenerated from code after the release, as usual.
- **An `end` or `bottom` label position,** and a label column on the inline end. No one has asked.
