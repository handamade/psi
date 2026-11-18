# Icons for the sections of a navigation tree (D137) — implementation plan

Spec: `docs/superpowers/specs/2026-11-18-d137-nav-section-icons-design.md`. Test-first.

1. **Tests.** In `icons.test.tsx`: the eight D137 icons render `aria-hidden`, at
   20, `stroke="currentColor"`, 2px round strokes, eight distinct shapes; every
   export of `icons/index.ts` renders a 24-unit viewBox, `aria-hidden` and size
   20; the notice lists all eight under Lucide and every icon it names exists.
   Run them and see them fail.
2. **Icons.** Eight files in `packages/react/src/icons/`, the shape of
   `IconSimCard.tsx`, paths copied from `lucide-static@1.75.0`. Export them from
   `icons/index.ts` and `src/index.ts`.
3. **Gallery.** `icons.stories.tsx` builds its list from `import * as icons from
   "./index.js"`, so it shows all 38 and cannot fall behind.
4. **Notice.** `packages/react/THIRD-PARTY-NOTICES.md` (Lucide ISC, Feather MIT,
   Simple Icons CC0, each with the Psi components it covers); add it to
   `files`; a pointer in `packages/react/README.md`; a presence check in
   `tools/verify-published.mjs`. `pnpm --filter @handamade/psi-react pack
   --dry-run` (or `pnpm pack` and `tar t`) lists it.
5. **Prose.** `packages/react/llms.txt` `## Icons (38)` with the full list; root
   `README.md` `+ 38 icons`; changeset (psi-react minor); `CLAUDE.md` range at
   PR time.
6. **Gates.** `pnpm build && node tools/check-docs-drift.mjs && pnpm test &&
   pnpm lint && pnpm --dir apps/site build && pnpm test:site`.
7. **PR.** Re-check D137 across `origin/*` and open PRs. Open, arm auto-merge,
   read it back. CI's `vr` fails on the eight gallery stories: download the
   `vr-baselines` artifact, show the renders, and commit them only after
   approval.
