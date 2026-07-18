# Psi (Ψ) — agent entry point

OKLCH-based themeable design system. Code-first: Figma receives generated values, never the source of truth.

## Machine-readable trail (read in this order)

1. `llms.txt` → `packages/tokens/llms.txt` + `packages/react/llms.txt` (rules + artifact index)
2. `packages/react/dist/manifest.json` — full component/prop inventory with types and defaults (generated; run `pnpm build` if missing)
3. `packages/tokens/dist/guidance.json` — variant intent and typical use
4. `packages/tokens/dist/resolved/<theme>.json` — every semantic token with resolved values per theme
5. `@handamade/psi-mcp` — MCP server (search/get) over manifest+guidance+resolved tokens; hosted at psi.kurkin.de/mcp; `init` generates consumer AGENTS.md (D43–D44).

## House rules (non-negotiable)

- Sizes are px numbers (`24 | 32 | 40 | 48`), never S/M/L. Scale names are pixel-true (`psi-gap-8` = 8px).
- Variants are flat: `accent | accent-subtle | neutral | neutral-subtle | ghost | danger | danger-subtle | outline` — no primary/secondary. One accent per visual group; `danger` only for destructive actions.
- Never hardcode colors in component CSS — bind `var(--psi-*)` (the custom stylelint plugin enforces this).
- Semantic colors are OKLCH formulas, not swatch ladders. New values go in `packages/tokens/src`, never in dist (dist is generated).
- Consumers import all four token CSS files: `base.css`, one theme css, `components.css`, `utilities.css` (utilities is REQUIRED — `.psi-container` + reduced-motion zeroing live there).
- Breakpoints are build-time JS constants (D31) — baked into media queries, not CSS vars.

## Workflow

- Specs and plans live in `docs/superpowers/` (decision log D1–D42 in the specs). Significant changes get a decision number.
- Verify with `pnpm build` (the token build is the WCAG AA contrast gate — it throws on failures), `pnpm test`, `pnpm lint`. CI runs all three on every PR.
- Versioning via changesets; release with `pnpm release` (requires npm auth).
