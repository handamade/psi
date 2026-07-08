# Promo one-pager for DS — design

**Date:** 2026-07-08
**Status:** Approved for implementation (autonomous session — decisions documented here in lieu of interactive approval; revise freely)
**Deliverable:** `apps/promo` — a single-page marketing site for the DS design system, built with the design system itself.

## 1. Audit: what the system gives us vs. what a promo page needs

Three parallel audits (components, tokens, monorepo/infra) established:

### Can use today
- **Tokens:** full semantic OKLCH color system (`--ds-bg-*`, `--ds-fg-*`, `--ds-fill-*`, `--ds-border-*`), spacing 0–80px, radius 4–12 + full, 11 type combos (max `30-36-bold`), `--ds-font-sans/mono`, utility classes, cascade layers `ds.base/theme/components/utilities`.
- **Theming:** `light`, `dark`, `acme` via `data-ds-theme` attribute; light bound to bare `:root`. Live `oklch(from …)` relative color syntax (evergreen browsers only).
- **Components:** Button (7 variants × 4 sizes), IconButton, Input, Select, Checkbox, Switch, Tag, Tooltip + 16 icons — all themeable, a11y-conscious, zero runtime deps, React 19.
- **Advertisable features:** OKLCH formulas not swatch ladders; a customer is a theme file, not a fork (`pnpm new-theme`); build-time WCAG AA contrast gate; Figma plugin "DS Token Sync" (code → Figma variables, dry-run diff, orphan reporting); AI-readable artifacts (`llms.txt`, `manifest.json`, `guidance.json`, DTCG JSON); pixel-true scale names; flat variant naming.
- **Consumption pattern (from apps/storybook):** deps `@dku/tokens`/`@dku/react` `workspace:*` + react/react-dom `^19.2.0`; import `base.css`, theme css files, `utilities.css`, `components.css`, `@dku/react/styles`; packages resolve from built `dist/`.

### Missing (the gap report)
The system is deliberately an **atoms-only, product-UI kit** — page composition belongs to consuming apps. Gaps a promo page must fill locally:

| Gap | Consequence for promo site |
|---|---|
| No layout primitives (Container/Stack/Grid/Section) | write local layout CSS |
| Type scale tops out at 30px; no fluid/display sizes | local `clamp()` hero type |
| No breakpoints / media queries anywhere | define local breakpoints |
| No shadow/elevation, motion, z-index, gradient tokens | define local `--promo-*` vars |
| Spacing tops out at 80px | local section-padding vars |
| No Link / button-styled anchor (Button is `<button>` only) | local `.promo-cta` anchor styles reusing button tokens |
| No nav/footer/card/hero components | compose from raw HTML + tokens |
| No web font (system stack only) | keep system stack (honest dogfooding) |
| No social/brand icons | text links in footer |
| Known issues: Select chevron hardcoded `#666` (won't recolor in dark), sRGB gamut warnings pending decision, changesets peer-dep release blocker | avoid claiming "fully gamut-safe"; showcase Select in light context |

Roadmap items worth an honest "What's next" section: custom listbox Select (v2), Popover-API Tooltip (v2), `@dku/mcp` server (v2 candidate), visual regression testing.

## 2. Approaches considered

1. **Static HTML/CSS using only token CSS** — simplest, but can't demo the React components live; undersells half the system.
2. **Vite + React 19 SPA at `apps/promo` (chosen)** — mirrors the storybook consumption pattern exactly, demos real components interactively, live theme switcher, and *is itself* the proof of the system's "compositions belong to consuming apps" philosophy.
3. **Next.js app** — overkill for one page; alien to the repo's plain-Vite conventions.

## 3. Design

### Architecture
- `apps/promo`: private workspace app (auto-included by `pnpm-workspace.yaml`). Vite 6 + React 19 + TS extending `tsconfig.base.json` (`jsx: react-jsx`). Dev server via `.claude/launch.json` for preview.
- CSS import order in `main.tsx`: tokens `base → light → dark → acme → utilities → components` → `@dku/react/styles` → local `promo.css`.
- `promo.css` declares a `promo` cascade layer after the `ds.*` layers; site-level vars (`--promo-container`, `--promo-section-pad`, `--promo-shadow-*`, `--promo-text-display/hero` via `clamp()`, breakpoints as plain media queries) all **derived from `--ds-*` where possible** so every theme restyles the whole page.
- Theme state: React state syncing `data-ds-theme` on `<html>`; initial value from `prefers-color-scheme`. This is consumer-app wiring, exactly as the DS intends.

### Page sections (one page, anchor nav)
1. **Header** — DS wordmark, anchor links, theme switcher (light/dark/acme) — the switcher is the first demo.
2. **Hero** — headline on the OKLCH-formula pitch, sub-line, two real DS Buttons as CTAs; decorative OKLCH formula/palette visual built from token colors.
3. **Principles** — four cards, verbatim from README.
4. **Live components** — interactive playground: Button variant×size matrix, Input/Select/Checkbox/Switch/Tag/Tooltip doing real things.
5. **Theming** — "a customer is a theme file, not a fork": theme cards, `pnpm new-theme`, contrast-gate callout, sample theme-file code block.
6. **Figma sync** — DS Token Sync plugin story (code → Figma variables, dry-run, orphans).
7. **AI-ready** — llms.txt / manifest.json / guidance.json / DTCG bullets.
8. **What's next** — honest v2 roadmap.
9. **Footer** — quick-start command, doc pointers.

### Error handling / testing
Static content SPA; no data flow. Verification = browser preview (console clean, snapshot, all three themes, mobile/desktop responsive) + `pnpm lint`/`tsc` cleanliness for the new app.

## 4. Decisions & non-goals
- No web fonts, no external assets — page must prove the system self-suffices (and keeps CSP trivial).
- No new components added to `@dku/react`; all composition stays in the app (matches spec's v1 philosophy). If layout/typography gaps hurt repeatedly, promote them to tokens/components later as a separate effort.
- Not wired into root `pnpm dev` filter yet — run via `pnpm --filter promo dev`. (Trivial to add later.)
- No git commit in this session (repo owner commits when satisfied).
