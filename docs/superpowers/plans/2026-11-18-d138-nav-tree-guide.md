# D138 — NavTree guide line and icon colours: plan

Spec: `docs/superpowers/specs/2026-11-18-d138-nav-tree-guide-design.md`.
Branch: `d138-nav-tree-guide`. Each step is red first, then green.

1. **Token test** — `packages/tokens/__tests__/nav-tree-tokens.test.ts`:
   - `navTreeVars` has the seven keys with their spec defaults, and
     `guide-width` ends in a unit.
   - `dist/components.css` declares them (after `pnpm --filter @handamade/psi-tokens build`).
   - `dist/scope-map.json`: `nav-tree-item-icon-fg` and `nav-tree-group-icon-fg`
     → `["text"]`, `nav-tree-guide-border` → `["border"]`.
   - `buildThemeCss` accepts the look's overrides on a light-based definition and
     emits them inside `@layer psi.components`. With `guide-border` bound to
     `--psi-fg-secondary` it throws `ThemeGateError`.
2. **Tokens** — add the seven keys to `nav-tree.ts` and update its header
   comment (no new contrast pair).
3. **CSS rule tests** — `NavTree.test.tsx`, a `D138` block that reads
   `nav-tree.module.css`:
   - `.item .icon` binds `color: var(--psi-nav-tree-item-icon-fg)`, and
     `.groupButton .icon` binds `--psi-nav-tree-group-icon-fg`.
   - The current icon (page and true) is `color: currentColor`.
   - `.withIcon > .groupList::before` draws a `border-inline-start` from the guide
     tokens, and no other `.groupList::before` exists.
   - The bar reads `indicator-width`, `indicator-inset-block` and
     `indicator-radius`, and the guide-group bar's offset is a `clamp()` on
     `guide-width`.
   - `round(` appears only inside `@supports`.
4. **CSS** — `nav-tree.module.css`.
5. **Story** — `GuideLine` in `NavTree.stories.tsx`: a light page frame with a
   dark sidebar whose wrapper sets the look's tokens in `style` (tokens only),
   top-level entries with icons, an open group with an icon and a current
   entry, a closed group, and the accent-text current mark.
6. **Browser spec** — `apps/storybook/vr/nav-tree.interaction.spec.ts`: geometry
   in LTR and RTL, colours, and defaults in `WithIcons`. Run with
   `pnpm --filter … build` of Storybook, then `pnpm test:e2e --grep nav`.
7. **Docs** — `NavTree.tsx` description, `packages/react/llms.txt`, the generated
   `docs/*.md`, `CLAUDE.md` decision range, `.changeset/nav-tree-guide.md` (minor).
8. **Gates** — `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site`.
9. **PR** — push, open, arm auto-merge and read it back. `vr`: expect zero
   changed stories and one new baseline (`GuideLine`). Show CI's render to the
   user before committing it.
