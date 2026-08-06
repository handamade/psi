# Tabs — ledger arc cycle 5 (D67)

Date: 2026-08-06. Status: **Draft** — cycle 5 of the ledger coverage arc, and
the one that empties the backlog.

Provenance: the 2026-08-05 arc spec (D59) made the component backlog derived
from what the authored patterns declare. Four of the five predicted components
have shipped — Table and Pagination (D62–D63), Toast (D64–D65) — and D66 found
that the fifth, Drawer, was a `Dialog` placement rather than a component at
all. `tabbed-workspace` → `Tabs` is the only gap left in `patterns.json`.

The arc spec put Tabs last on purpose: "smallest, least blocking." That
ordering held — nothing in cycles 2–4 was waiting on it.

## Decisions

- **D67 — `Tabs` is a compound family of four, controlled-only, with roving
  tabindex and automatic activation.**

  `Tabs`, `TabList`, `Tab`, `TabPanel` ship together in
  `packages/react/src/Tabs/`, one `slots.json` and one CSS module, following
  the `Menu` (D53) and `Table` (D62) precedents. Manifest goes **28 → 32**.

  ```tsx
  <Tabs value={view} onValueChange={setView} orientation="horizontal">
    <TabList aria-label="Accounts">
      <Tab value="all">All</Tab>
      <Tab value="checking">Checking</Tab>
      <Tab value="archived" disabled>Archived</Tab>
    </TabList>
    <TabPanel value="all">…</TabPanel>
    <TabPanel value="checking">…</TabPanel>
  </Tabs>
  ```

  Controlled-only, per D50/D53/D62: `Tabs` holds no selection state. `value`
  and `onValueChange` are required, there is no `defaultValue`, and no
  uncontrolled escape hatch.

  **Values are strings, not indices.** An index breaks the moment a tab is
  inserted, and the ledger's tabs map to account ids. `Tab` and `TabPanel` pair
  by `value`, so their source order need not match — though the pattern tells
  authors to keep it matching for readability.

  **Automatic activation, and only automatic.** Arrow keys move focus *and*
  selection together, which is the APG default where panel content is already
  available. Manual activation (arrows move focus, Enter/Space selects) is
  deliberately **not** offered as a mode: it is the right behaviour only when
  activating a panel is expensive, and a consumer in that position controls
  what the panel renders anyway. One activation model means one keyboard code
  path and one set of tests. Reversible by a numbered decision if a real case
  appears.

  **Every panel renders; unselected ones get `hidden`.** The alternative —
  returning `null` for unselected panels — leaves `aria-controls` on every
  unselected tab pointing at an element that does not exist, and throws away
  DOM state (a half-filled form in a panel loses its values on every tab
  switch). The cost is a heavier DOM when panels are large, and the answer to
  that is the consumer rendering less inside the panel, not the component
  unmounting it behind their back.

## Keyboard

Per the APG tabs pattern, with orientation deciding the axis:

| Keys | Behaviour |
|---|---|
| `Left`/`Right` (horizontal) or `Up`/`Down` (vertical) | Move to the previous/next enabled tab, wrapping at both ends; selection follows |
| `Home` / `End` | First / last enabled tab |
| `Tab` | Leaves the tab list entirely and lands on the active panel — the roving tabindex means the list is one stop, not one per tab |

Disabled tabs are skipped by arrow navigation and are not selectable. They use
`aria-disabled` rather than the `disabled` attribute, so they stay discoverable
to assistive tech — the same choice `MenuItem` made in D53.

**A second keyboard hook, deliberately not a shared one.** `useTabsKeyboard`
lives beside `useMenuKeyboard` rather than being abstracted with it. They
overlap on "roving tabindex with wrap and Home/End" and diverge on everything
else: Menu is vertical-only, adds character typeahead, handles Esc, and returns
focus to a trigger; Tabs is bi-axial, has no typeahead, no Esc, no trigger, and
moves selection as it moves focus. A shared hook would take an options object
with more branches than either caller uses. Recorded so the duplication reads
as a decision rather than an oversight.

This makes Tabs the second component with keyboard-navigation JS, after Menu.
D52's refusal of `role="toolbar"` was specifically to avoid that cost where the
semantics did not require it; `role="tablist"` genuinely does require it, so
this is not a reversal of D52.

## Tokens

`packages/tokens/src/components/tabs.ts` → `--psi-tabs-*`, registered in
`build.ts`'s `componentVars` registry.

| Key | Binds |
|---|---|
| `fg` | `--psi-fg-secondary` |
| `fg-selected` | `--psi-fg-accent` |
| `fg-disabled` | `--psi-fg-quaternary` |
| `bg-hover` | `--psi-fill-neutral3` — Menu's item recipe |
| `indicator` | `--psi-fill-accent` |
| `list-border` | `--psi-border-faint` |
| `focus-ring` | `--psi-border-focus` |
| `32-height`, `40-height` | `--psi-control-{n}-height` |
| `32-padding-x`, `40-padding-x` | `--psi-control-{n}-padding-inline` |

**No new contrast pairs.** `fgAccent` and `fgSecondary` on `bgPrimary` are
already in `wcagAAPairs`, and the geometry keys carry no `bg`/`fg`/`border`
segment so `keyGroup()` returns undefined and they stay out of both D46 gates —
the same shape `table.ts` established.

`fg-disabled` binds `--psi-fg-quaternary`, matching Menu's
`item-fg-disabled`. Note this is deliberately *not* contrast-gated: disabled
text is exempt from WCAG 1.4.3, and gating it would force a contrast that
defeats the affordance.

## Accessibility

- `TabList` renders `role="tablist"` with `aria-orientation`, and **requires an
  accessible name** — `aria-label` is promoted onto its own props interface
  per D60, so the manifest tells the truth about it rather than hiding it as a
  DOM passthrough.
- `Tab` renders `role="tab"` with `aria-selected`, `aria-controls` pointing at
  its panel, and `tabIndex` 0 only when selected.
- `TabPanel` renders `role="tabpanel"` with `aria-labelledby` pointing back at
  its tab, and `tabIndex={0}` so the panel itself is a tab stop — without it a
  panel whose content has no focusable element is unreachable by keyboard.
- Ids are generated with `useId` and shared through context, so `aria-controls`
  and `aria-labelledby` resolve without the consumer wiring anything.

## Pattern revisions

`tabbed-workspace.json` loses its `gaps` entry. **That empties the backlog** —
every pattern in `patterns.json` will compose only components that exist, which
is the condition the arc was driving at.

Its `orientation` parameter already matches the prop, so no rewrite is needed
beyond the gap.

Pattern count stays **13**; component count moves **28 → 32**, so
`check-docs-drift` will fail until the four count files and README's enumerated
list are updated.

## Where the app lives

`apps/ledger` — the transactions screen gains a tab set above the toolbar
switching between saved views (All / Uncategorised / This month), each applying
a different filter to the same table. That is the acceptance target per D59:
built against a real screen, not Storybook alone.

## Testing

- Unit: value pairing; `aria-selected` / `aria-controls` / `aria-labelledby`
  wiring; roving tabindex (exactly one tab with `tabIndex` 0); arrow keys per
  orientation with wrap; Home/End; disabled skipped and not selectable;
  `onValueChange` fires with the new value and Tabs does not self-select;
  unselected panels are `hidden` but present.
- Axe: horizontal, vertical, and a disabled-tab case.
- VR: stories per orientation, a disabled case, and a many-tabs overflow case.
- Playwright: focus actually moves with the arrow keys in a real browser, which
  jsdom's focus model approximates rather than reproduces.

## Gates

All four, in order:

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint
```

`vr` is CI-only. New stories mean new baselines — use the route cycle 4
established and `vr/README.md` now documents: run `--update-snapshots=none`
first, read the **failure count** rather than the tail, expect the 16 known
token-specimen divergences, then `--update-snapshots=missing` and confirm
`git status` shows only additions.

A changeset is required: `minor`.

## Out of scope

- **Manual activation mode** — see D67 above.
- **Closable / reorderable tabs** — that is a document-tab UI, a different
  component with drag and overflow semantics of its own.
- **Overflow scrolling or a "more" menu** — the ledger's tab sets are short.
  A tab list that overflows wraps; a priority-plus collapse is its own
  decision, and the surface-cycle spec already deferred that for Toolbar.
- **Lazy panel mounting** — see the `hidden` decision above.
- **Nested tab sets.**
