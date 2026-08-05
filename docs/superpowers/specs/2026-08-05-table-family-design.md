# Table family + Pagination — ledger arc cycle 2 (D62–D63)

Date: 2026-08-05. Status: **Draft** — cycle 2 of the ledger coverage arc.

Provenance: the 2026-08-05 ledger coverage arc spec (D59) made the backlog
derived rather than decided. Cycle 1 authored the ledger patterns and shipped
the machine-readable surface; five patterns declare gaps, and the two that
block the primary screen are `data-table` (gap: `Table`) and
`table-pagination` (gap: `Pagination`). This cycle closes both.

Table leads because every ledger screen depends on it and the arc spec named
it the most likely to overrun — better discovered in month one than month
three. Pagination is the pre-agreed split seam if that happens.

## Decisions

- **D62 — `Table` is a compound family of six, controlled-only, on real
  table semantics.**

  `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell` and
  `TableCell` live in one directory with one `slots.json` and one CSS
  module, following the `Menu`/`MenuItem`/`MenuSeparator` precedent (D53).
  Header and body compose as children; there is no `head` prop.

  The elements rendered are `<table>/<thead>/<tbody>/<tr>/<th>/<td>` — not a
  grid of divs. Native semantics are what make the component free on the axe
  gate and legible to screen readers without ARIA reconstruction.

  **Controlled-only, extending D50 and D53.** Table holds no state:

  | Prop | Type | Notes |
  |---|---|---|
  | `sortable` | `boolean` | enables header affordances only |
  | `sort` | `{ key: string; direction: "asc" \| "desc" } \| null` | |
  | `onSortChange` | `(sort) => void` | optional in the type — see below |
  | `selectable` | `boolean` | renders the checkbox column |
  | `selected` | `ReadonlySet<string>` | keyed by `TableRow`'s `rowId` |
  | `onSelectionChange` | `(selected: ReadonlySet<string>) => void` | |
  | `size` | `32 \| 40 \| 48` | row height, default `40` |
  | `stickyHeader` | `boolean` | |

  `TableHeaderCell` carries `sortKey?: string` and `numeric?: boolean`;
  `TableCell` carries `numeric?: boolean`; `TableRow` carries
  `rowId?: string`.

  **`onSortChange` and `onSelectionChange` are optional in the type**, not
  conditionally required. A discriminated union — `{ sortable: true;
  onSortChange: … } | { sortable?: false }` — expresses the real contract but
  does not survive docgen's flat prop extraction, so the manifest would lose
  the props entirely for the very agent this arc exists to serve. Flat and
  optional, with a development-mode warning when `sortable` or `selectable`
  is set without its handler, keeps the manifest honest. Dialog's required
  `onClose` (D50) is not a precedent here: Dialog has no `modal?: boolean`
  gating it, so the prop is unconditionally meaningful.

  Two reasons controlled-only is right here rather than merely consistent.
  A real ledger sorts and paginates **server-side**, so sort state must live
  where the fetch lives — an uncontrolled default is convenience that
  evaporates on the first non-local dataset. And `bulk-action-bar` and
  `table-pagination` are separate patterns composed *outside* Table; they can
  only read selection and page state if the consumer holds it.

  **Table does no data work** — no filtering, no row sorting, no pagination
  slicing. It renders what it is given. The ledger screen does that in a
  `useMemo`, which is also the honest shape for server-side data.

  **`numeric` means right-aligned *and* tabular figures.** A column that
  aligns but whose digits jitter between rows defeats the purpose. The second
  half needs a home, and `font-variant-numeric` currently appears nowhere in
  tokens or components. It becomes a scale token,
  `--psi-font-variant-numeric: tabular-nums`, bound by numeric cells and
  exposed to consumer prose through a `.psi-tabular` utility.

  Hardcoding it in `table.module.css` was rejected for the D54/D55 reason:
  per-size geometry lived as literals in CSS Modules and was thereby
  "invisible to manifest, MCP, DTCG, Figma; unreachable by
  `componentOverrides`; ungated by CI". A numeral setting fails the same way.
  A `numeric` entry in `ComboRole` was also rejected — roles select which
  font *family* loads, and numerals are a feature setting, not a family.

- **D63 — `Pagination` is a standalone numbered pager with ellipsis
  truncation.**

  `page`, `pageCount`, `onPageChange`, plus `siblingCount?: number`
  (default `1`) controlling how many pages flank the current one before
  truncation. It renders `<nav>` plus existing `Button`/`IconButton`
  rather than inventing controls, and it is **not** part of the Table
  family — `table-pagination` composes it as a Toolbar sibling of the
  page-size `Select`, so it must stand alone.

  A range-only control (`‹ › 1–25 of 312`) is the better *product* choice
  for an unbounded dataset and is what most finance consoles ship. It was
  rejected because this arc buys *coverage*: the completion criterion is a
  ledger screen with **zero improvisations**, and an agent that wants a
  numbered pager Psi does not have will hand-roll one — landing outside the
  contrast gate, axe, VR and the manifest, which is the exact leak D59 was
  written to close. A `variant` prop covering both was rejected as two
  components wearing one name, against the flat-variant house rule.

  The cost is accepted knowingly: Pagination owns keyboard semantics and
  `aria-current="page"` over a variable-length control, the second-most
  intricate a11y surface in this cycle after sortable headers.

## Applying D60: `Checkbox` promotes `aria-label`

Not a new decision — D60 established the mechanism and the rule. This cycle
is the first consumer to need it for `Checkbox`.

A selectable row's checkbox has **no visible label**. `Checkbox` today names
itself only through `children` (`Checkbox.tsx:34`), which renders visible
text — wrong inside a table cell. The correct accessible name is
`aria-label="Select transaction 2026-08-05 Acme Corp"`. That reaches the
input at runtime through `...rest`, but docgen filters it as a host prop, so
the manifest cannot tell an agent it exists. This is the `IconButton`
situation D60 fixed, in a second component.

`Checkbox` therefore declares `"aria-label"?: string` on its own props
interface — **optional**, unlike `IconButton`'s required form, because a
labelled checkbox remains the common case. Per D60's rule the redeclared type
is assignable to the inherited one, so it declares directly with no `Omit`.

Without this, `selectable` tables fail axe and the manifest cannot describe
the fix — the "AI-native claim leaking" D59 names.

## Tokens

`packages/tokens/src/components/table.ts`, pure indirection in the posture of
`menu.ts` (D53) — it aliases and invents nothing, so a brand retuning the
surface family or the control ramp gets Table for free:

```
bg, border, radius        → var(--psi-surface-*)
row-bg-hover              → var(--psi-fill-neutral3)      (Menu's item recipe)
row-bg-selected           → var(--psi-fill-tint-accent)   (Button/Tag accent-subtle's wash)
cell-border               → var(--psi-border-faint)
header-fg, sort-indicator-fg
{32,40,48}-row-height     → var(--psi-control-{n}-height)
{32,40,48}-cell-padding-x → var(--psi-control-{n}-padding-inline)
```

Every name above was verified against `packages/tokens/dist/*.css`. Two that
an earlier draft invented do **not** exist and are recorded here so the plan
does not reintroduce them: `--psi-fill-accent2` (the accent wash is
`--psi-fill-tint-accent`) and `--psi-control-{n}-padding-inline-text` (the
emitted keys are `padding-inline` and `padding-inline-icon` only). This is
the `--psi-fg-muted` mistake from the D53 plan, caught at spec time instead.

Row height aliasing the D54/D55 control ramp is the point: a 32px row and a
32px Button are the same 32px from one source. `table.module.css` binds only
`--psi-table-*`; the `psi/component-tokens-only` rule makes binding
`--psi-control-*` from a CSS Module a lint error, as it already does for
Button.

Geometry keys carry no `bg`/`fg`/`border` segment, so `keyGroup()` returns
`undefined` and they stay out of `scope-map.json` and both D46 gates.

Plus one scale token: `--psi-font-variant-numeric: tabular-nums`.

## Accessibility

Native semantics carry most of it. What Psi owns:

- **Sortable header** — `aria-sort="ascending|descending|none"` on the `<th>`,
  with a `<button>` inside taking the click and the accessible name.
  `aria-sort` belongs on the `th`, never on the button.
- **Select-all** — header checkbox with `indeterminate` set when the
  selection is partial.
- **Row checkboxes** — named via the promoted `aria-label` above.
- **Sticky header** — `position: sticky`; no ARIA involved.
- **Pagination** — `<nav aria-label="Pagination">`, `aria-current="page"` on
  the active page, and the ellipsis as a non-interactive
  `<span aria-hidden="true">` so it is not announced as a control.

## Pattern revisions

Both patterns are `blocked: true` today; both flip when the components land,
which is this cycle's proof.

- **`data-table.json` — drop the `head` slot.** Required, not optional:
  `patterns.ts:276` throws `unknown slot "head"` the moment `Table` exists
  and stops being a gap. Only `body` yields children (`patterns.ts:414`);
  every other slot renders as a **prop**, so the authored `head` slot meant
  `<Table head={…}>`, which this spec rejects in favour of compound children.
  Body composes the family so the preset emits real JSX.
- **`table-pagination.json` — unblock only.** `<Pagination />` stays bare.
  The validator enforces unknown props, literal-union membership and boolean
  types, but **not** required-prop presence, so a preset remains a sketch
  rather than runnable code.

`row-actions` then composes into the last cell, as `data-table`'s `intent`
already promises.

## Where the app lives

`apps/ledger` — a Vite app mirroring `apps/promo`'s setup, one route, one
transactions screen over a hand-written ~40-row fixture. No routing, no
backend.

It composes `filter-toolbar`, `data-table`, `bulk-action-bar` (on selection),
`table-pagination` and `empty-state`, and imports the token CSS the way a
consumer does — all four files, `utilities.css` included. The screen holds
sort, selection and page state and does its own `useMemo` filtering; that is
what proves D62's controlled-only decision rather than asserting it.

D59 requires a real screen — "each component is then built against a real
ledger screen as its acceptance target, not against Storybook alone" — so a
Storybook-only composition was rejected. A second screen was rejected as
well: `summary-tiles` and `empty-state` are already unblocked and need no new
component, so it would buy coverage this cycle is not claiming.

## Testing

| Layer | Coverage |
|---|---|
| Unit | sort emission; select-all indeterminate math; ellipsis truncation at page counts 1/2/7/13/100; `rowId` selection identity |
| a11y | axe on a selectable + sortable table — the gate that catches the `Checkbox` naming gap |
| Pattern | `validatePatterns` passes with both patterns unblocked; presets render |
| VR | Table at 32/40/48, sorted, selected, sticky, empty; Pagination at 1/7/100 pages |
| Contrast | a **new** `wcagAAPairs` entry, `fgPrimary` on `fillTintAccent`, in all three themes |

The contrast pair is genuinely new. `contrast-matrix.ts` already checks
`fgAccent` on `fillTintAccent`, but a selected row renders the row's ordinary
**primary** text over that wash, and no pair covers that combination today.
The matrix composites alpha correctly (`compositeHex`), so the tint is
evaluated properly once the pair is added — and the token build throws if it
fails, which is the gate doing its job rather than a risk to manage.

## Gates

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint
```

`check-docs-drift` **will** fail on the first run: the manifest goes 18 → 25
(Table plus five family members, plus Pagination) while `llms.txt`, the
package READMEs and the promo site still state 18. That is expected and gets
its own plan task rather than being discovered at the end. It has bitten on
D53 and again on #69.

CI's full order is `build → check-docs-drift → test → vr → lint`; only `vr`
cannot run locally.

## Risks

1. **Table overruns.** The arc spec predicted it. The seam is pre-agreed:
   Pagination splits to its own cycle and the ledger screen ships without it.
2. **VR baselines are Linux-only.** New stories fail on macOS by design;
   baselines come from CI's `vr-baselines` artifact, which also carries
   orphaned PNGs for deleted stories that must be removed by hand.
3. **A new workspace app can hide packaging bugs**, since workspace linking
   is not the real consumption path. Cycle 6's external consumer run is the
   test for that; this cycle does not claim to be.

## Out of scope

- Column resizing, reordering, virtualisation, and inline-editable cells.
- Row grouping, expandable rows, and frozen columns.
- Server-side data fetching of any kind — the fixture is static.
- Charts, which are a **permanent** non-goal of the arc.
- Editorial and motion polish, deferred to cycle 7 over a frozen set.
