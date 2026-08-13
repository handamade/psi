# @handamade/psi-tokens

## 0.19.0

### Minor Changes

- 2d08895: Add `@handamade/psi-tokens/generate` (D57): derive a brand from a text prompt
  as an AA-solved light/dark pair, and serialize it as `customers/<name>.ts`
  source. `parsePrompt` is deterministic — an FNV-1a hash seeds a PRNG, so an
  unrecognised prompt still derives a coherent brand. `deriveTheme` returns both
  members from one `BrandVector`, each solved to WCAG AA by binary-searching
  lightness; it never returns a theme that renders below AA, because it throws
  instead of returning one when the solver can't clear the matrix. The package
  now compiles `src/generate` to `dist/generate` via `tsc`.

  "Clears the AA matrix" means the same **33** pairs `scripts/build.ts` gates
  every committed theme on — `wcagAAPairs` plus `componentLabelPairs` — not the
  28-pair subset. `buildBrandPalette` darkens the accent anchor only as far as a
  white `fgOnAccent` label needs to clear `fillAccent` with margin, so that pair
  passes by construction rather than by escalation; at a flat `l: 0.55` the worst
  hue (146, `vivid`) rendered it at 4.4979:1. The serialized `customers/<name>.ts`
  also carries the vector's `fonts`, and its solved overrides no longer narrow
  `fgDanger`'s scopes — either omission made the emitted file wrong, and the
  second made it unbuildable.

## 0.18.0

### Minor Changes

- b680d52: Toolbar's direct form controls stop stacking, and every composition
  pattern now has a real, mounted Storybook story.

  `filter-toolbar` composes a bare `Input`/`Select` directly under `Toolbar`
  — the pattern most likely to be copy-pasted verbatim, and the one that
  rendered wrong: `Toolbar`'s flex-wrap row had no constraint on its
  children, and `Input`/`Select`'s own `width: 100%` became their flex-basis
  as direct flex children, so each control claimed the full row and the
  toolbar stacked vertically instead of reading as one. `Field`-wrapped
  usage (as `apps/ledger`'s filter row already does) was never affected.

  `Toolbar` gains `--psi-toolbar-control-width` (200px default) and a
  scoped rule giving its own direct, unwrapped `input`/`select` children a
  deliberate width, matching the effect existing hand-written `Toolbar`
  stories already worked around one-off with inline styles.

  Separately: every pattern in `patterns.json` (13 today) now renders as a
  real, registered React element tree in its own generated Storybook story
  with a VR baseline — `renderPresetElement`, a sibling to the existing
  `renderPreset` JSX-string emitter, so a pattern's documented composition
  and its rendered layout can no longer silently drift apart, and a future
  pattern gets a story automatically rather than needing one hand-written.

## 0.17.0

### Minor Changes

- 964c40f: `.psi-sr-only`, a public visually-hidden utility.

  Psi had no public way to hide content visually while keeping it in the
  accessibility tree — the technique existed only as private, byte-identical
  CSS duplicated across Toast, Checkbox and Switch, and nothing in `llms.txt`
  documented the convention. `.psi-sr-only` ships from `utilities.css`,
  generated the same way every other hand-written utility family is (D79), so
  it appears in `guidance.json` → `utilities.classes` automatically.

  Toast, Checkbox and Switch now consume it instead of their own private
  copies — internal cleanup only, no prop, behavior, or ARIA change (D80).
  The shared recipe also adds `clip-path: inset(50%)` alongside the legacy
  `clip: rect(0 0 0 0)`, a correctness fix none of the three private blocks
  had. One behavioral consequence: this hiding now lives in
  `utilities.css` rather than shipping inside `@handamade/psi-react/styles`,
  so consumers who had been omitting `utilities.css` will see a raw
  unstyled checkbox/switch input and a visible "Success:"/"Warning:"/"Error:"
  prefix in toasts, instead of merely mis-themed content. `utilities.css`
  is already documented as required (`NavBar` has depended on it the same
  way), so the risk is low.

## 0.16.0

### Minor Changes

- 1025e4a: Pagination clamps an out-of-range page, and the utility roster is machine-readable.

  `Pagination` given a `page` beyond `pageCount` rendered a pager with
  `aria-current="page"` on nothing — assistive tech reported no current page. It
  now renders from an effective page clamped into `[1, pageCount]`, warns in
  development, and renders no page buttons when there are no pages (D78).

  `guidance.json` gains `utilities` — every utility class, generated from the same
  source as the CSS. The icon set got this in 0.15.0; the 146 utility classes had
  no machine-readable form at all, so `psi-m-*` and `psi-p-*` could only be found
  by reading `utilities.css` (D79).

## 0.15.0

### Minor Changes

- ef349ef: The manifest carries the icon roster. `manifest.json` gains `icons: string[]`,
  so the icon set has a machine-readable form for the first time — consumers and
  agents no longer have to read the barrel to know what exists.

## 0.14.2

### Patch Changes

- c3ebceb: Fix: `IconMoreHorizontal` is importable (D74)

  0.14.0 shipped `IconMoreHorizontal` and a `row-actions` pattern whose preset
  renders it:

  ```jsx
  trigger={<IconButton aria-label="Actions" variant="ghost"><IconMoreHorizontal /></IconButton>}
  ```

  but the icon was never re-exported from the package root, so that preset was
  code no consumer could compile:

  ```
  TS2305: Module '"@handamade/psi-react"' has no exported member 'IconMoreHorizontal'.
  ```

  `src/index.ts` re-exports icons through a hand-written list, and the new icon
  was added to `src/icons/index.ts` only. Everything in-repo stayed green: the
  build compiles the barrel, and the pattern validator resolved the requirement
  against the **source directory**, where the file plainly exists.

  That resolution target was the actual defect. D71 added `requires` so a pattern
  could not reference an affordance that does not exist, and its own comment
  claimed reading the directory meant "a file that exists but was never exported
  still fails to resolve" — which is the opposite of what reading a directory
  does. It now resolves against the package's public export surface, so an icon
  that is not importable cannot satisfy a pattern.

  Two tests pin it: every icon in the barrel must be re-exported from the root,
  and every rooted icon must have a file. With the export removed, three tests
  fail — including the backlog-empty gate, because `row-actions` correctly goes
  blocked.

  Found by the D68 external consumer run against the published 0.14.0 tarball —
  the second real packaging bug that gate has caught, and the second invisible to
  every in-repo check.

## 0.14.1

### Patch Changes

- 52ac567: The manifest now describes `children`, and patterns can set `aria-*` (D72–D73)

  `dist/manifest.json` listed `children` for 12 of 34 components while 31 accept
  it, so an agent cross-checking its output strictly against the manifest — which
  is exactly what the generation eval asks for — would flag correct code as an
  invented prop. Three consecutive eval runs reported it.

  The cause was not the prop filter, which is what the previous cycle recorded.
  Measured against the real parser: **`react-docgen-typescript` reports
  `children` only when the declaration carries a JSDoc comment.** Whether the
  interface extends an `HTMLAttributes` type, and whether the type is written
  `ReactNode` or `React.ReactNode`, make no difference — all four combinations
  drop it, and adding a comment to any of them restores it. The twelve that
  worked were simply the twelve that documented it.

  So `children` is now documented on all 31 components that take it. `Input`,
  `Pagination` and `MenuSeparator` still omit it, and should: publishing a prop
  that does not apply is worse than omitting one that does.

  **Patterns can also set `aria-*` props on any component.** Previously the
  pattern validator rejected `aria-label` on `Input` because the manifest had no
  such prop, which left the shipped `filter-toolbar` pattern with a `Select` that
  had no accessible name. Every component spreads its rest props onto a DOM
  element, so every `aria-*` attribute is valid on every one of them — the
  manifest's silence was never a claim otherwise. `filter-toolbar` now names both
  of its controls.

  No runtime change: the component declarations are documented re-statements of
  members the prop types already had.

## 0.14.0

### Minor Changes

- 30da157: DescriptionList, IconMoreHorizontal, and patterns that can render themselves (D70–D71)

  The 2026-08-07 generation eval returned two improvisations, and both were the
  same defect: **a shipped pattern whose required parts did not all exist.**
  `row-actions` specified an icon trigger the 25-icon set had no glyph for;
  `detail-drawer`'s entire body was the sentence "[key-value summary of the
  selected record]". Both declared `gaps: []` truthfully, because `gaps` only
  covers components named in `compose` — and what was missing was named in
  `content`, as prose, where nothing looked.

  **New — `DescriptionList` + `DescriptionItem`:** a `<dl>` of term/value pairs.

  ```tsx
  <DescriptionList layout="inline">
    <DescriptionItem term="Date">7 Aug 2026</DescriptionItem>
    <DescriptionItem term="Amount">$1,240.00</DescriptionItem>
  </DescriptionList>
  ```

  `stacked` (default) puts the term above its value; `inline` is a two-column
  grid, which is what a drawer wants. The term is a prop and the value is
  children, matching `Field`'s `label` idiom. Each item renders
  `<div><dt/><dd/></div>` — the HTML5 grouping element — so the native
  term/value association assistive tech relies on stays intact.

  **New — `IconMoreHorizontal`**, the ellipsis glyph `row-actions` always asked
  for.

  **Patterns can now declare the affordances their content depends on**, via an
  optional `requires` array resolved against the manifest (`kind: "component"`)
  or the icon roster (`kind: "icon"`). An unresolved entry becomes a gap, which
  blocks the pattern through the machinery that already existed — now fed from
  content as well as from the compose tree. `row-actions`' preset emits
  `<IconMoreHorizontal />` instead of `[icon]`, and `detail-drawer`'s emits a
  real `DescriptionList` instead of a sentence. Both presets are now code you
  can paste.

  This does not make the bug impossible — nothing can stop an author from
  writing a placeholder and declaring nothing — so the build also prints every
  bracketed content placeholder (19 today, 17 of them legitimately consumer
  copy), making a new silent one visible rather than invisible.

  Also fixed: `packages/react/README.md` omitted `utilities.css`, listing four
  stylesheets where there are five, and `guidance.rules` now states when a
  control takes a `Field` and when it does not — `filter-toolbar` and
  `table-pagination` previously contradicted each other.

## 0.13.1

### Patch Changes

- d51e60b: Fix: the documented stylesheet import now typechecks (D68)

  ```ts
  import "@handamade/psi-react/styles";
  ```

  — what every doc tells you to write — was a TypeScript error in a standard
  TypeScript + Vite consumer:

  ```
  TS2882: Cannot find module or type declarations for side-effect import
  ```

  `vite/client` declares `*.css`, which covers the four
  `@handamade/psi-tokens/*.css` imports, but `./styles` carries no `.css`
  extension so the glob never matched it, and the export had no `types`
  condition to fall back on. Only the undocumented `./styles.css` spelling
  worked.

  Both spellings now carry a `types` condition pointing at an emitted
  `dist/styles.d.ts`, so either one typechecks. No API change and no runtime
  change — the CSS shipped is identical.

  Found by the arc's first external consumer run: a scratch npm project outside
  the workspace, installing the published 0.13.0 tarballs. The bug was invisible
  in-repo because pnpm links resolve the package through the filesystem and never
  evaluate an export condition. `scripts/package-exports.test.ts` now guards the
  conditions, the declaration's existence, and that every export target lives
  under `dist/` and survives a build.

## 0.13.0

### Minor Changes

- f3e8f08: Tabs — the coverage arc's last gap (D67)

  Adds `Tabs`, `TabList`, `Tab` and `TabPanel`, closing `tabbed-workspace`.
  **Every composition pattern now composes only components that exist.**

  ```tsx
  <Tabs value={view} onValueChange={setView} orientation="horizontal">
    <TabList aria-label="Saved views">
      <Tab value="all">All</Tab>
      <Tab value="flagged">Flagged</Tab>
    </TabList>
    <TabPanel value="all">…</TabPanel>
    <TabPanel value="flagged">…</TabPanel>
  </Tabs>
  ```

  - **Controlled-only**, per D50/D53/D62: `value` and `onValueChange` are
    required, there is no `defaultValue`, and Tabs never selects itself.
  - **Values are strings, not indices** — an index breaks the moment a tab is
    inserted. `Tab` and `TabPanel` pair by value, so source order need not match.
  - **Automatic activation**: arrow keys move focus and selection together, along
    the orientation's axis, with wrap. Home/End jump to the first/last enabled
    tab. Disabled tabs are skipped and use `aria-disabled`, so they stay
    discoverable. There is no manual-activation mode.
  - **Every panel renders; unselected ones get `hidden`**, so `aria-controls`
    always resolves and panel DOM state survives a switch. For an expensive
    panel, render less _inside_ it rather than omitting the `TabPanel`.
  - `TabList` owns the roving tabindex — the whole list is one tab stop, and
    `Tab` from it lands on the active panel.

  New `--psi-tabs-*` tokens aliasing the semantic layer and the D54/D55 control
  ramp. No new contrast pairs.

  Also widens the D46 `border` scope group to accept the logical longhands
  (`border-inline-start` and siblings). The group already carried every physical
  longhand and both logical shorthands, so their absence was an omission — and
  the logical form is the one that survives RTL. Found by the gate itself.

## 0.12.0

### Minor Changes

- a4cdcca: Dialog gains `placement` — a drawer is a placement, not a component (D66)

  ```tsx
  <Dialog open onClose={…} placement="inline-end" title="Transaction detail" />
  ```

  `placement` is `center | inline-start | inline-end`, defaulting to `center`.
  The `inline-*` values pin the panel full-height to that edge — that is Psi's
  drawer / side sheet, and **there is deliberately no `Drawer` component**.

  Everything a drawer needs beyond position, `Dialog` already owns: `showModal()`
  modality, the platform focus trap, `aria-modal`, focus restore, the inert
  background, `onClose(reason)` across esc/backdrop/close-button, the
  `dismissible` gate, and the title/footer slots. A sibling component would have
  to duplicate or wrap all of it — which is how a design system ends up with two
  subtly different focus traps.

  - **Placement changes position and nothing else.** Modality, focus behaviour
    and the dismissal reasons are identical under every value; a test asserts the
    full dismissal contract holds for all three.
  - **Logical, not physical** — `inline-start` / `inline-end`, so an RTL theme
    flips without a second code path.
  - `width` (`400 | 560 | 720`) is reused as the drawer's width; the height is
    always the viewport.
  - A drawer's panel scrolls internally so a `dismissible={false}` footer stays
    reachable.

  The `detail-drawer` composition pattern is unblocked and now composes `Dialog`,
  so an agent asking for a slide-over gets working JSX. No new tokens and no new
  contrast pairs — the drawer binds the existing `--psi-dialog-*` family.

## 0.11.0

### Minor Changes

- 28cf5cd: Toast — the feedback tier (D64–D65)

  Adds `Toast`, `ToastRegion`, `ToastProvider` and `useToast()`, closing the
  `action-feedback` pattern's gap. Drawer and Tabs are the coverage arc's
  remaining two.

  - **`Toast`** is presentational and controlled, like Dialog (D50) and Menu
    (D53): it holds no state, runs no timer and never removes itself —
    `onDismiss` reports and the owner disposes. Variants are Tag's status axis
    (`neutral | success | warning | danger`), not the flat action variants, and
    each variant's meaning is announced by a visually hidden status word rather
    than by colour alone.
  - **`ToastRegion`** renders two always-present live wrappers (polite and
    assertive) and routes toasts between them by variant. Both stay mounted when
    the queue is empty, because a live region only announces mutations to a
    subtree that already existed. It sits on the native top layer via
    `popover="manual"`, so a toast raised while a modal `Dialog` is open is still
    painted above the backdrop and still announced — though not clickable until
    the dialog closes, since `showModal()` makes everything outside the dialog
    inert.
  - **`ToastProvider` + `useToast()`** own the queue, the eviction limit and the
    auto-dismiss timers. Timers pause while the pointer or focus is inside the
    region and resume with the time remaining (WCAG 2.2.1); toasts carrying an
    action get a longer lifetime so the affordance cannot vanish before it is
    reached.

  New tokens: `--psi-toast-*`, aliasing the shared surface family. Three contrast
  pairs join the WCAG AA matrix (`fgSuccess`/`fgWarning`/`fgDanger` on
  `bgSecondary`), all passing across light, dark, acme and ember.

  Also adds the `IconInfo`, `IconAlertTriangle` and `IconAlertCircle` icons.

## 0.10.0

### Minor Changes

- 1bc82f1: Table family and Pagination — ledger arc cycle 2 (D62–D63).

  `Table` ships as a compound family of six — `Table`, `TableHead`, `TableBody`,
  `TableRow`, `TableHeaderCell`, `TableCell` — rendering native
  `<table>/<thead>/<tbody>/<tr>/<th>/<td>` semantics, so it is legible to screen
  readers without ARIA reconstruction.

  It holds no state. `sort`/`onSortChange` and `selected`/`onSelectionChange` are
  controlled, extending D50 and D53, so the same code works unchanged against a
  backend that sorts and paginates. `sortable` and `selectable` only enable the
  affordances; `size` is `32 | 40 | 48` px with rows aliasing the D54/D55 control
  ramp, so a 32px row and a 32px Button are the same 32px from one source.

  `numeric` cells align right **and** render tabular figures, via a new
  `--psi-font-variant-numeric` token also exposed as a `.psi-tabular` utility — a
  column that aligns but whose digits jitter between rows defeats the purpose.

  `Pagination` is a standalone numbered pager with ellipsis truncation,
  `aria-current="page"`, a labelled `nav` landmark, and an inert ellipsis. It is
  not a Table family member: the `table-pagination` pattern composes it as a
  Toolbar sibling of a page-size `Select`. `onPageChange` is required — unlike
  Table's `onSortChange`/`onSelectionChange`, nothing gates whether it matters,
  so an omitted handler is a dead control, not a documented no-op.

  `Checkbox` now declares `aria-label` on its own props interface (applying D60),
  so a table's row-selection checkbox — which has no visible label — is both
  nameable and discoverable in `manifest.json`.

  The `data-table` and `table-pagination` patterns are unblocked and render
  presets. `data-table`'s `head` slot was removed: only `body` yields children, so
  a `head` slot rendered as a prop rather than a header row.

  Also fixed: `emit-manifest.ts` selected docgen's first export positionally, so a
  source file exporting a helper before its component described the wrong export
  in the manifest. It now matches on `displayName` and throws on a mismatch rather
  than falling back silently.

## 0.9.1

### Patch Changes

- 92afb63: The search overview allocates its response budget by kind (D61).

  `search("")` used to fill topics, then patterns, then components until the
  6000-character budget ran out, so whichever kind came last absorbed all
  catalog growth — three more patterns was enough to starve components from six
  down to four. It now reserves a floor of eight components and derives the
  per-pattern summary cap from what remains, so a growing catalog shortens
  summaries instead of dropping items. The `blocked (gaps: …)` suffix is never
  trimmed, so the component backlog survives at any catalog size.

  No API change; keyword search results and ranking are unaffected.

## 0.9.0

### Minor Changes

- 1b7cf8d: No changes in this release.

  `@handamade/psi-tokens` is versioned in lockstep with `@handamade/psi-react`
  and `@handamade/psi-mcp`, so its version moves with theirs even when nothing
  in this package changed. Nothing in the token DSL, the palettes, the themes,
  the scales or the emitted CSS was touched — see the `psi-react` entry for
  what 0.9.0 actually contains.

## 0.8.1

Version bump only — no change to this package. `@handamade/psi-*` are released
in lockstep at one version number, so a fix in any one of them bumps all three.
The 0.8.1 fix is in `@handamade/psi-react` (Menu dismissal correctness, D58).

## 0.8.0

### Minor Changes

- dedb5b2: Control radius is now a token (D56)

  `border-radius` on Button, IconButton, Input, Select, Checkbox and Tooltip
  moves off the raw rungs and onto the `--psi-control-*` family introduced by
  D54–D55, completing it. One size-invariant dial, `--psi-control-radius`
  (default `var(--psi-radius-8)`), drives every control. The layer to
  override per component: `--psi-button-radius` (Button, and IconButton via
  the same token), `--psi-input-radius`, `--psi-select-radius`,
  `--psi-checkbox-box-radius`, and `--psi-tooltip-radius`.

  **No visible change.** Every default resolves to its current value, so the
  change is a rendered no-op by construction — CI's VR gate is what confirms
  that before merge.

  **What this unlocks.** A theme can retune control shape in one line, which
  the `Palette` + `SlotMap` contract could not express before:

  ```css
  [data-psi-theme="acme"] {
    --psi-control-radius: var(--psi-radius-4);
  }
  ```

  Checkbox and Tooltip cap themselves — `min(var(--psi-control-radius),
var(--psi-radius-4))` and `min(…, var(--psi-radius-6))` — so neither ever
  over-rounds a small object. The published radius scale's floor is
  `radius-4`, so Checkbox's cap is a no-op for every on-scale value a theme
  can set; it only bites if a theme reaches for an off-scale value like
  `0px`. Tooltip's higher ceiling does track a sharper theme, down to
  `radius-4`. Tag and Switch keep `--psi-radius-full`: pill-ness is component
  identity, not theme expression.

- e851be0: Control ramp: per-size geometry is now tokens (D54–D55)

  Height, padding, gap and font for Button, IconButton, Input and Select move
  out of CSS Modules into a shared `--psi-control-*` family, aliased per
  component as `--psi-{component}-{size}-{prop}` — the layer to override.

  **Visible changes.** Input and Select were flat at 8px inline padding at
  every size while Button scaled 8/12/16/20. They now bind a shared value ramp:

  | size | Input/Select padding | was |
  | ---- | -------------------- | --- |
  | 24   | 8                    | 8   |
  | 32   | 8                    | 8   |
  | 40   | 12                   | 8   |
  | 48   | 16                   | 8   |

  Input and Select at 48 also switch from `medium` to `regular`, now that
  `--psi-text-18-28-regular` exists.

  Buttons with a leading icon gain an optical inset — the icon sits one step
  closer to the edge than text (12 [icon] 8 [label] 16 at size 40) — and the
  icon/label gap now scales (4/8/8/8) instead of a flat 6px.

  Text-only Buttons are pixel-identical. `--psi-button-font` still overrides
  typography across all sizes.

- 44d7112: D53 — Menu, the overlay tier. `Menu` + `MenuItem` + `MenuSeparator` on the
  native Popover API: `popover="auto"` supplies the top layer and light dismiss;
  Psi supplies roving-tabindex keyboard navigation with typeahead, focus
  return, and dismissal reasons via `onClose("esc" | "outside" | "item-select")`.
  Controlled-only, like Dialog (D50): Esc and item activation only _report_ a
  dismissal — the popover stays open until the consumer flips `open`. Light
  dismiss (an outside click) is the one asymmetry, forced by the platform: the
  browser hides the popover itself before Menu can intervene, so `open` must
  still be flipped to keep React's state in sync. Zero new dependencies.

  Placement is CSS anchor positioning above the anchor floor (Chrome 125+ /
  Firefox 132+ / Safari 18.2+) and a `CSS.supports`-gated JS branch below it — a
  top-layer element's containing block is the viewport, so the fallback cannot be
  declarative. No collision flip below the anchor floor. Psi's documented browser
  floor is unchanged.

  New `--psi-menu-*` token family, pure indirection onto the D51 surface family,
  so brands retuning `--psi-surface-*` get Menu for free. New `row-actions`
  pattern takes the pattern index to four, all unblocked.

## 0.7.2

### Patch Changes

- 939e323: D46 follow-up (HAN-21): `accent-color` joins the `surface` property group in
  the scope vocabulary (it was a legitimate binding stylelint couldn't name), and
  the token build gains a scale-prefix guard — no semantic token's kebab name may
  start with a scale-family prefix (`space-|size-|radius-|text-|font-|duration-|ease-|z-`),
  closing the latent lookup-precedence shadow in both gates. llms.txt now states
  precisely what the stylelint rule covers (first-party CSS) and points external
  consumers at `dist/scope-map.json`.
- Declare the MIT license. All three packages were published with no `license`
  field, which npm reads as all-rights-reserved — the packages were installable
  but not legally reusable, contradicting the open-core intent. Adds
  `"license": "MIT"` to each package and an MIT `LICENSE` at the repo root
  (a copy also sits in each package directory — npm only auto-includes a LICENSE
  from the package's own folder, not the monorepo root).

## 0.7.1

### Patch Changes

- `guidance.tags` gains a `tagApi` note documenting Tag's spelling of subtle variants (`variant="accent" subtle` — subtle is a boolean prop, not a variant-union entry), closing the last 07-16 generation-eval docs gap. Landed with PR #43 which missed its changeset.

## 0.7.0

### Minor Changes

- e8ad93c: D51: shared `--psi-surface-*` elevated-surface token family + `Panel` component. Dialog's panel rebinds to the family (zero visual change). Scope gate now follows cross-family component-token refs.

## 0.6.0

### Minor Changes

- 2864521: D46 token scopes: semantic tokens declare the CSS property groups they may bind (`scopes` on token sources); the token build gates every component-token binding (through `oklch(from var())` derivations) and throws on violations; scopes are emitted into `dist/resolved/<theme>.json`, DTCG `$extensions.psi`, and a generated `dist/scope-map.json` consumed by the new `psi/token-scopes` stylelint rule. New inversion tokens `bgInverted`/`fgOnInverted` (tooltip rebind, zero visual change). Implementation surfaced two additional tokens (`fillStaticWhite` for the switch thumb, caught by the build gate) and property-group vocabulary refinements plus a checkbox `currentColor` refactor (caught by the stylelint gate on first run).

### Patch Changes

- 0d8cc5b: Ember: `fgOnAccent` deepened from the brand's warm black (l 0.25, 6.12:1 on
  the accent) to l 0.14 — 7.63:1, AAA for normal text. The warm black stays
  untouched everywhere else; only labels on the ember accent get darker.
  Field report: AA-passing contrast still read weak on the saturated orange
  with the mono button face on mobile OLED.

## 0.5.0

### Minor Changes

- b30e35c: New `Dialog` component (D50): modal on the native `<dialog>` top layer —
  controlled `open`/`onClose(reason)`, title/footer slots, width 400|560|720,
  dismissible gate over Esc/backdrop/close-button. First D45 slot contracts:
  `manifest.json` component entries now carry `slots` (authored for Dialog,
  explicit `[]` elsewhere), validated at build. New `--psi-dialog-*` tokens.
  The psi-mcp index passes slot contracts through (`get component:Dialog` returns them).
- 3a753a5: New `Field` component (D49): labeled form-row wrapper — label above, one
  message line below (error replaces description, aria-live), fieldset/legend
  group mode. Input and Select now consume FieldContext when wrapped:
  id/aria-describedby/aria-invalid/required are wired automatically (additive —
  standalone behavior unchanged). New `--psi-field-*` component tokens.

## 0.4.1

### Patch Changes

- 2b54f64: Agent-surface gap fixes from the HAN-8/HAN-17 verification sessions (HAN-16):

  - **psi-react**: every component now carries a one-line description (TSDoc →
    manifest.json → MCP briefs); NavBar styles raw anchors in its brand/nav-link
    slots (previously browser-default blue); `"./styles.css"` exports alias so
    TypeScript can type the side-effect import without `declare module`.
  - **psi-tokens**: NavBar gains `link-fg`, `link-fg-hover`, `focus-ring`
    component tokens.
  - **psi-mcp**: `getting-started` (topic + init-generated AGENTS.md) now lists
    the required `@handamade/psi-react/styles` import — omitting it renders
    every component unstyled; new `topic:themes` (theme list, data-psi-theme
    mechanics, customer themes) and `topic:scales` (space/size/radius/motion/
    layout values), both searchable — `search "space"` no longer returns empty.

## 0.4.0

### Minor Changes

- cd77458: D43/D44 — agent access. New package `@handamade/psi-mcp`: an MCP server (stdio via
  `npx @handamade/psi-mcp`, hosted Streamable HTTP at https://psi.kurkin.de/mcp) with two
  read-only tools — `search` (briefs over components/tokens/guidance) and `get` (full props,
  token formulas with resolved values in all four themes, topics) — answering from an index
  baked at publish from the generated artifacts. `npx @handamade/psi-mcp init [--claude]`
  generates a marker-delimited agent guide (AGENTS.md/CLAUDE.md) from the same index.
  tokens/react bump in lockstep; no API changes in either.

## 0.3.0

### Minor Changes

- b7b2a1e: D42 — the design system is now **Psi (Ψ)**. BREAKING (0.x minor per semver):

  - Packages renamed: `@handamade/tokens` → `@handamade/psi-tokens`, `@handamade/react` → `@handamade/psi-react`.
  - CSS API renamed: `--ds-*` → `--psi-*` custom properties, `.ds-*` → `.psi-*` utility classes, `data-ds-theme` → `data-psi-theme`, cascade layers `ds.*` → `psi.*`.

  Migration is mechanical: update the two dependency names, then string-replace `--ds-` → `--psi-`, `.ds-` → `.psi-`, and `data-ds-theme` → `data-psi-theme`. No token values, variants, or component APIs changed.

## 0.2.0

### Minor Changes

- fe67817: Site-scale & portfolio readiness (D27–D37): dark-first customer brands + ember
  theme; font roles (sans/serif/mono/display) with brand assignment; fluid
  display tier; serif/mono combos; motion tokens with reduced-motion zeroing;
  layout tokens (container, gutter, breakpoints export, z-index) + .ds-container;
  hairline/scrim alphas; Button href + outline variant + --ds-button-font; Card,
  NavBar, AspectRatio; media-tint recipe; arrow + social icons.

## 0.1.0

### Minor Changes

- 8c10d4b: AI-readability remediation: component-token layer, pixel-true typography, contrast gate hardening, palette scoping/theme registry, Figma parity, and AI-facing artifacts.

  **@handamade/tokens**

  - Added a component-token layer (`dist/components/*.vars.css` + `dist/components.css`) providing per-component CSS custom properties (button, input, select, checkbox, switch, tag, tooltip) derived from the semantic token layer.
  - Typography combos are now pixel-true, single-property `font` shorthands named `{size}-{lineHeight}-{weight}`. **Migration:** the old `--ds-text-{xs|sm|base|lg|...}-*` variables are replaced by `--ds-text-{size}-{lh}-{weight}` (e.g. `--ds-text-14-20-regular`). Update any consumers referencing the old scale names.
  - Hardened the contrast gate: checks now run over explicit component/label pairs (not just raw foreground/background combinations) and composite alpha colors against their actual backdrop in sRGB before evaluating contrast, closing gaps where translucent tokens previously passed incorrectly.
  - Gamut-clamping now emits explicit `GAMUT WARNING` diagnostics (theme, token, ΔE, clamped hex) during build instead of silently clamping out-of-gamut OKLCH values — surfaced for light, dark, and acme.
  - Packaging fixes: corrected `exports`/`files` so `dist/resolved/*`, `dist/dtcg/*`, `dist/components/*`, `dist/types/index.d.ts`, and `dist/guidance.json` are all resolvable by consumers.
  - Figma plugin parity: alpha channel support, number-valued variables, and text style generation now match the CSS output.
  - Added palette scoping and a customer theme registry so per-customer themes (e.g. `acme`) can be layered without leaking into the base semantic palette.
  - New AI-facing build artifacts: `guidance.json` (machine-readable usage guidance), DTCG-format token exports (`dist/dtcg/*.json`), a component `manifest.json`, generated per-component `docs/*.md`, and `llms.txt` files at the repo and package roots.

  **@handamade/react**

  - Consumes the new component-token layer and pixel-true typography variables.
  - Tooltip accessibility fixes (keyboard/focus and ARIA behavior).
  - Ships `manifest.json` and generated `docs/*.md` alongside the existing `dist/{index.js,styles.css,index.d.ts}` for AI/agent consumption.

  Storybook's token-docs pages (Color/Spacing/Typography) now read the active toolbar theme via Storybook globals, so the Color Tokens table shows swatches and hex values for the selected theme (light/dark/acme) instead of always showing light.
