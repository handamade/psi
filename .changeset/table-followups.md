---
"@handamade/psi-react": minor
---

Table follow-ups (D128).

- **Selection names you can translate.** `Table` takes `selectAllLabel` (default "Select all rows") and `selectRowLabel` (default "Select row"). A row checkbox without `selectLabel` is now named by `selectRowLabel` and the row's header cell (`TableCell rowHeader`), "Select row Acme", or, with no row header, by its position, "Select row 3". It no longer reads out the raw `rowId`. Tests that find a row checkbox by its old name need the new one.
- **Focus no longer lands under a sticky header.** Inside a `TableContainer`, a sticky header's measured height is kept clear at the top (`scroll-padding-block-start`), so a row that keyboard focus scrolls into view lands below the header, not behind it (WCAG 2.4.11).
- **The frame's edge with an empty body.** With several `TableBody`s where the last one is empty, the last body that has rows now draws the bottom edge: no doubled border, rounded corners. The same goes for the top corners when there is no `TableHead` and the first body is empty.
- **`TableContainer`** warns once about a missing name under `StrictMode`, not twice, and a `TableCaption` with `id=""` no longer gives the region `aria-labelledby=""`.
- **Generated docs:** a family member without its own tokens (the `Table` parts, `MenuItem`, `Tab`, `Radio` and others) now says which family's tokens it binds, instead of "scale tokens only".
