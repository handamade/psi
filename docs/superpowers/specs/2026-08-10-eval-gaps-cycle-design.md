# Eval gaps cycle — Pagination's range, the utility roster, and four prose fixes (D78–D79)

Date: 2026-08-10. Status: **Draft**.

Provenance: `tools/generation-eval/runs/2026-08-07-b.md`, the run that closed the
ledger arc with zero improvisations, filed four assessed docs gaps and two
smaller recurring ones. The 08-07 handoff scheduled them as ordinary
documentation work under a number that D76 then took.

**Two of the six are larger than the eval reported, and one is not
documentation at all.** Each item below was measured against the code before
being written down, and three of those measurements changed what the item is.

## What the measurements changed

| Eval said | Measured |
|---|---|
| `Pagination` is *silent* on `page > pageCount` | It renders a pager with **no `aria-current="page"` on any button** — an a11y hole, not a docs gap |
| The N-controlled-`Menu` *idiom* is undocumented | `Menu`, `MenuItem` and `MenuSeparator` are **absent from `react/llms.txt` entirely** — the only 3 of 34 components missing |
| `.psi-m-0` is undiscoverable | **No machine-readable artifact lists any utility class.** 146 ship; `psi-m*`/`psi-p*` are in no `llms.txt`, no `guidance.json`, no `manifest.json` |

The other three were as reported.

## Decisions

- **D78 — `Pagination` is answerable for a `page` outside its range, and
  clamping it is a bounded exception to controlled-only.** Measured today with
  `siblingCount: 1`: `paginationRange(5, 3)` returns `[1,2,3]` and
  `paginationRange(1, 0)` returns `[]`. Because the page button's current-state
  test is `item === page` (`Pagination.tsx`), an out-of-range `page` matches
  nothing, so **no button receives `aria-current="page"`** and assistive tech
  reports a pager with no current page.

  `Pagination` computes an **effective page** — `min(max(page, 1), pageCount)` —
  and renders from it, plus a dev-only `console.warn` naming both values,
  following the existing precedent at `Table.tsx:109` (`sortable` set without
  `onSortChange`).

  This is a deliberate, bounded departure from the controlled-only rule that
  governs `Table` (D62), `Dialog` (D50), `Toast` (D64), `Tabs` (D67) and `Menu`
  (D53): the component renders a page its own `page` prop does not name. **D65
  set the precedent** for bounding such an exception rather than quietly
  breaking the rule, and this is recorded the same way. The alternative —
  rendering no page buttons whenever `page` is out of range, even though pages
  exist — was considered and rejected: it is truer to the rule and strictly
  worse for the user, who is left with a pager that has vanished rather than one
  that has recovered. (That is distinct from case 1 below, where `pageCount < 1`
  means there is genuinely no page to render.)

  **Three cases, and the third is the one that ships broken if missed:**
  1. `pageCount < 1` — clamping yields `0`, which is not a page. Render **no
     page buttons**; both arrows disabled; warn. This is the `pageCount === 0`
     case 08-07 (a) hit.
  2. `page < 1` — effective page is `1`.
  3. **Prev and Next must emit from the effective page, not the raw prop.**
     Today both handlers close over `page` directly (`onPageChange(page - 1)` /
     `onPageChange(page + 1)`). With clamping but without this, `page=5,
     pageCount=3` highlights `3` while Prev emits `4` — still out of range, so
     the pager can never recover from the state the fix exists to handle. The
     disabled tests (`page <= 1`, `page >= pageCount`) move to the effective
     page for the same reason.

- **D79 — the utility roster is machine-readable, and it is emitted from the
  same source as the CSS.** `guidance.json` gains a `utilities` key.
  `emitUtilitiesCSS()` (`packages/tokens/scripts/emit-utilities.ts`) loops over
  `spacingScale` to write 146 classes; the roster is emitted from **that same
  structure**, so the CSS and the roster cannot disagree. A roster written
  beside the emitter rather than from it would be a second source of truth, and
  the icon count is what a second source of truth looks like six releases later.

  This is the icon-roster fix generalised. 0.15.0 shipped `manifest.icons`
  because "the icon set had no machine-readable form, so anything that needed to
  know which glyphs exist had to read the barrel." The same sentence is true of
  utility classes today, and it is why `.psi-m-0` has now been missed by two
  consecutive eval runs — one used it, the next killed UA margins with inline
  `margin: 0`.

  **Home: `guidance.json`, in `psi-tokens`.** Tokens owns the CSS, so tokens owns
  the roster. `packages/mcp/src/index-builder.ts:77` already reads
  `guidance.json`, the `./guidance.json` export already exists, and CLAUDE.md
  already lists it as artifact 3 of the machine-readable trail — so the roster
  becomes reachable with no new published surface. Rejected: a new
  `dist/utilities.json` (cleanest semantically, but costs an export condition, a
  trail entry in three files, MCP wiring and a `verify:published` claim, to
  separate inventory from guidance in a file agents already fetch whole); and
  `manifest.json` (the closest mirror of `manifest.icons`, but it is emitted by
  `psi-react` while utilities are `psi-tokens` CSS, so react's build would have
  to read tokens' dist and couple two builds that are independent today).

  Acknowledged mismatch: CLAUDE.md describes `guidance.json` as *variant intent
  and typical use*, and a class roster is inventory. The cost of the mismatch is
  one sentence of documentation; the cost of a new export surface is permanent.

## Prose fixes, no decision number

Ordinary documentation. Each states a fact verified against the source.

1. **`onSortChange` emits the *next* state.** `TableHeaderCell.tsx:34` computes
   `const direction = isActive && sort!.direction === "asc" ? "desc" : "asc"`
   and calls `onSortChange?.({ key: sortKey, direction })`. So a fresh column
   arrives `asc`, an active `asc` column emits `desc`, an active `desc` column
   emits `asc` — all three asserted in `TableSort.test.tsx`. The consumer stores
   what it is handed; it must not toggle again. `react/llms.txt:48` names the
   prop and never says what it carries, which is why the eval agent read
   `dist/index.js` to find out. Fix `docs/Table.md` and `llms.txt:48`.

2. **`data-table` gets an actions column, and its misplaced instruction moves.**
   `patterns/data-table.json` composes three header cells and three body cells,
   so the actions column exists in neither. Worse, the instruction
   `"[put the row-actions menu in the last cell]"` is attached to the
   **`payee-cell`** content key while the last cell is `amount-cell` — an agent
   following it literally puts the menu in the middle column. Add the actions
   `TableHeaderCell` and `TableCell` to the compose tree, and state the header
   convention. Two runs have now hit this.

3. **Spacing guidance extends past forms.** `react/llms.txt:76` gives 24/12/8
   for fields, toggle groups and button rows, inside the *Form field*
   composition entry — so there is nothing for page-level layout, and every
   section gap in the eval deliverable was the agent's own choice. Add
   page-level guidance as its own composition entry rather than extending the
   form one.

4. **`Menu` joins `llms.txt`.** `Menu`, `MenuItem` and `MenuSeparator` are the
   only 3 of 34 manifest components with no mention in `react/llms.txt`; the
   eval agent reached them through `patterns.json` alone. The entry states:
   controlled-only on the native Popover API, `open` + `onClose(reason)` with
   reasons `"esc" | "outside" | "item-select"`, `trigger`, `placement`
   (`bottom-start | bottom-end | top-start | top-end`), and required
   `aria-label`. It also documents **the N-instance idiom** — the eval agent has
   twice invented a single `openMenuId`, and D58 exists because that shape had a
   real dismissal bug, so the idiom is worth stating rather than leaving to be
   re-derived.

## A rule this cycle adopts

**Prose names families; it never states a count.** `llms.txt` is hand-written,
so a count in it is a fresh drift liability of exactly the kind D76 spent a
cycle removing from `apps/promo`. The utilities entry names the families
(`psi-gap-*`, `psi-p-*`/`psi-px-*`/`psi-py-*`, `psi-m-*`/`psi-mx-*`/`psi-my-*`,
`psi-text-*`, `psi-display-*`, `.psi-container`, `.psi-media-tint`) and the
scale they are built from; the exact list lives in `guidance.json`, where it is
derived. Adding "146 utilities" to a hand-written file would create the very
problem D79 exists to close.

## Gates

All five, in order, and **`pnpm build` must run first** — it regenerates
`guidance.json`, and `check-docs-drift` reads `dist/manifest.json` (it now
*crashes* rather than fails on a stale one, since it reads `manifest.icons`).

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm test:site
```

**Every test is proven red before the fix.** This repo has now paid three times
for a guard with a working mechanism and the wrong target — D70's `children`
diagnosis, D71's icon roster (which had a *passing* removal test and still
shipped the bug), and two drafts of `verify-published`. Concretely: the
`aria-current` assertion must fail against today's `Pagination`, and the roster
test must fail against today's `guidance.json`.

`vr` is CI's — this cycle adds no stories, so it should not move. If it does,
something unintended changed.

A changeset is required: `guidance.json` gaining a key and `Pagination` changing
behaviour are both user-visible. **`minor` ×3.**

`pnpm verify:published` after release covers `psi-react`, so it will exercise
`Pagination` but not `guidance.utilities`, which ships from `psi-tokens`. Worth
knowing rather than assuming the run covers the whole cycle.

## Out of scope

- **D77, the preset-render gate.** Already diagnosed under that number in
  `2026-08-07-public-site-cycle-design.md`; this cycle takes D78–D79 to leave it
  undisturbed. Claiming D77 here would have been the fourth numbering collision.
- **The D76 carries** — `.formula-card-head` at 320px, the missing skip
  link/focus-order assertions, and globbing `check-docs-drift`'s promo file
  list. Recorded in the D76 spec's `## Known carry`.
- **Re-running the eval.** The arc is closed; the strict published-trail variant
  is its own decision.
- **A count of anything in hand-written prose.** See the rule above.
