# Ledger coverage arc — expressiveness as the completion criterion (D59–D60)

Date: 2026-08-05. Status: **Draft** — opens the coverage arc after 0.8.1.

Provenance: three lines converge on this.

1. **The strategy reframe.** Psi is a tool and credibility asset first;
   licensing revenue is a bonus, not the core idea. The
   2026-07-22 growth doc's anti-goal — "competing on component breadth" —
   was written to protect a *commercial* position against Astryx and
   shadcn. With revenue demoted, that argument no longer binds. What
   survives is only the budgeting fact that components are expensive at
   this quality bar. Breadth is not forbidden; it is costed.

2. **The market-comparison list is nearly spent.** Of the eight prioritized
   improvements in the 2026-07-18 comparison, six have shipped (public npm,
   MCP server, Field/Dialog/Menu, agent-context generation, v0 channel).
   The remaining two — per-brand light+dark pairs and seed-derived
   scaffolding — were justified as the *client demo*. Without a client,
   they fall to nice-to-have and do not lead.

3. **The AI-native axis is saturating.** `tools/generation-eval` reports an
   assessed docs-gap trend of 6 → 5 → 1, and the fifth fix shipped with the
   2026-07-21 run. More documentation polish buys nothing measurable. But
   that eval's task is a settings form — it only ever exercises components
   that already exist. It measures whether an agent uses Psi correctly,
   never whether Psi can express the app.

The gap this arc closes: an agent can only be prevented from going wrong
*inside the vocabulary it has*. At 16 components, an agent building
anything real must improvise — and every improvisation lands outside the
contrast gate, outside axe, outside VR, outside the manifest. That is the
AI-native claim leaking, and coverage is the only patch.

Cycle context: `main` has been idle since 2026-08-01 (0.8.1 published, board
clean, no open PRs or changesets). Decisions D53–D58 were all defensible
craft work on a small set, and none moved a strategic gate — the drift this
spec is written to end. The cause was not working on the wrong things; it
was working on things with no completion criterion.

> **MET, 2026-08-07.** `tools/generation-eval/runs/2026-08-07-b.md` returned
> **zero improvisations**, reported and assessed. The arc closed in seven
> cycles: Table + Pagination, Toast, Drawer-as-a-Dialog-placement (D66), Tabs,
> the eval retarget (D68–D69), DescriptionList + the affordance validator
> (D70–D71), and the packaging work (D72–D75).
>
> Two things about how it closed are worth more than the closing. **The
> component count was an output, exactly as D59 predicted** — 21 at the start,
> 34 at the end, and the number was never once a target. And **the arc's own
> success signal was wrong twice**: cycle 6 opened by reporting an empty
> backlog, which was true and meaningless, because `gaps` inspected only the
> compose tree while two patterns named missing affordances in prose; and the
> D71 validator built to fix that shipped the very bug it was built to catch.
> Both were found by running the eval, not by any gate — which is the case for
> D59's central claim that a measurement beats a checklist.

## Decisions

- **D59 — The coverage arc's completion criterion is expressiveness, not a
  component count.** The target is a transactions/ledger console at
  `apps/ledger`, built entirely from Psi, serving three jobs at once: the
  coverage driver, the generation-eval task, and the Phase 1 proof artifact.

  The arc is **done** when `tools/generation-eval/PROMPT.md`, retargeted at
  a ledger screen, returns a run with **zero improvisations** — no
  hand-rolled table, no `div` impersonating a tab strip, no invented props.
  Whether that takes 21 components or 31 is an output, not a target.
  "30–50 components" is explicitly replaced by this gate: it is the same
  open-ended goal in a different costume, and it invites building
  components because a list says so.

  The backlog is derived, not decided: patterns for the ledger's screens are
  authored first, and the `gaps` arrays they declare (D47, already built and
  currently unused) *are* the component backlog, ordered by frequency.
  Patterns that turn out to need no new component are a success of the
  mechanism, not a wasted step.

  Method: patterns declare the backlog; each component is then built against
  a real ledger screen as its acceptance target, not against Storybook
  alone.

- **D60 — Components may promote specific native props into their manifest
  surface.** `scripts/emit-manifest.ts` currently drops every DOM
  passthrough outside `WELL_KNOWN_PASSTHROUGHS = ["ref", "className",
  "placeholder"]`, so the manifest "reflects each component's own API." The
  rationale is sound for `id` and `style`; it fails where a native prop is
  essential to the component's use:

  | Component | Hidden prop | Consequence |
  |---|---|---|
  | `IconButton` | `aria-label` | The component is unusable without it, and undiscoverable. Blocks the `row-actions` pattern, which documents the limitation in prose. |
  | `Input` | `type` | `<Input type="date">` is invisible, so date filtering reads as a missing component. |

  The fix is **per-component promotion**, not blanket declaration: a
  component opts a native prop in by **declaring it on its own props
  interface**, which lifts it past the `propFilter` in `emit-manifest.ts`
  (the parent file is then the component's own source, not `node_modules`).
  `Menu` already does exactly this with `"aria-label"?: string`
  (`Menu.tsx:53`), so this decision names an existing mechanism rather than
  inventing one — **no build-script change is required**. `IconButton`
  promotes `aria-label` as **required**; `Input` promotes `type` as a
  curated literal union. Blanket declaration is rejected — it floods the
  manifest and defeats the original intent.

  *Not in scope, contrary to an earlier draft of this spec:* `Tag`
  `children`. The 2026-07-21 eval flagged it, but it was fixed in #44 in
  that same cycle — the current manifest lists `children` on `Tag`,
  `Checkbox` and `Switch` alike. Verified against `dist/manifest.json`
  rather than the eval prose.

  The cycle's three promotions ended up in three different shapes —
  `Menu`'s optional `"aria-label"?: string`, `IconButton`'s required
  `"aria-label": string`, and `Input`'s narrowed `type?: InputType` behind
  an `Omit<InputHTMLAttributes<HTMLInputElement>, "type">` — and that
  variance is the mechanism, not an inconsistency to clean up. The rule: if
  the redeclared type is assignable to the inherited native type, declare
  it directly on the component's own props interface, as `Menu` and
  `IconButton` do (narrowing an inherited optional prop to required is
  compatible, since every value that satisfies the required prop also
  satisfies the optional one it replaces). If the redeclared type narrows
  to something the inherited type doesn't accept — `Input`'s curated
  literal union against the native `HTMLInputTypeAttribute` — the inherited
  key has to be `Omit`ted first, or the two declarations conflict and
  TypeScript rejects the interface.

  This is an AI-native correctness fix surfaced by the coverage work rather
  than competing with it: the manifest is the artifact the entire agent
  story rests on, and for icon-only controls it has been omitting the
  accessible-name contract.

## Pattern set and predicted backlog

Three of the four existing patterns are already ledger patterns:
`filter-toolbar` composes directly into the console, `row-actions` was
written for table rows and is blocked only by D60, and
`destructive-confirm` covers void/delete.

| New pattern | Predicted gap |
|---|---|
| `data-table` — sortable, selectable, sticky header, numeric columns | **Table** (+ family) |
| `table-pagination` — page size + range | **Pagination** |
| `detail-drawer` — row → side sheet with summary and actions | **Drawer** (see note) |
| `action-feedback` — transient confirmation after an action | **Toast** (+ region) |
| `tabbed-workspace` — switch views/accounts | **Tabs** |
| `bulk-action-bar` — selection count, bulk actions, clear | *predicted none* — Toolbar + Button + Tag |
| `date-range-filter` — from/to native date inputs | *none, once D60 promotes `type`* |
| `empty-state` — no results / no data yet | *predicted none* — Panel + Button |
| `summary-tiles` — account balances | *none* — Card |

**Predicted backlog: five components** — Table (with a
`TableHeader`/`TableRow`/`TableCell` family, following the
`Menu`/`MenuItem`/`MenuSeparator` precedent), Pagination, Toast, Tabs,
Drawer. That lands the library near **21 top-level components, not 30–50**
(16 today plus five; roughly 26 manifest entries once family members are
counted, as `Menu` contributes three today). That is the intended outcome,
not a shortfall.

These are *predictions*. Cycle 1 replaces them with what the authored
patterns actually declare, including the possibility that a
"predicted none" pattern proves awkward to compose and earns a gap.

**Note on Drawer:** it may not be a new component. Dialog exists, and D53
established the overlay tier on the Popover API; a drawer is plausibly
`Dialog` with a side placement rather than a sibling. Left open for the
Drawer cycle to decide; if so, the backlog drops to four.

## Cycles

Each cycle gets its own spec and plan, claiming decision numbers from D61
onward. This arc spec stays short deliberately so it does not go stale —
detail belongs in the per-cycle specs.

| # | Cycle | Ships | New components |
|---|---|---|---|
| 1 | Machine-readable surface | Ledger patterns authored; D60 prop promotion; `row-actions` unblocked | none |
| 2 | Table family + tabular numerals | Table (+family), numeric column tokens, Pagination | Table, Pagination |
| 3 | Toast | Toast + region/provider, imperative API | Toast |
| 4 | Drawer | Side sheet for row detail | Drawer (or a Dialog placement) |
| 5 | Tabs | Roving tabindex, orientation, panel wiring | Tabs |
| 6 | Eval retarget + external consumer run | `PROMPT.md` rewritten to a ledger screen; run; close what it finds | as proven |
| 7 | Editorial + motion pass | One pass over the frozen set — its own decision | none |

**Cycle 1 ships no components on purpose.** It ends with `patterns.json`
holding a real backlog and the manifest telling the truth about essential
props. Everything after is planned against declared needs.

**Ordering rationale:** Table first because every screen depends on it and
it is the most likely to overrun — better discovered in month one than
month three. Toast next because it is independent and unblocks feedback
everywhere. Tabs last: smallest, least blocking. If cycle 2 overruns,
Pagination splits out — it is the natural seam.

**Motion:** the token architecture is already correct — components bind
`var(--psi-duration-*)` / `var(--psi-ease-*)` and reduced-motion zeroes the
tokens centrally (D30), so nothing hand-rolls timing. What is thin is
application: six transition/animation declarations across all 16
components. Cycle 7 addresses that over a set that has stopped moving.
Polishing before the set is frozen means polishing twice.

## Where the app lives

`apps/ledger`, in-repo — it inherits CI, VR baselines, and the token gates
immediately, and grows screen-by-screen through cycles 2–5 as each
component's acceptance target.

The known cost: workspace linking hides packaging bugs, a class this repo
has been bitten by (#54, LICENSE missing from published tarballs). Cycle 6
therefore adds an **external consumer run** — install the published
packages into a scratch repo outside the workspace and build one ledger
screen there, exercising the real consumption path including
`init`-generated AGENTS.md. In-repo for velocity; one external run for
truth.

## Gates and metrics

Every cycle carries the existing gates: contrast gate in `pnpm build`,
tests, lint, axe, VR in CI, docs-drift, patterns validator, changeset. From
cycle 1 the patterns validator has real gap entries to check.

Two arc-level metrics, both must reach zero:

- **Docs-gap count** — existing, 6 → 5 → 1.
- **Improvisation count** — new, from the retargeted eval.

## Out of scope

- **Chart components — permanent, not deferred.** Psi ships no chart
  components; the ledger uses a third-party library bound to Psi tokens.
  Owning data-viz (scales, axes, legends, tooltips, per-type accessibility)
  is a larger project than the design system and has no completion
  criterion. What Psi *does* ship is a **chart token contract** — a
  colorblind-safe categorical sequence, semantic up/down colors, gridline
  and axis tokens — delivered in whichever cycle first charts something.
  Stating this as permanent keeps the improvisation metric readable (a
  third-party chart is correct behavior, not a gap) and keeps
  `patterns.json` honest (no gap that never closes). Reversible, like any
  decision here, by a new numbered decision.
- **Inline-editable table cells.** The ledger reads and acts on rows.
- **Custom calendar widget.** Styled native `<input type="date">` for this
  arc, following the D15 precedent that shipped a styled native `<select>`
  and deferred the custom listbox. A custom range calendar is its own later
  decision.
- **Table extras:** no virtualization, no column resizing, no drag-reorder.
  Sorting, selection, sticky header, numeric alignment, empty and loading
  states only. More than that is a numbered decision, not a quiet
  expansion.
- **Components with no pattern demanding them.** This clause replaces the
  "30–50" target.
- **`--from-accent` seed scaffolding and per-brand light+dark pairs.** Still
  open market-comparison gaps (#4, #5), but justified as a client demo that
  has no client. They do not lead this arc.

## Risks

- **Duration.** At observed velocity (11 → 16 components across several
  intense cycles; Menu alone consumed a cycle plus the D58 follow-up, and
  Menu is simpler than Table) this is a multi-month arc. Table is
  realistically a cycle by itself.
- **VR cost growth.** 188 baselines today; each component adds stories and
  lengthens the CI `vr` job, which is already the slowest gate.
- **Spec staleness.** Mitigated by keeping this document short and pushing
  detail into per-cycle specs.
- **Table scope creep.** The most likely way this arc becomes a year. The
  out-of-scope list above is the guard; enforce it by requiring a decision
  number for any addition.
