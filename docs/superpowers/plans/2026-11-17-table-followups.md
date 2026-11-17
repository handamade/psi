# Table follow-ups (D128) — implementation plan

Spec: `docs/superpowers/specs/2026-11-17-table-followups-design.md`. Test-first: each
task writes its failing test, sees it fail, then implements.

1. **Caption id and warning (P-container).** `TableContainer.test.tsx`: warning once
   under `<StrictMode>`; `TableCaption id=""` inside a container → `aria-labelledby`
   is the offered id; outside → no `id` attribute. Fix: a `warned` ref; `id ||
   offeredId`; `captionId || undefined`.
2. **Edge rules.** `table-css.test.ts`: the two new `:has()` rule groups exist (border
   and both bottom radii on `.body:not(:has(~ .body .row)) .row:last-child`, both top
   radii on `.table:not(:has(.head)) .body:not(.body:has(.row) ~ .body) .row:first-child`).
   Then the CSS.
3. **Header size → scroll padding.** `TableContainer.test.tsx` with a stubbed
   `ResizeObserver`: sticky table inside a container sets `--_psi-table-head-size` to
   the measured px; non-sticky does not; unmount clears it. Implementation: `stickyHeader`
   into `TableContext`; `setHeadSize` on `TableContainerContext`; `TableHead` observes
   its `<thead>`; container rule `scroll-padding-block-start`.
4. **Selection names.** `TableSelection.test.tsx`: `selectAllLabel`; `selectRowLabel` +
   row header ("Select row Acme", via `aria-labelledby`, live on change); position
   fallback ("Select row 2"); `selectLabel` wins. Implementation: two Table props in
   context; `TableRowContext` (offered header id + register) provided by `TableRow` only
   when selectable; `TableCell rowHeader` registers; selection cell composes the name.
5. **Generator.** `docs-sections.test.ts`: `themingSection` given family prefixes emits
   the family line; given none, the scale-tokens line. `emit-docs.ts`: find the
   component's source, its imported CSS modules, the `var(--psi-…)` names, and the
   families whose generated `.vars.css` declare them.
6. **Browser checks.** `apps/storybook/vr/table.interaction.spec.ts`: Shift+Tab under the
   sticky header, and the `[rows, rows, empty]` edge. Run with `CI=1 pnpm test:e2e` on a
   local build (geometry tests, platform-independent).
7. **Docs and release.** `llms.txt` selection line; axe case; changeset (minor);
   `CLAUDE.md` D1–D128.
8. **Gates:** `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint &&
   pnpm --dir apps/site build && CI=1 pnpm test:site`. `vr` in CI only.
