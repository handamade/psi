# The release guard refuses a stale generation eval and warns on a stale Figma library (D144)

Date: 2026-11-19. Status: **Implemented** on branch `d144-release-hygiene`.

Provenance: a design-system inspection on 2026-11-18 found four pieces of the
release process that nothing enforces. Each one had already rotted:

1. **The generation eval stopped being run.** The newest file in
   `tools/generation-eval/runs/` is `2026-08-07-b.md`. Measured from the tags
   on 2026-11-19, **23 releases** (0.15.0 to 0.37.0) have shipped since.
   `PROMPT.md` says to run it "after any recipe/doc change", and
   `tools/release-guard.mjs` never looks. The inspection ran a generation test
   of its own, and it was not logged in the repo.
2. **The Figma library fell ten releases behind.** File
   `MvbVttmGaFBmEqydtLJ0JN` reflects 0.27.0. No script generates it: a session
   rebuilds it by hand through the Figma MCP, so no build or test can notice
   that it is behind.
3. **The root `llms.txt` points at the June and July specs** and at the plan
   for a branch, `site-scale-portfolio-readiness`, that was merged and deleted
   long ago. `README.md`'s Documentation section has the same two stale
   links. Both name specific files, so both rot as soon as the next spec lands.
4. **Merged worktrees pile up under `.claude/worktrees/`.** They were pruned on
   2026-11-16 and nine had come back by 2026-11-18. CLAUDE.md describes how to
   tell that a branch is absorbed but never says when to look.

D144 was free on every `origin/*` branch and in both open PRs on 2026-11-19.
D143 is claimed by #200. **Check the number again when the PR opens.**

## Decisions

### D144 — `release-guard` refuses a release when five or more releases have been tagged since the newest generation-eval run, and warns when the Figma stamp is more than one minor behind; the release steps gain Figma and worktree pruning

**Eval freshness is a refusal.** `release-guard` reads the run files in
`tools/generation-eval/runs/` (names matching `YYYY-MM-DD.md` or
`YYYY-MM-DD-<suffix>.md`), takes the newest by name, and counts the distinct
versions tagged `@handamade/psi-*@x.y.z` whose tag date falls **strictly after**
that run's date. A release tagged on the same day as a run counts as covered,
because a run is made against what has been published that day. That is how
the 2026-11-18 run tested 0.37.0. If that count is **5 or more**, the guard
refuses. The message names the newest run, the count and the limit, and says
how to log a run: dispatch `PROMPT.md`, score it with `RUBRIC.md`, and write it
as `runs/<date>.md`. A folder with no runs is refused the same way.

**N = 5**, for two reasons:
- **The cadence comes in bursts.** Ten releases went out between 2026-11-13 and
  2026-11-18, and none between 2026-08-13 and 2026-09-28. A limit counted in
  days would either block a burst week or let a quiet quarter through with no
  run. A limit counted in releases follows the code that actually shipped.
- **One release at a time is too tight.** A run means dispatching a fresh agent
  and scoring its report, which takes about an hour. Five releases fit a burst
  of related work, about two days at the November rate, and one run at the end
  of it covers the whole burst. Five is also well below the 23 that
  accumulated unnoticed.

**There is no bypass flag.** A stale eval is the only thing a bypass would be
used to hide. If a hotfix ever has to ship past the limit, the release itself
is the place to say why, and the guard's constant is one line.

**The Figma library gets a stamp, and a lagging stamp is a warning.**
`docs/figma-library.json` records the file key and the Psi version the library
reflects:

```json
{
  "file": "MvbVttmGaFBmEqydtLJ0JN",
  "reflects": "0.27.0"
}
```

It lives in `docs/` because it describes something outside the code. It is not
generated and has no build input. The session that updates the Figma file
updates the stamp in the same change. `release-guard` reads the version being
released from `packages/react/package.json`. That file is already bumped by
`changeset version`, which runs before `pnpm release`. When the stamp is
**more than one minor behind** that version, the guard prints a warning and
continues: `0.38.0` against `0.37.0` is quiet, and `0.39.0` against `0.37.0`
warns. A major-version difference also warns. It is a warning and not a refusal
because code is the source of truth (the project's first principle). A stale
library is a gap for designers, and it must never hold up a fix to the code.
A missing or unreadable stamp also warns: the check is advisory, and missing
data should be reported rather than allowed to block a release.

The stamp is set to **0.27.0**, the version the inspection measured. A parallel
session is bringing the file up to 0.37.0 and will move the stamp when it
finishes.

**Two release steps in CLAUDE.md**, both of them after publish:
- **Figma.** Update the library and `docs/figma-library.json`, or record why
  not in the release PR. The guard's warning is the reminder, and this step
  says what to do about it.
- **Worktrees.** Prune worktrees whose branches are merged. Use the absorbed
  check CLAUDE.md already documents, with its false positives (main moved
  ahead, a consumed changeset), and remove a worktree only after reading the
  output. Nothing is pruned automatically. Some worktrees belong to sessions
  that are still running, so pruning takes a judgement.

**The root `llms.txt` and the README's Documentation section** now point at
the folders, `docs/superpowers/specs/` and `docs/superpowers/plans/`, instead
of at individual files. They say that decisions are numbered from D1 in each
spec's `## Decisions` section and that the newest spec has the highest number.
Neither file states a number. A typed range is the kind of claim that rots.
CLAUDE.md's own range (`D1–D142`) is a working note for sessions claiming a
number, and it moves to `D1–D144` here.

**The inspection's generation test is logged** as
`tools/generation-eval/runs/2026-11-18.md`. Earlier runs keep only the scored
report in the repo, not the screen the agent wrote, and this run does the
same.

### Why the guard's logic moves to `tools/lib/`

`release-guard.mjs` is a script with side effects: it calls git and exits the
process. The tested tools in this repo (`publish-plan.mjs`, `exports-map.mjs`)
keep their decisions in pure functions under `tools/lib/`, with a sibling
`*.test.mjs` that the `tools` vitest project picks up. The new checks follow
the same pattern in `tools/lib/release-checks.mjs`. The functions take run
filenames, tag lines, and versions as arguments, so the tests need no git
repository and no file system.

## Not in scope

- **Running the eval in CI.** A run needs a fresh agent and a human to score
  it, so the guard can check freshness but cannot produce a run.
- **Generating the Figma file.** It is built by hand through the Figma MCP.
  Generating it from code would be a separate decision.
- **Pruning anything in this change.** The step is written down here, and it
  is carried out at the next release.

## Follow-ups

- **The 2026-11-18 run's findings** are documentation and MCP work, listed in
  the run file under "What this makes next": the icon index, the pattern
  presets that fail `check` (D143 is taking those), Tag's generic variant
  block, the `useToast()` API table, the `destructive-confirm`/Dialog Cancel
  disagreement, and `check` suggesting `onVolumeChange`.
- **The Figma stamp moves to 0.37.0** when the parallel Figma session finishes.
- **A Figma-against-manifest check**, which the inspection suggested, would
  replace a hand-kept stamp with a measurement. It needs read access to the
  file from CI, which is not available today.
