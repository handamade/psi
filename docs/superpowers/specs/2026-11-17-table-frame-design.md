# A table frame that rounds, and a container that scrolls (D123)

Date: 2026-11-17. Status: **Approved**, branch `d123-table-frame`.

Provenance: four limits of `Table`, found by rendering it on 0.28.0 in
Chromium. Two are defects of the frame and the cells. Two are missing pieces:
a way to scroll a wide table, and a mark that says a column can be sorted.
Expandable rows, sorting by several columns, hiding columns, striped rows, the
selection labels and `Pagination` are out of scope.

The number was allocated by the coordinating session. D124 and D125 are held
by branches in flight at the same time.

## What's there today

1. **The border stays square at a rounded corner.** `.table` sets
   `border-radius: var(--psi-table-radius)` (`--psi-surface-radius`, 12px in
   the default theme) together with `border-collapse: collapse`. A collapsed
   table does not round its border: the background takes the curve, the 1px
   border meets in a square corner outside it. Every table, every theme.
   Switching to `border-collapse: separate` is not one line:
   - the body's last row draws a bottom border that doubles the table's own;
   - a hovered or selected first or last row, and a sticky header, paint a
     square background over the curve;
   - the sticky header draws its bottom edge with an inset `box-shadow`,
     because `border-bottom` does not paint on a sticky `<th>` in the
     collapsed model. That stand-in is written for the collapsed model.
2. **A wide table has no scroll wrapper, and inside one the sticky header
   stops sticking.** `Table` is `width: 100%` with no wrapper. At 320px with
   `white-space: nowrap` cells it measured 828px wide and ran out of its
   container. An `overflow-x: auto` wrapper becomes the scroll container in
   **both** axes (`overflow-x: auto` forces `overflow-y` off `visible`), so
   the header sticks to the wrapper, which does not scroll vertically. In a
   300px scrolling region scrolled by 200px, the header ended at −199px.
   With the table directly in the region (like `AppShell`'s `<main>`) the
   header stays at the top. The `Sticky` story has three rows and never
   scrolls, so `vr` cannot catch a regression of either.
3. **A `numeric` cell wraps**, so an amount breaks over two or three lines in
   a narrow column.
4. **A sortable column shows no mark until it is sorted.** The indicator
   span is empty at rest, so a sortable header looks like a plain one. It
   also means a right-aligned numeric header label shifts left by the
   arrow's width the first time its column is sorted.

## Decisions

- **D123 — `Table` draws its frame in the separate border model; a new
  `TableContainer` scrolls both ways, keeps a sticky header sticking, and
  draws the frame itself; `numeric` cells do not wrap; a sortable column
  shows a two-way mark at rest.**

  - **A bare `Table`'s frame: separate model, rounded corner cells.**
    - `.table` moves to `border-collapse: separate; border-spacing: 0`,
      keeping its 1px `--psi-table-border` and `--psi-table-radius`.
    - Cells keep only their bottom border (`--psi-table-cell-border`). The
      body's last row drops it, so it does not double the table's border.
      When the body has no rows, the header's last row drops it instead
      (`:has`), for the same reason.
    - The four corner cells take `border-radius: calc(var(--psi-table-radius)
      - 1px)`, the radius of the border's inner edge. Top corners: the first
      row of whichever section comes first (`TableHead`, or `TableBody` when
      there is no head). Bottom corners: the body's last row, or the head's
      last row when the body is empty. A `colSpan` cell that is both first
      and last takes both.
    - **Row states paint the cells, not the `<tr>`.** Hover and selected
      backgrounds move from `.row` onto its cells (`.row:hover > *`,
      `.row[data-selected] > *`). A `<tr>`'s background is not clipped by its
      cells' radii in every engine, so a hovered last row would still paint
      square. A consumer's own background on a `TableRow` shows through
      cells at rest, as before.
    - **The sticky header's `box-shadow` goes.** `border-bottom` paints on a
      sticky `<th>` in the separate model. The sticky header's top corner
      cells are rounded by the rule above, so its background stays inside
      the curve.
    - The caption sits above the frame, as today: a `<caption>` lies outside
      the table's border box.
    - A bare `Table` otherwise behaves as today. It does not scroll sideways,
      and `stickyHeader` sticks to the nearest scrolling ancestor (the page,
      or `AppShell`'s `<main>`).

  - **`TableContainer`: a scrolling region that is the frame.**
    - Renders a `<div>` with `overflow: auto`, the 8th member of the Table
      family, wrapping one `Table`. Like the family's other members it lives
      in `Table/` and has no `slots.json`: slot contracts are read per
      component folder, so `TableHead` and `TableCaption` carry none either.
    - `maxBlockSize?: number | string` — a number is px, a string any CSS
      length (`"60vh"`, `"calc(100dvh - 200px)"`). It sets
      `max-block-size`. Without it the container only scrolls sideways in
      practice, since its height hugs the table.
    - **The frame moves to the container.** It draws `--psi-table-border`,
      `--psi-table-radius` and `--psi-table-bg`, and its `overflow` clips the
      content to the rounded inner edge. The `Table` inside drops its own
      border and corner radii (`.container > .table`). So the frame stays put
      while the content scrolls under it in both axes.
    - A `stickyHeader` table inside sticks to the container's top edge,
      because the container is now the scroller in both axes. That case
      measured −199px before this change.
    - **Keyboard: `role="region"` and `tabIndex={0}`.** A scrolling region
      that holds no focusable content cannot be scrolled from the keyboard in
      Safari. Being a tab stop fixes that in every browser. Focus draws the
      shared ring (`--psi-table-focus-ring`, `--psi-focus-ring-width`,
      `--psi-focus-ring-offset`).
    - **Name: from the caption, automatically.** The container provides a
      context; a `TableCaption` inside registers its id there (its own `id`
      if it has one, a generated one if not), and the container sets
      `aria-labelledby` to it. Without a caption the consumer passes
      `aria-label` or `aria-labelledby`, which win over the caption. In
      development, a container with neither warns once, after mount.
    - **Inside a container, the caption is inside the frame** and scrolls
      with the content. A `<caption>` cannot leave its table, and the table
      is inside the scroller. Focusing the caption after a page change
      (D85) scrolls it back into view, which is what the paging flow wants.
    - Remaining attributes land on the `<div>`, and it takes a `ref`
      (D85 posture). `role` and `tabIndex` are the container's and win; for
      the name, a consumer's `aria-label` or `aria-labelledby` wins over the
      caption.
    - No new tokens: the container binds the table's own.

  - **`numeric` cells do not wrap.** `.cell[data-numeric]` gets
    `white-space: nowrap`. Body cells only: a numeric column's header label
    may still wrap, so a long label ("Outstanding balance") does not widen
    the column. A column that is then too wide for its space is what
    `TableContainer` is for.

  - **A sortable column shows a two-way mark at rest.**
    - The `↑`/`↓` text glyphs become small private inline SVGs drawn in
      `currentColor`, the same size in every state. They are not exported,
      so the icon set and its count do not change.
    - At rest: an up-and-down pair, in the header's own colour
      (`--psi-table-header-fg`, `--psi-fg-secondary`, already gated at 4.5:1
      as the header text).
    - Sorted: a single up or down arrow in `--psi-table-sort-indicator-fg`
      (accent), as today.
    - The slot is always filled, so a right-aligned numeric label no longer
      shifts when its column becomes sorted.
    - `aria-sort` stays on the `<th>`; the mark stays `aria-hidden`.

  **What this changes.** Every table's border now follows its corner, in
  every theme; every table baseline in `vr` changes. A hovered or selected
  row's colour is now on its cells: a consumer that styled
  `.row:hover` on the `<tr>` itself through a `className` should style the
  cells instead. A consumer that needs a wide table, or a table in a
  fixed-height region with its header pinned, wraps it in `TableContainer`.
  Every sortable header shows a mark at rest. Amounts stay on one line.

  Weighed and not taken:

  - **`Table` always renders a wrapper `<div>` frame.** One code path, but
    the wrapper must scroll to show wide content, which makes it the scroll
    container in both axes and breaks a page-sticky header for every
    existing consumer. `overflow: clip` keeps sticky working but hides
    content past the edge, which is worse than today's overflow.
  - **Fix only the bare table; the container only scrolls.** The table's
    border would scroll away with the content, and a sticky header would sit
    in a box with no top edge.
  - **Keep the collapsed model and draw the frame with an outline or
    `box-shadow` on `<table>`.** Neither is clipped, so the corner cells'
    backgrounds still need radii, and the cell borders still collapse into a
    square corner under the curve.
  - **`↕` as a text glyph at rest.** The smallest change, but the glyph's
    shape and width depend on the font.
  - **The mark on hover or focus only.** Invisible at rest and on touch,
    which is the defect.
  - **A `tabIndex` only while the container overflows** (a
    `ResizeObserver`). One fewer tab stop when nothing scrolls, at the cost
    of a stateful component and a tab order that changes with the viewport.

## Stories and tests

- **`Sticky`, rewritten:** about 20 rows in a bare `stickyHeader` `Table`
  inside a 240px-high `overflow: auto` region, scrolled 200px on mount. The
  "table directly in `<main>`" case.
- **`InContainer`, new:** the same rows, `nowrap` content, in a
  `TableContainer` with `maxBlockSize={240}` inside a 320px-wide box,
  scrolled both ways on mount. The header sticks, and the frame and its
  corners stay put while the content moves.
- The shared `Demo` table gets a sortable column that is not sorted, so the
  rest mark is in a baseline.
- **`vr/table.interaction.spec.ts`, new** (Playwright, geometry, not pixels):
  in both stories the header's top equals the scroller's top after the
  scroll; the container scrolls sideways (`scrollWidth > clientWidth`); a
  corner cell's computed `border-top-left-radius` is non-zero on a bare
  table; the table's own border is `0px` inside a container.
- **Unit tests:** the container's `role`, `tabIndex`, `aria-labelledby` from
  a caption (own id and generated id), `aria-label` winning, the dev warning
  with no name, `maxBlockSize` as a number and as a string, `ref` and
  attribute forwarding; the header's rest mark and its two sorted marks.
- **Axe:** a `TableContainer` with a caption joins `a11y.axe.test.tsx`.

## Docs

`llms.txt` ("Table family" 7 → 8, with a `TableContainer` line: a wide
table, or a fixed-height region with a pinned header; and "55 React 19
components" → 56 wherever it is stated), the READMEs, `a11y-meta`, the
generated `packages/react/docs/TableContainer.md`, and the site's Table page
(the member list and a scrolling example). The `data-table` pattern is
unchanged: wrapping is a layout choice the consumer makes. `check-docs-drift` is the arbiter of which prose states a count.
D124 and D125 move the same counts: whichever branch merges second merges
`origin/main` and re-runs drift first.

A changeset, minor: a new component.

## Follow-ups

- A caption that stays visible while a container scrolls sideways (a
  caption outside the scroller, which loses `<caption>` semantics, or a
  sticky inline offset).
- Safari and Firefox renders of the corner cells: `vr` is Chromium only.
