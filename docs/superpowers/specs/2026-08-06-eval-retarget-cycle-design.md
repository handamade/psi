# Eval retarget + external consumer run — ledger arc cycle 6 (D68)

Date: 2026-08-06. Status: **Draft** — cycle 6 of the ledger coverage arc, and
the one that grades it.

Provenance: D59 set the arc's completion criterion and it is not a component
count:

> The arc is **done** when `tools/generation-eval/PROMPT.md`, retargeted at a
> ledger screen, returns a run with **zero improvisations** — no hand-rolled
> table, no `div` impersonating a tab strip, no invented props.

Cycles 1–5 spent the derived backlog: Table, Pagination, Toast and Tabs
shipped, and Drawer turned out to be a `Dialog` placement (D66). Every pattern
in `patterns.json` now composes only components that exist. **That is a
milestone, not the criterion** — the patterns were authored in cycle 1 by
prediction, so a fully satisfied pattern set says nothing about what a screen
an agent has never seen will demand.

## Decisions

- **D68 — The external consumer run is a standing gate, not a one-off, and it
  found a real bug on its first execution.**

  The arc spec justified it in one line — workspace linking hides packaging
  bugs, a class this repo was already bitten by (#54, LICENSE missing from
  published tarballs). Run against a scratch npm project outside the workspace
  on 0.13.0, it confirmed three things and broke one.

  Confirmed: `LICENSE` ships in both tarballs (the #54 fix holds in the real
  published artifact, which nothing in-repo checks); all five stylesheets
  resolve through the published `exports` map; a ledger screen using Table,
  Tabs, Toast, Pagination and a `Dialog` drawer builds, renders and is fully
  styled — tokens resolve, `.psi-container` measures 1312px, the drawer
  measures flush to the viewport edge at full height.

  **The bug: the documented stylesheet import does not typecheck.** Every doc
  in the repo — `CLAUDE.md`, `packages/react/llms.txt`, the READMEs — tells
  consumers to write

  ```ts
  import "@handamade/psi-react/styles";
  ```

  and in a standard TypeScript + Vite consumer that is
  `TS2882: Cannot find module or type declarations for side-effect import`.
  `vite/client` declares `*.css`, which covers the four
  `@handamade/psi-tokens/*.css` imports, but `./styles` carries no `.css`
  extension so the glob never matches it, and the export had no `types`
  condition to fall back on. The *undocumented* `./styles.css` spelling worked.
  The documented one did not.

  This is precisely the shape of bug the run exists to catch: invisible in the
  workspace, because pnpm links resolve `@handamade/psi-react` through the
  filesystem and never evaluate an export condition. And it landed on the fifth
  stylesheet — the one CLAUDE.md already flags as the most-forgotten, and the
  one that cost the D62 ledger app its only improvisation.

  **Fix:** a `types` condition on both `./styles` and `./styles.css`, pointing
  at an emitted `dist/styles.d.ts`. Both spellings are published, so fixing one
  would only move the trap. The declaration is emitted rather than tracked
  because everything else under `dist/` is generated and a hand-maintained file
  there is the one thing `rm -rf dist` would not restore. It is intentionally
  empty: a side-effect-only CSS module has no exports, and its existence is
  what satisfies the compiler.

  **Brought back in-repo as `scripts/package-exports.test.ts`**, which asserts
  the conditions, that the declaration exists, and that every export target
  lives under `dist/` and is present after a build. That last check is the
  general form of the bug — an export pointing outside the `files` list
  resolves in the workspace and 404s from the tarball.

  The external run itself stays manual and periodic, not a CI step: it needs a
  *published* version to install, so it can only run after a release, and
  wiring it into `ci` would either test stale versions or block on npm.

- **D69 — The eval's task is retargeted from the settings form to a ledger
  screen, and the improvisation count is what it reports.**

  `PROMPT.md`'s task has been a Profile settings form since the eval was
  written. That task only ever exercised components that already existed, which
  is exactly the blind spot D59 named — it measures whether an agent uses Psi
  correctly, never whether Psi can express the app.

  The retargeted task is a transactions screen: a filterable, sortable,
  selectable table with row actions, paginated, with saved-view tabs, a detail
  drawer, and confirmation feedback. Every element maps to a shipped pattern,
  so a run that improvises is reporting a real expressiveness gap rather than a
  documentation one.

  **The rubric gains a third counted quantity.** It currently counts hard fails
  and guesses; it now also counts **improvisations** — a hand-rolled element
  where a Psi component exists, a `div` standing in for a component, or a
  composition the patterns already describe being rebuilt from primitives.
  Guesses and improvisations are different failures: a guess is a docs gap, an
  improvisation is a coverage gap, and D59's criterion is the second one
  reaching zero.

  The existing settings-form task is kept in the file as a secondary task
  rather than deleted, so the 6 → 5 → 1 docs-gap trend stays comparable across
  runs.

## Running it

`PROMPT.md` says "copy it verbatim into a new agent session" and that
restriction is load-bearing: the eval measures what the machine-readable trail
alone conveys, so any agent carrying this repo's context — including the one
that wrote the components — invalidates the result. The run is therefore
dispatched to a fresh agent, and this cycle ships the retargeted prompt and
rubric; the run and its `runs/<date>.md` log follow.

## Gates

All four, in order. `check-docs-drift` is unaffected — no component or pattern
counts change this cycle.

A changeset is required: the `exports` fix is user-visible, and it is a `patch`
rather than a `minor` because no API is added.

## Out of scope

- **Wiring the external run into CI** — see D68.
- **Fixing whatever the eval reports.** The run's findings become the next
  cycle's work; closing them inside the cycle that measures them would mean
  grading and correcting in the same breath.
