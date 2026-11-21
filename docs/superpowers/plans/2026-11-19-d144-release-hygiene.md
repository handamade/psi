# D144 release hygiene — plan

Spec: `docs/superpowers/specs/2026-11-19-d144-release-hygiene-design.md`.
Branch: `d144-release-hygiene`. One PR.

## Tasks

1. **Pure checks, test first.** `tools/lib/release-checks.test.mjs`, then
   `tools/lib/release-checks.mjs` with:
   - `newestRun(filenames)` → `{ file, date } | null`. It accepts
     `YYYY-MM-DD.md` and `YYYY-MM-DD-<suffix>.md`, ignores every other name, and
     orders by name, so `2026-08-07-b.md` is newer than `2026-08-07.md`.
   - `releaseDates(tagLines)` → `Map<version, earliestDate>` from
     `refname<TAB>YYYY-MM-DD` lines, counting only `@handamade/psi-*@x.y.z`
     tags. The three packages share one version.
   - `evalFreshness({ runFiles, tagLines, limit })` →
     `{ ok, newest, since, message }`. Releases count when they are dated
     strictly after the run. The guard refuses when `since >= limit` or when
     there are no runs.
   - `minorsBehind(stamp, released)` → a number, or `Infinity` when the majors
     differ.
   - `figmaWarning({ stamp, released })` → a string or `null`. It warns when
     the stamp is missing or invalid, or when it is more than 1 minor behind.
   - The tests cover the same-day boundary, a suffixed run, non-run files, an
     empty folder, deduplication of the three packages' tags, non-Psi tags, and
     the edges of `limit`: 4 passes and 5 refuses.
2. **Wire `tools/release-guard.mjs`.** After the main checks, fetch tags, read
   the run folder and `git for-each-ref`, refuse when `evalFreshness` fails,
   read `docs/figma-library.json` and the react version, print
   `figmaWarning` to stderr, and continue. `EVAL_RELEASE_LIMIT = 5`.
3. **Stamp.** `docs/figma-library.json` with `{ file, reflects: "0.27.0" }`.
4. **Run log.** `tools/generation-eval/runs/2026-11-18.md`, in the format of
   `2026-08-07-b.md`: the result, method, hard fails, the assessed stumbles,
   what was not counted, and what it makes next. Add a line to `PROMPT.md`
   saying the guard now enforces the cadence. Do not copy the screen file:
   earlier runs never kept their outputs.
5. **Docs.** Point the root `llms.txt` and the README's Documentation section
   at the spec and plan folders, with no typed range. In CLAUDE.md, change
   `D1–D142` to `D1–D144`, add the guard's eval refusal and Figma warning to
   the Release line, and add a Figma step and a worktree-pruning step after
   `verify:published`.
6. **Gates.** All five:

   ```bash
   pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site
   ```

   Run the guard's new logic for real against this repo's tags, with
   `node -e` importing the lib, and confirm it reports that the 2026-11-18
   run covers 0 releases.
7. **PR.** Re-check that D144 is still free, open the PR, arm auto-merge, and
   read it back.

## Changeset

None. The change touches release tooling, docs and repo notes, and none of the
three published packages. The tools-only PRs #164, #168 and #185 set this
precedent, and CLAUDE.md asks for a changeset for user-visible package changes.
An empty changeset would also make `.changeset/` non-empty, which by the
release rule triggers a release that ships nothing.
