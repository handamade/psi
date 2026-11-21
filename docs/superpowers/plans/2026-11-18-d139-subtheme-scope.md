# Sub-theme scope (D139) and NavBar brand alignment (D140) — implementation plan

Spec: `docs/superpowers/specs/2026-11-18-d139-subtheme-scope-design.md`.
Branch `d139-subtheme-scope`. Node 24 (`nvm use`).

## Task 1 — classify component tokens (D139)

- `packages/tokens/src/emit/component-scope.ts`: `classifyComponentTokens(componentVars, semanticNames)`
  and `overrideDependents(overrides, componentVars, scopes)`.
- Test first: `packages/tokens/__tests__/component-scope.test.ts`. Colour keys theme, `*-border-width`
  page, `focus-ring` theme through its value, `button-radius` page through `control-radius`,
  `dialog-bg` theme through `surface-bg`, a cycle terminates; dependents are transitive, skip
  overridden tokens, keep registry order.

## Task 2 — emit two rules, and dependents in a theme's block (D139)

- `scripts/emit-components.ts` takes the scope map; `scripts/build.ts` classifies once against the
  light theme's keys.
- `src/emit/css.ts` `emitThemeCSS` appends `overrideDependents` to the overrides block.
- Tests: `emit-components.test.ts` (both rules, one-rule component), `emit-css.test.ts`
  (`control-radius` override re-declares `button-radius`; ember's block unchanged).

## Task 3 — scope gate (D139)

- `src/scope-gate.ts` `checkOverrideScopes`: a page-scoped override that reaches a semantic token or a
  palette entry is a violation with group `"page"`; `src/theme/gate.ts` words its message.
- Tests in `scope-gate.test.ts`; `app-shell-tokens.test.ts` keeps passing (its backgrounds are colour
  keys).

## Task 4 — tokens for the brand column (D140)

- `components/app-shell.ts`: `sidebar-padding: var(--psi-space-8)`, bound in
  `app-shell.module.css`.
- `components/navbar.ts`: `brand-width`, `brand-inset`.
- Tests: `app-shell-tokens.test.ts`, a navbar token test; both classify page.

## Task 5 — `NavBar brandAlign="sidebar"` (D140)

- `NavBar.tsx` prop and class; `navbar.module.css` rule (logical properties only).
- `NavBar.test.tsx`: class present, fluid implied, no effect without a brand.
- `AppShell.stories.tsx`: a `BrandAligned` story (dark header and sidebar, Menu icon button, NavTree
  icons). `apps/storybook/vr/app-shell.interaction.spec.ts`: icon columns equal in LTR and RTL, brand
  ends at the sidebar's edge, and the header reads a page-scope sidebar width under its sub-theme.

## Task 6 — docs and drift

- AppShell and NavBar doc comments, `packages/react/llms.txt`, `packages/tokens/llms.txt`,
  `app-shell.ts` / `toolbar.ts` comments, generated docs (`pnpm build`), site pages if they quote the
  old rule, `CLAUDE.md` decision range at merge time.
- Changeset: minor, behaviour change stated first.

## Gates

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site
pnpm test:e2e
```

`vr` in CI only. Show the user CI's renders before committing any baseline.
