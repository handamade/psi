---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

Tables for a token-paged list (D85). Every default is unchanged.

- **The Table family passes attributes through.** `Table`, `TableHead`,
  `TableBody`, `TableRow`, `TableHeaderCell` and `TableCell` spread their
  remaining HTML attributes onto their element (`aria-label`, `aria-busy`,
  `id`, `data-*`) and take a `ref`; their own attributes win.
- **New `TableCaption`**: `<caption>` with a name line and a `detail` line for
  the range. It takes `tabIndex` and a `ref`, so focus can move to it after a
  page change; when focused it draws the shared ring.
- **`TableCell`** gains `colSpan`, and `rowHeader`, which renders
  `<th scope="row">`.
- **New `CursorPagination`**: a `<nav>` of two ghost Buttons with visible
  words, *Previous* and *Next*, for a list that pages by opaque token. It holds
  no state.
- **`Button`** insets a trailing icon (`> svg:last-child`) the way it insets a
  leading one.
- **Patterns**: new `cursor-pagination`; `data-table` gains a caption with a
  range. 37 components, 16 patterns.
