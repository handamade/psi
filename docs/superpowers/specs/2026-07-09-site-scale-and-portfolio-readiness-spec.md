# Site-Scale & Portfolio Readiness — Design Spec

**Date:** 2026-07-09
**Status:** Implemented (2026-07-09, branch site-scale-portfolio-readiness; plan: ../plans/2026-07-09-site-scale-and-portfolio-readiness-plan.md)
**Predecessors:** `2026-06-12-design-system-design.md` (core spec, decisions D1–D26), `2026-07-06-remediation-and-ai-readability-plan.md` (fully landed)

## Context

The portfolio site (`~/Projects/dku/portfolio`, single-file static, ember-field redesign shipped 2026-07-08) is the second real consumer of the design system after `apps/promo`. A gap analysis (2026-07-09) compared the portfolio's needs against the DS inventory and found the color foundation ready (slots map cleanly, per-brand contrast gate applies) but four structural absences: **no dark-first brand path, no serif/display typography, no motion tokens, no layout/viewport layer** — plus missing components (link-styled buttons, Card, NavBar) and icons.

The tell: `apps/promo/src/promo.css:1-6` hand-rolls `--promo-container`, sticky blur header, fluid display type, easing, and shadows because the DS "deliberately doesn't ship" them. The portfolio would duplicate that same layer. Two consumers duplicating the same primitives means they belong in the system.

## Goals

1. A brand can be **dark-first** (built on `darkTheme` formulas), scaffolded and contrast-gated like any other.
2. Ship the **`ember` brand** (the portfolio's identity) as the second customer theme.
3. Typography supports **font roles** (sans/serif/mono/display, brand-assignable) and a **fluid display tier**.
4. New token categories: **motion** (durations, easings, reduced-motion convention), **layout/viewport** (container, gutter, breakpoints, z-index), **hairline/scrim alphas**.
5. New components: **Button `href` polymorphism + `outline` variant, Card, NavBar, AspectRatio**; new icons (arrows + social).
6. **Consumer pilot:** portfolio adopts `@handamade/tokens` (CSS-only, stays no-build); promo migrates duplicated `--promo-*` primitives to DS tokens.

## Non-goals (v1.2)

- Particle/parallax/scroll-animation helpers — art direction stays app-level; the DS supplies only durations/easings and the reduced-motion convention.
- Shadow/elevation token ladder — promo keeps its local `--promo-shadow-1`; revisit when a third consumer needs it.
- SectionHeader component — ships as a documented recipe only.
- Font *file* shipping/`@font-face` — consumers load their own webfonts; the DS defines roles and stacks.
- React adoption in the portfolio — tokens-CSS-only this cycle; components remain available for a future portfolio build-step migration.
- MCP server, custom-listbox Select, Tooltip popover API — unchanged v2 deferrals (D25/D26).

---

## WS1 — Dark-first brands + `ember`

### DSL / build changes

`packages/tokens/src/themes/customers/index.ts` — extend the customer interface:

```ts
export interface CustomerTheme {
  palette: Palette;
  slots: SlotMap;
  /** Which default theme the brand's formulas build on. Default: "light". */
  base?: "light" | "dark";
  /** Optional semantic-token formula overrides, merged over the base theme. */
  overrides?: ThemeDef;
}
```

- `scripts/build.ts` assembles customers as `{...(c.base === "dark" ? darkTheme : lightTheme), ...c.overrides}`.
- `scripts/new-theme.ts` accepts `pnpm new-theme <name> --base dark` and scaffolds accordingly (comment in the generated file states the base).
- Contrast gate and gamut warnings already run per registered theme — no change needed, but add a regression test that a dark-based customer theme is gated.

### The `ember` brand

`packages/tokens/src/themes/customers/ember.ts`, registered as `ember` with `base: "dark"`. Palette anchors (culori-derived from shipped portfolio hexes):

| Anchor | Hex source | OKLCH (l / c / h) | Slot |
|---|---|---|---|
| `emberCanvas` | `#0c0a09` | 0.147 / 0.004 / 49 | `canvas` |
| `emberInk` | `#f3ede6` | 0.949 / 0.011 / 72 | `ink` |
| `emberAccent` | `#ff7847` | 0.724 / 0.177 / 40 | `accent` |
| `emberEmerald` (reuse default emerald anchor values) | — | as default | `success` |
| `emberAmber` (reuse default amber) | — | as default | `warning` |
| `emberRuby` (reuse default ruby) | — | as default | `danger` |

Notes:
- `bgSecondary` must resolve near `#100d0b` (0.162 / 0.007 / 56) — the portfolio footer surface. If the inherited dark formula lands visibly off, add an `overrides.bgSecondary` delta.
- Accent-on-canvas and label pairs must pass the AA gate; adjust `emberAccent` L minimally if the gate fails (precedent: D20).

## WS2 — Typography: font roles + display tier + serif/mono combos

### Font roles

- Emit four role vars from `scripts/emit-utilities.ts`: `--ds-font-sans`, `--ds-font-mono` (existing), **new `--ds-font-serif`** (`Georgia, "Times New Roman", serif`-based system stack) and **new `--ds-font-display`** (defaults to `var(--ds-font-sans)`).
- Add brand-level font assignment: `CustomerTheme` gains optional `fonts?: { sans?: string; serif?: string; mono?: string; display?: string }`. Emitted inside the brand's `[data-ds-theme="<name>"]` block so a brand re-points roles without touching combos. Fonts are per-brand, not per light/dark theme.
- `ember` sets: `display: '"Archivo", system-ui, sans-serif'`, `serif: '"IBM Plex Serif", Georgia, serif'`, `mono: '"IBM Plex Mono", "Courier New", monospace'`, `sans: '"Archivo", system-ui, sans-serif'`.
- Guidance (`guidance.json`) documents that consumers load the corresponding webfonts themselves (families + weights per brand).

### Weights

`packages/tokens/src/scales/typography.ts`: extend `Weight` with `"extrabold"` (800) and `"black"` (900).

### Display tier (fluid)

New scale in `typography.ts`:

```ts
export interface DisplayCombo { min: number; max: number; vw: number; lineHeight: number; weight: Weight; tracking: number; }
// name: --ds-display-{min}-{max}-{weight}  (pixel-true at both ends, D28)
export const displayCombos: DisplayCombo[] = [
  { min: 56, max: 128, vw: 9, lineHeight: 0.95, weight: "black", tracking: -0.02 },
  { min: 36, max: 64,  vw: 5, lineHeight: 1.05, weight: "black", tracking: -0.02 },
  { min: 32, max: 32,  vw: 0, lineHeight: 1.1,  weight: "extrabold", tracking: -0.01 },
];
```

Emitted as `font:` shorthand vars using `clamp(minpx, vw, maxpx)` and `var(--ds-font-display)`, plus matching `.ds-display-*` utility classes that add `letter-spacing` and `text-transform: uppercase` (transform/tracking can't live in the `font` shorthand — utilities carry them, D28).

### Serif & mono combos

Extend the combo model with an optional role (default `sans`, preserving all existing names):

```ts
export interface TypographyCombo { fontSize: number; lineHeight: number; weight: Weight; role?: "sans" | "serif" | "mono"; }
export const comboName = (c) => `${c.role && c.role !== "sans" ? c.role + "-" : ""}${c.fontSize}-${c.lineHeight}-${c.weight}`;
```

New combos (portfolio body/label coverage; consumers normalize to nearest — see WS6):

- Serif: `serif-18-28-regular`, `serif-20-30-regular`, `serif-20-32-regular`, `serif-24-36-regular`, `serif-28-40-regular`
- Mono: `mono-13-20-regular`, `mono-14-20-regular`, `mono-15-24-regular`, `mono-15-24-medium`

## WS3 — Motion tokens

New scale `packages/tokens/src/scales/motion.ts`:

```ts
export const durationScale = [150, 200, 350, 450, 600]; // ms → --ds-duration-150 … --ds-duration-600
export const easings = {
  standard: "ease",
  "in-out": "ease-in-out",
  soft: "cubic-bezier(0.2, 0.6, 0.2, 1)", // signature glide (portfolio thumbnails/cards)
};
```

- Emitted into `base.css` as `--ds-duration-*` / `--ds-ease-*`.
- **Reduced motion via token zeroing (D30):** `dist/utilities.css` appends
  `@media (prefers-reduced-motion: reduce) { :root { --ds-duration-150: 0.01ms; … } }` — every consumer and component that uses duration tokens degrades automatically.
- Component CSS migrates hardcoded transitions (`button.module.css`, `switch.module.css`, etc., currently `0.15s ease`) to `var(--ds-duration-150) var(--ds-ease-standard)`.
- No keyframes ship in v1.2; recipes (e.g. the portfolio's `pulse-down`) are documented in guidance.

## WS4 — Layout & viewport tokens

New scale `packages/tokens/src/scales/layout.ts`:

```ts
export const breakpoints = { sm: 560, md: 960 };            // build-time constants (D31)
export const container = { max: 1312, gutter: 40, gutterNarrow: 24 };
export const zIndex = { nav: 100, overlay: 1000, tooltip: 1100 };
```

- CSS vars can't drive `@media`, so breakpoints are **constants**: exported from `@handamade/tokens` (JS + `./types`), included in `guidance.json` and DTCG, and baked into emitted utility media queries (D31).
- Emit `--ds-container-max`, `--ds-gutter` (40px, drops to 24px under `md` via media query in utilities), `--ds-z-*`.
- New utility: `.ds-container` (`max-width: var(--ds-container-max); margin-inline: auto; padding-inline: var(--ds-gutter)`).
- `tooltip.module.css` migrates `z-index: 1000` → `var(--ds-z-tooltip)`.
- Spacing scale (`scales/spacing.ts`): append section-rhythm steps `96, 120, 144`.

### Hairline & scrim alphas

- Semantic layer (`themes/light.ts` + `dark.ts`): add `borderFaint` (ink @ alpha 0.08) alongside existing `borderNeutral` 0.15 / `borderStrong` 0.3.
- New scrim tokens (canvas-derived): `scrimSoft` (alpha 0.25), `scrimMedium` (0.35), `scrimHeavy` (0.82) — the DSL's `alpha` field already supports this. Add to AA-exempt list if the gate flags non-text surfaces (scrims are not text pairs).

## WS5 — Components & icons (`@handamade/react`)

### Button: `href` + `outline` variant

- `Button` accepts optional `href` (+ `target`, `rel`); when present it renders `<a>` with identical classes; `disabled` on an anchor maps to `aria-disabled="true"` + `pointer-events: none` (D33). `IconButton` gets the same treatment.
- New variant `outline` (8th): transparent bg, `1px solid var(--ds-border-strong)` border, ink label; hover fills accent with canvas label (the portfolio/promo ghost-bordered CTA). Component tokens: extend `src/components/button.ts` accordingly; add the variant's label pairs to `componentLabelPairs`.
- New component token `--ds-button-font` (defaults to the existing UI combo) so brands can restyle button typography (ember → mono).

### Card

New component (`packages/react/src/card/`):

- Props: `variant: "stacked" | "featured"` (featured = side-by-side media/body grid ~1.6fr/1fr, stacks under `md`), `media?: ReactNode`, `hoverLift?: boolean` (translateY(-6px) via `--ds-duration-350`), `href?` on the title composed by the consumer (Card itself is a layout shell, not a link).
- Component tokens `src/components/card.ts`: `--ds-card-border` (borderFaint), `--ds-card-bg` (transparent), `--ds-card-gap`, `--ds-card-radius` (radius-8; ember overrides to 0 via brand component override — D34: brands may override component tokens in `overrides`).

### NavBar

New component (`packages/react/src/navbar/`):

- Sticky top bar: `brand` slot, `children` (links), `actions` slot; `.ds-container`-aware inner width.
- Component tokens `src/components/navbar.ts`: `--ds-navbar-height` (64px), `--ds-navbar-bg` (canvas @ alpha 0.82), `--ds-navbar-blur` (12px), `--ds-navbar-border` (borderFaint). Uses `--ds-z-nav`.

### AspectRatio + media treatment

- `AspectRatio` component: `ratio: number` (e.g. `16/10`, `4/5`), clips + `object-fit: cover` on child img.
- Media tint recipe (not a component): brand component token `--ds-media-tint` (default `none`; ember sets the sepia chain `grayscale(1) sepia(0.65) saturate(1.6) hue-rotate(-12deg) brightness(0.88) contrast(1.05)`) + documented `.ds-media-tint` utility with hover reveal using `--ds-duration-450` / `--ds-ease-soft` (D35).

### Icons

- New glyphs (same single-component pattern, `currentColor`): `IconArrowDown`, `IconArrowUpRight`, and social set `IconLinkedIn`, `IconGitHub`, `IconX`, `IconInstagram` (D36: social glyphs are in-scope as plain monochrome icons; no brand-color variants).

## WS6 — Consumer pilot

### Portfolio (tokens-CSS-only, stays no-build)

- Vendor generated CSS into the portfolio repo (`portfolio/vendor/dku-tokens/`): `base.css`, `utilities.css`, `ember.css` (+ a one-line sync script documented in AGENTS.md). `<html data-ds-theme="ember">`.
- Replace hand-rolled `:root` vars with `--ds-*` equivalents. **Normalization table** (portfolio value → DS token; visual shifts of a few px are accepted):

| Portfolio | DS token |
|---|---|
| `--bg` #0c0a09 / `--bg-footer` #100d0b | `--ds-bg-primary` / `--ds-bg-secondary` |
| `--ink` / `--ember` | `--ds-fg-primary` / `--ds-fg-accent` |
| hairlines 0.08 / 0.1–0.12 / 0.2 / 0.35 | `border-faint` / `border-faint` / `border-neutral` / `border-strong` |
| scrim rgba(bg, .25/.35/.82) | `--ds-scrim-soft/medium/heavy` (nav bg = heavy) |
| `--max-w` 1312 / `--pad-x` 40→24 | `--ds-container-max` / `--ds-gutter` |
| clamp(56,9vw,128) / clamp(36,5vw,64) / 32px h2 | `--ds-display-56-128-black` / `--ds-display-36-64-black` / `--ds-display-32-32-extrabold` |
| serif 17-26 → 18-28, 23-34 → 24-36, others exact | `--ds-text-serif-*` |
| mono 13/14/15 | `--ds-text-mono-*` |
| durations 0.2/0.35/0.45/0.6s + cubic-bezier(0.2,0.6,0.2,1) | `--ds-duration-200/350/450/600` + `--ds-ease-soft` |
| sepia filter chain | `--ds-media-tint` |
| section padding 100/110/120/140 | `--ds-space-96/120/120/144` |
| nav z-index 50 | `--ds-z-nav` |

- Out of scope for replacement: hero particle canvas, parallax JS, `pulse-down` keyframe (app-level; they *consume* duration/ease tokens).
- Acceptance: side-by-side screenshots at 1440/375 show no unintended visual change beyond the documented normalizations; browser floor note added to portfolio AGENTS.md (OKLCH relative color: Chrome/Edge 119+, Safari 18+, Firefox 128+).

### Promo migration

- Replace `--promo-container`, `--promo-ease`, sticky-header bg/blur/z, and fluid display sizes with the new DS tokens/utilities. `--promo-shadow-1` stays local (shadows deferred).

---

## Decision log additions

- **D27** Customer brands may declare `base: "light" | "dark"`; single base per brand in v1.2 (no per-brand light+dark pairs yet).
- **D28** Display combos are named pixel-true at both clamp endpoints (`--ds-display-{min}-{max}-{weight}`); tracking and uppercase live in `.ds-display-*` utilities because `font:` shorthand can't carry them.
- **D29** Font roles (sans/serif/mono/display) are brand-level (`CustomerTheme.fonts`), not theme-level; the DS never ships font files.
- **D30** Reduced motion is implemented by zeroing `--ds-duration-*` under `prefers-reduced-motion: reduce` in `utilities.css`; components/consumers get compliance for free by using duration tokens.
- **D31** Breakpoints are build-time constants exported from `@handamade/tokens` (not CSS vars — `@media` can't consume vars); emitted utilities bake the media queries.
- **D32** Scrim tokens are canvas-alpha semantic tokens and are exempt from the AA text-contrast gate (they are surfaces, not text pairs).
- **D33** `Button`/`IconButton` render `<a>` when `href` is present; anchor "disabled" = `aria-disabled` + `pointer-events: none`. No separate LinkButton component.
- **D34** Brands may override *component* tokens (e.g. `--ds-card-radius: 0`, `--ds-button-font`) via their `overrides`/emitted theme block — component tokens are part of the themeable surface.
- **D35** Media tint is a token + utility recipe, not a component; the filter chain is brand-defined.
- **D36** Social icons (LinkedIn/GitHub/X/Instagram) ship as ordinary monochrome icon components.
- **D38** (2026-07-16, user-approved) npm scope is `@handamade`, not `@dku`: the org name `dku` is unavailable on npmjs.com, while `@handamade` is the maintainer's username scope (no org required) and matches the GitHub org, keeping GitHub Packages open as a fallback registry. CSS prefixes (`--ds-`, `.ds-`) and the repo/folder names are unchanged — only the package scope moved.
- **D37** (added at plan review, user-approved) Solid accent labels bind to semantic `fgOnAccent` (default: alias of fg-static-white; ember: fg-static-black's formula). The gate pair follows the binding — white on `#ff7847` is 2.62:1, and "adjusting emberAccent L minimally" would have required 0.724 → ~0.58, destroying the brand color for a pairing the brand never renders (its CTA hover is dark-on-ember, 6.12:1). The outline variant's hover label reuses the accent binding because the literal canvas-on-accent fails AA in default light (4.35) and dark (3.92). Switch `thumb-bg` stays fg-static-white (the thumb also sits on the unchecked neutral track; not a text label).

## Quality gates (all must pass per milestone)

1. `pnpm build` green across workspace; tokens `dist/` regenerates deterministically.
2. Contrast gate passes for light, dark, acme, **ember** (including new `outline` button label pairs).
3. Stylelint token rule passes (no new hardcoded values in component CSS — transitions/z-index now tokenized).
4. Storybook renders all components under `ember`; token-doc pages include motion/layout/display categories.
5. `guidance.json`, DTCG export, `manifest.json`, per-component docs, `llms.txt` regenerated and include the new categories/components.
6. Changeset present (minor bump for both published packages).
7. Consumer pilot verification: portfolio + promo build and visually verified at 1440/375; screenshots archived in the plan doc.
