# Table follow-ups: focus under a sticky header, empty bodies, the container's name, the family's Theming line, and selection labels (D128)

Date: 2026-11-17. Status: **Approved** (scoped by the coordinating session),
branch `claude/d128-table-followups-65850f`.

Provenance: the D126 spec's follow-ups and PR #174's review, plus an older
limit of row selection found in a limits discussion. Five defects of the
`Table` family, all small, under one number. Out of scope: a caption that
stays visible while a container scrolls sideways, Firefox renders of the
corners, and everything in `Pagination` and `CursorPagination` (D127).

D128 was allocated by the coordinating session; D127 is held by a branch in
flight. Checked free on `main`, every branch and every open PR at spec time.

## What's there today

Measured on `main` at 0.32.0, in Chromium and WebKit through Playwright
against the built Storybook, and in jsdom.

1. **Keyboard focus can land behind a sticky header.** In the `InContainer`
   story (a `stickyHeader` table in a `TableContainer`, header 43px high),
   with each row's first cell made focusable: scrolled so a 43px row sits
   with 8px showing below the header, Shift+Tab onto it does **not** scroll.
   The browser treats the row as visible, because it is inside the
   scrollport; 35 of its 43px stay under the header. A row placed wholly
   under the header, with focus on the row below it, is likewise "visible":
   Shift+Tab onto it does not scroll and all 43 of its 43px stay hidden,
   which fails WCAG 2.4.11 (Focus Not Obscured, Minimum). Same numbers in
   both engines. Setting `scroll-padding-block-start: 43px` on the container
   makes the first case scroll by 35px and land the row exactly at the
   header's bottom edge, and the second scroll the row fully into view
   (77px below the header: the engines centre an element that is wholly
   outside the padded scrollport), in both engines. Programmatic `focus()` on a row far
   off-screen centres it, so it was never the problem. The header is 43px,
   not the 40px row token, so a padding taken from the size ramp would fall
   short.
2. **With several bodies, an empty last body keeps the previous body's
   bottom edge square and doubled.** D126's rules key on
   `.body:last-of-type`. With bodies `[rows, rows, empty]`, the last body
   with rows keeps its last row's 1px bottom border (doubling the table's)
   and its bottom corner cells stay square (`0px`). The mirror case exists
   too: no `TableHead` and an empty first body leaves the next body's top
   corner cells square.
3. **`TableContainer`'s dev warning prints twice under `StrictMode`.** The
   warning runs in a mount `useLayoutEffect`, and StrictMode runs mount
   effects twice in development.
4. **A caption with `id=""` names the container with `aria-labelledby=""`.**
   `TableCaption` uses `id ?? offeredId`, so an empty string is kept, put on
   the `<caption>` and registered.
5. **The family's generated Theming line is wrong.** `emit-docs` writes, for
   every component without its own `<name>.vars.css`, that it "binds scale
   tokens only, so there is nothing component-scoped to override". The seven
   members of the Table family (`TableHead`, `TableBody`, `TableRow`,
   `TableCell`, `TableHeaderCell`, `TableCaption`, `TableContainer`) bind
   `--psi-table-*` tokens (borders, row backgrounds, header colours, the
   focus ring) through the family's shared stylesheet. The same sentence is
   false for other members of other families, for the same reason.
6. **Row-selection names are fixed English, and the default row name is the
   raw `rowId`.** The select-all checkbox is named `"Select all rows"` with
   no prop. A row checkbox without `selectLabel` is named
   `` `Select row ${rowId}` `` — "Select row 8f3a2c91", a database key read
   aloud.

## Decisions

- **D128 — Five `Table` follow-ups: the container keeps a focused row clear
  of its sticky header; the frame's edge rules find the first and last body
  that have rows; the container warns once and ignores an empty caption id;
  `emit-docs` names the token family a member binds; and the selection names
  take props, with a default row name read from the row header.**

  - **Focus clears the sticky header (WCAG 2.4.11).**
    - Inside a `TableContainer`, a `stickyHeader` table's `TableHead`
      measures its own block size and registers it with the container,
      through the context the caption already uses. The container sets a
      private `--_psi-table-head-size` on itself, and its rule reads
      `scroll-padding-block-start: var(--_psi-table-head-size, 0px)`.
    - **Measured, not taken from the size ramp:** the header measured 43px
      against a 40px row token, and a header label may wrap. A
      `ResizeObserver` follows it; where there is none (jsdom, old engines)
      it measures once on mount.
    - Only for a sticky header inside a container. A bare table's sticky
      header sticks to the page or `AppShell`'s `<main>`, which Psi does not
      own; that case is a follow-up.
    - A `className` on the container can still set its own
      `scroll-padding-block-start`, since the value is in the stylesheet,
      not an inline style.
    - Nothing renders differently: scroll padding only moves where a
      focused or scrolled-into-view element lands.

  - **The edge rules find the first and last body with rows.**
    - Bottom edge: the last row of the last body **that has rows**
      (`.body:not(:has(~ .body .row))`) drops its bottom border and takes the
      bottom corner radii.
    - Top edge with no head: the first row of the first body that has rows
      (`.body:not(.body:has(.row) ~ .body)`) takes the top corner radii.
    - The D126 `:last-of-type` / `:first-of-type` rules stay as they are, so
      an engine without `:has()` keeps today's behaviour; the new rules are
      their own rules, as D126's `:has()` cases are, so such an engine drops
      only them.

  - **The container's name and warning.**
    - The no-name warning prints once per container, StrictMode or not (a
      ref remembers it has warned; React keeps refs across StrictMode's
      second effect run).
    - An empty `id` on `TableCaption` is treated as absent, as D126 already
      treats an empty `aria-label`: inside a container the caption takes the
      offered id; outside one it renders no `id`. The container also treats
      an empty registered id as none.

  - **The Theming line names the family a member binds.**
    - For a component with no `<name>.vars.css`, `emit-docs` reads the CSS
      modules its source file imports, collects the `var(--psi-…)` names,
      and looks each up in the generated component token files. If any
      belong to a family, the line says so: "This component has no
      `--psi-table-cell-*` tokens of its own. Its styling binds the
      `--psi-table-*` tokens; override those at any scope." Only when none
      do does it keep the "scale tokens only" sentence.
    - Fixed in the generator, so the generated docs and the site's pages
      that read them change with the next build; nothing is edited by hand.
      Other families' members (the `Menu` parts, for instance) get the
      corrected line too, because the defect was the generator's.

  - **Selection names take props; a row's default name comes from its row
    header.** Following D117 (`Toast.dismissLabel`): plain strings, with
    defaults that keep what English speakers hear today wherever it was
    already right.
    - `Table.selectAllLabel?: string`, default `"Select all rows"`: the
      select-all checkbox's name.
    - `Table.selectRowLabel?: string`, default `"Select row"`: the start of
      every row checkbox's name.
    - A row checkbox's name, most specific first:

      ```
      TableRow.selectLabel  >  selectRowLabel + the row header  >  selectRowLabel + position
      ```

      - **The row header** is the row's `TableCell rowHeader` (D85: "the
        cell that names its row"). The checkbox is labelled by itself and
        that cell (`aria-labelledby`), so the name is "Select row Acme" and
        follows the cell's content live. The cell takes a generated id when
        it has none, registered with its row the way a caption registers
        with its container; only in a selectable table, so no other table
        gains ids.
      - **Position** is the row's 1-based place among the rows `Table`
        reads (rows with a `rowId`, across bodies): "Select row 3". It
        replaces the raw `rowId`. It counts body rows only, so it is one
        less than the row index a screen reader announces with the header
        row; the TSDoc says so and recommends a row header. A row `Table`
        cannot see (inside a wrapper component, which `Table` already warns
        about) has no position and is named by `selectRowLabel` alone.
    - An empty string is not special-cased, as in D117.
    - Word order is fixed (label, then identifier). A language that needs
      another order passes `selectLabel` per row, as consumers already do.
    - No visible change, so no story and no baseline. Axe covers a
      translated selectable table.

  **What this changes.** A row checkbox's accessible name without
  `selectLabel` changes from "Select row <rowId>" to "Select row <row
  header>" or "Select row <n>". Tests that query by the old name break,
  which is the point. Nothing else changes for a consumer: no visible change
  except the frame's edge with an empty body, which was wrong. The generated
  docs of several members change wording.

  Weighed and not taken:

  - **Scroll padding from the size tokens** (`:has(> .sticky[data-size])`).
    CSS only, but 3px short in the one measurement taken, and wrong for a
    wrapping header label.
  - **`scrollIntoView` on focus.** A focus listener that re-scrolls
    duplicates what the browser does and fights its own scroll.
  - **A function prop for the row name** (`(rowId) => string`). Handles
    word order, but still keys the name off an id instead of the row's
    content, and differs from D117's string props.
  - **The first cell as the fallback name.** Often the identifier, but just
    as often a date, an icon or a button; position is at least always true.

## Stories and tests

- No new story; no baseline changes expected (no visible change in any
  existing story).
- **`vr/table.interaction.spec.ts`:** in `InContainer`, with rows made
  focusable, a row placed wholly under the header and Shift+Tab onto it
  lands at or below the header's bottom edge; and on a bare table with
  bodies `[rows, rows, empty]` built in the page, the last body with rows
  has a `0px` bottom border and rounded bottom corners.
- **Unit tests:** `TableHead` registers its size with the container only
  when sticky (mocked `ResizeObserver`), and the container sets the private
  property; the warning prints once under `StrictMode`; a caption with
  `id=""` (inside a container: offered id; outside: no `id`); the
  `selectAllLabel`, `selectRowLabel` and the three-step row name; the CSS
  rules by text, as `table-css.test.ts` does today.
- **`docs-sections.test.ts`:** a component that binds a family's tokens
  gets the family line; one that binds none keeps the scale-tokens line.
- **Axe:** a selectable table with translated labels and a row header joins
  `a11y.axe.test.tsx`.

## Docs

`llms.txt`'s selection line (the two Table props and the row-header name),
the TSDoc that feeds the generated docs and manifest. Changeset: minor (new
props) on the lockstep packages. `CLAUDE.md`'s decision range moves to
D1–D128.

## Follow-ups

- A bare `stickyHeader` table that sticks to the page or `AppShell`'s
  `<main>` has the same 2.4.11 exposure; Psi does not own that scroller's
  `scroll-padding`. `AppShell` could set it when its `<main>` holds a sticky
  header, or the docs could say so.
- Multi-row sticky headers: every header cell sticks at `0`, so a second
  header row slides under the first. Not new, not measured here.
