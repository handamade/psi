# Control ramp — per-size geometry as tokens (D54–D55)

Date: 2026-07-31. Status: **Draft** — targets 0.8.0.

Provenance: the 2026-07-31 analysis of the BuninUX token/geometry skills
(`bunind/gtc-tokens`, `bunind/concentric`) against Psi. Two ideas in those
repos have no Psi equivalent — GTC models component size as a *token mode*,
and concentric states a *checkable geometry law* — and reading Psi's shipping
CSS through that lens exposed a defect and the structural gap behind it.

The defect: `Button` scales its inline padding across the size ramp
(8/12/16/20) while `Input` and `Select` are flat at `space-8` at every size
([`button.module.css:37-61`](../../../packages/react/src/Button/button.module.css),
[`input.module.css:11`](../../../packages/react/src/Input/input.module.css),
[`select.module.css:15`](../../../packages/react/src/Select/select.module.css)).
At `size={48}` a Button insets its label 20px while an Input insets its text
8px, and the two sit adjacent in every form Psi ships.

The gap behind it: Psi's component-token layer covers colour and *container*
geometry — `--psi-card-radius`, `--psi-surface-padding`, `--psi-menu-radius`
— but every per-size value on the four sized controls lives as a literal in a
`.size24 { … }` block. That geometry is therefore invisible to the manifest,
`guidance.json`, the MCP, the DTCG export and the Figma plugin; unreachable
by `componentOverrides` (D34); and ungated by CI — which is why the
inconsistency shipped.

This is the same class of evidence as D51: two consumers of an idea
(Button's ramp, Input's ramp) diverging because the system offers no shared
primitive to converge on.

## Decisions

- **D54 — Per-size geometry is a `control` token family; the four sized
  controls alias it.** A new component-token source
  `packages/tokens/src/components/control.ts` declares a token-only family
  with no component behind it — the exact posture of `surface.ts` (D51),
  which Dialog, Panel and Menu already alias.

  Height and gap are shared across roles; padding and font fork by role
  (D55). The family:

  | Token | 24 | 32 | 40 | 48 |
  |---|---|---|---|---|
  | `--psi-control-{n}-height` | `size-24` | `size-32` | `size-40` | `size-48` |
  | `--psi-control-{n}-padding-inline` | `space-8` | `space-12` | `space-16` | `space-20` |
  | `--psi-control-{n}-padding-inline-icon` | `space-6` | `space-8` | `space-12` | `space-16` |
  | `--psi-control-{n}-gap` | `space-4` | `space-8` | `space-8` | `space-8` |
  | `--psi-control-{n}-font` | `text-12-16-medium` | `text-14-20-medium` | `text-16-24-medium` | `text-18-28-medium` |
  | `--psi-control-value-{n}-padding-inline` | `space-8` | `space-8` | `space-12` | `space-16` |
  | `--psi-control-value-{n}-font` | `text-12-16-regular` | `text-14-20-regular` | `text-16-24-regular` | `text-18-28-regular` |

  28 family tokens. Components alias them the way `--psi-dialog-radius`
  aliases `--psi-surface-radius`:

  ```ts
  // button.ts                    // input.ts / select.ts
  "40-padding-inline":            "40-padding-inline":
    "var(--psi-control-40-padding-inline)",
                                    "var(--psi-control-value-40-padding-inline)",
  ```

  56 component-alias tokens (Button 20, Select 20, Input 12, IconButton 4),
  84 new tokens in total. The alias tier is what
  makes the divergence structurally impossible while keeping per-component
  *and* per-size brand overrides reachable; binding `--psi-control-*`
  directly in the CSS Modules would halve the count but surrender D34
  overrides, which ember uses today. Rejected for that reason.

  **Naming.** Role precedes size (`control-value-40-padding-inline`), matching
  how variant precedes property elsewhere (`button-accent-bg-hover`). `value`
  over `text` because a Button has text too — the real distinction is a
  centred *label* versus a left-aligned *value the user reads or edits*;
  `field` and `input` were rejected as collisions with existing components.

  **Override precedence is three tiers, widest wins:**

  ```css
  .size40 { font: var(--psi-button-font, var(--psi-button-40-font)); }
  ```

  `--psi-button-font` (brand, all sizes — undeclared by default, exists only
  when a brand sets it) → `--psi-button-40-font` (brand, one size — new) →
  `--psi-control-40-font` (system default — new). This preserves ember's
  `"button-font": "var(--psi-text-mono-15-24-regular)"`, which deliberately
  flattens font across the whole ramp, byte-for-byte.

  **No emitter or gate changes.** `emit-components.ts` already emits flat
  `--psi-{component}-{key}`. The D46 scope gate passes these untouched:
  `SCALE_RE` skips `--psi-space-*`/`--psi-size-*`/`--psi-text-*` references,
  and `keyGroup()` returns `undefined` for keys carrying no `bg`/`fg`/`border`
  suffix, so geometry tokens are never scope-checked. Registration in
  `build.ts` is two lines in the same block D53 touched.

- **D55 — Label and value controls get separate padding and font ramps, and
  icon-leading controls get an optical inset.** Two design laws, both
  previously implicit or absent.

  **The value ramp** (`8/8/12/16`) is deliberately one step tighter than the
  label ramp (`8/12/16/20`). A centred label wants more air than a
  left-aligned value; the prevailing convention agrees (shadcn: button 16 /
  input 12 at h-40). Chosen over a single shared ramp after visual comparison
  at all four sizes. `Input` and `Select` both bind `control-value-*`, so
  they cannot diverge from each other.

  **`text-18-28-regular` is added to `typographyCombos`.** Input and Select
  run `regular` at 24/32/40 and then jump to `medium` at 48 — not a slip, but
  a forced choice: the combo scale has no sans `18-28-regular`, so 48 had
  nowhere else to go. Adding it is one line, exactly the additive case the
  explicit combo list is designed for (D13), and it makes the value ramp
  internally consistent.

  **The optical inset.** An icon is a solid shape with no side bearing; text
  carries its own. A symmetric `16 [icon] 8 [label] 16` therefore reads
  wrong — the icon looks pinned to the edge. Correct is `12 [icon] 8 [text]
  16`. Psi expresses this with `:has()` rather than the nested-padding
  construction used in Figma auto-layout (container 12 + text wrapper 4 +
  gap 4), which needs no DOM wrapper and no API change:

  ```css
  .size40 { padding-inline: var(--psi-button-40-padding-inline);
            gap: var(--psi-button-40-gap); }
  .size40:has(> svg:first-child) {
            padding-inline-start: var(--psi-button-40-padding-inline-icon); }
  ```

  Identical pixels, different mechanism. The token set carries all three
  values so the resolved JSON the Figma plugin consumes still gives a
  designer every number they need to build the auto-layout version.
  `:has()` is well inside the browser floor (Safari 18+, Firefox 128+).

  The `padding-inline-icon` ramp (`6/8/12/16`) is derived, not invented. Take
  the Figma construction's three values — container `p`, text inset `i`, raw
  gap `g` — and solve so that `p + i` equals today's label padding:

  | size | `p` (icon side) | `i` | `g` | → icon side | icon↔text | text side |
  |---|---|---|---|---|---|---|
  | 24 | 6 | 2 | 2 | **6** | **4** | **8** |
  | 32 | 8 | 4 | 4 | **8** | **8** | **12** |
  | 40 | 12 | 4 | 4 | **12** | **8** | **16** |
  | 48 | 16 | 4 | 4 | **16** | **8** | **20** |

  Size 40 lands exactly on `12 [icon] 8 [text] 16`. Every value sits on the
  existing spacing scale, the icon-side ramp turns out to be the previous
  step of the label ramp at each size, and the emitted `padding-inline-icon`
  and `gap` tokens are the effective columns. Because `p + i` reproduces
  today's padding, a text-only Button renders pixel-identical to what ships
  now and only icon-bearing ones change.

  **Documented limitation:** `:has(> svg:first-child)` matches a Psi icon
  passed as a direct child. A consumer wrapping their icon in a `<span>` gets
  no optical inset and can set `--psi-button-40-padding-inline-icon`
  themselves — which is what the token tier exists for.

  Convergence note, recorded because it bears on how much weight to give the
  source material: this rule is independently the same as concentric's
  *"solid shapes sit 3u from the edge, text 4u… text carries its own
  breathing room."* It is the second independent convergence with that work,
  after pixel-true/factual scale keys (D13).

## Component bindings

- **Button** — `height`, `padding-inline`, `padding-inline-icon`, `gap`,
  `font` from `control-*`. Text-only rendering is unchanged at every size.
- **IconButton** — `height` only. Square, zero padding, single child, so
  padding/font/gap do not apply.
- **Input** — `height`, `padding-inline`, `font` from `control-value-*`.
  Padding changes at 32/40/48 (8 → 8/12/16); font at 48 becomes `regular`.
- **Select** — same as Input, plus two Select-local tokens. The chevron is a
  fixed 12×12 data URI at `right space-8 center`, which is why the end
  padding is a flat `space-24` (8 offset + 12 glyph + 4 breathing). Both
  ramp off the value padding, preserving that relationship:
  `--psi-select-{n}-chevron-offset` = `8/8/12/16` (tracks the value ramp) and
  `--psi-select-{n}-padding-inline-end` = `24/24/28/32` (offset + 16).

## Machine readability

A `geometry` block is added to `src/guidance.ts`, carrying the ramp as data
keyed by component and size. This is in scope deliberately: component tokens
do not currently reach the MCP at all — it bakes `guidance.json` and
`resolved/*.json`, and `resolved` holds only semantic theme tokens, so
`--psi-button-accent-bg` is equally unreachable today. That is a pre-existing
gap this cycle does not try to close in general, but "an agent cannot ask what
padding a 40px Button uses" was the headline justification for D54, and
shipping the tokens without the answer would leave the promise half-kept.

## Testing

- Token test asserting the family's exact shape and that each component
  aliases the correct ramp — same shape as `menu-tokens.test.ts` (D53).
- **Anti-drift test:** `Input` and `Select` must resolve to the *same*
  `control-value-*` token at every size. This is what makes the D54 defect
  unrepeatable rather than merely fixed, and it is the acceptance test for
  the cycle.
- CSS output snapshots updated.
- Existing Button/IconButton/Input/Select unit + axe tests pass unchanged —
  no behavioural change, no API change.
- VR baselines re-approved deliberately for Input/Select at 32/40/48 and for
  icon-bearing Button stories. Text-only Button baselines must stay
  byte-identical; that zero-diff assertion is the proof the derivation is
  right.
- Full gate chain per commit: `pnpm build` (contrast + D46 scopes),
  `pnpm test`, `pnpm lint`.

## Release, consumers, process

- One release: `@handamade/psi-tokens` and `@handamade/psi-react` 0.8.0.
  Minor at 0.x, with the before/after ramp in the changeset note. Input and
  Select padding is a visible change for consumers; text-only Buttons are
  pixel-identical; icon-bearing Buttons shift by design.
- **Sequencing with D53.** Branched off `main` while the Menu cycle is still
  in flight. The only shared file is `packages/tokens/scripts/build.ts` (two
  lines in the component registry); implementation lands after D53 merges,
  one rebase.

## Out of scope

- **Geometry law + drift test** — declaring Psi's intentional ratios
  (padding/H rises 0.333→0.417 while font/H falls 0.500→0.375 across the
  ramp; radius fixed at 8 as a brand signature) and a CI check that fails
  when a new component departs from the envelope. Concentric's audit method
  with Psi's own constants. Deferred to a later cycle — D54 makes it possible
  by turning the values into data.
- **DTCG component export** — emitting the component tier into
  `dtcg/{theme}.json` with `$extensions.mode` keyed by px size, plus a single
  mode-carrying file across all four themes. Cheap once the tokens exist, and
  the natural companion to the Figma plugin work.
- **Chevron size ramping.** Select's chevron stays a fixed 12×12 at all four
  sizes. It looks undersized at 48 next to 18px text, but ramping it means
  swapping `background-size` per size and re-measuring against the native
  control — its own small cycle, flagged here rather than guessed at.
- **Icon sizing in Button.** Icons are passed as children and Psi does not
  size them; an icon's dimensions are the consumer's. Related to the chevron
  question and deferred with it.
- **Leading icons in Input/Select.** Neither component supports them today,
  so `control-value-*` ships no `padding-inline-icon`. Additive later.
- **Tokenizing unsized components.** `MenuItem` hardcodes
  `padding: space-8 space-12` and `radius-6`; Tooltip, Dialog and NavBar
  hold similar literals. Same class of gap, no size ramp involved, no
  divergence shipping today. Separate cycle.
