# DS — next-generation design system: design spec

- **Date:** 2026-06-12
- **Status:** awaiting user review
- **Owner:** Dmytro Kurkin

## Context

A themeable design system (Figma + code) for Dmytro's own projects and customer work, built on four principles:

1. **OKLCH calculations, not swatch ladders.** Semantic colors are formulas over a small set of brand anchors (`oklch(from var(--ds-palette-x) calc(…) …)`), not hand-picked `red-50…red-900` scales.
2. **Pixel-true scale names.** `ds-gap-8` means visual 8px (0.5rem). Component sizes are numbers (`Button size={32}`), never S/M/L, so new sizes are additive and never break the naming.
3. **Component-level tokens.** Every component is themeable independently of global tokens, and tinted semi-transparent backgrounds are *derived* from foreground tokens instead of being authored as separate styles.
4. **Flat variant naming.** `accent`, `accent-subtle`, `neutral` — no `primary/secondary` hierarchies. Typography is `text-{size}-{lineHeight}-{weight}` (`text-16-20-regular`), so `17-21-extrabold` slots in without conflicts.

## Decision log (short form)

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Deliverable shape | Themeable npm package set | Fixes propagate to every consumer; a customer is a theme file, not a fork |
| 2 | Source of truth | Code-first; Figma receives generated values | Figma variables can't hold OKLCH formulas — only resolved statics |
| 3 | Styling delivery | CSS custom properties + CSS Modules | Zero runtime deps, no framework lock-in |
| 4 | v1 scope | Foundations + 8 components + Storybook | Proves every architectural idea without drowning in component work |
| 5 | Browser floor | Evergreen only (Chrome/Edge 119+, Safari 18+, Firefox 128+) | Relative color syntax with custom properties (`oklch(from var(…) …)`) is reliably supported from Safari 18+; 16.4 shipped the basic syntax but had bugs with `var()` in the `from` position |
| 6 | Token authoring | TS formula DSL → codegen (approach A) | Formulas as data: one resolver feeds CSS, Figma, docs, and tests — no drift |
| 7 | Token layering | 3 tiers: primitive → semantic → component | Industry-standard structure (≈ Material reference/system/component) |
| 8 | Intra-layer references | Allowed, cycle-checked by codegen | Enables fg-derived tints and self-derived hover states (principle 3) |
| 9 | Palette → theme indirection | Slot mapping `{ink, canvas, accent, …}` | Customer brands keep their own color names; formulas never change |
| 10 | Figma sync mechanism | In-repo Figma plugin; MCP for bootstrap only | Works on any Figma plan (REST write is Enterprise-only); no AI-session dependency in the team workflow |
| 11 | Token definition home | All tiers live in `@handamade/tokens` | React consumes generated artifacts only; Figma sync is complete from one source |
| 12 | Emitted CSS structure | Cascade layers `ds.base → ds.theme → ds.components → ds.utilities` | Consumer overrides win predictably |
| 13 | Scale naming | Pixel-true names, rem values | `ds-gap-8` = visual 8px; `size={32}`; new entries are additive forever |
| 14 | Variant naming | Flat: `accent / neutral / danger` + `-subtle` / `ghost` | No primary/secondary hierarchy (principle 4) |
| 15 | Select (v1) | Styled native `<select>` | Bulletproof a11y now; custom listbox is v2 |
| 16 | Tooltip | Native popover API + tiny positioning util | Zero dependencies |
| 17 | Quality gate | Contrast matrix fails the build, per theme | Every declared (fg, bg) pair is contrast-validated at build time; not a blanket a11y guarantee (focus rings, touch targets, semantic HTML are tested separately) |
| 18 | Two-way Figma sync | Non-goal | Code is the single source of truth; Figma is a projection |
| 19 | Gamut policy | Browser gamut-maps live CSS; codegen clamps resolved values to sRGB via culori | Figma/hex consumers need safe values; ΔE > 2 build warning catches palette anchors pushing gamut boundaries |
| 20 | Status fg lightness (light) | `set(0.48)` (this spec originally said 0.65) | 0.65 failed AA 4.5:1 on bg-primary; 0.48 passes for all four status colors. Dark uses 0.75. Implemented 2026-06; logged 2026-07-06 |
| 21 | Component-label contrast pairs | Added to the matrix, per solid variant, all themes | 2026-07-06 review: default Tag success (white on emerald L 0.60) = 3.47 and acme accent Button = 3.55 shipped failing AA — the matrix only covered fg tokens on neutral surfaces/tints |
| 22 | Static label inks | `fg-static-white` gets a counterpart `fg-static-black` | Solid warning fills need a theme-invariant dark label; `fg-primary` flips light in dark themes and fails on amber |
| 23 | AI-readable artifacts | First-class generated projection, shipped in-package (llms.txt, manifest.json, guidance.json, generated docs) | Agents in consuming repos only see node_modules; generating from the one resolver means AI docs cannot go stale (see "AI consumption") |
| 24 | DTCG export | Promoted to v1.1 deliverable (was "generate later if interop is needed") | AI/tool interop is that need; it is one more emitter over already-resolved data |
| 25 | MCP server | Deferred to v2 | In-package files give repo-local agents ~90% of the value; MCP adds out-of-repo discoverability only |
| 26 | Tooltip popover API (revises 16) | Deferred to v2; v1 keeps span rendering + adds Escape dismiss and open delay | WCAG 1.4.13 needs Escape now; top-layer/anchor positioning deserves its own design pass |

## Non-goals (v1)

- Two-way Figma sync (code is the single source of truth; Figma is a projection)
- Legacy browser fallback builds
- Tailwind integration of any kind
- Visual regression testing (v2 candidate: Playwright screenshots or Chromatic)
- Custom-listbox Select (v1 ships a styled native `<select>`; custom listbox is v2)
- Public open-sourcing decisions (package registry can stay private initially)
- MCP server for agent access (v2 candidate — decision 25; in-package generated artifacts cover repo-local agents)

## Architecture

pnpm-workspace monorepo `ds/`:

```
packages/tokens       @handamade/tokens   — formula DSL, ALL token definitions (palette,
                                      themes, scales, component tokens), codegen,
                                      emitted CSS + resolved JSON + TS types
packages/react        @handamade/react    — 8 components, CSS Modules, peer React 19;
                                      consumes ONLY generated artifacts from @handamade/tokens
packages/figma-plugin private       — in-repo Figma plugin that upserts variables
                                      from resolved JSON (works on any Figma plan)
apps/storybook        not published — docs, generated token tables, workbench
```

- CSS prefix: `--ds-`; class prefix `ds-`. npm scope: `@handamade`.
- Two published packages so CSS-only consumers (e.g. the portfolio) can use
  `@handamade/tokens` without React.
- Versioning: changesets, semver. Consuming repos install from the registry;
  during development, `pnpm pack`/file deps.

## Token model

### Layer 0 — palette (per brand)

Brand-named OKLCH anchors with no semantics: `obsidian`, `platinum`, `sapphire`,
`ruby`, `amber`, `emerald` (default brand). Plus static `white`/`black`.

A **slot mapping** binds palette entries to the six roles every theme formula
references: `{ ink, canvas, accent, success, warning, danger }`. Formulas never
reference palette names directly — only slots. A customer brand supplies its own
palette (own names) plus a slot map, and every downstream formula works unchanged.

### Layer 1 — semantic theme tokens (per theme)

Same token names in every theme; different formulas per theme. Light is the
reference implementation; dark redefines formulas (e.g. `fg-primary` derives from
`canvas` instead of `ink`).

| Group | Tokens | Formula sketch |
|---|---|---|
| bg | `bg-primary`, `bg-secondary` | canvas refs |
| fg | `fg-primary` | from ink: L 30%, C 0.03 |
| | `fg-secondary/tertiary/quaternary` | fg-primary at alpha 0.7 / 0.5 / 0.3 |
| | `fg-primary-inverted`, `fg-static-white` | canvas ref / white |
| | `fg-accent/success/warning/danger` | from slot: L 48% light / 75% dark, C cap(0.23) — decision 20 |
| | `fg-static-black` | from ink: L set(0.25), C cap(0.03) — decision 22 |
| fill | `fill-neutral-1…6` | canvas with progressive ΔL (±0.016…0.068) |
| | `fill-accent` (+ status fills) | slot refs |
| | `fill-tint-accent/success/warning/danger` | **from the matching fg token, alpha 0.12** |
| border | `border-neutral`, `border-strong`, `border-focus` | fg-primary alphas / accent |

The `fill-tint-*` group is principle 3: tinted backgrounds derived from
foregrounds, never authored separately.

### Layer 2 — component tokens

Each component declares its own custom properties, defaulting to semantic tokens:

```css
.button {
  --ds-button-accent-bg: var(--ds-fill-accent);
  --ds-button-accent-bg-hover: oklch(from var(--ds-button-accent-bg) calc(l - 0.04) c h);
}
```

Interactive states derive from the component's *own* token, so overriding one
background retunes its hover/active automatically. Component tokens are
overridable at any scope (page, section, one-off element) without touching
global tokens.

### Formula DSL (authoring format)

One typed shape covers every formula above:

```ts
// packages/tokens/src/themes/light.ts
fgAccent:       token({ from: slot.accent,  l: set(0.65), c: cap(0.23) }),
fgSecondary:    token({ from: ref.fgPrimary, alpha: 0.7 }),
fillNeutral3:   token({ from: slot.canvas,  l: delta(-0.017), c: delta(+0.001) }),
fillTintAccent: token({ from: ref.fgAccent, alpha: 0.12 }),
```

Channel operations: `set(v)`, `delta(±v)`, `cap(v)` (upper clamp — emits
`min(channel, v)` in CSS), `alpha`. Sources: `slot.*` (palette roles) or
`ref.*` (other tokens, cycle-checked). The DSL stays this small until a real
token needs more — YAGNI.

### Scales — pixel-true names, rem values

- **Spacing** `--ds-space-{px}`: 0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80
- **Control heights** `--ds-size-{px}`: 24, 32, 40, 48
- **Radius** `--ds-radius-{px}`: 4, 6, 8, 12, `full`
- **Typography**: explicit combo list → `--ds-text-16-20-regular` etc.; families
  `--ds-font-sans`, `--ds-font-mono`. Adding a combo (e.g. `17-21-extrabold`) is
  appending one list entry.
- **Utilities** (generated, minimal): `ds-gap-*`, `ds-p-*`/`ds-px-*`/`ds-py-*`,
  `ds-m-*`/`ds-mx-*`/`ds-my-*`, `ds-text-*`. Nothing hand-written.

### Theme application

- Light tokens on `:root` AND `[data-ds-theme="light"]`; other themes scoped to
  `[data-ds-theme="{name}"]`.
- Themes nest (subtree theming works — it's all custom-property scope).
- A consumer that forgets a theme import degrades to light defaults, never to
  unstyled output.

### Gamut policy

OKLCH can express colors outside the sRGB gamut. Two contexts, two strategies:

- **Live CSS** (`oklch(from … calc(…))`): the browser's own gamut mapping
  handles out-of-gamut values at render time (CSS Color Level 4 mandates this).
  No action needed from the system.
- **Resolved JSON / Figma sync**: culori's `toGamut('oklch', 'srgb')` is
  applied during codegen. Resolved hex values are always sRGB-safe. A build
  warning is emitted when clamping changes a color by ΔE > 2, flagging palette
  anchors that are pushing gamut boundaries — the designer can then adjust the
  source anchor rather than silently accepting a shifted resolved value.

Decision 19 in the decision log.

### Terminology mapping (token tiers vs. atomic design)

Our layers are the industry-standard *token tier* model — adjacent to, but
distinct from, atomic design. Atomic design organizes **components**
(atoms → molecules → organisms → templates → pages); tokens sit *below* its
atoms ("subatomic" in Brad Frost's own framing). Customer-facing vocabulary:

| Our spec | Token-tier vocabulary | Material 3 | Atomic design |
|---|---|---|---|
| Layer 0 — palette + slots | Tier 1: primitive/global | Reference tokens | subatomic |
| Layer 1 — semantic theme | Tier 2: semantic/alias | System tokens | subatomic |
| Layer 2 — component tokens | Tier 3: component | Component tokens | subatomic |
| The 8 components | — | — | atoms |
| Compositions in consumer apps | — | — | molecules/organisms/pages |

Two deliberate deviations from the textbook tier model:

1. **Tier 1 cardinality.** Classic Tier 1 is a static ladder (`blue-50…900`) —
   exactly what principle 1 rejects. Layer 0 is ~6 anchors + slot map because
   Tier 2 is *computed* by formulas, not picked from a ladder.
2. **Intra-layer references.** Textbook tiers reference only the tier above.
   We allow same-layer derivation (`fg-secondary` ← `fg-primary`,
   `fill-tint-accent` ← `fg-accent`, button hover ← button bg); the codegen's
   cycle-checker provides the safety the classic model got from rigidity.

v1 deliberately stops at atoms: no molecules/organisms ship in the package —
compositions belong to consuming apps, keeping this a system, not a UI kit.

## Codegen pipeline

`packages/tokens/scripts/build.ts`, run with tsx; `--watch` for dev.

1. **Load** typed palette/theme/scale/component-token modules.
2. **Validate**: unknown slot, unknown ref, circular ref, duplicate name, type
   errors → build fails with the exact token path (`themes/light.fgAccent`).
3. **Resolve** every formula per theme with culori →
   `dist/resolved/{theme}.json`: `{ name, oklch: {l,c,h,alpha}, hex, formula }`
   where `formula` is the human-readable "Reference → Mod" string for docs/Figma
   descriptions.
4. **Emit CSS** into cascade layers `@layer ds.base, ds.theme, ds.components, ds.utilities`:
   - `base.css` — palette vars, scales, fonts (ds.base)
   - `{theme}.css` — semantic tokens in **live relative-color form** (ds.theme)
   - `components/{name}.vars.css` — component token blocks (ds.components)
   - `utilities.css` — generated utility classes (ds.utilities)
5. **Emit types** — token-name unions, `ThemeConfig`, size/variant literal types
   consumed by `@handamade/react` props.

Key property: the live CSS keeps the `oklch(from var(…) calc(…))` form (runtime
palette swap continues to cascade), while resolved JSON carries the identical
math as static values for Figma, docs, and tests. Both come from one resolver —
they cannot drift.

Root `pnpm dev` = tokens watch + Storybook.

## Figma sync

- **Durable artifact: `packages/figma-plugin`** — a small private Figma plugin
  (vanilla TS, plugin API). Paste/load `dist/resolved/*.json` → it upserts a
  "DS Tokens" variable collection: one mode per theme; color variables grouped
  `bg/fg/fill/border`; number variables for space/size/radius; text styles for
  typography combos; token formula strings written into variable descriptions.
- **Idempotent**: upsert by name; reports created/updated/orphaned; never
  deletes silently. Dry-run mode lists the diff.
- Works on any Figma plan (REST Variables write API would require Enterprise —
  explicitly avoided as a dependency).
- The Figma MCP available in Claude sessions may be used to bootstrap the
  library file during development, but no recurring workflow depends on an AI
  session.
- Components in Figma are drawn by hand (designer-controlled) but bound to
  synced variables: palette change in code → build → plugin sync → the whole
  Figma library recolors.
- Future (out of scope v1): Tokens Studio–compatible export from resolved JSON.

## Components (`@handamade/react`)

Per-component folder: `Button.tsx`, `button.module.css`, `Button.stories.tsx`,
`Button.test.tsx` (token definitions live in `@handamade/tokens/src/components/button.ts`).

Conventions:

- `variant`: `accent | accent-subtle | neutral | neutral-subtle | ghost | danger | danger-subtle`
  (subset per component; e.g. Tag ships `neutral | accent | success | warning | danger`,
  each with a `-subtle` form whose background derives from the matching fg token).
- `size`: `24 | 32 | 40 | 48` number literal type. Numbers are the contract —
  additive forever.
- Module CSS may reference **only that component's `--ds-{component}-*` tokens**;
  a stylelint rule enforces it. Binding to semantic tokens happens only in the
  token definition file.
- React 19: `ref` as a normal prop; no forwardRef. Zero runtime deps. SSR-safe.
- A11y choices: Select = styled native `<select>`; Tooltip = native popover API
  + small positioning util (no Floating UI); Checkbox/Switch = real inputs with
  visually-custom rendering; all interactive components keyboard-complete and
  labeled in stories.

The 8: **Button, IconButton, Input, Select, Checkbox, Switch, Tag/Badge, Tooltip**,
plus ~16 tree-shakable icon components (`currentColor`).

## Usage guidance

### Variants — when to use what

| Variant | Intent | Typical use |
|---|---|---|
| `accent` | Primary action, draws attention | Submit, CTA, main action in a group |
| `accent-subtle` | Accent tone, lower visual weight | Selected state, active filter, soft CTA |
| `neutral` | Default, structurally present | Secondary actions, toolbar buttons |
| `neutral-subtle` | Minimal chrome | Inline actions, table row actions |
| `ghost` | No visible container until hover | Icon-only triggers, compact toolbars |
| `danger` | Destructive action | Delete, remove, disconnect |
| `danger-subtle` | Destructive context, low urgency | Warning badges, soft destructive hints |
| `success / warning` (Tag only) | Status communication | Status badges, labels |

Rule of thumb: one `accent` per visual group; everything else `neutral` or
`ghost`. `danger` only for actions with real consequences.

### Typography — combo naming and selection

Token pattern: `--ds-text-{fontSize}-{lineHeight}-{weight}`.

| Use case | Token | Why this combo |
|---|---|---|
| Body text | `text-16-24-regular` | 1.5 line-height for readability in paragraphs |
| Compact UI text | `text-14-20-regular` | Tighter leading for labels, table cells |
| Headings | `text-24-32-medium` | Medium weight avoids bold fatigue |
| Small labels | `text-12-16-regular` | Smallest readable size for captions |

Adding a new combo (e.g. `text-17-21-extrabold` for a marketing page) is one
line in the scale definition — no hierarchy conflict, no rename cascade.

### Interactive states — derivation model

States are derived from the component's own tokens, not from a global state
scale. The chain:

```
default bg → hover: L - 0.04  → active: L - 0.08  → disabled: alpha 0.4
           → focus: 2px ring from --ds-border-focus
```

Overriding the component's `--ds-{component}-accent-bg` retunes hover/active
automatically. Disabled state preserves the variant's hue at reduced alpha —
never goes gray.

### Figma governance

Code is the single source of truth; Figma is a generated projection. Workflow:

1. **Token changes happen in code only.** Edit the DSL, run `pnpm build`,
   verify in Storybook.
2. **Sync to Figma** by running the in-repo plugin. It reports
   created/updated/orphaned variables. Review the diff before committing.
3. **Components in Figma** are drawn by hand (designer-controlled) but use
   only synced variables for color, spacing, and typography — no local styles
   or hardcoded values.
4. **Detached instances** (components unlinked from the library) are the
   designer's responsibility to resync; the system can't prevent this.
5. **New brand/customer theme**: add in code first (scaffold → build →
   contrast check → plugin sync). Never author a palette directly in Figma.

The plugin's dry-run mode and orphan report are the safety nets. No variable
is silently deleted — orphans are listed so the designer can clean up
intentionally.

## Storybook & docs (`apps/storybook`)

- Storybook 9 + Vite.
- **Generated token pages** read `dist/resolved/*.json`: swatch, name, formula
  ("Reference → Mod"), resolved hex — per theme. Docs cannot go stale.
- Theme-switcher toolbar (light/dark/customer themes), typography specimen,
  spacing grid, icon gallery.
- `addon-a11y` + play-function interaction tests per component.

## Testing & quality gates

| Gate | Tool | Fails the build when |
|---|---|---|
| Formula resolver unit tests | vitest | math/clamps/cycles regress |
| CSS output snapshots | vitest | emitted CSS changes unexpectedly |
| **Contrast matrix** | vitest + resolved JSON | any declared (fg, bg, min-ratio) pair under threshold in any theme — incl. customer themes; prints actual ratio |
| Component behavior | vitest + testing-library | interaction/aria regressions |
| Story a11y | addon-a11y, interaction tests | violations in stories |

Initial contrast matrix (AA): `fg-primary`/`fg-secondary` on `bg-primary`,
`bg-secondary`, `fill-neutral-1…6` ≥ 4.5; `fg-accent/success/warning/danger` on
`bg-primary` and on their `fill-tint-*` ≥ 4.5; every button/tag label on its
variant background ≥ 4.5. `fg-tertiary/quaternary` are explicitly exempt
(decorative tier) — documented as such.

The pitch line this enables: *brand colors in, contrast-validated token set
out.* The contrast matrix covers the declared (fg, bg) pairings; it does not
replace full-scope accessibility testing (focus management, touch targets,
motion, semantic HTML) — those are covered by component tests and addon-a11y.

## Customer theming workflow

1. `pnpm new-theme acme` scaffolds `src/themes/customers/acme.ts` (palette +
   slot map + optional formula overrides — any semantic or component token).
2. Build emits `themes/acme.css` + resolved JSON; contrast matrix runs against
   the customer's colors automatically.
3. Figma plugin sync adds an "Acme" mode to the variable collection.
4. Customer app: `import '@handamade/tokens/themes/acme.css'` +
   `<html data-ds-theme="acme">`.

## AI consumption (added 2026-07-06)

Code is the single source of truth; AI-readable artifacts are a third generated
projection (alongside CSS/Figma and human docs). An agent working in a
*consuming* repo sees only `node_modules` — so everything it needs ships inside
the published packages, generated by the same codegen that feeds CSS and Figma,
and therefore unable to drift.

| Artifact | Location | Source |
|---|---|---|
| `llms.txt` | each package root | hand-written index (short, stable) |
| Resolved tokens + formulas | `@handamade/tokens/resolved/{theme}.json` | resolver (exists) |
| DTCG export | `@handamade/tokens/dtcg/{theme}.json` | new emitter over resolved data (decision 24) |
| Usage guidance as data | `@handamade/tokens/guidance.json` | `src/guidance.ts` — variant intent, state derivation, typography selection |
| Component manifest | `@handamade/react/manifest.json` | react-docgen-typescript over component sources |
| Per-component docs | `@handamade/react/docs/*.md` | generated from manifest + guidance |
| Package READMEs | each package root | hand-written intro linking the above |

Rules:

- Generated docs are never hand-edited; hand-written prose is limited to
  READMEs and `llms.txt`.
- The variant-intent table and state-derivation chain in this spec move to
  `src/guidance.ts` as the canonical machine-readable copy; the spec's "Usage
  guidance" section remains the human narrative.
- v2 candidate: `@handamade/mcp` server exposing the same artifacts as queryable
  tools (decision 25).

## Error handling summary

- Codegen validation errors name the exact token path; build exits non-zero.
- Contrast failures block CI with the failing pair and actual ratio.
- Figma plugin: dry-run diff, idempotent upserts, orphan report, no silent deletes.
- Missing theme import in a consumer → light defaults from `:root`, never unstyled.

## Alternatives considered

- **CSS-native authoring + parser** (approach B): zero indirection, but every CSS
  feature becomes parser work; customer themes unvalidated. Rejected for v1.
- **W3C DTCG tokens + Style Dictionary/Terrazzo** (approach C): standard interop,
  but the format cannot express relative-color formulas — the system's core idea.
  Rejected; a DTCG export can be generated later if interop is needed.
- **Figma REST Variables API for sync**: write access is Enterprise-only. Rejected
  as a hard dependency; plugin API chosen instead.
- **MCP-only Figma sync**: works, but couples a team workflow to an AI session.
  Demoted to bootstrap-only.

## Build order sketch (input to the implementation plan)

1. Monorepo scaffold + tokens package skeleton + formula DSL + resolver tests
2. Default brand palette + light theme + codegen CSS/JSON/types emit
3. Dark theme + contrast matrix + scales/utilities
4. Storybook with generated token pages (parity with the screenshot's tables)
5. Button + IconButton (proves component tokens, derived states, sizes)
6. Remaining six components + icons
7. Figma plugin + initial library sync
8. Customer-theme scaffolder + example customer theme + docs polish
