# Visual regression has no budget: `maxDiffPixels` 48 → 0, and the stale Select baselines refreshed (D89)

Date: 2026-10-01. Status: **Implemented** on branch `d89-select-chevron-baselines`.

Provenance: a consequence recorded by D87 (`2026-10-01-filter-form-design.md`,
Consequences). D81 (#112, 2026-09-28) redrew the `Select` chevron as two
`linear-gradient` strokes. D87 had to re-baseline stories holding a `Select`
for its own reasons and found their chevron darker than the committed one —
a change `vr` had passed for three days, because it sits under
`maxDiffPixels: 48`. D87 refreshed its own stories and left "the stale ones
elsewhere … for a refresh of their own". This is that refresh, and the
question it raises: should `vr` catch a change this small?

## What's there today

Measured on `main` at `a1ab416` (D86) and again at `cd9d918` (D87).

1. **Ten stories render a Psi `Select`.** Every one of the 165 stories was
   loaded from the built Storybook and searched for a visible `<select>`
   whose computed `background-image` is the D81 gradient. No story renders a
   hidden or a non-Psi `<select>`. After D87 there are twelve: D87 added
   `components-toolbar--filter-form` and `patterns-presets--filter-form`,
   both baselined from CI.
2. **Nine of them had pre-D81 baselines** — 18 screenshots in light and
   ember. `patterns-presets--cursor-pagination` was baselined by D85
   (2026-09-30), after D81, and was current. D87 refreshed six of the 18
   (`components-field--default`, `components-toolbar--filter-toolbar`,
   `components-toolbar--wrapping`); **12 remained stale**:
   `components-select--{default,error,disabled,all-sizes}` and
   `patterns-presets--{filter-toolbar,table-pagination}`, in both themes,
   dated 2026-07-21 to 2026-08-10.
3. **The change is the chevron and nothing else, and it is not cosmetic.**
   CI's render against each stale baseline, compared at threshold 0 (any
   channel, any amount):
   - same image size in all 18;
   - **exactly 20 changed pixels per chevron** (80 in `all-sizes`, four
     `Select`s), every one inside the chevron's box at the control's end;
   - **0 changed pixels anywhere else.**

   The old chevron was faint; the new one binds `chevron-fg`. Strongest
   chevron pixel against the control's background, WCAG contrast:

   | Screenshot | Committed (pre-D81) | CI render (D81) |
   | --- | --- | --- |
   | `select--default` light | 2.06 | 4.92 |
   | `select--default` ember | 1.71 | 8.48 |
   | `select--disabled` ember | 1.16 | 2.22 |

   The pre-D81 chevron failed WCAG 1.4.11 (3:1) in both themes. D81 fixed a
   non-text-contrast failure, and `vr` could not tell the difference between
   that fix and noise.
4. **At the configured threshold 0.02, Playwright counts 7–10 px per
   chevron** (29 and 36 for `all-sizes`) — of the 20 that changed, the rest
   move less than the threshold. HAN-20 chose 48 as "above the noise floor
   (0) and below the smallest label signal (54)". 54 was the smallest signal
   *measured then*; this one is **7**.
5. **The noise floor holds at 0 across a full CI run.** A probe commit set
   `maxDiffPixels: 0` (CI run 36840962017): **18 failed, 506 passed** — the
   18 are exactly the pre-D81 `Select` screenshots of item 2, and every
   other screenshot in the suite matched its baseline at 0 diff pixels. This
   repeats HAN-20's same-environment measurement on CI's own runner.

## Decisions

- **D89 — `vr` allows no differing pixels: `maxDiffPixels` is 0, and the
  per-pixel `threshold` stays 0.02.** A budget exists to absorb noise, and
  there is none to absorb: 506 of 506 unchanged screenshots measured 0 on
  CI, as every same-environment re-render has since HAN-20. Any non-zero
  budget therefore only sets the size of a real change that goes unseen —
  and a 1.71 → 8.48 contrast change came in at 7.

  Weighed and not taken:

  - **Keep 48.** Item 3 is the counter-example: a WCAG failure and its fix
    both pass.
  - **A small non-zero budget**, say 4 — under the chevron's 7. The number
    would be fitted to the one small signal found so far, not to any
    measured noise; the next smaller change (a glyph's stroke, a 1 px
    offset on an icon) would slip under it the same way.
  - **Per-region checks** — screenshot each component's element with its own
    budget. `maxDiffPixels` is already absolute (HAN-20 removed the
    area-scaled ratio), so the chevron counts 7 whether the region is the
    page or the `Select`; a smaller region does not make a small change
    bigger. Regions pay off when noise is local (an animated area, a
    caret) and the rest can be held strict. There is no noise, local or
    otherwise. They would add a selector list to maintain and multiply
    screenshots in a job that already takes 9 minutes for 524.
  - **Threshold 0 as well.** 0.02 already counts the chevron; at 0 it would
    count 20 instead of 7–10 — a different measure of the same failure, not
    a failure caught that is missed now. HAN-20's reasons for 0.02 stand,
    and one knob moves at a time.

  **Flakiness** is the cost a zero budget risks, and the evidence against it
  is the probe run above plus this PR's own runs (Verification). Playwright
  already waits for two consecutive identical captures before it compares,
  which absorbs in-page settling. **If a screenshot ever fails with no
  source change behind it, that is the first measured noise**: record the
  story, theme and pixel count, and set the budget above that measurement
  only — if it lands at or above 7, per-region checks become the better
  answer, not a larger global budget.

## Changes

- `apps/storybook/vr/playwright.config.ts`: `maxDiffPixels: 48` → `0`, with
  the reason beside it.
- `apps/storybook/vr/README.md`: the budget, a "Why the budget is 0 (D89)"
  section, and the refresh workflow's step 3 corrected — CI's renders in the
  `vr-baselines` artifact are the `test-results/**/*-actual.png` files; the
  artifact's `stories.spec.ts-snapshots/` folder is only the committed
  baselines coming back.
- **12 baselines replaced** with CI's renders from run 36840962017, the
  files listed in item 2.
- `CLAUDE.md`: one line under the `vr` bullet.

No changeset: nothing published changes.

## Verification

- **Which stories:** the Storybook scan of item 1, run on the D86 build and
  again on the D87 build after rebasing. On the D87 build, every one of the
  24 `Select` screenshots now carries the new chevron in its committed
  baseline.
- **What changed in each image:** item 3, computed for all 18 of the probe's
  failures against their committed baselines, not sampled; and looked at,
  zoomed, for `select--default` in light and ember and `all-sizes`.
- **The five gates** of `CLAUDE.md` green locally: 2437 tests in 103 files,
  docs drift clean, the site gate 9 of 9.
- **`vr` on CI at budget 0, rebased on D87:** run 36843237571, **537 passed,
  0 failed**. Every screenshot in the suite matched at 0 diff pixels — the
  12 refreshed here, the 6 D87 refreshed, and everything else. With the
  probe, that is two full runs on CI's runner with no noise; the commit
  recording this ran a third (see the PR).

## Consequences

- **Any visual change of any size fails `vr`** until CI's render is
  committed beside it — the D87 workflow becomes the only workflow. A PR that
  touches a shared primitive should expect to refresh every story it
  reaches, and its spec should name them.
- **A change in CI's runner image fails more screenshots than before.**
  HAN-20 already accepted a mass refresh in that case; the budget of 48 was
  never large enough to absorb a font-stack change either.
- **D87's open consequence is closed:** no committed baseline holds the
  pre-D81 chevron.
- **Older plans cite `maxDiffPixels: 48`** (`2026-07-31-control-radius.md`,
  `2026-07-20-d46-token-scopes.md`). They are records of their cycle and stay
  as written.
