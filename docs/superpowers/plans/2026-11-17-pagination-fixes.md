# Pagination fixes (D127) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship D127 (spec: `docs/superpowers/specs/2026-11-17-pagination-fixes-design.md`): a pager whose arrows hold still, which keeps focus, takes its arrow names as props and has a compact form on phones; plus pagination presets that render a working pager and a select with options.

**Architecture:** `paginationRange` returns a constant `2s + 5` items once the pages don't fit. `Pagination` renders the union of the wide (`siblingCount`) and compact (`0`) ranges once, marks single-form items with `data-only`, and a `≤ 560px` media query picks the form. Every slot has one width, set from the digit count of `pageCount`. Focus moves to a sensible neighbour when the focused arrow disables itself. The pattern language gains one intrinsic element, `option`.

**Tech Stack:** React 19, CSS Modules, Vitest + Testing Library (jsdom), Playwright (`@interaction`, CI), pnpm workspace.

## Global Constraints

- Decision number **D127**. Never name the register, a P-id or a consumer in repo files, commits or the PR.
- Do not touch `packages/react/src/Table/` or `TableContainer`.
- Component CSS binds only `--psi-pagination-*` or scale tokens (`space|size|radius|text|font|…`); stylelint enforces it.
- Breakpoint `sm` = 560px (D31), written as a literal in the media query with a comment.
- Defaults: `previousLabel = "Previous page"`, `nextLabel = "Next page"`.
- Preset page sizes: 10, 50, 100. `table-pagination` Pagination: `page={1} pageCount={10}`.
- Gates: `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && CI=1 pnpm test:site`.

---

### Task 1: A constant slot count in `paginationRange` (P77)

**Files:**
- Modify: `packages/react/src/Pagination/Pagination.tsx` (`paginationRange`)
- Test: `packages/react/src/Pagination/Pagination.test.tsx`

**Interfaces:** Produces `paginationRange(page, pageCount, siblingCount): Array<number | "ellipsis">`, unchanged signature, length `min(pageCount, 2s + 5)`.

- [ ] **Step 1: Update the expectations and add the length invariant.**

```ts
it("fills the window near the start", () => {
  expect(paginationRange(2, 13, 1)).toEqual([1, 2, 3, 4, 5, "ellipsis", 13]);
});
it("fills the window near the end", () => {
  expect(paginationRange(13, 13, 1)).toEqual([1, "ellipsis", 9, 10, 11, 12, 13]);
});
it("keeps the slot count one past the start", () => {
  expect(paginationRange(3, 13, 1)).toEqual([1, 2, 3, 4, 5, "ellipsis", 13]);
});
it("keeps the slot count one before the end", () => {
  expect(paginationRange(11, 13, 1)).toEqual([1, "ellipsis", 9, 10, 11, 12, 13]);
});
// in the sweep, siblingCount 0..3:
expect(out).toHaveLength(Math.min(pageCount, 2 * siblingCount + 5));
```

- [ ] **Step 2: Run** `pnpm --dir packages/react exec vitest run src/Pagination` — expect the four cases and the length invariant to fail.

- [ ] **Step 3: Implement.**

```ts
export function paginationRange(page: number, pageCount: number, siblingCount: number): Array<number | "ellipsis"> {
  const siblings = Math.max(0, siblingCount);
  const windowSize = siblings * 2 + 1;
  const slots = windowSize + 4;
  if (pageCount <= slots) return range(1, pageCount);
  const edgeRun = windowSize + 2;
  if (page - siblings <= 3) return [...range(1, edgeRun), "ellipsis", pageCount];
  if (page + siblings >= pageCount - 2) return [1, "ellipsis", ...range(pageCount - edgeRun + 1, pageCount)];
  return [1, "ellipsis", ...range(page - siblings, page + siblings), "ellipsis", pageCount];
}
```

- [ ] **Step 4: Run** the same command — PASS.
- [ ] **Step 5: Commit** `feat(pagination): a constant slot count (D127)`.

### Task 2: One slot width, a compact form, arrow names (P77, P79, P80)

**Files:**
- Modify: `packages/react/src/Pagination/Pagination.tsx`, `pagination.module.css`
- Test: `packages/react/src/Pagination/Pagination.test.tsx`

**Interfaces:** Produces `pagerItems(page, pageCount, siblingCount): PagerItem[]` (module export, not re-exported from `index.ts`):

```ts
type Only = "wide" | "compact" | undefined;
export type PagerItem =
  | { kind: "page"; page: number; only: Only }
  | { kind: "ellipsis"; before: number; only: Only };
```

`PaginationProps` gains `previousLabel?: string` and `nextLabel?: string`.

- [ ] **Step 1: Tests.**
  - `pagerItems(50, 100, 1)` → pages 1, 49w, 50, 51w, 100; ellipses before 49 (wide), before 50 (compact), before 100 (both).
  - Sweep pageCount 1–30 × siblingCount 0–3 × page: the compact numbers ⊆ the wide numbers; filtering by form reproduces `paginationRange(…, s)` and `paginationRange(…, 0)` exactly.
  - Rendered: page 50 of 100 renders buttons 1, 49, 50, 51, 100 once each; `49` has `data-only="wide"`; three ellipses, one `data-only="compact"`.
  - `siblingCount={0}` renders no `data-only`.
  - `previousLabel="Zurück"`/`nextLabel="Weiter"` name the arrows; defaults unchanged.
  - The nav sets `--psi-pagination-digits` to 3 at 100 pages, 1 with no pages.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Merge rule: for each number in the union (ascending), emit an ellipsis before it when either form has one before it (flag the forms), then the page (flag the forms). CSS:

```css
.nav { display: flex; align-items: center; gap: var(--psi-space-4); }
.slot {
  min-inline-size: max(var(--psi-size-32), calc(var(--psi-pagination-digits, 1) * 1ch + 2 * var(--psi-space-4)));
  font-variant-numeric: tabular-nums;
}
.nav .page { padding-inline: var(--psi-space-4); }
.ellipsis { display: inline-flex; justify-content: center; font: var(--psi-text-14-20-medium); }
/* breakpoints.sm = 560 (D31: build-time constant, baked). */
@media (width <= 560px) { .nav [data-only="wide"] { display: none; } }
@media (width > 560px) { .nav [data-only="compact"] { display: none; } }
```

- [ ] **Step 4: Run** — PASS. `pnpm lint` on the CSS.
- [ ] **Step 5: Commit** `feat(pagination): one slot width, a compact form, arrow names (D127)`.

### Task 3: Focus stays in the pager (P78)

**Files:**
- Modify: `Pagination.tsx`, `packages/react/src/CursorPagination/CursorPagination.tsx`
- Test: both `.test.tsx`

- [ ] **Step 1: Tests** with a controlled wrapper (`useState`):
  - Pagination: focus Next at 12 of 13, Enter → `13` has focus. Focus Previous at 2, Enter → `1` has focus. Focus Next at 5, Enter → Next keeps focus. A `fireEvent.click` on Next without focus → focus not moved.
  - CursorPagination: wrapper with `index` 0..2, `hasPrevious = index > 0`, `hasNext = index < 2`. Focus Next at index 1, Enter → Previous has focus. Mirror for Previous. Both disabled → nothing moves.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Record the pressed arrow on click only if `e.currentTarget === document.activeElement`. In a `useEffect` on `[effectivePage, pageCount]` (Pagination) or `[hasPrevious, hasNext]` (CursorPagination): take and clear the record; if that arrow is now disabled and focus is on it or on the body, focus `[aria-current="page"]` in the nav (Pagination) or the other arrow if enabled (CursorPagination).
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `fix(pagination): focus stays in the pager when an arrow disables itself (D127)`.

### Task 4: Presets render (P81, and P78's focus target)

**Files:**
- Modify: `packages/react/scripts/patterns.ts`, `packages/react/patterns/pattern.schema.json`, `packages/react/patterns/table-pagination.json`, `packages/react/patterns/cursor-pagination.json`
- Test: `packages/react/scripts/patterns.test.ts`, `render-preset.test.ts`, `render-preset-element.test.tsx`, `emit-patterns.test.ts`

- [ ] **Step 1: Tests.** `option` validates without a manifest entry; an unknown lowercase name (`div`) still throws `unknown component`; a non-`body` slot on `option` throws; `renderPreset` emits `<option value="10">10</option>`; `renderPresetElement` creates a native `<option>`. The emitted `table-pagination` preset contains `page={1}`, `pageCount={10}` and three options; `cursor-pagination` three options; `table-pagination`'s intent names where focus goes.
- [ ] **Step 2: Run** `pnpm --dir packages/react exec vitest run scripts` — FAIL.
- [ ] **Step 3: Implement** `const INTRINSIC_ELEMENTS = new Set(["option"])`: in `walk`, an intrinsic node skips the manifest lookup, scans props for placeholders only, and allows only `body`; `renderPresetElement` passes the tag string to `createElement`. Edit the two presets.
- [ ] **Step 4: Run** — PASS, then `pnpm build` (regenerates `dist/patterns.json`).
- [ ] **Step 5: Commit** `fix(presets): pagination presets render a pager and page sizes (D127)`.

### Task 5: Docs, layout gate, changeset

**Files:**
- Modify: `packages/react/llms.txt`, `packages/react/src/a11y-meta.ts`, `CLAUDE.md` (D1–D127)
- Create: `apps/storybook/vr/pagination.interaction.spec.ts`, `.changeset/pagination-fixes.md`

- [ ] **Step 1:** Playwright `@interaction`: for `data-pagination--hundred-pages` with `args=page:N` for N in 1, 2, 3, 4, 5, 50, 97, 99, 100, Next's left edge is the same; at a 320×640 viewport, `document.documentElement.scrollWidth <= 320` on page 97.
- [ ] **Step 2:** llms.txt Pagination line; a11y-meta `Pagination` entry, `CursorPagination` Tab line.
- [ ] **Step 3:** changeset (minor, `@handamade/psi-react`), CLAUDE.md range.
- [ ] **Step 4:** Five gates.
- [ ] **Step 5: Commit** `docs: pagination D127 docs, layout gate, changeset`.
