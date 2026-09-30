# Table Pass-Through, Caption and CursorPagination (D85) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `Table` that a token-paged list can drive: attributes reach every element, a caption can take focus and state the range, a cell can span or head a row, and a pager with visible words moves by cursor.

**Architecture:** Six existing members gain `...rest` and `ref`; one new member (`TableCaption`) and one new standalone (`CursorPagination`, two `Button`s in a `<nav>`) follow the family's existing shapes. `Button` gains the trailing-icon inset. Two pattern files.

**Tech Stack:** React 19, CSS Modules, Vitest + Testing Library, axe, Playwright over built Storybook.

Spec: `docs/superpowers/specs/2026-09-30-table-cursor-paging-design.md`.

## Global Constraints

- Node 24; `node -v` first.
- Spread first, own attributes after; `className` merged. No existing Table test edited.
- `CursorPagination` holds no state; both buttons carry visible text.
- No new token families. Focus rules bind the D82 tokens.
- Counts after: **37 components, 16 patterns**.
- Gates: `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site`, then the full `pnpm test:e2e` — never `--grep <story word>`, which also matches the screenshot spec and writes `-darwin` baselines on macOS.
- Re-check D85 is free immediately before opening the PR.

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/react/src/Table/{Table,TableHead,TableBody,TableRow,TableHeaderCell,TableCell}.tsx` | rest props, ref; `colSpan`, `rowHeader` |
| `packages/react/src/Table/TableCaption.tsx` (new), `table.module.css`, `slots.json` | the caption |
| `packages/react/src/CursorPagination/{CursorPagination.tsx,cursor-pagination.module.css,CursorPagination.test.tsx,CursorPagination.stories.tsx}` (new) | the pager |
| `packages/react/src/Button/button.module.css` | trailing-icon inset |
| `packages/react/src/index.ts`, `scripts/emit-manifest.ts`, `src/a11y-meta.ts`, `src/a11y.axe.test.tsx`, `Table/Table.stories.tsx` | registration, docs, stories |
| `packages/react/patterns/cursor-pagination.json` (new), `data-table.json` | patterns |
| `README.md`, `packages/react/README.md`, `packages/react/llms.txt`, `packages/mcp/README.md`, `packages/mcp/llms.txt` | counts and prose |
| `.changeset/table-cursor-paging.md` (new) | `minor` |

---

### Task 1: Pass-through, `ref`, `colSpan`, `rowHeader`

- [ ] **Step 1: Failing tests** in `Table/Table.test.tsx` (new `describe("pass-through (D85)")`): each member receives `data-testid` and `aria-busy`/`aria-label`/`id`; `Table` keeps `data-size` and `TableHeaderCell` keeps `scope="col"` against hostile spreads; each member forwards `ref`; `TableCell colSpan={4}` → `colspan="4"`; `rowHeader` → `th[scope=row]` carrying the cell class.
- [ ] **Step 2: Run red** — `pnpm vitest run packages/react/src/Table`.
- [ ] **Step 3: Implement.** Each props interface extends the matching `Omit<…HTMLAttributes<…>, "children">` (`TableHTMLAttributes<HTMLTableElement>`, `HTMLAttributes<HTMLTableSectionElement>`, `HTMLAttributes<HTMLTableRowElement>`, `ThHTMLAttributes<HTMLTableCellElement>`, `TdHTMLAttributes<HTMLTableCellElement>`), gains `ref`, destructures `...rest`, and spreads it first. `TableCell`: declare `colSpan?: number` and `rowHeader?: boolean`; render `<th scope="row" className={[styles.cell, styles.rowHeader, className]…}>` when `rowHeader`. CSS: `.rowHeader { font: var(--psi-text-14-20-medium); text-align: start; }`.
- [ ] **Step 4: Run green** (whole `Table/` folder). **Step 5: Commit** — `feat(react): the Table family passes attributes and refs through; colSpan and row headers (D85)`

### Task 2: `TableCaption`

- [ ] **Step 1: Failing test** `Table/TableCaption.test.tsx`: renders `<caption>` as the table's first child with name and `detail`; `tabIndex={-1}` and a ref can take focus; `data-*` reaches it; `className` merged.
- [ ] **Step 2: Red** (missing module). **Step 3: Implement** `TableCaption.tsx` (`children`, `detail?`, `className`, `ref`, rest), CSS `.caption`, `.captionDetail`, `.caption:focus-visible` with the inset ring on `--psi-table-focus-ring`. Add `"TableCaption"` to `Table/slots.json`'s body `accepts`.
- [ ] **Step 4: Green.** **Step 5: Commit** — `feat(react): TableCaption (D85)`

### Task 3: `CursorPagination` and the trailing-icon inset

- [ ] **Step 1: Failing test** `CursorPagination.test.tsx`: both labels visible text and custom labels honoured; `hasPrevious={false}` disables Previous only; Next click calls `onNext` once and not `onPrevious`; a disabled button's click calls nothing; `<nav aria-label="Pagination">` with an override; icons `aria-hidden`.
- [ ] **Step 2: Red.** **Step 3: Implement** the component and `cursor-pagination.module.css` (`.nav { display: inline-flex; gap: var(--psi-space-8); }`). In `button.module.css` add, after each `:has(> svg:first-child)` rule, `.sizeN:has(> svg:last-child) { padding-inline-end: var(--psi-button-N-padding-inline-icon); }`.
- [ ] **Step 4: Green; `pnpm lint:css`.** **Step 5: Commit** — `feat(react): CursorPagination; Button insets a trailing icon (D85)`

### Task 4: Registration, stories, axe, patterns, prose

- [ ] Exports in `index.ts`; `COMPONENTS` gains `"TableCaption"` (after `TableCell`) and `"CursorPagination"` (after `Pagination`); `COMPONENT_DIR.TableCaption = "Table"`.
- [ ] `a11y-meta.ts`: `TableCaption`, `CursorPagination`.
- [ ] Stories: `Table/Table.stories.tsx` gains `WithCaption` (caption with range detail, a row header column, an empty-state row spanning with `colSpan`); `CursorPagination.stories.tsx`: `Default`, `FirstPage`, `LastPage`, `Size40`.
- [ ] Axe cases: a table with caption, row headers and a spanning cell; `CursorPagination` both ways.
- [ ] Patterns: `cursor-pagination.json`; `data-table.json` gains a `TableCaption` first child with `content: caption` and `detail: {content:range}`. Ids in `seed-patterns.test.ts` / `emit-patterns.test.ts` (sixteen).
- [ ] Counts: 35 → 37 in `README.md` (plus the two names in its list), `packages/react/README.md`, `packages/react/llms.txt`, `packages/mcp/README.md`; 15 → 16 in `packages/react/llms.txt`, `packages/mcp/README.md`, `packages/mcp/llms.txt`. `llms.txt`: Table family (7), the pass-through, caption, `colSpan`, `rowHeader`; a `CursorPagination` paragraph under Pagination.
- [ ] Changeset `minor`. `pnpm build`; add regenerated docs and `Presets.stories.tsx`.
- [ ] Commit — `feat(react): register TableCaption and CursorPagination; patterns, docs (D85)`

### Task 5: Gates, browser, spec, PR

- [ ] Five gates, then `pnpm test:e2e`.
- [ ] In a browser: the caption story (focus the caption: ring inside, text unmoved), the pager at both sizes with the trailing chevron inset, in light and ember; the accessibility tree of the row-header table.
- [ ] Spec Verification and Consequences; status Implemented. Commit.
- [ ] Re-check D85 free; push; PR; auto-merge armed and read back; stop for review. New baselines expected: one Table story, four pager stories, one preset, in two themes; `data-table` preset baselines change (caption added).
