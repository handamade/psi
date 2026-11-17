---
"@handamade/psi-react": minor
---

A pager that holds still, keeps focus, translates and fits a phone (D127).

- **`Pagination`'s Previous and Next no longer move as the page changes.** Once the pages don't all fit, it shows `2 × siblingCount + 5` slots on every page: near an end the window fills out on the far side (`1 2 3 4 5 … 100` on page 2, where it was `1 2 3 … 100`). Every page button and ellipsis is one slot as wide as the widest page number, with tabular numerals, and page buttons have a smaller inline padding. At 100 pages the pager is 342px on every page, where it was 251–361px.
- **A compact form at or below 560px of viewport.** The pager shows the `siblingCount={0}` range, `1 … 50 … 100`: 264px at 100 pages, so it fits a 320px screen. Pass `siblingCount={0}` for that form at any width. The arrows no longer shrink when the pager is wider than its container.
- **`previousLabel` and `nextLabel`** on `Pagination` translate the arrows' accessible names. The defaults are today's *Previous page* and *Next page*.
- **Focus stays in the pager.** When Previous or Next had focus and the new page disables it, `Pagination` moves focus to the current page's button, and `CursorPagination` to the other direction's button.
- **The `table-pagination` preset renders a working pager** (`page={1} pageCount={10}`), and both pagination presets give their `Select` the page sizes 10, 50 and 100. The pattern language accepts `option` as a native element, for exactly this. `table-pagination`'s intent says where focus goes after a page change.
