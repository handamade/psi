# Cycle 6 handoff — running the retargeted eval (D68–D69)

Date: 2026-08-06. Spec: `docs/superpowers/specs/2026-08-06-eval-retarget-cycle-design.md`.

This is the handoff for the run that **grades the ledger coverage arc**. Cycles
1–5 are shipped and published; the derived backlog is empty. What remains is
D59's actual completion criterion, which no session that built the components
can run for itself.

## Why this needs a fresh session

`tools/generation-eval/PROMPT.md` says "copy it verbatim into a new agent
session," and that restriction is the whole measurement. The eval asks what the
machine-readable trail alone conveys to an agent that has never seen the repo.
Any agent carrying context from the cycles that built Table, Toast, Drawer and
Tabs — including the one that wrote this file — already knows the answers and
would score itself.

So: **do not run this in a session that has repo context.** Open a fresh one.

## How to run it

1. Open a new agent session with **no prior context** on this repo.
2. Paste `tools/generation-eval/PROMPT.md`'s "## The prompt" section
   **verbatim**. Do not paraphrase it, do not add repo context, do not answer
   its questions for it. The forbidden-source rule (no reading anything under a
   package's `src/`) is part of the measurement, not a formality.
3. The primary task is the **transactions screen**. The settings form is kept
   below it as a secondary task; run it only if you want the long form for
   trend comparison.
4. When the agent reports back, score it against `tools/generation-eval/RUBRIC.md`
   and log the result as `tools/generation-eval/runs/2026-08-XX.md`, following
   the shape of `runs/2026-07-21.md`.

## What to look for

The rubric now counts **three** quantities, and the third is new and is the
point of this run:

| Quantity | Means | Fix |
|---|---|---|
| Hard fails | invented prop, hardcoded colour, off-vocabulary size/variant | a bug |
| Guesses | docs were insufficient | a doc change |
| **Improvisations** | the system could not express the thing | **a component** |

**D59's criterion is improvisations reaching zero.** Assess them at review
rather than trusting the agent's count — an agent may not realise that what it
hand-rolled has a pattern in `dist/patterns.json`, and may report an ordinary
app-level choice as an improvisation. A third-party chart is **correct
behavior**, not an improvisation: Psi ships no chart components by permanent
decision.

The docs-gap trend to continue is **6 → 5 → 1** (see `runs/2026-07-21.md`).
Note the task changed, so a rise in guesses is expected and is not a
regression — the ledger screen is a larger surface than the settings form.

## Do not fix findings in the same cycle

Per the spec's out-of-scope: the run's findings become the *next* cycle's work.
Grading and correcting in one breath destroys the measurement.

## Repo state as of this handoff

- **`main` is at 0.13.0**, published on npm with tags pushed. Four clean
  releases in a row (0.10.0 → 0.13.0).
- **32 components, 13 patterns, zero gaps.** Every pattern composes only
  components that exist.
- **Decision log runs D1–D69.** Claim D70 next. Confirm against a `## Decisions`
  entry in a spec, not a grep — the note in `CLAUDE.md` explains why.
- **PR #84 is open** with D68–D69 (the packaging fix and the eval retarget).
  Merge it before running the eval, so the agent reads the retargeted prompt
  and gets a `@handamade/psi-react/styles` import that typechecks.

## Environment gotchas that cost this session time

- **GitHub Actions was degraded on 2026-08-06.** The signature: a job cancelled
  at exactly 15 minutes with **zero steps ever reporting**, or a failure at
  `Set up job` with `Failed to resolve action download info. Error: Service
  Unavailable`. Both mean the runner never got the code. Re-run; do not debug
  the diff.

  Two second-order effects worth knowing, because both look like something
  else:

  - **Runs can be created very late.** `main` at `8dd66d4` appeared to have no
    run at all for ~25 minutes, then one showed up and was cancelled at the
    usual 15-minute mark. "No run exists" is not a stable reading during an
    incident — re-check before concluding anything from it.
  - **A required check with no run blocks merging indefinitely**, showing as
    `ci — Expected — Waiting for status to be reported` with
    `mergeable_state: blocked`. Nothing times it out. The fix is a new
    `pull_request` event: **push a commit** (`synchronize`), which preserves
    an armed auto-merge. Closing and reopening also works but clears
    auto-merge, so prefer the push.
- **VR baselines.** Generating *missing component-story* baselines in a Linux
  container is safe; regenerating the token specimen pages is not. Run
  `--update-snapshots=none` first and read the **failure count**, not the tail
  — expect 16 known divergences (`color-tokens`, `layout`, `motion`,
  `typography` × 4 themes). Then `--update-snapshots=missing`, then confirm
  `git status` shows only additions. Full detail in `apps/storybook/vr/README.md`.
- **This container runs Node 22.22.2**, above pnpm 11.9's ≥22.13 floor despite
  `.nvmrc` saying 24. Not a problem; don't "fix" it.
- **The four gates are four.** `check-docs-drift` is its own CI step and is not
  part of `build`/`test`/`lint`.

## The external consumer run, for next time

D68 made it a standing gate. It found the `./styles` typecheck bug on its first
execution and is worth repeating after each release. The recipe:

```sh
mkdir /tmp/consumer && cd /tmp/consumer && npm init -y
npm install @handamade/psi-react@latest @handamade/psi-tokens@latest react react-dom
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom
# a real tsconfig with "moduleResolution": "bundler", and src/vite-env.d.ts
# containing: /// <reference types="vite/client" />
npx tsc --noEmit && npx vite build
```

It only works against a *published* version, which is why it is not a CI step.
