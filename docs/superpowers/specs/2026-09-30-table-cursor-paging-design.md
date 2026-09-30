# Tables for a token-paged list: pass-through across the Table family, `TableCaption`, `colSpan` and row headers, `CursorPagination` (D85)

Date: 2026-09-30. Status: **Implemented** on branch `d85-table-cursor-paging`.

Provenance: the fourth item of the Psi 0.21 portal handoff
(`docs/superpowers/plans/2026-09-30-psi-0.21-portal-handoff.md`, brief D85).
The portal's lists page by opaque token: the backend returns a
`nextPageToken`, no page count and no page numbers, in pages of 10, 50 or
100. After a page change, focus moves to the table's caption, which states
the range — *"Rows 51–100 of more than 100,000"*. And every control carries
visible text; an icon only reinforces it (rule 4).

## What's there today

1. **`Table`, `TableRow` and `TableCell` spread no extra props**
   (`Table.tsx`, `TableRow.tsx`, `TableCell.tsx`); nor do `TableHead`,
   `TableBody` and `TableHeaderCell`. A consumer cannot set `aria-label`,
   `aria-busy`, `id` or `data-*` on any of them. Only `Table` takes a `ref`.
2. **There is no caption component.** A raw `<caption>` child works, because
   children render straight into `<table>`, but it is unstyled and
   undocumented, and the `Table` slot contract admits only `TableHead` and
   `TableBody`.
3. **`TableCell` has no `colSpan`**, so an empty-state row cannot span the
   table, and there is no row header.
4. **`Pagination` numbers its pages and requires `pageCount`.** Its
   *Previous* and *Next* are icon-only `IconButton`s (`Pagination.tsx:121`,
   `:151`), which the portal's rule 4 forbids.
5. **`Button` insets a leading icon, not a trailing one.** Its size rules
   carry `:has(> svg:first-child)` only (`button.module.css:50-81`), so a
   *Next* button with a chevron after its text would sit the icon at the full
   text inset — the asymmetry D54's optical rule exists to prevent, mirrored.

## Decisions

- **D85 — The Table family passes attributes through, has a caption, a
  spanning cell and a row header; and a cursor pager with visible words
  stands beside the numbered one.**
  - **Every family member spreads its remaining HTML attributes** onto its
    element: `Table` → `<table>`, `TableHead` → `<thead>`, `TableBody` →
    `<tbody>`, `TableRow` → `<tr>`, `TableHeaderCell` → `<th>`, `TableCell` →
    `<td>`. They are spread first, so the member's own attributes win —
    `data-size`, `data-selected`, `data-row-id`, `data-numeric`, `scope`,
    `aria-sort` — and `className` is merged. Each member also takes a `ref`
    to its element; `Table` already did.
  - **New `TableCaption`**: renders `<caption>`, takes `ref`, `className` and
    HTML attributes, so the consumer can set `tabIndex={-1}` and move focus to
    it. `children` is the name line; `detail` is an optional second line —
    the range, say. Set in the table's type tokens: the name at
    `14-20-medium`, the detail at `12-16-regular` in the header foreground,
    inset to the cells' padding, above the table. When focused it draws the
    shared focus ring (D82) inside its box, on `--psi-table-focus-ring`.
    The `Table` slot contract admits it.
  - **`TableCell` gains `colSpan`** (passed to `<td>`, declared so the
    manifest lists it, per D60) **and `rowHeader?: boolean`**, which renders
    `<th scope="row">` with the cell's styling at `14-20-medium`.
  - **New `CursorPagination`**: `hasPrevious`, `hasNext`, `onPrevious`,
    `onNext`, `previousLabel` (default *Previous*), `nextLabel` (default
    *Next*), `size` (`32 | 40`, default 32), `aria-label` (default
    *Pagination*), `className`. It renders `<nav>` with two `ghost` `Button`s:
    `IconChevronLeft` before *Previous*, *Next* before `IconChevronRight`. A
    button whose direction is unavailable is `disabled`. It keeps no state
    and knows nothing about pages: the consumer holds the tokens.
    - It is a sibling of `Pagination`, not a mode of it. `Pagination`'s
      contract is a page count and numbers; this one has neither, and a prop
      that switches a component between two contracts is what D66 refused.
    - It takes no `--psi-cursor-pagination-*` tokens, as `Pagination` takes
      none: every visual is `Button`'s.
  - **`Button` insets a trailing icon too**: `:has(> svg:last-child:not(:first-child))`
    sets `padding-inline-end` to the size's icon inset, the mirror of the
    leading rule. A solid shape has no side bearing at either end.
    - The `:not(:first-child)` guard was found in a browser, not in the
      brief. With `<Icon/> Label`, the label is a text node, so the svg is
      both the first and the last *element* child, and a plain
      `svg:last-child` rule measured every leading-icon button at 8/8 instead
      of 8/12. So a trailing icon must follow an element: `CursorPagination`
      wraps its labels in `<span>`, and the CSS comment says so. The
      `icon-leading` story measures 6/8, 8/12, 12/16, 16/20 before and after,
      so nothing shipped changes.
  - **Patterns.** New `cursor-pagination`: a `Toolbar` holding a labelled
    page-size `Select` and a `CursorPagination`. `data-table` gains a
    `TableCaption` with a range summary. 37 components, 16 patterns.
  - **Not done:** `Pagination`'s icon-only arrows stay. They are its
    contract, and the portal does not use it.

## Verification

- **Tests first**, each red before its change:
  - the family: 6 tests red on assertion — attributes reach every element,
    own attributes win against a hostile spread, `className` merges on every
    member, a `ref` from every member, `colSpan`, `rowHeader` as
    `th[scope=row]` carrying the cell class;
  - `TableCaption`: red on the missing module, then 3 tests — first child of
    the table with its `detail` and the table named by it, focus through a
    ref, attributes and `className`;
  - `CursorPagination`: red on the missing module, then 6 tests — visible
    words and hidden icons, translated labels and nav label, the unavailable
    direction disabled, one `onNext` per press and never the other handler,
    nothing from a disabled button, `className`;
  - the patterns: red on the missing `cursor-pagination`; the D72 children
    test red until `CursorPagination` joined the four that take none.
- **Regression.** No existing Table, Pagination or Button test was edited.
- **In a browser** (Chromium 149, built Storybook):
  - the `WithCaption` accessibility tree: `table "Applications Rows 51–100
    of more than 100,000"`, three `rowheader`s, and the spanning cell as one
    row; the caption focused through `focus()` draws `solid 2px` at `-2px`;
  - the pager's buttons measure `Previous` 8/12 and `Next` 12/8 at size 32,
    the mirror insets; the existing `icon-leading` story is unchanged at
    6/8, 8/12, 12/16, 16/20 (see the guard above);
  - the `cursor-pagination` preset: a labelled `combobox` beside the nav.
- **axe:** three new cases, no violations.
- **The five gates** green: 2344 tests in 96 files (2326 in 94 before), docs
  drift at 37 components and 16 patterns, site gate 9 of 9. Interaction set
  158 of 158, the D82 sweep included.

## Consequences

- **Visual regression: 14 new baselines, and `data-table` changes.** New:
  `WithCaption`, five `CursorPagination` stories, the `cursor-pagination`
  preset, in light and ember. Changed: the `data-table` preset in both
  themes, which gained a caption. From CI's artifact; the changed pair from
  its actual renders.
- **The family now forwards every attribute it is given.** A consumer can
  put `role` or `aria-sort` where it does not belong; the types allow it
  because `HTMLAttributes` does.
- **A trailing icon needs an element before it** to be inset. `<Button>Next
  <Icon/></Button>` with a text label gets the text inset on both sides, as
  it did before this change.
- **`Pagination`'s icon-only arrows stay**, and now sit beside a pager whose
  words are visible. A later decision may give `Pagination` labels too; the
  portal does not need it.
- **The portal** renders its lists with `TableCaption` (`tabIndex={-1}`,
  the range in `detail`), moves focus there after a page change, sets
  `aria-busy` on `TableBody` while a page loads, spans its empty-state row,
  and pages with `CursorPagination` beside a `Select` of 10, 50 and 100.
