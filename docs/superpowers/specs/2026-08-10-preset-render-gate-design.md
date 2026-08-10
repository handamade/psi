# A preset is answerable for what it renders, not only what it composes (D77)

Date: 2026-08-10. Status: **Draft**.

Provenance: diagnosed in full at `2026-08-07-public-site-cycle-design.md:251`
under a placeholder D77, deliberately left undisturbed by D78–D79
(`2026-08-10-eval-gaps-cycle-design.md`'s "Out of scope": *"Claiming D77 here
would have been the fourth numbering collision"*). Re-verified against current
`main` (717143d, psi 0.17.0) before writing this spec — the bug and its
surrounding facts are unchanged since the original diagnosis.

## The bug, re-verified

`packages/react/patterns/filter-toolbar.json` composes a bare `Input` and
`Select` directly inside `Toolbar` — no `Field` wrapper. `Toolbar` is
`display: flex; flex-wrap: wrap` (`toolbar.module.css`) with no constraint on
its children's flex-basis. `Input` and `Select` both ship `width: 100%`
(`input.module.css:5`, `select.module.css:5`). A flex item's `flex-basis`
defaults to `auto`, which resolves from the item's specified `width` — so each
control's hypothetical main size is 100% of the container, and the row
collapses into a vertical stack instead of a filter bar. Measured externally at
**1200px inside a 1200px container**.

This is the pattern most likely to be copy-pasted verbatim — `react/llms.txt`
itself says presets are "copy-paste JSX generated from the compose tree" — and
it is the one that renders wrong.

**`Toolbar`'s own component author already knows.** `Toolbar.stories.tsx:25-26`
carries this exact comment today: *"Input/Select default to width:100%; size
them in the story so the row reads as a toolbar instead of every control
stacking."* Every story manually overrides width with an inline `style` to
work around the defect. The workaround has existed next to the bug the whole
time; it was never generalized into a fix.

## Why it's load-bearing, not cosmetic

D71 settled the `Field`-vs-no-`Field` question *against* `Field` for toolbar
filter controls — no visible label needed, `aria-label`/`placeholder` name the
control — making the bare-control shape `filter-toolbar` uses the deliberately
documented one, not an oversight.

But `apps/ledger/TransactionsScreen.tsx:124-139` is commented
`{/* filter-toolbar */}` while wrapping **both** `Input` and `Select` in
`Field` — the reference/acceptance app implements the option the pattern's own
JSON rejects. It never shows the bug because `Field` is `display: grid;
min-width: 0` with no `width` of its own (`field.module.css:1-7`) — as a flex
child, `Field`'s `flex-basis: auto` resolves from its unset (auto) width, so it
already sizes to content. Confirmed unchanged on current `main`.

One of the two has to move. The original diagnosis already ruled out two
alternatives, and re-examination doesn't change either verdict:

- **Width hints via props on the preset's `Input`/`Select`.** Blocked by
  docgen's `propFilter`, which drops native props like `style`/`width` before
  they reach `manifest.json` — a pattern can only set props the manifest
  documents. Even if it weren't blocked, it would fix this one pattern's one
  instance while leaving `Toolbar` itself broken for any hand-composer who
  reaches for it the same way `filter-toolbar` does.
- **`apps/ledger` adopting the preset's bare shape.** Makes the reference app
  visibly render the bug it currently avoids by accident.

That leaves: **`Toolbar` constrains its own direct form-control children.**

## Decisions

- **D77 — `Toolbar` gives its direct, unwrapped form controls a deliberate
  default width, and every preset proves it renders by being mounted with a VR
  baseline.** One decision, not two: the fix without the gate would correct
  `filter-toolbar` specifically while leaving the other 12 patterns equally
  unverified for the same failure mode, and a deferred gate is how this
  project accumulates unclaimed backlog (D57's theme console has sat reserved
  for months with no spec). Bundling them forces both to land together.

  **The CSS fix:**

  ```css
  .toolbar > input,
  .toolbar > select {
    width: var(--psi-toolbar-control-width);
  }
  ```

  No inline CSS fallback — matching the established component-token idiom
  (`panelVars` etc.): the default value (`200px`) lives once, in
  `packages/tokens/src/components/toolbar.ts`'s exported vars object, and
  every theme's build emits it unconditionally at `:root`, so the token is
  always present by the time this rule runs. An inline `var(--x, 200px)`
  fallback would be a second place the default could drift from the token.

  This targets only *bare* children — `Input`/`Select` used directly, as
  `filter-toolbar` does — so `Field`'s wrapper (already safe) is untouched. It
  wins over `.input`/`.select`'s own `width: 100%` on specificity alone:
  `.toolbar > input` is `(0,1,1)` against `.input`'s `(0,1,0)`. Verified
  against the real built stylesheet (`packages/react/dist/styles.css`), which
  ships **entirely unlayered** (`grep -c "@layer"` → 0), so this isn't a
  cascade-layer question — specificity decides outright, independent of
  import/bundle order. A consumer who wants a specific width still wins via
  inline `style` or `className` (higher specificity/later cascade either way)
  — exactly what `Toolbar.stories.tsx` already does by hand today, and nothing
  about this fix removes that ability.

  `--psi-toolbar-control-width` is a new standalone token, defaulting to
  `200px`. No existing scale reaches this range (`sizeScale` tops at 48,
  `spacingScale` at 144 — both are for heights/gaps, not component widths);
  `Dialog`'s `width={400|560|720}` (`dialog.module.css:90-92`) is the existing
  precedent for a component owning its own literal-pixel width outside the
  shared scales. 200px sits at the narrower end of what `Toolbar.stories.tsx`
  already hand-picked (180–240px) — a sane default, not a claim that it's
  optimal for every control's content.

  **The gate:** `renderPreset()` (`packages/react/scripts/patterns.ts:438`)
  already walks each pattern's compose tree — resolving props, content,
  parameter defaults, and the D71 icon-for-content substitution — and emits a
  JSX **string**. `packages/react/src/index.ts`'s export names match
  `patterns.json`'s `component` strings exactly (`"Toolbar"` →
  `export { Toolbar }`), so a sibling function,
  `renderPresetElement(pattern, components): ReactElement | null`, walks the
  **same** tree and resolution logic but calls `React.createElement` against
  the real barrel exports instead of pushing text. One generic Storybook
  story, in a new `apps/storybook/src/patterns/` directory (mirroring the
  existing `token-docs/` precedent for stories that don't belong to a single
  component), iterates `patterns.json` and mounts one story per pattern from
  `renderPresetElement`'s output. A 14th pattern gets a story with no
  hand-authoring; a test asserts the story count equals `patterns.json`'s
  entry count, so a silently-skipped pattern isn't possible.

  **Rejected: hand-write 13 stories, one per pattern.** Simpler to read in
  isolation, but it's a second, manually-synced copy of what `renderPreset`
  already encodes — the exact "two sources of truth" shape D79 (the utility
  roster) and D80 (`.psi-sr-only`) both existed to close in this same
  codebase. It also wouldn't test what actually matters: whether the pattern
  *as authored* renders correctly, versus whether a hand-recreated
  approximation of it does. A pattern's JSON could drift from its hand-written
  story and nothing would catch it.

  **VR/theme scope:** the story glob
  (`apps/storybook/src/**/*.stories.tsx`) auto-includes the new stories with
  no extra wiring, and every story is already captured in light + ember by
  default per the existing VR convention (`apps/storybook/vr/README.md`).
  Preset stories follow that same default rather than a narrower carve-out —
  special-casing them is more code than letting the existing rule apply, and
  the arc's own history already treats added VR cost as a named risk to
  control by *pattern count* (13, not 13×N), not by shrinking per-story theme
  coverage. Wrap/overflow behavior stays `Toolbar`'s own existing narrow-width
  `Wrapping` story's job; the new preset stories render at a realistic content
  width and exist to catch "does this stack when it shouldn't" — the actual
  defect, not a wrap-behavior regression.

## Gates

All five, in order, `pnpm build` first:

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm test:site
```

A changeset is required — `Toolbar`'s rendered output changes for any consumer
whose bare `Input`/`Select` children were previously stacking (a visible,
user-facing fix), and `--psi-toolbar-control-width` is a new, overridable
component token in the same `--psi-{component}-*` family CLAUDE.md documents.
`Toolbar` currently has **zero** component tokens — there is no
`packages/tokens/src/components/toolbar.ts` (confirmed: `ls
packages/tokens/src/components/` lists 19 files, none named `toolbar`,
matching `toolbar.module.css` binding no `--psi-*` custom property today).
`packages/tokens` unambiguously owns this addition; a new
`toolbar.ts` (following `panel.ts`'s shape, the smallest existing example) is
part of this cycle's work. `@handamade/psi-tokens`: minor (new token, new
component file). `@handamade/psi-react`: minor (behavior change — `Toolbar`'s
children no longer stack by default). `renderPresetElement` is purely internal
build/test tooling, like `renderPreset` already is — `packages/react`'s
`exports` field has no path to `scripts/`, so it is not a public API surface
and does not itself justify a bump. `@handamade/psi-mcp`: patch (no
`guidance.json`/roster shape changes this cycle).

**Every test proven red before its fix**, per the standing rule (D70, D71,
D79): the new preset-mounted story/VR baseline must be captured *failing*
(stacked) against today's `Toolbar` before the CSS fix lands, not only proven
passing after.

`vr` is CI's — this cycle **does** add stories (13 new pattern stories plus
whatever `Toolbar`'s own story picks up from the CSS change), so `vr` is
expected to move this time, unlike D78–D80. New baselines come from CI's
`vr-baselines` artifact, per the existing baseline-update workflow
(`apps/storybook/vr/README.md`).

## Out of scope

- **Per-instance width authorship for pattern controls.** Blocked by
  docgen's `propFilter`; a future decision if patterns need it, not this one.
- **A generalized "does every pattern also render correctly at every
  viewport/breakpoint" gate.** This decision covers one realistic content
  width per pattern, matching the existing per-component VR convention. Any
  wider viewport matrix is a separate, larger cost decision.
- **Auditing every other component for the same flex-basis-from-width
  interaction.** Verified instead of assumed: of the five patterns composing
  `Toolbar` (`filter-toolbar`, `bulk-action-bar`, `date-range-filter`,
  `summary-tiles`, `table-pagination`), only `filter-toolbar` places bare
  `Input`/`Select` directly under it. `date-range-filter` and
  `table-pagination` already wrap theirs in `Field` (same safe shape as
  `apps/ledger`, and untouched by this fix's `.toolbar > input, .toolbar >
  select` selector, since a `Field`-wrapped input is a grandchild, not a
  direct child); `bulk-action-bar` and `summary-tiles` carry no form controls
  at all. `filter-toolbar` is the only pattern currently exposed. If a future
  pattern reaches the same shape, it's a one-line fix following this
  precedent, not a reason to widen this cycle now — and the D77 gate itself
  is what will catch it if it does.
