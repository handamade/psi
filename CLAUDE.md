# Psi (Ψ) — agent entry point

OKLCH-based themeable design system. Code-first: Figma receives generated values, never the source of truth.

## Machine-readable trail (read in this order)

1. `llms.txt` → `packages/tokens/llms.txt` + `packages/react/llms.txt` (rules + artifact index)
2. `packages/react/dist/manifest.json` — full component/prop inventory with types and defaults (generated; run `pnpm build` if missing)
3. `packages/tokens/dist/guidance.json` — variant intent and typical use
4. `packages/tokens/dist/resolved/<theme>.json` — every semantic token with resolved values per theme
5. `@handamade/psi-mcp` — MCP server (search/get) over manifest+guidance+resolved tokens; hosted at psi.kurkin.de/mcp; `init` generates consumer AGENTS.md (D43–D44).

## House rules (non-negotiable)

- Sizes are px numbers (`24 | 32 | 40 | 48`), never S/M/L. Scale names are pixel-true (`psi-gap-8` = 8px).
- Variants are flat: `accent | accent-subtle | neutral | neutral-subtle | ghost | danger | danger-subtle | outline` — no primary/secondary. One accent per visual group; `danger` only for destructive actions.
- Never hardcode colors in component CSS — bind `var(--psi-*)` (the custom stylelint plugin enforces this).
- Semantic colors are OKLCH formulas, not swatch ladders. New values go in `packages/tokens/src`, never in dist (dist is generated).
- Consumers import **five** stylesheets, not four: the four token CSS files `base.css`, one theme css, `components.css`, `utilities.css` (utilities is REQUIRED — `.psi-container` + reduced-motion zeroing live there), **plus `@handamade/psi-react/styles`**, which carries the component class rules. Omitting the fifth renders every component unstyled while the build stays green. This rule previously said "all four" and cost the D62 ledger app its only improvisation. **Only `packages/react/llms.txt` had it right** — this note used to credit `packages/react/README.md` too, and that was false: the README listed three token stylesheets and never mentioned `utilities.css` until D70's eval caught it. Machine trail right, human-facing doc wrong, exactly like D68's `./styles` bug.
- Breakpoints are build-time JS constants (D31) — baked into media queries, not CSS vars.

## Workflow

- **Node 24 (`.nvmrc`) — check `node -v` before the first pnpm command.** pnpm 11.9 requires ≥22.13 and dies on Node 20 with `ERR_UNKNOWN_BUILTIN_MODULE` (it needs `node:sqlite`). `~/.zshenv` puts 24 on PATH for fresh shells, but a shell that predates that setup still has 20 first. Fix the shell with `nvm use` (reads `.nvmrc`) — do not prefix individual commands with a PATH override, which fixes one command and leaves the next to fail.
- Specs and plans live in `docs/superpowers/` (decision log **D1–D65** in the specs). Significant changes get a decision number — check the highest one in use before claiming the next, since parallel sessions have collided on numbering. **A grep alone over-reads**: it returns numbers that are merely *mentioned* or reserved forward (the D59 arc spec says later cycles "claim decision numbers from D61 onward", so `D61` greps as taken while nothing owns it). Confirm a number is actually claimed by a `## Decisions` entry in a spec, not just referenced in prose.
- **Verify with all five gates, not four:**

  ```bash
  pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site
  ```

  The token build is the WCAG AA contrast gate — it throws on failures. **`check-docs-drift` is the one that gets forgotten**: it is its own CI step, *not* part of `build`/`test`/`lint`, so a green local trio says nothing about it. It fails whenever a component or pattern count changes and `llms.txt`, a README or any other prose still states the old number — which is every coverage cycle. It has now bitten twice (D53, and again on #69 where three files still claimed 4 composition patterns after the catalog went to 13). **Put it in the gate list of every plan.**

  **`test:site` is the fifth, added by D76**, and it is one omission away from the same fate as `check-docs-drift`: it is its own step, not folded into `test`, so a plan that lists only the historical four gates will look complete and gate nothing on `apps/promo`. It needs `apps/promo/dist` to exist — run a full `pnpm build` (or `pnpm --dir apps/promo build`) first, or it fails on a missing build output rather than testing anything — and it must run from the repo root, since it reads `packages/react/dist/manifest.json` and `apps/storybook/storybook-static/index.json` by relative path.

  CI's full order is `build → check-docs-drift → test → vr → test:site → lint`. Of those, only `vr` cannot be run locally (see below).
- **`pnpm vr` only passes in CI.** Baselines are ubuntu-latest renders; a macOS run fails all 188 stories on the `-darwin` snapshot suffix and its default update mode silently writes junk baselines. Let CI's `vr` job be the gate and hold the merge with auto-merge. Details in `apps/storybook/vr/README.md`.

## Branches and releases

- **Branch names, three cases.** Linear issue exists → use Linear's generated name (`dkurkin/han-44-…`), which auto-links the PR to the issue. Decision work with no issue → `d56-control-radius`. Anything else → `fix/`, `docs/`, `chore/`.
- **One branch, one PR, then delete it.** Squash-merge is the repo default, so a merged branch's commits never appear on `main` by hash — `git branch --merged` will not list them. **Before deleting, fetch, then scope the diff to the files the branch touched, against `origin/main`:**

  ```bash
  git fetch origin && git diff origin/main <branch> -- $(git diff --name-only origin/main...<branch>)
  ```

  Empty output means every file the branch touched is identical on `origin/main`, so the branch is safe to delete. **Read the output before deleting** — the check is worthless if the delete runs regardless.

  **When the scoped diff comes back non-empty, run the ancestor check before believing it:**

  ```bash
  git merge-base --is-ancestor origin/<branch> origin/main && echo ABSORBED
  ```

  `ABSORBED` is conclusive — the tip is already in `main`'s history, the branch holds nothing, delete it. **Silence is not the opposite.** Because squash-merge rewrites the commit, a normally-merged branch is *never* an ancestor: measured on the merged heads of #96, #97 and #98, all three exit non-zero. So this check stays silent for most branches you are about to delete legitimately. It is a fast yes, not a verdict — on silence, fall back to reading the scoped diff.

  This is what settles the scoped diff's **first** false positive: **non-empty purely because `main` edited the same file later.** Hit on `claude/progress-review-goals-fsnch5` (2026-08-10), whose diff showed a real `ci.yml` hunk while the branch had **zero unique commits** — `main` had added the `pnpm test:site` step after it. The tell is in the diff you already have: every line was a `-` and none was a `+`, i.e. the branch *lacks* what `main` has rather than carrying anything of its own. Same shape as the two earlier instances on `fix/absorbed-check-stale-main` and `fix/branch-absorbed-check`.

  **There is a second false-positive shape, and the all-deletions tell does not catch it: a consumed changeset reappears as a new file.** `changeset version` *deletes* the `.changeset/<name>.md` file on `main` when it cuts the release, so a fully-absorbed branch still carries that file and the scoped diff shows it as a pure addition. Measured on `origin/d78-eval-gaps-cycle` (2026-08-13): **19 insertions / 39 deletions across 6 files**, of which **17 insertions are `.changeset/eval-gaps-cycle.md` alone** — a file `main` will never have again, because 0.16.0 consumed it. Four of the six files were pure deletions (the `main`-moved-ahead shape, including `.psi-sr-only` added later by D80), and the sixth was a one-line `llms.txt` swap of the same kind. The branch was absorbed; D78's Pagination clamp and D79's utility roster are both on `main`. **Applying the all-deletions heuristic to that diff says "keep it".** So: before concluding a branch carries work, check whether the `+` lines are confined to `.changeset/` — if they are, that is the release consuming the changeset, not the branch holding anything.

  Three checks that look right and are not. `git cherry -v main <branch>`: the squashed commit's patch-id matches no individual commit, so every commit shows `+` and a fully-merged branch reads as if it still carries work (confirmed on a 13-commit branch). An **unscoped** `git diff`: non-empty whenever `main` has merely moved ahead — 1379 deletions on a fully absorbed branch. And the scoped diff against **local `main` instead of `origin/main`**: a stale local `main` reports a fully-absorbed branch as carrying work — 47606 bytes on a branch whose content was already on `origin/main`, because local `main` sat 3 commits behind. Local `main` is stale by default whenever PRs merge remotely, which is every time.
- **Arm auto-merge at PR creation, then verify it armed.** `gh pr merge <n> --auto --squash` exits 0 and prints nothing while leaving auto-merge OFF. Always read it back with `gh pr view <n> --json autoMergeRequest`; if it says null, use the `enablePullRequestAutoMerge` GraphQL mutation, which does work. This matters because the `protect-main` ruleset sets `strict_required_status_checks_policy`, so a second open PR goes stale and needs a full ~5.5-min `ci` re-run.
- **Every user-visible change carries a changeset.** `packages/*` are versioned in lockstep at one number.
- **Cut a release whenever `.changeset/` is non-empty and `main` is green** — don't let them pool. Four accumulated once and left D53 merged-but-unpublished across three decisions.
- **After every publish, run `pnpm verify:published`** (D75). It installs the real tarballs into a scratch project outside the workspace and checks what the workspace structurally cannot: `exports` conditions, `LICENSE` in the tarball, and that every identifier a published preset renders is actually importable. It has caught two real bugs that all five CI gates missed — D68's `./styles` TS2882 and D74's unexported `IconMoreHorizontal`, the latter shipping in two releases because this run was manual and got skipped. It takes a version argument (`node tools/verify-published.mjs 0.14.0`) so a regression can be bisected.
- Release: branch `release/psi-x.y.z` → `pnpm changeset version` → PR → merge → `pnpm release` locally. `pnpm release` now ends in `git push --tags` (`changeset tag` creates tags but never pushes them — that gap silently stranded 0.8.1's tags after publish). Needs npm auth, and **npm 2FA means it must run in an interactive terminal** — non-interactive shells fail with `ERR_PNPM_OTP_NON_INTERACTIVE` before publishing anything. `tools/release-guard.mjs` refuses anything but a clean, up-to-date `main`.

## gstack (recommended)

This project uses [gstack](https://github.com/garrytan/gstack) for AI-assisted workflows.
Install it for the best experience:

```bash
git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup --team
```

Skills like /qa, /ship, /review, /investigate, and /browse become available after install.
Use /browse for all web browsing. Use ~/.claude/skills/gstack/... for gstack file paths.
