# Storybook docs theme and upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Storybook goes to 10.6.7, and every docs page's story box follows the theme toolbar (D123).

**Architecture:** One unlayered rule in `preview.css` gives `.docs-story` the theme's page background. One Playwright interaction spec proves it in all four themes.

**Tech Stack:** Storybook 10, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-17-storybook-docs-theme-design.md`

## Global Constraints

- Node 24: run `node -v` before the first pnpm command; `nvm use` if it prints `v20.x`.
- Do not run `pnpm vr` locally; CI is the `vr` gate. `pnpm test:e2e` runs the interaction specs, which have no snapshots, and is safe on macOS.
- `CLAUDE.md`'s D-range goes to what `origin/main` holds plus D123 when the PR opens.
- Commit after each task; end commits with the attribution line the session gives.

## File Map

- Modify `apps/storybook/package.json`, `pnpm-lock.yaml`
- Modify `apps/storybook/.storybook/preview.css`
- Create `apps/storybook/vr/docs-theme.interaction.spec.ts`
- Modify `CLAUDE.md` (D-range)

## Task 1: Upgrade Storybook

- [ ] Set `storybook`, `@storybook/react-vite`, `@storybook/addon-docs`, `@storybook/addon-a11y` to `^10.6.7` in `apps/storybook/package.json`; `pnpm install`.
- [ ] `pnpm ls -r storybook` prints 10.6.7 only.
- [ ] `pnpm --dir apps/storybook build` succeeds; the story count in `storybook-static/index.json` is unchanged from `main`.
- [ ] Commit: `chore: Storybook 10.6.7`.

## Task 2: Failing spec

- [ ] Create `docs-theme.interaction.spec.ts`. For `light`, `dark`, `acme`, `ember`, it opens `iframe.html?viewMode=docs&id=components-switch--docs&globals=theme:<t>`, waits for `.docs-story`, and resolves `--psi-bg-primary` and `--psi-fg-primary` through probe elements. Every `.docs-story` must have that background and colour.
- [ ] `pnpm exec playwright test -c apps/storybook/vr --grep "story boxes" --reporter=list`: fails on all four themes (the background is transparent).

## Task 3: The rule

- [ ] In `preview.css`, after the `@layer psi.base` block, add an unlayered `.docs-story { background: var(--psi-bg-primary) }` with a comment explaining why it is unlayered (spec, D123).
- [ ] Rebuild Storybook; `pnpm exec playwright test -c apps/storybook/vr --grep "story boxes" --reporter=list` passes; the full `pnpm test:e2e` passes.
- [ ] Look at the `Switch` docs page in Dark in the browser.
- [ ] Commit: `fix: docs pages follow the theme (D123)`.

## Task 4: Gates and PR

- [ ] `CLAUDE.md` D-range updated.
- [ ] `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site`
- [ ] Push, open the PR, arm auto-merge and read it back. CI's `vr` is the gate for the upgrade.
