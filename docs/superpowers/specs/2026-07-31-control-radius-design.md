# Control radius — the size-invariant ramp member (D56)

Date: 2026-07-31. Status: **Draft** — targets 0.8.0.

Provenance: a teardown of southleft.com's `<theme.console>` (2026-07-31),
which derives a whole-site theme from a text prompt. The teardown surfaced a
gap on our side rather than a feature worth copying: Psi's theme contract
(`Palette` + `SlotMap`, six OKLCH anchors and six slots) expresses a brand's
*colour* and nothing else. A customer who wants sharper or softer controls
has to fork component CSS.

This decision follows D54–D55 (`control ramp: per-size geometry as tokens`,
merged as e851be0) and completes the `--psi-control-*` family it introduced.
D54–D55 moved height, gap, padding-inline, the icon inset and font off CSS
literals and onto a shared, per-size, token-only family that Button,
IconButton, Input and Select alias. Radius was the one geometry property it
left behind: all six control `border-radius` declarations still bind rungs
directly.

Sequencing note: this is the first of two. D56 (here) adds the radius member.
D57 is the theme console that consumes it — prompt → constraint vector →
`Palette` + `SlotMap` + control radius, applied live and exported as a real
`customers/<name>.ts`.

## Decisions

- **D56 — Control radius is a size-invariant member of the `--psi-control-*`
  family.** `packages/tokens/src/components/control.ts` gains one key
  alongside the existing ramp; the family is already registered in
  `build.ts`, so no wiring changes:

  ```ts
  // ── Size-invariant ────────────────────────────────────────────
  // Radius does not ride the size ramp: border-radius sits on each
  // component's base rule, not in its .size{n} blocks, and all four sizes
  // resolve to radius-8 today. One dial keeps it that way and gives a theme
  // a single control-shape override (D57).
  radius: "var(--psi-radius-8)",
  ```

  Per-component tokens alias it, matching the unsized half of the existing
  convention (`--psi-button-focus-ring`, `--psi-checkbox-box-bg`):

  ```
  --psi-button-radius:       var(--psi-control-radius)
  --psi-input-radius:        var(--psi-control-radius)
  --psi-select-radius:       var(--psi-control-radius)
  --psi-checkbox-box-radius: min(var(--psi-control-radius), var(--psi-radius-4))
  --psi-tooltip-radius:      min(var(--psi-control-radius), var(--psi-radius-6))
  ```

  The `min()` on the two outliers is load-bearing. Checkbox's box sits at
  `radius-4` and Tooltip at `radius-6`; binding either straight to an
  8px-default dial over-rounds a 16px checkbox, and hard-coding them off the
  dial leaves a "sharp" theme with visibly rounded small objects. `min()`
  caps each at its own ceiling and never exceeds it, regardless of what the
  dial is set to. It is the idiom the colour layer already uses for exactly
  this purpose — `oklch(from var(--psi-palette-sapphire) 0.48 min(c, 0.23)
  h)` in every theme's `fg-accent`.

  The published radius scale (`radiusScale = [4, 6, 8, 12]` in
  `packages/tokens/src/scales/radius.ts`) has no rung below `radius-4`, so
  `min(var(--psi-control-radius), var(--psi-radius-4))` evaluates to 4px for
  every *on-scale* value a theme can set — Checkbox's cap does not track a
  sharp theme downward, because there is nowhere below `radius-4` for it to
  go on the published scale. It only moves below 4px if a theme reaches for
  an off-scale value, e.g. `--psi-control-radius: 0px` — the rung scale has
  no `radius-0`. Tooltip's ceiling (`radius-6`) sits one rung above the
  floor, so it does genuinely track a sharper theme, down to `radius-4`.

  Checkbox and Tooltip are outside the D54–D55 ramp (that family covers
  Button, IconButton, Input, Select) but inside this one, because radius is
  a shape property every control has, whereas the ramp is about sized
  geometry those two do not participate in.

  Tag and Switch keep `--psi-radius-full` and gain no token. Pill-ness is
  component identity, not theme expression: a switch with square ends reads
  as a broken checkbox, not as a sharp switch.

  Six `border-radius` declarations rebind (`button.module.css:8`,
  `icon-button.module.css:8`, `input.module.css:7`, `select.module.css:8`,
  `checkbox.module.css:42`, `tooltip.module.css:14`). The four
  `--psi-radius-full` declarations in `tag.module.css` and
  `switch.module.css` are left alone. IconButton binds `--psi-button-radius`
  under the existing `ALIASES` entry in the stylelint plugin, the same way it
  binds `--psi-button-{n}-height`.

  Every default resolves to its current value, so the change is a rendered
  no-op by construction — the same posture D54–D55 held for the geometry it
  moved.

- **Themes override the family, not the components.** `components.css` is
  emitted under `:where(:root, [data-psi-theme])`, so a theme sets one
  property and every control follows:

  ```css
  [data-psi-theme="acme"] { --psi-control-radius: var(--psi-radius-4); }
  ```

  No new override mechanism, no change to the `Palette`/`SlotMap` types, and
  per-component escape hatches remain for anything that must differ. This is
  the surface D57's generated themes drive.

## Constraint: the stylelint boundary

`tools/stylelint-plugin-psi-tokens.mjs` restricts each component's CSS to its
own `--psi-<component>-*` namespace plus global scale rungs:

```js
const ALLOWED_GLOBAL = /^--psi-(space|size|radius|text|font|duration|ease|z)-/;
```

`--psi-control-radius` matches neither, so component CSS must **not**
reference it directly — exactly the posture `control.ts` already documents
for the ramp ("nothing binds it directly; the psi/component-tokens-only rule
makes that a lint error"). All indirection lives in the token layer. The
plugin needs no change.

## Non-goals

- No renaming of rungs. `--psi-radius-8` stays 8px; the CLAUDE.md pixel-true
  rule is preserved by adding a semantic layer above the scale, never by
  redefining it. Multiplier-based shape (southleft's
  `--sl-space-factor: 1.15`) is rejected outright for this reason.
- No new component, no prop. Shape is a theme concern; the React API is
  unchanged.
- No colour change, so the contrast matrix and its build gate are untouched.

## Verification

- `pnpm build` — `--psi-control-radius` present in `dist/components.css`, all
  five per-component tokens resolve.
- `pnpm lint` — ESLint plus `psi/component-tokens-only` and
  `psi/token-scopes` clean; no component CSS references `--psi-control-*`.
- `pnpm test` — extends the existing
  `packages/tokens/__tests__/control-tokens.test.ts` (created by D54–D55)
  rather than adding a file: assert the `radius` key, assert
  `emitComponentVarsCSS` emits `--psi-control-radius`, assert each of the
  five per-component bindings including the two `min()` caps, and assert Tag
  and Switch declare no radius token.
- `pnpm vr` — **zero diff pixels**. This is the acceptance signal, not a
  formality: config is `maxDiffPixels: 48` at `threshold: 0.02`, and HAN-20
  established that same-environment re-renders measure exactly 0 across all
  stories. Any non-zero diff means a default changed by mistake. D54–D55
  rebaselined 14 snapshots; this decision should add none.

D46 note: `radius` is not in `SUFFIX_GROUPS` (which covers `fg`/`bg`/`border`
only), so the new tokens are unscoped and `psi/token-scopes` needs no
vocabulary change.

## Rejected alternatives

- **Per-size radius as a sixth ramp member (`--psi-control-{n}-radius`).**
  The natural first guess, and wrong on the evidence: `border-radius` sits on
  each component's *base* rule, never in its `.size{n}` blocks, and all four
  sizes resolve to `radius-8`. Shipping it per-size would mean moving
  `border-radius` into four size blocks per component — 16 declarations where
  there are now four — to encode variation that does not exist, and it would
  cost D57 its single dial (a "sharp" theme would set four tokens per family
  instead of one). Radius is genuinely size-invariant; the family holds both
  shapes, as it already does with `{size}-*` and `value-{size}-*`.
- **Per-component radius tokens with no shared member.** Additive and
  concept-free, but "make this theme sharper" becomes six coordinated
  overrides that can drift apart, and D57's generator would have to know all
  six names.
- **Named shape presets (`sharp | default | soft`).** Coherent by
  construction and trivial for a generator to emit, but no other Psi tier
  works by preset, and it introduces a vocabulary purely to serve one
  consumer. A theme that wants a preset can set one token.
- **Moving Tag and Switch onto the family.** Maximises a generated theme's
  visual range at the cost of making pills unrecognisable at low radius.
  Rejected on identity grounds; revisit only with evidence a customer wants
  it.
- **Bundling density here.** Moot as of e851be0 — per-size padding, height,
  gap and font shipped as D54–D55. An earlier draft of this spec deferred
  density to a future decision on the grounds that it was size-indexed and
  VR-churning; that work has since landed, and this decision inherits its
  family rather than re-opening it.
