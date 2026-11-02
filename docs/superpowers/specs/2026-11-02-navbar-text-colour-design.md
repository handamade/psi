# `NavBar` sets its own text colour (D111), and the CI image (D112)

Date: 2026-11-02. Status: **Implemented** on branch `fix/navbar-text-colour`.

Provenance: the Web Portal, trying D110's documented way. The user's decision on
where to fix it: "Fix it in Psi". The number is the first free `## Decisions`
entry: D110 is the highest claimed, and no PR was open. It is a number of its own
and not an amendment to D110 because it adds a token and changes a bar that has
nothing to do with the frame.

## What's there today

Measured on `main` (`29bbc1b`) in Chromium, with plain text added to the `Frame`
stories' `actions`.

1. **`.navbar` sets no `color`.** A custom property re-resolves under
   `data-psi-theme`, but `color` inherits as a resolved value, so a bar under a
   sub-theme keeps the page's text colour:

   | Page theme | Plain text in the bar | `dark`'s `fgPrimary`, on that bar |
   | --- | --- | --- |
   | `light` | `oklch(0.3 0.03 250)`, dark on a dark bar | `oklch(0.93 0.01 250)` |
   | `ember` | `oklch(0.949 0.011 72)`, readable by chance | `oklch(0.93 0.01 250)` |

   The Portal measured a plain `<span>` under `vega-night`: Ink `rgb(35,31,32)` on
   Night `rgb(15,21,38)`, 1.11:1.
2. **Only plain text is affected.** `Button` and the anchors in `brand` and the
   links set their own colours. `.sidebar` sets
   `color: var(--psi-app-shell-sidebar-fg)`, which is why D110's sidebar was fine.
3. **D110's `Frame` stories hold no plain text**, so they did not show this.

## Decisions

- **D111 — `.navbar` paints `--psi-navbar-fg`, default `var(--psi-fg-primary)`.**
  - **The same shape as `--psi-app-shell-sidebar-fg`:** a component token aliasing
    the semantic layer, declared under `:where(:root, [data-psi-theme])`, so it
    re-resolves under the attribute. No prop.
  - **No contrast pair.** `fgPrimary` on `bgPrimary` is gated in every theme. The
    default `--psi-navbar-bg` is that canvas at 0.82 with the page behind it, and
    `--psi-navbar-link-fg-hover` and the brand's anchors have always painted
    `fgPrimary` on it, with no pair of their own. The pinned pair count does not
    move. A theme that sets another `navbar-bg` picks a surface, as with
    `--psi-card-bg`. The scope gate refuses a surface token on `navbar-fg`, and a
    test pins that.
  - **The fix sits on `NavBar`, not on `[data-psi-theme]`.** A base rule giving
    every sub-themed element `color: var(--psi-fg-primary)` would cover more, and
    would change the text of every consumer's sub-themed block, in a layer that
    has no such rule today. It is the wider question and it is not this defect.

  **What this changes.** One token and one declaration. A consumer whose `body`, or
  an ancestor of the `NavBar`, sets a colour other than `--psi-fg-primary` sees plain
  text and `currentColor` icons in the bar move to `--psi-fg-primary`. Setting
  `--psi-navbar-fg` keeps theirs, and a test pins that. An unlayered `color` of their
  own on the `<header>` still wins.

## Verification

- **Tests first**, red before the change:
  - `app-shell.interaction.spec.ts` (`@interaction`): in `Frame`, in light and
    ember, the text computes the bar's `--psi-fg-primary` and that differs from the
    page's. A token set on the bar sets the text.
  - `NavBar.test.tsx`: the module binds the token. `app-shell-tokens.test.ts`: the
    default, and the scope gate on `navbar-fg`.
- **Baselines.** Every story is compared with the build of `main`, as pixels, in
  VR's matrix. Storybook's `body` is `--psi-fg-primary`, so the bars that are not
  under a sub-theme should not move.
- **Gates:** `pnpm build`, `check-docs-drift`, `pnpm test`, `pnpm lint`, the promo
  build and `pnpm test:site`.

### Measured

- **Red first.** Unit: 2 failed on assertion before the change; the scope-gate case
  passed, since it pins behaviour the gate already has. Browser, against `main`'s
  CSS with the story's text in place: both colour specs failed, with the values in
  finding 1.
- **Baselines.** All 206 stories, 424 renders, were rendered from `main`'s CSS and
  from this branch and compared byte for byte in Chromium on macOS: 420 identical, 4
  differing. The 4 are `Frame` and `FrameSidebarClosed` in light and ember, the only
  stories with plain text under a sub-theme, and they differ by that text's colour.
  Both builds held the text, so the comparison isolates the fix. Against `main`'s
  committed baselines the 4 also gain the text.
- **CI's first `vr` run on #150** (41539404975): 886 passed, 8 failed. 4 are those
  renders, differing only inside the text's box, and their baselines are that run's
  `-actual.png`, looked at before committing. The other 4 were not predicted:
  `icons-gallery--all-sizes` and `icons-gallery--size-20` in light and ember, 1 pixel
  over the threshold each, on the anti-aliased edge of `IconSettings`. This branch
  does not reach that icon, `main` passed the same baselines at `29bbc1b`, and they
  are byte-identical locally, so those baselines stay as they are. D112 is the cause.

## The CI image (D112)

Found by #150's `vr`, and landed with it because that PR cannot pass without it.

`ubuntu-latest` moved from Ubuntu 24.04 to 26.04 on 2026-11-02, read from each run's
*Set up job* log:

| Run | Head | Started (UTC) | Image | `vr` |
| --- | --- | --- | --- | --- |
| 41513921243 | #149, `3287438` | 19:52 | `ubuntu-24.04` | pass |
| 41518489796 | `main`, `29bbc1b` | 20:21 | `ubuntu-24.04` | pass |
| 41539404975 | #150, `7b87ab5` | 22:41 | `ubuntu-26.04` | 4 icon renders fail |
| 41541717865 | #150, `3549b6e` | 22:58 | `ubuntu-26.04` | the same 4 fail |

The 4 renders from the two 26.04 runs are byte-identical, so this is no flake: the
image draws `IconSettings`' edge differently. Every other render passes on 26.04.
Chromium is the same build on both, `chromium v1228`, so the difference comes from
the system beneath it. Which library was not measured.

- **D112 — The `ci` job runs on `ubuntu-24.04`, not `ubuntu-latest`.** `vr` allows 0
  differing pixels (D89), so its baselines belong to one image, and a label that
  moves on GitHub's schedule fails every open PR and `main` on a day nothing in this
  repository changed.
  - **No baseline moves.** The committed ones are already this image's renders, apart
    from the 4 `Frame` renders above, which the pinned run checks.
  - **Moving to 26.04 is its own change:** the label and the 4 icon baselines in one
    PR, when this image nears retirement.

  Weighed and not taken:

  - **Refreshing the 4 icon baselines from 26.04, and staying on `ubuntu-latest`.** It
    costs no config, and leaves `vr` red on any run that lands on 24.04 while the label
    is moving. GitHub has rolled such moves out gradually, and a run's image cannot be
    chosen under that label. The next move would fail again unannounced.
  - **A pixel allowance for these renders.** D89 removed one after it hid a real
    change for three days.
- **Local gates:** build, docs drift (52 components, 24 patterns), `pnpm test` (119
  files, 2652 tests), lint, promo build, `test:site` (9) and `test:e2e` (470).
