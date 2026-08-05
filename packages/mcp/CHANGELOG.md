# @handamade/psi-mcp

## 0.9.0

### Minor Changes

- 1b7cf8d: The served catalog grows to 13 patterns, and the search overview no longer drops components (D59–D60)

  The index this server bakes at publish now carries **13 composition
  patterns**, five of which declare a component gap — `Table`, `Pagination`,
  `Drawer`, `Toast`, `Tabs`. Consuming agents can read the design system's
  own backlog for the first time, rather than inferring it.

  That growth exposed a bug here. `search("")` fills its response by kind —
  topics, then patterns, then as many components as the 6000-character budget
  affords — so nine new patterns pushed the component tail off the end, down
  from more than five to three. Pattern summaries are now trimmed in the
  overview projection only, and always retain their `blocked (gaps: …)`
  suffix, so the backlog survives the trim. The stored summaries that feed
  keyword ranking are untouched: search results and result ordering are
  unchanged. The overview now carries all 13 topics, all 13 patterns and 6
  components.

  The served manifest also reflects two prop changes in `psi-react`:
  `IconButton.aria-label` is now a required, discoverable prop, and
  `Input.type` is a curated union. See the `psi-react` entry for the
  consumer-facing impact of those.

## 0.8.1

Version bump only — no change to this package. `@handamade/psi-*` are released
in lockstep at one version number, so a fix in any one of them bumps all three.
The 0.8.1 fix is in `@handamade/psi-react` (Menu dismissal correctness, D58).

## 0.8.0

### Minor Changes

- 44d7112: D53 — Menu, the overlay tier. `Menu` + `MenuItem` + `MenuSeparator` on the
  native Popover API: `popover="auto"` supplies the top layer and light dismiss;
  Psi supplies roving-tabindex keyboard navigation with typeahead, focus
  return, and dismissal reasons via `onClose("esc" | "outside" | "item-select")`.
  Controlled-only, like Dialog (D50): Esc and item activation only _report_ a
  dismissal — the popover stays open until the consumer flips `open`. Light
  dismiss (an outside click) is the one asymmetry, forced by the platform: the
  browser hides the popover itself before Menu can intervene, so `open` must
  still be flipped to keep React's state in sync. Zero new dependencies.

  Placement is CSS anchor positioning above the anchor floor (Chrome 125+ /
  Firefox 132+ / Safari 18.2+) and a `CSS.supports`-gated JS branch below it — a
  top-layer element's containing block is the viewport, so the fallback cannot be
  declarative. No collision flip below the anchor floor. Psi's documented browser
  floor is unchanged.

  New `--psi-menu-*` token family, pure indirection onto the D51 surface family,
  so brands retuning `--psi-surface-*` get Menu for free. New `row-actions`
  pattern takes the pattern index to four, all unblocked.

## 0.7.2

### Patch Changes

- Rebuild the served index against tokens/react 0.7.2. `psi-mcp` bakes its
  search index at build time from `packages/react/dist/manifest.json` and
  `packages/tokens/dist/*` (`index-builder.ts`), so the published artifact goes
  stale whenever either upstream package changes — the D46 follow-up moved
  `accent-color` into the `surface` property group, which flows into the
  resolved-token scopes the index serves. No source change; this keeps the three
  packages on the lockstep the 0.7.1 release established.
- Declare the MIT license. All three packages were published with no `license`
  field, which npm reads as all-rights-reserved — the packages were installable
  but not legally reusable, contradicting the open-core intent. Adds
  `"license": "MIT"` to each package and an MIT `LICENSE` at the repo root
  (a copy also sits in each package directory — npm only auto-includes a LICENSE
  from the package's own folder, not the monorepo root).

## 0.7.1

### Patch Changes

- 131f15a: Generated docs stop fabricating API surface (HAN-41): the Theming section now claims `--psi-<component>-*` overrides only when the token family exists, and derived hover/active states only when the family has `-hover` tokens — Toolbar's docs state it has no component tokens instead of inventing them. Tag now lists `children` in the manifest like the other content-bearing leaves.

## 0.7.0

### Minor Changes

- e8ad93c: D51: shared `--psi-surface-*` elevated-surface token family + `Panel` component. Dialog's panel rebinds to the family (zero visual change). Scope gate now follows cross-family component-token refs.
- 4371c74: D52: `Toolbar` — JS-free wrapping row for filter/search controls (`gap` 8|12|16, `role="group"` when labeled). Flips the `filter-toolbar` pattern from blocked to live; its preset now renders.

### Patch Changes

- 2c3bfb9: Manifest now lists the `placeholder` passthrough (HAN-22); `./patterns.json` added to the exports map for parity with `./manifest.json` (HAN-24).

## 0.6.0

### Minor Changes

- 83f2a5e: D47/D48 patterns + contract validator: composition recipes with clarifying parameters in `patterns/*.json` (seeds: settings-form-row, destructive-confirm, filter-toolbar), validated in `pnpm build` by the single contract validator (all D48 error classes throw; `gaps` print as the machine-readable backlog); generated `dist/patterns.json` carries gap-annotated recipes and deterministic preset JSX. psi-mcp: pattern intents join `search`, `get pattern:<id>` returns full recipes (no new tools, D43); `init` AGENTS.md gains the pattern-first composition rule. Field declares D45 slot contracts (label/body/description). Seeds are validated against the real manifest (Switch's parameterless reality, Tag's onDismiss).

## 0.5.0

### Minor Changes

- b30e35c: New `Dialog` component (D50): modal on the native `<dialog>` top layer —
  controlled `open`/`onClose(reason)`, title/footer slots, width 400|560|720,
  dismissible gate over Esc/backdrop/close-button. First D45 slot contracts:
  `manifest.json` component entries now carry `slots` (authored for Dialog,
  explicit `[]` elsewhere), validated at build. New `--psi-dialog-*` tokens.
  The psi-mcp index passes slot contracts through (`get component:Dialog` returns them).

## 0.4.1

### Patch Changes

- 2b54f64: Agent-surface gap fixes from the HAN-8/HAN-17 verification sessions (HAN-16):

  - **psi-react**: every component now carries a one-line description (TSDoc →
    manifest.json → MCP briefs); NavBar styles raw anchors in its brand/nav-link
    slots (previously browser-default blue); `"./styles.css"` exports alias so
    TypeScript can type the side-effect import without `declare module`.
  - **psi-tokens**: NavBar gains `link-fg`, `link-fg-hover`, `focus-ring`
    component tokens.
  - **psi-mcp**: `getting-started` (topic + init-generated AGENTS.md) now lists
    the required `@handamade/psi-react/styles` import — omitting it renders
    every component unstyled; new `topic:themes` (theme list, data-psi-theme
    mechanics, customer themes) and `topic:scales` (space/size/radius/motion/
    layout values), both searchable — `search "space"` no longer returns empty.

## 0.4.0

### Minor Changes

- cd77458: D43/D44 — agent access. New package `@handamade/psi-mcp`: an MCP server (stdio via
  `npx @handamade/psi-mcp`, hosted Streamable HTTP at https://psi.kurkin.de/mcp) with two
  read-only tools — `search` (briefs over components/tokens/guidance) and `get` (full props,
  token formulas with resolved values in all four themes, topics) — answering from an index
  baked at publish from the generated artifacts. `npx @handamade/psi-mcp init [--claude]`
  generates a marker-delimited agent guide (AGENTS.md/CLAUDE.md) from the same index.
  tokens/react bump in lockstep; no API changes in either.
