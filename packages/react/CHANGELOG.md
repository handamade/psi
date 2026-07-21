# @handamade/react

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
