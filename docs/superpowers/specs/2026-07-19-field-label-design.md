# Field — labeled form-row wrapper (D49)

Date: 2026-07-19. Status: **Approved design, scheduled for 0.5** (first of the
two eval-blocking component gaps from the market report; HAN-11). Dialog
(HAN-12) follows and adopts D45 slot contracts; Field only needs flat props.

Evidence base: the psi-demo consumer dogfood (HAN-17) hand-rolled exactly this
component (`FieldRow`: label + control + hint with manual `htmlFor`/`id`) and
silently dropped `aria-describedby` — the boilerplate and the a11y gap this
component removes. The D47 seed pattern "settings form row" composes it.

## Decisions

- **D49 — One `Field` component; the label is a slot, not a sibling
  export.** The market report's "Field/Label" resolves to a single wrapper.
  Anatomy, in order: optional label, the control(s) as children, one message
  line. Renders a `div` (`.psi-field`); in group mode a
  `fieldset`/`legend` (see below). No `size`, no `variant` — sizes belong to
  controls, Field has one visual voice.

  Props (flat, docgen-clean): `label?: ReactNode`, `description?: ReactNode`,
  `error?: ReactNode`, `required?: boolean`, `group?: boolean`,
  `htmlFor?: string` (override; default `useId`), `ref?: Ref<HTMLDivElement>`
  (or `HTMLFieldSetElement` in group mode), `className?: string`.

  - **Error replaces description.** One message line below the control:
    description normally, error when `error` is truthy. The line is
    `aria-live="polite"` so the swap is announced. No stacking, no layout
    jump beyond one line.
  - **Context bridge** (the library's first React context, internal):
    Field provides `{ id, describedBy, invalid, required }`. `Input` and
    `Select` consume it when present — take the generated `id` (an explicit
    `id` prop wins), merge `describedBy` into `aria-describedby`, set
    `aria-invalid`, and light their existing `error` styling (their own
    `error` prop keeps working standalone; own prop OR context, either
    lights it). `required` flows to the control's `required` attribute.
  - **Group mode** (`group`): renders `fieldset` + `legend`;
    `aria-describedby` sits on the fieldset. Checkbox/Switch keep their
    built-in labels and do **not** consume the context in 0.5 — the fieldset
    covers them semantically. Scope call (2026-07-19): text-likes get the
    full label treatment; Checkbox/Switch get group treatment only.
  - Layout: label-above only. Horizontal label-left rows are out of scope
    until a real consumer needs them.

## Architecture

```
packages/react/src/Field/Field.tsx        — component + FieldContext (not exported from index)
packages/react/src/Field/field.module.css — layout + message styling, --psi-field-* bindings
packages/react/src/Field/Field.test.tsx   — RTL suite (below)
packages/react/src/Field/Field.stories.tsx— states: default/description/error/required/group
packages/tokens/src/components/field.ts   — component tokens
packages/react/src/Input/Input.tsx        — consume FieldContext (small)
packages/react/src/Select/Select.tsx      — consume FieldContext (small)
```

Component tokens (`--psi-field-*`, navbar/button pattern):
`label-fg: var(--psi-fg-secondary)`, `message-fg: var(--psi-fg-tertiary)`,
`error-fg: var(--psi-fg-danger)`, `marker-fg: var(--psi-fg-danger)`,
`gap: var(--psi-space-6)`. Typography binds the global scale directly in the
CSS module (`--psi-text-14-20-medium` label, `--psi-text-12-16-regular`
message) — allowed by the stylelint rule; the contrast gate already covers
the aliased semantics.

Generated artifacts are free: TSDoc one-liner → manifest (non-empty
description is test-gated since 0.4.1), docs/Field.md, MCP brief, init
AGENTS.md inventory. guidance.json gains one steering line (rules/recipes):
wrap labeled controls in Field; don't hand-roll label+message rows. Shipping
Field resolves the first half of the D47 example `gaps: ["Field", "Dialog"]`.

## Testing

- RTL: label association (`getByLabelText` finds the control);
  `aria-describedby` merge (own + generated); error replaces description;
  `aria-invalid` + error styling via context; standalone `error` prop still
  works without Field; group mode renders `fieldset`/`legend` with
  describedby on the fieldset; required marker renders and `required`
  reaches the control; explicit `id`/`htmlFor` override wins.
- Axe: Field states join `a11y.axe.test.tsx`.
- VR: the Storybook story enrolls Field in the Playwright suite.
- Manifest: existing index-builder gates cover the new entry.

## Release mechanics

Ships in 0.5 with Dialog (HAN-12). Minor bump: new component + new component
tokens + Input/Select gaining context awareness (additive, non-breaking —
without a Field ancestor their behavior is unchanged).

## Out of scope

- Horizontal (label-left) orientation — revisit on real consumer demand.
- `Textarea` — doesn't exist; Field covers it via the same context when it
  lands.
- Textarea-flavored field customizations — auto-grow, character counters,
  input masks, and similar; deferred until Textarea itself exists.
- Complex chat/composer fields (multi-control input rows with attachments,
  send actions, etc.) — a pattern/composite concern (D47 territory), not a
  Field feature.
- Form-level validation state or submission handling — Field is per-field.
- Checkbox/Switch consuming FieldContext individually — group mode covers
  0.5; revisit if a single-checkbox-with-error consumer appears.
- A separate `Label` export.
