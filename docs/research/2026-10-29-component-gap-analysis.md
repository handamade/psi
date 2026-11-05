# Component gap analysis: Psi vs. popular design systems

_2026-10-29 · branch `docs/component-gap-analysis` · follows `ds-inspection/reports/2026-10-28-inspection.md` (Station 1, work-order "Access upgrades": "Station 1's benchmark is still recollection")_

This is research, not a decision: it claims no D-number. Anything worth building goes through spec → plan → D-number as usual.

## Method and limits

- **Psi side:** `packages/react/dist/manifest.json` (52 components, 33 families) and `patterns.json` (24 patterns). Read from disk at `main` `ef26485`; same data the hosted MCP serves.
- **Benchmark side:** the `design-systems` knowledge MCP (designsystems.surf catalog entries). Each entry carries a **component roster** per system. I tallied 14 systems: Uber Base, Alaska Auro, eBay Evo, UAE DLS, MongoDB LeafyGreen, Esri Calcite, IBM Carbon, GitLab Pajamas, Microsoft Fluent 2, Google Material, Razorpay Blade, Monday Vibe, Pinterest Gestalt, Kiwi Orbit. Four more (Spectrum, Paste, Salesforce, PatternFly) were dropped because the catalog snippet cut off mid-list.
- **What the rosters are not:** they list component *names*, not APIs. So this document is solid on **which components exist**, and thin on **which variants exist**. Variant findings below are tagged `[verified]` (Psi manifest) or `[recollection]` (benchmark side, not retrievable from the MCP).
- **Naming merges:** "Modal" and "Dialog" are one component; "Menus" and "Dropdown" overlap; "Badges" is read as status/count indicator. Counts are out of 14 and are lower bounds where a roster looked short.
- **Tally:** counts were computed with a throwaway script over the rosters as the MCP returned them (not committed). Re-derive by querying `search_chunks` for each system's "Components:" roster.

## Where Psi already meets the floor

Present in Psi and in ≥ 8 of 14 benchmark systems: Button (14), Checkbox (14), Radio (14), Switch (13), Tabs (13), Text field → Input (13), Alert banner → Banner/InlineAlert (12), Cards (11), Data table → Table + `data-table` pattern (11), Select (10), Snackbar → Toast (10), Tooltip (10), Modal/Dialog (10), Pagination (8), Menus (8), Text area (8), Icon (8).

Also covered by a pattern rather than a component: Empty state (4/14 → `empty-state`), Drawer (7/14 → `detail-drawer`), Action bar (2 → `bulk-action-bar`), Filter input (3 → `filter-toolbar`), Date range (→ `date-range-filter`, built on native `<input type="date">`).

Psi has components the benchmark rosters do not list: Skeleton, DescriptionList, AspectRatio, SkipLink, Announcement, CursorPagination, Stack, Text, Toolbar, CopyButton. These are product-driven, not gaps.

## Gap table: in the benchmark, absent in Psi

| Rank | Component | Systems (of 14) | Psi today | Gap |
|---:|:--|:-:|:--|:--|
| 1 | **Link** | 12 | `Button href` only; no text link | Missing |
| 2 | **Accordion / Disclosure** | 12 | none | Missing (deferred, D98/D99 Tier-2) |
| 3 | **Popover** | 12 | Menu uses the Popover API internally; Tooltip is hover-only; no general popover | Missing as a public component |
| 4 | **Badge** (count / dot indicator) | 12 | `Tag` covers status labels | Partial: no count/dot-on-icon |
| 5 | **Date picker** | 11 | native `<input type="date">` + `date-range-filter` | Missing (native only) |
| 6 | **Progress indicator** (spinner) | 11 | `Skeleton` only | Missing |
| 7 | **Progress bar** | 10 | none | Missing (deferred, D98/D99 Tier-2) |
| 8 | **Avatar** | 10 | none | Missing |
| 9 | **Breadcrumb** | 9 | none | Missing |
| 10 | **Segmented control** | 9 | `Tabs` / `Toolbar` approximate it | Missing |
| 11 | **Chip** | 8 | `Tag` + `onDismiss` covers dismissible | Partial: no selectable / filter chip |
| 12 | **Combobox** | 8 | `Select` is a native-`<select>` wrapper | Missing |
| 13 | **Divider** | 8 | `MenuSeparator` only | Missing as a general component |
| 14 | **Slider** | 8 | none | Missing |
| 15 | **List** | 6 | `DescriptionList` only | Missing (generic list) |
| 16 | Search | 5 | `filter-toolbar` pattern | Pattern-covered |
| 17 | Page header | 4 | none (AppShell/NavBar are frames) | Missing |
| 18 | Tree view | 3 | `NavTree` is navigation-specific | Partial |
| 19 | Button group | 3 | `Toolbar` | Partial |

Out of scope by doctrine, not gaps: **Bottom sheet** (4), **App bar / Navigation bar** (3 each): AppShell is a desktop frame by design. **Sidebar** (4) is `AppShell` + `NavTree`. **Charts** are D59.

**Reading the table.** Every component ranked 1–10 is shipped by at least 9 of the 14 systems, and Psi has none of them as a first-class component (Badge is the partial exception, via `Tag`).

## Variant and prop gaps on components Psi already has

These are the places a consumer coming from another system would reach for a prop and not find it.

| Component | Gap | Evidence |
|:--|:--|:--|
| Button, IconButton | No `loading` state, no leading/trailing icon slot, no full-width option | `[verified]` manifest props: `variant, size, type, href, target, rel` |
| Input | No prefix/suffix adornment, no clear or password-reveal affordance | `[verified]` manifest props: `type, size, error, placeholder` |
| Select | Native `<select>` only: no multi-select, no searchable | `[verified]` manifest props: `children, size, error` |
| Tag | No selectable / filter-chip state (`subtle` boolean also diverges from Button's `*-subtle`, already in the inspection) | `[verified]` manifest |
| Card | Two variants (`stacked`, `featured`) and `hoverLift`; no selected or interactive state | `[verified]` manifest |
| Table | Sort and selection exist; no expandable rows | `[verified]` manifest; expandable rows `[recollection]` as common elsewhere |
| Menu | `MenuItem` variants `neutral` / `danger`; no checkbox/radio items or submenus in the manifest | `[verified]` manifest |
| Progress / loading | `Skeleton` is the only loading affordance; nothing for an in-flight action or determinate progress | `[verified]` manifest |

Where Psi is *ahead* on variants: Button's 8 flat variants (including `outline` and three `*-subtle`) exceed the primary/secondary/text trio the benchmark's Button guidance describes, and Dialog ships `width` (400/560/720), `placement` and `initialFocus`.

## Recommended order

Ranked by benchmark frequency, then by how much each unblocks:

1. **Popover** — foundation for Combobox, Date picker and a richer Tooltip; Psi already has the Popover API plumbing in Menu.
2. **Link** — the most common gap per effort; one component, no new primitives.
3. **Progress** (spinner + bar) — pairs with Button `loading`; ProgressBar is already named in D98/D99.
4. **Button `loading` + icon slots** — a prop-level fix on the highest-traffic component.
5. **Avatar, Divider, Breadcrumb** — small, static, high-frequency.
6. **Disclosure/Accordion** — already scoped in D98/D99; ship with the portal's next ask.
7. **Segmented control, Combobox, Date picker, Slider** — larger; each needs its own spec.

This conflicts with one stated deviation: *"Component breadth is product-driven (portal handoffs), not benchmark-driven."* The order above is benchmark-driven. Before any of it becomes a spec, read `~/Projects/dku/psi-handoffs/` and reorder by what the portal actually asked for. Benchmark frequency measures what is common; it does not measure what the portal needs.

## Not checked

- The 4 systems with truncated rosters, and systems outside the catalog (Radix, shadcn, Mantine, Chakra, Ant, MUI, Base UI).
- Per-component API shape in other systems. The knowledge MCP is a catalog of links and summaries, not a prop database.
- `psi-handoffs/` (the actual demand signal).
- Hosted Psi MCP over JSON-RPC; the local manifest was used instead, and the inspection verified the two agree at 0.27.0.
