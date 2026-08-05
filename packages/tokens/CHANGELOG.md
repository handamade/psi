# @handamade/psi-tokens

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
