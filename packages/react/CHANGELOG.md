# @handamade/psi-react

## 0.9.0

### Minor Changes

- 1b7cf8d: Components promote essential native props into the manifest, and the ledger catalog grows from 4 patterns to 13 (D59–D60)

  `IconButton` now declares `aria-label` as a **required** prop. It was always
  accepted — inherited from `ButtonHTMLAttributes` — but the manifest's prop
  filter dropped it, so an agent reading `manifest.json` had no discoverable
  way to name an icon-only control. This is a type-level breaking change:
  TypeScript consumers omitting `aria-label` will now see an error, which is
  the point — the previous state shipped unnameable buttons silently.

  `Input` now declares `type` as a curated union (`text | search | email | tel
| url | password | number | date`), deliberately narrower than the native
  attribute: checkbox, radio, file and submit are separate Psi controls, so
  those values were never meaningful here. This is also a type-level breaking
  change: TypeScript consumers currently passing `type="checkbox"`, `type="radio"`,
  `type="file"`, or `type="submit"` to `Input` will now see a new TypeScript
  error.

  Nine new ledger patterns are authored, taking the catalog from 4 to 13.
  `dist/patterns.json` now carries a machine-readable component backlog for
  the first time, naming five gaps: `Table`, `Pagination`, `Drawer`, `Toast`,
  `Tabs`. `row-actions` switches to the icon-only kebab trigger it always
  wanted. Three patterns — `bulk-action-bar`, `empty-state`, `summary-tiles`
  — were checked against the shipped component set and confirmed to need
  nothing new.

  Also fixed: growing the catalog to 13 patterns pushed the MCP search
  overview past its 6000-character response budget, which was silently
  squeezing components out of the empty-query overview (down to 3). Pattern
  summaries are now capped at 120 characters in the overview projection only
  — the stored summaries used for search ranking are untouched. The overview
  now surfaces all 13 topics, all 13 patterns, and all 6 components.

## 0.8.1

### Patch Changes

- 93f5399: Menu no longer reports a dismissal for a menu the consumer has already closed (D58)

  Two menus sharing one `openId` — the shape of the `row-actions` pattern —
  left **both** closed when you switched between them. Clicking B's trigger
  light-dismisses A at the platform level before the consumer's click handler
  runs, so A's popover was already closed by the time its `open` prop flipped;
  the sync effect then armed no suppression and A's queued `toggle` reported
  `onClose("outside")`, clearing `openId` and closing B milliseconds after it
  opened.

  `onClose` now carries an invariant: a dismissal is only ever reported for a
  menu that is still open according to its own `open` prop. Genuine light
  dismiss, Esc and item-select are unaffected. No API change.

  Also fixed: the trigger wrapper is the anchor box for both placement paths and
  was being stretched to its cell as a grid or flex-column item, so the menu
  anchored to the cell edge instead of the trigger. It now sizes to its trigger.

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

### Patch Changes

- a2dee09: Patterns: fill placeholders now use `[square brackets]`, and the D48 validator
  rejects fill text that isn't JSX-safe (error class 9). The old angle-bracket
  convention (`"confirm-label": "<verb the object>"`) rendered into preset text
  children as `<Button ...><verb the object></Button>`, which a JSX parser reads
  as an unclosed `<verb>` element — all three seed presets in `dist/patterns.json`
  shipped unparseable. `content` values and literal slot text fills may no longer
  contain `<` or `{`; a new test parses every emitted preset with the TypeScript
  JSX parser so a preset can never again validate while failing to compile.

## 0.7.2

### Patch Changes

- Declare the MIT license. All three packages were published with no `license`
  field, which npm reads as all-rights-reserved — the packages were installable
  but not legally reusable, contradicting the open-core intent. Adds
  `"license": "MIT"` to each package and an MIT `LICENSE` at the repo root
  (a copy also sits in each package directory — npm only auto-includes a LICENSE
  from the package's own folder, not the monorepo root).
- cac00e2: NavBar: fix missing gutter padding and typeface (HAN-40). The inner layout div
  still used the pre-D42 `ds-container` class — renamed to `psi-container` so the
  gutter padding and max-width centering apply again. NavBar now also sets
  `font: var(--psi-text-14-20-medium)` like every other text-bearing component
  instead of inheriting the page font (UA serif on hosts that don't set one).

## 0.7.1

### Patch Changes

- 131f15a: Generated docs stop fabricating API surface (HAN-41): the Theming section now claims `--psi-<component>-*` overrides only when the token family exists, and derived hover/active states only when the family has `-hover` tokens — Toolbar's docs state it has no component tokens instead of inventing them. Tag now lists `children` in the manifest like the other content-bearing leaves.

## 0.7.0

### Minor Changes

- e8ad93c: D51: shared `--psi-surface-*` elevated-surface token family + `Panel` component. Dialog's panel rebinds to the family (zero visual change). Scope gate now follows cross-family component-token refs.
- 4371c74: D52: `Toolbar` — JS-free wrapping row for filter/search controls (`gap` 8|12|16, `role="group"` when labeled). Flips the `filter-toolbar` pattern from blocked to live; its preset now renders.

### Patch Changes

- 2c3bfb9: Manifest now lists the `placeholder` passthrough (HAN-22); `./patterns.json` added to the exports map for parity with `./manifest.json` (HAN-24).

## 0.6.0

### Minor Changes

- 83f2a5e: D47/D48 patterns + contract validator: composition recipes with clarifying parameters in `patterns/*.json` (seeds: settings-form-row, destructive-confirm, filter-toolbar), validated in `pnpm build` by the single contract validator (all D48 error classes throw; `gaps` print as the machine-readable backlog); generated `dist/patterns.json` carries gap-annotated recipes and deterministic preset JSX. psi-mcp: pattern intents join `search`, `get pattern:<id>` returns full recipes (no new tools, D43); `init` AGENTS.md gains the pattern-first composition rule. Field declares D45 slot contracts (label/body/description). Seeds are validated against the real manifest (Switch's parameterless reality, Tag's onDismiss).

### Patch Changes

- 36f2c6c: Checkbox checkmark glyph now binds its ink via `color` + `border: solid currentColor` instead of a direct token binding on `border` — semantically honest under D46 scopes, byte-identical rendering.

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

### Patch Changes

- Updated dependencies [fe67817]
  - @handamade/tokens@0.2.0

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

### Patch Changes

- Updated dependencies [8c10d4b]
  - @handamade/tokens@0.1.0
