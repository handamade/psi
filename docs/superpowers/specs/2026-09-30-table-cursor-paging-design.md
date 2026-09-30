# Tables for a token-paged list: pass-through across the Table family, `TableCaption`, `colSpan` and row headers, `CursorPagination` (D85)

Date: 2026-09-30. Status: **In progress** on branch `d85-table-cursor-paging`.

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
  - **`Button` insets a trailing icon too**: `:has(> svg:last-child)` sets
    `padding-inline-end` to the size's icon inset, the mirror of the leading
    rule. A solid shape has no side bearing at either end. No existing
    `Button` renders a trailing `svg`, so nothing shipped changes.
  - **Patterns.** New `cursor-pagination`: a `Toolbar` holding a labelled
    page-size `Select` and a `CursorPagination`. `data-table` gains a
    `TableCaption` with a range summary. 37 components, 16 patterns.
  - **Not done:** `Pagination`'s icon-only arrows stay. They are its
    contract, and the portal does not use it.

## Verification

To be filled in when implemented. Tests that go red first:

- `aria-busy="true"` and `data-testid` passed to `Table` reach the
  `<table>`; the same for each family member; a passed `data-size` on
  `Table` or `scope` on `TableHeaderCell` does not displace the member's own;
- `TableCaption` renders a `<caption>` as the table's first child, with its
  `detail`; a ref to it can take focus;
- `TableCell colSpan={4}` renders `colspan="4"`; `rowHeader` renders
  `th[scope=row]`;
- `CursorPagination` renders both labels as visible text; `hasPrevious={false}`
  disables *Previous*; pressing *Next* calls `onNext` once; pressing a
  disabled button calls nothing; axe finds no violations;
- the `Table` slot contract admits `TableCaption`; `data-table` and
  `cursor-pagination` validate and render through the preset gate;
- the D82 sweep passes the new stories.

## Consequences

To be filled in when implemented.
