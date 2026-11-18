# A pager that holds still, keeps focus, speaks any language and fits a phone (D127)

Date: 2026-11-17. Status: **Implemented** on branch
`claude/d127-pagination-fixes-7983e6`.

Provenance: a discussion of Psi's limits on 2026-11-16 measured five defects in
`Pagination`, `CursorPagination` and the `table-pagination` preset. They ship
together under one decision because they touch the same two components and the
same two presets. The `Table` family and `TableContainer` belong to a parallel
session (D128) and are not touched here.

## What's there today

Measured in this worktree's Storybook build (`Data/Pagination`, `HundredPages`,
args changed through the Storybook channel), Chromium, system UI font, 14px. The
pager's width is the distance from the left edge of Previous to the right edge of
Next.

1. **Previous and Next move as the page changes.** `paginationRange` pads its
   window near the ends, so a 100-page pager shows 5, 6 or 7 page slots. Numbers
   of one, two and three digits also differ in width (`1` is 30.6px, `100` is
   48.4px; the ellipsis is 19.1px). Width of the pager, which is also where Next
   ends:

   | `pageCount` | page → width (px) |
   | --- | --- |
   | 100 | 1–2: 251.4 · 3: 288.5 · 4: 325.2 · 5: 312.0 · 50: 336.1 · 96: 337.6 · 97: 360.8 · 98: 314.8 · 99–100: 270.1 |
   | 13 | 1–2: 242.4 · 3: 279.5 · 4: 316.2 · 5: 303.0 · 7: 302.2 · 10: 333.8 · 11: 296.8 · 12–13: 253.3 |
   | 1000 | 1: 260.3 · 500: 371.9 · 1000: 297.0 |
   | 10000 | 5000: 407.7 |

   From page 2 of 100, Next moves 37px right. A second click where it was lands
   on `100`. From page 97 it moves left onto the gap.
2. **An arrow that disables itself drops keyboard focus.** With focus on Next at
   page 99 of 100, moving to page 100 leaves `document.activeElement` on the
   disabled button, but it no longer matches `:focus`. No ring is drawn, Enter
   and Space do nothing, and a screen reader is left on a dimmed control.
   (Chromium keeps the sequential-navigation point, so Shift+Tab reaches `100`.
   Firefox moves focus to the body.) `CursorPagination` disables its buttons the
   same way. The `cursor-pagination` preset's intent sends focus to the table
   caption after a page change. The `table-pagination` preset names no focus
   target.
3. **The arrow names are fixed English.** `Pagination.tsx` names the arrows
   `"Previous page"` and `"Next page"` and has no prop for them.
   `CursorPagination` takes `previousLabel` and `nextLabel` (D85).
4. **Too wide for a phone.** Storybook pads the story by 16px on each side. The
   widest 100-page pager (360.8px at page 97) needs 392.8px of viewport, so it
   overflows a 375px screen by 18px and a 320px screen by 73px. There is no
   compact form. And a pager wider than its container squeezes its arrows:
   they are flex items with no width of their own, so at 320px they measured
   16px, not 32px. (Psi's Storybook decorator pads a story by another 16px a
   side, so a story at 320px leaves the pager 256px.)
5. **The `table-pagination` preset renders a broken pager.** It composes
   `<Pagination />` with no `page` and no `pageCount`. `Pagination` clamps that
   to "no pages": two disabled arrows and no numbers, and the range warning
   (D78) logs twice under StrictMode. Its `Select` has no `<option>`s. Neither
   does the `cursor-pagination` preset's. The pattern language cannot express an
   `<option>`, because every node must name a manifest component.

## Decisions

- **D127 — `Pagination` keeps its arrows still, keeps focus, takes its arrow
  names as props and has a compact form on phones. `CursorPagination` keeps
  focus. The pagination presets render a working pager and a page-size select
  with options.**

  - **A fixed number of slots.** Once the pages don't all fit,
    `paginationRange` returns `2 × siblingCount + 5` items on every page:
    first, an ellipsis, `2 × siblingCount + 1` pages around the current one,
    an ellipsis, last. Near an end, the window is filled out on the side away
    from that end, as it is in the middle. With the default `siblingCount` of 1:

    ```
    page 1–4 of 100   1 2 3 4 5 … 100
    page 5 of 100     1 … 4 5 6 … 100
    page 97–100       1 … 96 97 98 99 100
    ```

    When the pages do fit (`pageCount ≤ 2 × siblingCount + 5`), every page is
    shown, as today, so the count is constant for that `pageCount` too. An
    ellipsis still stands for at least two pages. The sibling sweep test keeps
    its four invariants and gains a fifth: the length is
    `min(pageCount, 2 × siblingCount + 5)` on every page.
  - **Slots of one width.** Every page button and every ellipsis is a
    slot of the same width:
    `max(var(--psi-size-32), digits × 1ch + 2 × var(--psi-space-4))`, where
    `digits` is the number of digits in `pageCount`. The nav sets it as
    `--psi-pagination-digits`. Page numbers use `tabular-nums`, so every number
    of that many digits is the same width. `1ch` (9.07px) is wider than a
    tabular digit (8.86px) in the measured font. Page buttons drop to
    `--psi-space-4` inline padding, since the slot width now sets their size.
    The arrows stay 32px `IconButton`s. Together, Previous and Next sit at the
    same x on every page of a given `pageCount`.
    - At 1–99 pages a slot is 32px. At 100–999 it is 35.2px, and the pager is
      342.5px wide on every page (measured).
    - The formula is written content-box, as
      `max(var(--psi-size-24), digits × 1ch)` plus the two 4px insets, because
      the token-scope rule lets `--psi-space-4` bind padding but not a width.
      The result is the same: a 32px square up to two digits.
    - **Nothing in the pager shrinks** (`flex-shrink: 0` on its items), so the
      arrows stay 32px in a container narrower than the pager.
  - **`siblingCount` stays.** The register asked whether, with a fixed width,
    `siblingCount` becomes a count of slots. It stays a count of siblings: the
    slot count follows from it (`2s + 5`), and renaming it would break every
    consumer for no gain.
  - **Focus stays in the pager.** When Previous or Next had focus on
    activation and the new page disables it, `Pagination` moves focus to the
    current page's button. That button carries `aria-current="page"`, so a
    screen reader announces where the user landed. `CursorPagination` moves it
    to the other direction's button, if that one is enabled; with both disabled,
    focus is left alone. Both components move focus only from the button that
    had it, and only while focus is still on that button or on the body, so a
    pointer click in Safari (which does not focus a button) and a user who has
    tabbed away are left alone. Psi keeps `disabled`, not `aria-disabled`:
    `Button` and `IconButton` have no focusable disabled state for a
    `<button>`, and adding one is a shared-component change no row asks for.
  - **The presets name a focus target.** `table-pagination`'s intent says
    focus stays in the pager after a page change: on the button pressed, or on
    the current page's button when an arrow disables itself. A numbered pager
    reports where it is through `aria-current`, so the pager is the right place
    for focus. `cursor-pagination` keeps the caption: a cursor pager has no
    position to report, so the caption's range carries it (D85).
  - **Translatable arrow names.** `Pagination` takes `previousLabel` and
    `nextLabel`, the same names as `CursorPagination`'s, with defaults
    `"Previous page"` and `"Next page"`. Those are today's names, so nothing
    changes for a consumer that sets neither. Here they are accessible names,
    because `Pagination`'s arrows are icon-only. `CursorPagination`'s are
    visible text. The TSDoc says so.
  - **A compact form below 560px of viewport.** At or below
    `breakpoints.sm` (560px, D31: a build-time constant baked into the media
    query), the pager shows the `siblingCount = 0` range, which is five slots
    once the pages don't fit: `1 2 3 … 100`, `1 … 50 … 100`, `1 … 98 99 100`.
    At 100 pages that is 264px on every page (measured), which fits a 320px
    screen with 16px gutters (288px).
    - **One DOM for both forms.** `Pagination` renders the union of the two
      ranges once. An item that belongs to only one form carries
      `data-only="wide"` or `data-only="compact"`, and the media query hides
      the other form's items with `display: none`, which also takes them out
      of the tab order and the accessibility tree. The compact page numbers are
      a subset of the wide ones for every `siblingCount` (the sweep test checks
      this), so the union adds only ellipses. No button is rendered twice. A
      jsdom test, which applies no CSS, sees the wide form's buttons. A focused
      button is always in both forms: the arrows, and the current page.
    - **No prop.** `siblingCount={0}` already *is* the compact form, at any
      width, for a pager in a narrow panel on a wide screen. With
      `siblingCount={0}`, the two forms are the same and nothing is hidden.
    - **Limit.** At 1000–9999 pages a compact slot is 44.3px (measured) and
      the pager is 309.5px wide: it fits a 375px screen (343px), not a 320px
      one. The TSDoc says so.
  - **The presets render.** `table-pagination` gives `Pagination`
    `page={1}` and `pageCount={10}`. Both pagination presets give their `Select`
    three options: 10, 50 and 100, the page sizes D85 records.
    - **The pattern language gains one intrinsic element, `option`.** A node
      whose `component` is `option` is a native `<option>`. It is not looked up
      in the manifest, its props are not validated (only scanned for
      placeholders), and it takes only a `body` slot. `renderPreset` emits
      `<option value="10">10</option>`. `renderPresetElement` creates the
      native element. The allowed set is exactly `{ "option" }`, not "any
      lowercase name", so a preset cannot route around a Psi component with raw
      HTML. `verify-published` matches uppercase identifiers only, so an
      `option` needs no import. The schema's `component` description says so.
  - **Docs.** TSDoc feeds `docs/Pagination.md` and the manifest.
    `packages/react/llms.txt` (the Pagination line), `a11y-meta.ts` (a new
    `Pagination` entry; `CursorPagination`'s Tab line) and the two preset
    intents are hand-written and are updated.
  - **Tests.** Unit (jsdom): the range sweep with the two new invariants, the
    union and its `data-only` marks, focus after an arrow disables itself (both
    components), the label props, and the presets' rendered props and options.
    Layout (Playwright, `@interaction`, which runs in CI and needs no
    screenshots): Next's x is the same on every page of `HundredPages`, and the
    pager fits a 320px viewport.
  - **Changeset:** minor on `@handamade/psi-react`, with the lockstep packages.
  - **Baselines.** The page slots change width and padding, so every story
    showing `Pagination` changes: `Data/Pagination` and the
    `Patterns/Presets` stories `TablePagination` and `CursorPagination` (now
    with an option in its select). They are refreshed from CI's renders, after
    the user approves them.

## Candidates this design does not make nearly free

- **A range line (`1–50 of 1,234`).** Nothing here renders text beside the
  pager.
- **`size`.** The slot floor is `--psi-size-32` and the arrows are 32px. A
  `size` prop would need a floor and an arrow size per size, which is the same
  work it was before.
- **First, last and go to page.** The fixed slot count leaves no room for two
  more buttons in the compact form.
- **A busy state.** Keeping focus on a disabled arrow, which a busy pager would
  want, is the `aria-disabled` mode of `Button` that this design leaves out.

## Follow-ups, not in this PR

- **A page change is not announced when focus stays on an arrow.** Pressing Next
  in the middle of the range changes the page, and a screen reader hears
  nothing. `aria-current` speaks only when focus lands on the current page's
  button. A polite live region, or a recommendation to move focus to a caption
  as `cursor-pagination` does, would close it.
- **The `filter-form` and `filter-toolbar` presets' `Select`s have no options
  either.** The intrinsic `option` node fixes them in a line each, but those
  presets are not pagination presets and their baselines are not this PR's.
- **`Button` and `IconButton` have no focusable disabled state for a
  `<button>`.** `aria-disabled` with the `.disabled` styling exists only for
  `href`. A busy pager and any toolbar that disables a control under the
  pointer would use it.

## Out of scope

- The Candidates: a range line, `size`, first/last/go to page, a busy state.
- `packages/react/src/Table/` and `TableContainer` (the D128 session).
