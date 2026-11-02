# `NavBar` sets its own text colour (D111)

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
- **Local gates:** build, docs drift (52 components, 24 patterns), `pnpm test` (119
  files, 2652 tests), lint, promo build, `test:site` (9) and `test:e2e` (470).
