---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

Table family and Pagination — ledger arc cycle 2 (D62–D63).

`Table` ships as a compound family of six — `Table`, `TableHead`, `TableBody`,
`TableRow`, `TableHeaderCell`, `TableCell` — rendering native
`<table>/<thead>/<tbody>/<tr>/<th>/<td>` semantics, so it is legible to screen
readers without ARIA reconstruction.

It holds no state. `sort`/`onSortChange` and `selected`/`onSelectionChange` are
controlled, extending D50 and D53, so the same code works unchanged against a
backend that sorts and paginates. `sortable` and `selectable` only enable the
affordances; `size` is `32 | 40 | 48` px with rows aliasing the D54/D55 control
ramp, so a 32px row and a 32px Button are the same 32px from one source.

`numeric` cells align right **and** render tabular figures, via a new
`--psi-font-variant-numeric` token also exposed as a `.psi-tabular` utility — a
column that aligns but whose digits jitter between rows defeats the purpose.

`Pagination` is a standalone numbered pager with ellipsis truncation,
`aria-current="page"`, a labelled `nav` landmark, and an inert ellipsis. It is
not a Table family member: the `table-pagination` pattern composes it as a
Toolbar sibling of a page-size `Select`.

`Checkbox` now declares `aria-label` on its own props interface (applying D60),
so a table's row-selection checkbox — which has no visible label — is both
nameable and discoverable in `manifest.json`.

The `data-table` and `table-pagination` patterns are unblocked and render
presets. `data-table`'s `head` slot was removed: only `body` yields children, so
a `head` slot rendered as a prop rather than a header row.

Also fixed: `emit-manifest.ts` selected docgen's first export positionally, so a
source file exporting a helper before its component described the wrong export
in the manifest. It now matches on `displayName` and throws on a mismatch rather
than falling back silently.
