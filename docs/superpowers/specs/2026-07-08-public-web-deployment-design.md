# DS public web (promo + Storybook) on Vercel — design

**Date:** 2026-07-08
**Status:** Approved for implementation (autonomous session — decisions documented; revise freely)
**Builds on:** `2026-07-08-promo-site-design.md`

## Goal

Make `apps/promo` the permanent public face of the design system, publish it on
Vercel together with Storybook, keep all cross-references stable, and give the
team a repeatable "work on the system → publish an update on the website" loop.

## Approaches considered

1. **Two Vercel projects** (promo + storybook on separate domains) — clean
   separation but cross-links need env-configured absolute URLs on both sides,
   two deploys to keep in sync, two domains to manage.
2. **One Vercel project, one domain (chosen):** promo at `/`, static Storybook
   at `/storybook/`. All cross-references are same-origin relative paths that
   can never drift apart; one build, one deploy, one URL to share.
3. **Vercel microfrontends/multi-zone** — overkill for a static one-pager +
   static Storybook.

## Architecture

```
ds (git repo root, GitHub: handamade/s-ds-claude, public)
├── vercel.json            → buildCommand: pnpm build:web, outputDirectory: site-dist
├── tools/assemble-site.mjs → site-dist/ = apps/promo/dist + /storybook ← storybook-static
├── apps/promo             → the website (Vite SPA at /)
└── apps/storybook         → storybook build → served at /storybook/
```

- `pnpm build:web` (root): `pnpm -r build` (topological — tokens → react →
  promo/storybook) then assemble `site-dist/`. `site-dist/` is gitignored.
- `vercel.json` lives at the repo root so importing the repo into Vercel gives
  git-push publishing with zero dashboard config: push to `main` → production,
  any branch → preview URL.
- Initial publish in this session: deploy the prebuilt `site-dist/` via the
  Vercel connector; git integration is a one-time dashboard import afterwards.

## Cross-references

- **Promo → Storybook:** `apps/promo/src/lib/storybook.ts` is the single
  source of truth for Storybook URLs: base `/storybook/` in production,
  `http://localhost:6006/` in dev. Story doc ids follow the existing title
  convention (`Components/Button` → `components-button--docs`, plus
  `icons-gallery`, `tokens-and-assets-*`, `welcome`). Links appear in the
  header nav, the playground cards (per-component "storybook →" links), and
  the footer.
- **Storybook → promo:** `.storybook/manager.ts` sets brand title/url — the
  Storybook logo links back to `/` on the same origin.
- **Website → repo:** footer links to the public GitHub repo.

## Publishing updates (the ongoing loop)

- `apps/promo/src/content/updates.ts` — typed list of dated entries (tag,
  title, body, optional links). Rendered as a new **Updates** section on the
  page (newest first). Adding an entry is a one-object edit.
- Flow once git-connected: edit `updates.ts` (or any DS code) → PR → preview
  URL → merge to `main` → production updates automatically. Until then:
  `pnpm build:web` + deploy.
- Release notes source of truth stays changesets; an updates entry is written
  by hand when a release is worth announcing (deliberately curated, not
  auto-generated — the site is marketing, not a changelog mirror).

## Decisions & non-goals

- Storybook keeps its own look; only brand title/url added — no theme fork.
- No custom domain in this pass; Vercel-assigned URL first, domain is a
  dashboard action later.
- No analytics, no CMS. `updates.ts` in-repo is the CMS.
- Root README gains a "Website" section documenting the loop.
