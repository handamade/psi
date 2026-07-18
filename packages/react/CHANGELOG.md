# @handamade/react

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
