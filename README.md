<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/psi-logo-dark.png">
  <img src="docs/assets/psi-logo-light.png" alt="Psi" width="220">
</picture>

# Psi — themeable design system

**Live site:** [psi.kurkin.de](https://psi.kurkin.de) · [Storybook](https://psi.kurkin.de/storybook/)

OKLCH-based design system for web applications, built on four core principles:

1. **OKLCH calculations, not swatch ladders.** Semantic colors are formulas, not hand-picked scales.
2. **Pixel-true scale names.** `psi-gap-8` means 8px; component sizes are numbers (32, 40), never S/M/L.
3. **Component-level tokens.** Every component is independently themeable; derived states live in code, not as separate styles.
4. **Flat variant naming.** `accent`, `accent-subtle`, `neutral` — no primary/secondary hierarchies.

## Workspace

- **packages/tokens** — Formula DSL, token definitions, codegen, CSS + JSON artifacts
- **packages/react** — 11 React 19 components (Button, IconButton, Card, NavBar, AspectRatio, Input, Select, Checkbox, Switch, Tag, Tooltip) + 22 icons
- **packages/figma-plugin** — In-repo Figma plugin syncing resolved tokens
- **apps/storybook** — Workbench and generated component documentation
- **apps/promo** — Public website (promo one-pager + update feed), built with Psi itself

## Quick start

```bash
pnpm install
pnpm build
pnpm test
pnpm dev
```

- `pnpm install` — Install dependencies
- `pnpm build` — Build all packages
- `pnpm test` — Run vitest across the workspace
- `pnpm dev` — Start tokens watcher + Storybook dev server

## Website

The public site (promo page at `/` + Storybook at `/storybook/`) deploys to
Vercel from this repo:

- `pnpm build:web` — build all packages, then assemble `site-dist/` (promo + storybook)
- `pnpm dev:web` — tokens watcher + promo (5199) + storybook (6006) dev servers
- **Publish an update:** add an entry to `apps/promo/src/content/updates.ts`,
  merge to `main` — the Vercel Git integration rebuilds and deploys the site.
- Vercel config lives in `vercel.json` (build command, output `site-dist/`).

## Documentation

- [**Design spec**](docs/superpowers/specs/2026-06-12-design-system-design.md) — Principles, architecture, decisions
- [**Implementation plan**](docs/superpowers/plans/2026-07-06-remediation-and-ai-readability-plan.md) — Active roadmap
- [**@handamade/psi-tokens README**](packages/tokens/README.md) — Token usage and theming
- [**@handamade/psi-react README**](packages/react/README.md) — Component usage and API

For AI: see [llms.txt](llms.txt) and per-package llms.txt files for machine-readable artifacts.
