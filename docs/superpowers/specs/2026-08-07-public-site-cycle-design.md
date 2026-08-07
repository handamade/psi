# The public site is a projection, and it is also a product (D74)

Date: 2026-08-07. Status: **Draft** — a maintenance cycle, deliberately not on
the arc's critical path. Written to be *injected*, not scheduled.

Supersedes the untracked draft `2026-08-07-consumer-surface-gaps-design.md`,
which claimed D73–D74. **Both numbers were taken while it sat uncommitted**:
`2026-08-07-manifest-children-cycle-design.md` claims D72–D73 and shipped as
0.14.1 (#89, #90). Highest number actually held by a `## Decisions` entry is
**D73**. This spec takes **D74**; the preset-render gate that draft called D74
is recorded under *Deferred* as a future **D75** and is **not** in this cycle.

That collision is itself the third instance of the hazard `CLAUDE.md` already
documents. The rule held — the grep was not the check, the `## Decisions` entry
was — but only because someone re-checked before implementing.

## Provenance

Two independent runs, four weeks apart in package terms, agreeing:

1. A **cold-consumption run against 0.12.0** by a session with no repo context:
   install the published packages into a scratch Vite/React 19 app, build a
   six-section application, drive it, compare Figma against code. The second
   execution of D68's standing external consumer gate.
2. A **design review of `apps/promo` on 0.14.1** (this session), driving the
   rendered site at 320–1920px in both themes with Playwright, axe-core 4.12,
   and computed OKLCH→sRGB contrast.

Run 1's stronger half belongs on the record and is not re-litigated: clean
install and build, zero runtime deps, **zero invented props, variants or sizes
across 20+ components**, every documented runtime contract verified by driving
the app rather than reading about it — `Menu` reporting `"outside"`, `Dialog`
reporting `"esc"` without self-closing, toast variants routing to the right
live region, `@layer` letting unlayered consumer CSS win without `!important`.
That is the D59 thesis holding under an adversarial read.

Every defect either run found sits **outside the package**. Run 1 found the
site is *false*. Run 2 found it is also *badly built* — and that the two are
the same failure, because nothing gates it.

## What has already been closed

Not re-litigated here:

- The `./styles` typecheck bug (D68) — run 1 predates 0.13.1.
- `README.md`'s four-stylesheet list and `CLAUDE.md`'s false claim about it.
- The `filter-toolbar` / `table-pagination` labeling contradiction, resolved in
  `guidance.ts:21` against `Field` for toolbar filter controls.
- **The manifest `children` / native-prop emitter fix.** The superseded draft
  listed this as out of scope, "owed to its own cycle" — it then shipped as
  D72–D73 in 0.14.1. `patterns/filter-toolbar.json` was touched by #89, so the
  deferred D75 analysis below must be re-verified against the current file
  before anyone implements it.

## Decisions

- **D74 — The public site is gated like every other prose artifact, and held
  to the same craft bar as the components it advertises.**

  Two halves. They are one decision because they have one cause: `apps/promo`
  is the only surface in this repo that no gate looks at.

  ### Half one: it is false

  Measured on 0.14.1 (`manifest.json`, `src/icons/`, `patterns.json`,
  `package.json`):

  | Site says | Reality | Where |
  |---|---|---|
  | 18 components | **34** | `Hero.tsx:5`, `Roadmap.tsx:4`, `Playground.tsx:70` |
  | 22 icons | **26** | `Hero.tsx:6`, `Roadmap.tsx:4` |
  | "all three patterns are now live" | **13** | `updates.ts:34` |
  | `0.8.1` | **0.14.1** | `Playground.tsx:44` |
  | newest update 0.8.0, 2026-07-31 | seven releases later | `updates.ts:16` |

  The drift survived six releases because `tools/check-docs-drift.mjs` checks
  four READMEs and three `llms.txt` files and **contains no reference to
  `apps/promo`**. On this HEAD it passes while printing `34 components, 13
  patterns stated consistently` — next to a site that says 18. A green gate
  and a true site are currently unrelated facts.

  The whole ledger arc (D59–D71, 16 components: the Table family, Pagination,
  Toast, Tabs, DescriptionList, Dialog-as-drawer) is invisible. `Playground`
  demos stop at Menu and stamp version numbers into card headings — "the 0.7
  surface pair", "the 0.8 overlay tier" — which is a naming convention that
  guarantees rot.

  Run 1 is its own proof of cost: all three factual errors the consuming agent
  made trace to trusting the site over the package, including one that drove a
  recommendation it had to reverse — to an agent that had *already read*
  `llms.txt`. The site is the first thing an external agent reaches and the
  least true thing Psi publishes.

  Three parts, and the third is what makes the first possible:

  1. **Numbers are derived at build time, never typed.** Anything an artifact
     already knows — component count, icon count, the name list, the current
     version — reads from `manifest.json` / `package.json`. What stays
     hand-written (release notes) joins the `check-docs-drift` claims list.
  2. **`llms.txt` is served at the advertised URLs.** `assemble-site.mjs`
     copies both package `llms.txt` files and the root one into `site-dist`.
     *(Inherited from run 1: `psi.kurkin.de/llms.txt` reportedly 404s while §04
     advertises it. **Unverified in this cycle** — no live fetch was made. Check
     before citing it as fixed.)*
  3. **The icon roster becomes an artifact.** It has no machine-readable form:
     `emit-patterns.ts:24` reads `src/icons` off disk and throws the list away.
     That is exactly why "22 icons" could rot while component counts at least
     had something to check against. `manifest.json` gains `icons: string[]`.

  **Scope note:** §04 asserts Figma parity, which is not true (see *Deferred*).
  While the copy is regenerated that claim softens to what ships. Minimal edit
  — the Figma question stays parked.

  ### Half two: it is badly built

  The site is the system's only public demonstration of its own craft, and it
  currently fails its own three headline claims. Ranked by the review; full
  evidence in the cycle plan.

  **Blocking.**

  - **46 WCAG AA failures, from one line.** `promo.css:69` binds `.annot` to
    `--psi-fg-tertiary` at 12px. Measured **2.84:1** on `bg-primary`, **2.90:1**
    on Panel in light theme; axe-core reports 46 nodes and *no other violation
    on the page*. `.annot` is not chrome — it carries the hero stat line, the
    four `.pg-note` paragraphs, theme captions, `roadmap-foot`, footer notes and
    every `.var-row` value. `--psi-fg-secondary` measures 4.86:1 / 5.08:1 at the
    same sizes and is the fix.

    The reason it survived is structural and worth recording: **`fgTertiary` is
    the one foreground absent from `contrast-matrix.ts:127–169`.** The site that
    says "WCAG AA is a build gate, not a guideline" found the single token the
    gate does not cover and set its body copy in it. Whether `fgTertiary` joins
    the matrix is a **token decision, not a site decision** — out of scope here;
    the site stops misusing it either way.

  - **Horizontal overflow at two viewport bands.** `promo.css:834` hides the nav
    only below 720px and the four-button theme switch never wraps. Measured
    `scrollWidth`: **337 @320**, **863 @760**, **868 @860** against viewport
    width. At 320 the `ember` button sits at 279–332px; across the entire
    **721–959px** band — tablet and landscape phone — the switch is pushed off
    screen. A clipped control at 320px is a blocker on its own.

  **Craft.** Ragged card bottoms in the flagship 4-up row (measured panel
  heights 250 / 228 / 227 / 227, because the grid stretches the `<article>` and
  not the `Panel` inside it); `.var-row .val` truncating 2 of 8 rows to an
  ellipsis with no expanded view; `.pg-note` prose running **1166px** at 12px
  (~180 characters per line) on a page whose `.update p` already caps at 70ch;
  update cards 1216px wide around a 617px text column, eleven times; the sticky
  header's 0.82 scrim letting 32px display headings resolve as words behind the
  nav links; the hero's contrast-derivation widget failing AA at rest (4.38:1)
  and reaching **2.88:1** when the user drags Δ to +0.12; no skip link ahead of
  seven chrome tab stops; and both hero CTAs implemented as `<button>` +
  `scrollIntoView` when `Button` has taken `href` since D33/D34.

  What passed, so the next reader does not re-test it: focus rings on all 14
  tab stops, `Menu` keyboard and focus restore, `prefers-reduced-motion`
  (`.rise` and the body transition both suppressed), dark theme contrast
  (4.51–4.55:1), and every token binding — the site hardcodes no colors.

  ### The gate, which is the actual decision

  A fix without a gate is the six-release drift again with fresher numbers.
  `check-docs-drift.mjs` learns `apps/promo`, and the site's counts become
  derived rather than asserted. The craft half needs its own floor: **axe-core
  already runs in this repo** (`packages/react/src/a11y.axe.test.tsx`), and the
  promo site gets the same treatment — one test, real viewport, zero
  violations, plus an assertion that `scrollWidth === clientWidth` at 320, 760
  and 1440. Both bugs above are caught by those two assertions.

## Also in this cycle, without decision numbers

Corrections, not design:

- **`resolved/*.json`'s `hex` is opaque and nothing says so.** `resolver.ts:131`
  emits 6-digit sRGB always; alpha lives in `oklch.alpha`. Symptom:
  `fgPrimary`, `fgSecondary`, `borderFaint`, `borderNeutral`, `borderStrong`
  and `scrimHeavy` all report the same hex, which reads as a data bug. It nearly
  put 76 fully-opaque values into the Figma library.

  **The reported fix — emit `hex8` — is rejected.** `dtcg/*.json` already emits
  exactly that (`color.border.faint` is `#222f3c14`), each with its formula in
  `$description`. The interop artifact is lossless; run 1 read the wrong file.
  The correction is two lines in `packages/tokens/llms.txt`, not a schema change
  that duplicates DTCG.

- **`llms.txt` lists the numeric scales.** Space's 17 steps, radius 4/6/8/12 +
  full, size 24/32/40/48. Run 1's third error was an invented `--psi-radius-2`,
  because the file states the *pattern* and never the *values*. Sizes are
  already listed this way; the other two are not.

- **External run logs get a home.** D68 made the external run a standing gate
  and gave its output nowhere to live, so run 1 exists only in an unrelated
  scratch repo. Copied to `tools/generation-eval/runs/2026-08-06-external.md`,
  and the D68 recipe gains that as its logging step. Eval runs and external runs
  are different instruments — the filename says which.

## Priority, and where this is injected

**This does not lead and must not displace the arc.** D59's criterion is a
ledger run with zero improvisations; `runs/2026-08-07.md` returned two, cycle 7
shipped their fixes, and the re-run that grades it is owed. That re-run is the
critical path.

The injection point follows from a scheduling fact, not a preference: **the
eval re-run cannot be done by a session with repo context** — that restriction
*is* the measurement. A fresh session runs the eval while a repo-context
session runs this cycle. They touch no common files, and this cycle ships no
components, so `check-docs-drift`'s counts do not move under the eval's feet.

One ordering constraint: `runs/2026-08-07.md` names the next refinement as a
**genuinely external run** — installed from npm with no repo present, so
`CLAUDE.md` cannot load. On that run the website is part of the measured
surface, and an agent reading `psi.kurkin.de` first would be measuring 18
components against a 34-component package. **D74 should land before that run**,
or the run measures the site instead of the system.

This cycle is being implemented in an isolated worktree on `d74-promo-site`,
deliberately non-intersecting with parallel package work.

## Gates

All four, in order. Three notes specific to this cycle:

- **`check-docs-drift` is the thing being changed, so assert its behavior rather
  than assume it.** Run it *before* fixing the site and confirm it **fails** on
  the current promo claims; then fix and confirm it passes. A check added and a
  check proven are not the same thing, and this repo has been bitten by the
  difference.
- **The a11y assertions get the same treatment.** Confirm the axe test fails at
  46 nodes and the 320/760 overflow assertions fail *before* the fixes land.
- **`vr` is CI's** (macOS writes junk baselines). This cycle adds no stories, so
  `vr` should be untouched — if it moves, something unintended changed.

A changeset is required: `manifest.json` gaining `icons` is user-visible.
`minor` if `icons` ships; `patch` if the cycle splits and only the site lands.

## Deferred, with the diagnosis recorded

### D75 — a preset is answerable for what it renders, not only what it composes

**Not in this cycle.** Recorded so it is not re-derived, and renumbered from the
superseded draft's D74.

`patterns.json` presets are documented as copy-paste JSX an agent should emit
verbatim. The `filter-toolbar` preset emits a bare `Input` and `Select` inside
`Toolbar`. `Toolbar` is `display:flex; flex-wrap:wrap`; `Input` and `Select` are
`width: 100%`. A flex item with `flex-basis: auto` resolves its basis from
`width`, so each control claims the full row: measured externally at **1200px
inside a 1200px container** — a vertical stack where a filter bar was specified.
The pattern most likely to be copy-pasted is the one that renders wrong.

Cycle 7 made this load-bearing: D71 settled the `Field` question *against*
`Field` for toolbar filter controls, so the collapsing form is now the
deliberate documented one. And `apps/ledger/TransactionsScreen.tsx:125` is
commented `{/* filter-toolbar */}` while wrapping both controls in `Field` —
i.e. the reference app implements the option the pattern rejects. `Field` is
`display:grid` with `min-width:0`, which is why the ledger never shows the bug.
One of the two has to move.

Nothing forces the question, because **no gate ever mounts a preset**.
`validatePatterns` resolves names, slot contracts, props and `requires`;
`render-preset.test.ts` asserts the emitted string. Both are correct and both
are blind to layout by construction. The decision is the gate, not the patch:
**every preset renders in Storybook and carries a VR baseline** — one story per
pattern, one theme, one viewport. 13 stories, not 13 × 4, because VR cost is a
named arc risk.

Any fix must correct the **copy-pasted output**, not just this repo's two files.
That points at `Toolbar` constraining its own direct form-control children.
Rejected alternatives: width hints via props on the preset's `Input`/`Select`
(blocked by the `propFilter` native-prop drop, and it fixes the pattern while
leaving `Toolbar` broken for hand-composers); and the ledger adopting the
preset's shape (makes the reference app render the bug).

**Re-verify first:** #89 touched `patterns/filter-toolbar.json` and the
native-prop emitter. The measurement above predates it.

### Figma parity — parked by the owner

Recorded so it is not re-derived, and because run 1's own P1 ("run the sync in
CI") is not implementable as written:

- The sync is a Figma **plugin** (`editorType: ["figma"]`, `main: dist/code.js`)
  that runs inside the app. There is no CI form. Automating it means the REST
  Variables API, whose write endpoints are Enterprise-only, against a
  Professional plan whose 4-mode collection cap the file has already reached.
- `COLLECTION_NAME = "DS Tokens"` (`code.ts:67`, unchanged since the first
  commit) does not match the file's `Color` / `Scale` collections. Re-running
  adds a third collection rather than converging on them.
- The largest reported gap cannot be closed by running it: `--psi-control-*` and
  `--psi-surface-*` are not in `resolved/*.json` at all — they live in
  `dist/components/*.vars.css`, which the plugin does not read. Motion *is* in
  `resolved` and is still skipped: `code.ts:285` iterates space/size/radius only.
- The advertised formula-in-description **is** implemented (`code.ts:277`) and
  alpha **is** preserved (`code.ts:243`). Their absence from the file is evidence
  the file was not produced by this plugin — not that the pipeline over-promised.

Figma is not a stalled projection; it is a hand-maintained artifact no generator
here reproduces, and the remediation performed during run 1 (76 values, 25
aliases, 38 descriptions, by hand) widened that gap. Resuming means choosing
between dropping the parity claim, rebuilding the plugin against the file's
actual structure with a manual post-release ritual, or paying for Enterprise.
That is a numbered decision of its own, not a CI ticket.

## Out of scope

- **Re-running the eval.** The arc's critical path, not this cycle's work.
- **Adding `fgTertiary` to the contrast matrix.** A token decision. This cycle
  stops the site misusing the token; it does not change the token.
- **A `Stack` component.** Settled by D70.
- **Emitting `hex8` in `resolved/*.json`.** Rejected above; DTCG carries it.
- **Redesigning the site.** The visual language is coherent and fully
  token-driven. This cycle fixes what is false and what is broken, and changes
  no art direction.
