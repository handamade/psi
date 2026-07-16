# Hardening cycle — nets & honest anchors

_Spec date: 2026-07-16 · Status: Approved (design), implementation pending_
_Origin: 2026-07-16 re-inspection (78/100) — `ds-inspection/reports/2026-07-16-inspection.md` and its work order. Companion decisions made interactively with real computed samples._

## Goal

Close the verification gaps the inspections surfaced, before any new component surface is built: automated accessibility checks, a visual-regression net, honest (in-gamut) palette anchors with the diagnostic promoted to a gate, and the AI-context residuals from two generation-test runs. Deliberately **no new components** — the Field → Dialog → Toast cycle follows separately, landing on a fully netted system.

## Non-goals

- New components or component APIs (next cycle)
- Measure/width tokens (deferred: real consumers are Field/Dialog next cycle; until then content widths are app-level — documented, not tokenized)
- Nested-subtree brand fonts (stays a documented limitation in `guidance.fonts.scope`; no consumer nests brand themes today)
- MCP server (D25 — unchanged)
- Any visual change to shipped themes (WS3 is a visual no-op by construction, and WS2 proves it)

## Decisions

- **D39 — In-gamut anchors, gated.** Palette/theme anchors must resolve inside sRGB. The anchors behind all 33 current warnings (~10 unique anchors; `fillTint*` entries derive from the same sources) are retuned to their in-gamut equivalents — the exact values the clamp already renders, so shipped colors do not change. Once clean, the D19 gamut diagnostic is promoted from warning to build failure: a future out-of-gamut anchor fails CI. Rationale for the flagship case: light `fgWarning` stays olive `#7e5400` (5.77:1) — a dark saturated yellow does not exist in sRGB; raising L to 0.52 leaves only 0.4 of AA headroom, and shifting hue to h60 reads as a sibling of danger red. The vivid amber warning identity lives in fills (`#e79d00`), which are unaffected. Decided from rendered samples on the real light background.
- **D40 — Tags are exempt from "one accent per visual group."** The rule governs interactive emphasis (buttons/CTAs). Passive labels don't consume the accent budget. Guidance: prefer `*-subtle` variants for badges — `accent-subtle` for highlight/plan badges, `neutral-subtle` for meta, `success`/`warning`/`danger` reserved for status. Encoded in both `packages/react/llms.txt` and `guidance.ts` (→ `guidance.json`).
- **D41 — Visual regression via Playwright in CI, no external service.** Snapshots of the built Storybook: component stories in light + ember, token-docs pages in all four themes. Baselines are linux-rendered and committed; refreshes flow through CI artifacts. Chromatic rejected to keep the system free of external services and accounts.

## Workstreams

### WS1 — Accessibility verification

- **axe:** every component gets an axe pass in the vitest suite (axe-core against rendered output, per variant where variants change semantics). jsdom cannot run the color-contrast rule — acceptable: contrast is already gated at token build. The axe pass covers ARIA validity, roles, names, structure.
- **Keyboard:** extend behavior assertions to Select, Checkbox, Switch, Input (focus visibility, Space/Enter activation, label association) via user-event, in the style of the existing Tooltip/Button keyboard tests.
- **Keyboard maps in docs, generated:** a single `a11y` metadata map in `packages/react/src` (component → keyboard interactions + screen-reader notes) rendered by `emit-docs.ts` into each component doc page and consumable from the machine trail. One source; docs stay generated. Tooltip's Escape/hover-delay behavior (WCAG 1.4.13, already tested) becomes documented for the first time.

### WS2 — Visual regression

- CI job step: build Storybook static, serve, Playwright iterates the story index and snapshots per D41's matrix. Near-zero diff threshold.
- Committed baseline images in Playwright's default snapshot layout (adjacent `*-snapshots/` directories under the VR test home in `apps/storybook`); a documented refresh path via CI artifact download.
- Ordering note: WS2 must land **before** WS3 merges, so the retune's zero-diff claim is machine-checked.

### WS3 — Gamut retune + gate

- For each warned token: replace the authored anchor (l/c/h) with its in-gamut equivalent as computed by the existing clamp path, so `gamutWarnings()` returns pre == post (ΔE 0). Shipped hex values are unchanged; existing hex-asserting tests stay green untouched — that's part of the proof.
- Then flip the build: any `GAMUT WARNING` becomes a thrown error (same pattern as the contrast gate). CI enforces it forever.
- D39 recorded in this spec's decision log; the warning-hue rationale travels with it.

### WS4 — AI context closure

Extend `packages/react/llms.txt` Compositions (and `guidance.ts` where noted) with the five residuals from the 2026-07-16 generation re-test:

1. **Programmatic theming:** the standard setup is `data-ds-theme` on `<html>`; a JS consumer sets it via `document.documentElement` (effect/init code). State explicitly: **theme CSS does not paint `body`** [verified: no `body` rule in base/ember CSS] — consumers paint `background: var(--ds-bg-primary)` at their app root.
2. **Field spacing numbers:** label→control `ds-gap-6`, field→field `ds-gap-24`, toggle groups `ds-gap-12`, button rows `ds-gap-8`. (These become the Field component's defaults next cycle.)
3. **Tag/badge rule:** D40 text, in llms.txt + guidance.json.
4. **CSS import order:** all DS stylesheets are order-independent thanks to the explicit `@layer` order statement (WS5); recommended listing stays base → theme → components → utilities for readability.
5. **Widths:** "content widths are app-level; the system tokenizes the page container only (see non-goals — component width tokens arrive with Field/Dialog)."

Plus: **the generation eval moves into the repo** at `tools/generation-eval/` — the exact prompt (entry point restriction: llms.txt trail only, no component source), the task definition, and a grading rubric (invented props? on-system tokens? guesses logged?). Results log under `tools/generation-eval/runs/`. Run cadence: after any recipe/doc change and before promoting a new component's docs.

### WS5 — Small ledger

- Emit an explicit `@layer ds.base, ds.theme, ds.components, ds.utilities;` order statement (single declaration, early) so import order genuinely cannot matter — closes the standing ledger item and makes WS4's import-order claim true by construction.
- `scripts/new-theme.ts`: accept flags before positional args.
- `emit-dtcg`: de-duplicate easing definitions.

## Testing & verification

- Full existing gates stay green throughout (contrast, drift, 249 tests, lint).
- New gates added by this cycle: axe (WS1), VR snapshots (WS2), gamut-clean build (WS3).
- Cycle exit: third generation-eval run reports **zero guesses** on the five WS4 topics; `pnpm build` emits zero gamut warnings and would fail if it didn't; VR job green with committed baselines.
- Projection to verify at next inspection (2026-10-15): Stations 3 and 5 ≥ 8.

## Sequencing

WS5 (@layer) → WS4 docs (claims depend on it) → WS1 (independent) → WS2 → WS3 (needs WS2's net) → generation-eval run → cycle exit checks. WS1 can run in parallel with WS2.

## Out-of-repo reminders (not in this cycle's PRs)

- Cloudflare `sociatum-ds` detach — Dmytro's dashboard
- Figma file URL into `ds-inspection/GARAGE.md` — unlocks design-side stations at the next inspection
