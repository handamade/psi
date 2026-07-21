# Surface cycle — Panel, Toolbar, surface tokens (D51–D52)

Date: 2026-07-21. Status: **Draft** — targets 0.7.0.

Provenance: HAN-19 (elevated surface panel) and HAN-23 (Toolbar, the
`filter-toolbar` pattern's declared gap), plus the two small rides-along
fixes HAN-22 and HAN-24. Kicked off after the 2026-07-21 Mode-3 re-inspection
(87/100, all stations green).

The evidence for the surface family is convergent use: Dialog's panel (D50)
and the promo site's hand-rolled `.card` (`apps/promo/src/promo.css` ~line
363) independently arrived at the same recipe — `--psi-bg-secondary` +
`--psi-border-faint` hairline + `--psi-radius-12` + `--psi-space-24` padding —
while the DS `Card` is deliberately a different thing (transparent-on-canvas,
`radius-8`, media-slot oriented). Two consumers converging on a recipe the
system doesn't offer is the definition of a missing primitive.

## Decisions

- **D51 — Elevated surface is a token family plus a `Panel` primitive; Card
  stays untouched.** A new component-token source
  `packages/tokens/src/components/surface.ts` declares the family:
  `bg: var(--psi-bg-secondary)`, `border: var(--psi-border-faint)`,
  `radius: var(--psi-radius-12)`, `padding: var(--psi-space-24)`, with D46
  scopes matching the suffix convention. Dialog's panel rebinds to it
  (`dialog.ts` `bg`/`border` → `var(--psi-surface-bg)` /
  `var(--psi-surface-border)`; the panel radius in `dialog.module.css` moves
  onto `var(--psi-surface-radius)`) — zero rendered change by construction,
  proven by the absolute-pixel VR baselines (the exact class of change the
  HAN-20 switch made visible). A new `Panel` component
  (`packages/react/src/Panel/`, Card's file layout: component, module.css,
  stories, tests, `slots.json`, `a11y-meta.ts` entry) binds only
  `--psi-surface-*`:

  ```tsx
  interface PanelProps extends HTMLAttributes<HTMLDivElement> {
    /** Inner padding in px. @default 24 */
    padding?: 16 | 24;
    ref?: Ref<HTMLDivElement>;
  }
  ```

  `padding={16}` binds `--psi-space-16`. D45 contract: single `body` slot,
  `accepts: {}`, cardinality `1..*`. Deliberately no title/footer slots, no
  `hoverLift`, no variants — Card keeps its transparent-on-canvas identity,
  Panel is the elevated surface, and slots can be added later without
  breaking. The rejected alternatives from HAN-19: a Card `surface` variant
  (muddies Card's identity and clashes radius-8 vs radius-12) and a
  token-family-only ship (leaves the recipe invisible to the manifest/MCP —
  wrong trade for an agent-first system).

- **D52 — Toolbar is a JS-free wrapping flex row; ARIA `role="toolbar"` is
  deliberately not used.** `packages/react/src/Toolbar/`:

  ```tsx
  interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
    /** Gap between controls in px. @default 8 */
    gap?: 8 | 12 | 16;
    ref?: Ref<HTMLDivElement>;
  }
  ```

  Flex row, `align-items: center`, `flex-wrap: wrap`, gap from the
  pixel-true scale. Overflow behavior is wrap (chosen in brainstorm over
  horizontal scroll and priority-plus collapse; both remain possible later as
  opt-in props without breaking API — collapse would additionally need a Menu
  primitive Psi doesn't have). The ARIA `toolbar` role contracts arrow-key
  roving-tabindex navigation, which is wrong for a row of form controls
  (Input, Select, Tag) and would demand JS; instead, when `aria-label` is
  passed the component renders `role="group"`, otherwise a plain `div`. D45
  contract: `body` slot, `accepts: {}`, cardinality `0..*`. Landing Toolbar
  flips `filter-toolbar`'s `gaps: ["Toolbar"]` / `blocked: true` in
  `patterns.json`; the D48 validator and preset rendering pick it up
  automatically — the pattern index turning live is the acceptance test.

## Rides-along fixes (no decision numbers)

- **HAN-22** — add `placeholder` to `WELL_KNOWN_PASSTHROUGHS` in
  `emit-manifest.ts` so Input/Select `placeholder` becomes visible to
  `dist/manifest.json`, the MCP surface, and the D48 pattern validator. Plus
  the audit the issue asks for: sweep components for other real
  native-passthrough APIs invisible to the manifest; include case-by-case,
  documented in the PR.
- **HAN-24** — add `"./patterns.json"` to `packages/react/package.json`
  `exports` (parity with `./manifest.json`), patch changeset.

## Release, consumers, process

- One release: `@handamade/psi-tokens` 0.7.0 (minor — new token family) and
  `@handamade/psi-react` 0.7.0 (minor — Panel, Toolbar; carries HAN-22/24).
  Changesets as usual. Definition of done is the existing CI gate chain:
  token build (contrast + D46 scopes), D48 pattern validator, docs-drift,
  unit + axe tests, Playwright VR (absolute maxDiffPixels), lint.
- **Promo migration + content refresh** (same cycle, after release): promo
  replaces the hand-rolled `.card` with `<Panel>` as its first consumer, and
  homepage content is updated to cover 0.6 patterns and the 0.7 components
  (clears the stale-content symptom from the 07-21 report).
- **Branch protection**: enable on `handamade/psi` `main` requiring the CI
  checks, via `gh api` — process change, no decision number, flagged in two
  inspections running.
- Testing per component: unit + axe, VR stories across the four themes
  (light/dark/acme/ember), docs regen; Dialog rebind covered by existing VR
  baselines staying byte-identical in intent (zero-diff assertion).

## Out of scope

- Toolbar overflow scroll / collapse; Panel title/footer slots (add later,
  non-breaking).
- HAN-18 (portfolio re-vendor) and HAN-21 (consumer-CSS lint coverage) stay
  in the backlog.
- Generation-eval rerun: deferred to backlog by choice this cycle, but noted —
  `patterns.json` changes when `filter-toolbar` unblocks, and the harness's
  own cadence ("after any recipe/doc change") will be due immediately after
  0.7.0 ships.
