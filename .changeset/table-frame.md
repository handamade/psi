---
"@handamade/psi-react": minor
---

A table frame that rounds, and a container that scrolls (D126).

- **`Table`'s border follows its rounded corner** in every theme. The table moves to the separate border model; the corner cells take the inner radius, so a sticky header or a hovered or selected first or last row stays inside the curve. Hover and selected colours now paint the row's cells rather than the `<tr>`: if you styled a row's hover through a `className`, style its cells.
- **`TableContainer`**, new: wraps a `Table` that is wider than its space or must scroll in a fixed height (`maxBlockSize`). It scrolls both ways and keeps a `stickyHeader` at its top, draws the frame itself, and is a named, focusable region (named by the table's `TableCaption`, or by `aria-label`).
- **A `numeric` cell no longer wraps**, so an amount stays on one line.
- **A sortable column shows a two-way mark before it is sorted**; a sorted column shows an up or down arrow in the accent, as before. The marks are SVGs now, not text arrows.
