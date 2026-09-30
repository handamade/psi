# One focus ring: a width and two offsets as tokens, and a gate that tabs through every story (D82)

Date: 2026-09-30. Status: **In progress** on branch `d82-focus-ring`.

Provenance: the first item of the Psi 0.21 portal handoff
(`docs/superpowers/plans/2026-09-30-psi-0.21-portal-handoff.md`, brief D82).
The portal holds itself to WCAG 2.2 AA with zero failures on its primary
flows, in one compact density. A focus indicator that changes shape from one
control to the next, or falls back to the browser's, is the kind of failure
its audit counts. D82 goes first because every later decision of the release
(D83–D88) adds focusable parts, and they should bind the ring from the start.

## What's there today

Measured on `main` at `b85367a`, in Chromium 149 against the built Storybook:
every story loaded, every tab stop visited, the computed `outline` read from
the focused element. 130 stories, 214 tab stops.

1. **The ring's geometry is written out eleven times.** Each component writes
   `outline: 2px solid var(--psi-<name>-focus-ring)` and its own
   `outline-offset`. No token carries the width or the offset, so a brand
   cannot change them, and nothing stops the twelfth copy from differing.
2. **Three offsets are in use.** `2px` on most controls, `-2px` on a `Tab`,
   `-1px` on `Input` and `Select`.
3. **`Input` and `Select` key the ring on `:focus`**, every other component on
   `:focus-visible` (`input.module.css:24`, `select.module.css:43`).
4. **Menu items draw the browser's ring**, `auto 1px rgb(0, 95, 204)`:
   `menu.module.css` has no focus rule. This is in every open-Menu VR
   baseline, because Menu focuses its first item on open.
5. **A long drawer draws the browser's ring, twice.** Chromium makes a
   scroll container keyboard-focusable. In `drawer-long-content` the scrolling
   `.panel` takes the dialog's initial focus, and the `<dialog>` itself is a
   later tab stop. Both show `auto 1px`. `dialog.module.css` has no focus rule.
6. **Toast has no gap.** The handoff brief says Toast's action shows the
   browser default. It does not: the action slot accepts `Button`, `Tag` and
   `IconButton` (`Toast/slots.json`, `contracts.json`), and the dismiss control
   is an `IconButton`. Each already draws the Psi ring, measured at
   `solid 2px` / `2px`. The same holds for Dialog's close button and footer
   buttons. The brief's claim came from the absence of a focus rule in
   `toast.module.css`, not from a browser.
7. **The ring's colour is safe on every surface it lands on, but not gated.**
   `borderFocus` is `fgAccent` unchanged; the matrix gates `fgAccent` on
   `bgPrimary` only. Measured against the elevated surface (`bgSecondary`) and
   a hovered Menu item:

   | Theme | `bgPrimary` | `bgSecondary` | Menu item hover |
   | --- | --- | --- | --- |
   | light | 5.91 | 6.45 | 5.60 |
   | dark | 8.76 | 8.05 | 7.50 |
   | acme | 6.39 | 6.98 | 6.07 |
   | ember | 8.40 | 8.24 | 7.18 |

   WCAG 1.4.11 asks 3.0.

## Decisions

- **D82 — Psi draws one focus ring: its geometry is three scale tokens, every
  focusable part Psi owns binds them on `:focus-visible`, and a real-browser
  gate tabs through every story to prove it.**
  - **Three scale tokens**, in `packages/tokens/src/scales/focus-ring.ts`,
    emitted into `base.css` with the other scales:

    | Token | Value | Use |
    | --- | --- | --- |
    | `--psi-focus-ring-width` | `2px` | the `outline` width |
    | `--psi-focus-ring-offset` | `2px` | a ring drawn outside the control |
    | `--psi-focus-ring-offset-inset` | `-2px` | a ring drawn inside it |

    - They are `px`, not `rem`: a focus ring is a hairline, and today's rings
      are `2px`. Nothing moves for a control that keeps its offset.
    - The inset offset is a literal, not
      `calc(var(--psi-focus-ring-width) * -1)`. A custom property holding
      `var()` is computed where it is declared, at `:root`, so an override of
      the width on a themed sub-tree would not reach it. Three independent
      tokens say what is true.
    - They also appear in `resolved/<theme>.json` (`scales.focusRing`) and in
      the DTCG output (`dimension.focusRing`), so MCP and Figma see them.
    - The family is unscoped under D46, as `size` and `radius` are.
  - **One shape.** Every focus rule is
    `outline: var(--psi-focus-ring-width) solid var(--psi-<name>-focus-ring)`
    with `outline-offset` bound to one of the two offsets. The per-component
    `-focus-ring` colour tokens stay; they are what a consumer overrides.
  - **Inset where the ring would otherwise be clipped or land on a
    neighbour**: `Input`, `Select`, a `Tab`, a `TabPanel`, a Menu item, the
    `<dialog>` and its scrolling panel. Everything else draws outside.
    - `Input` and `Select` move from `-1px` to `-2px`: the ring now sits
      wholly inside the border box instead of straddling its edge.
    - `TabPanel` moves from `2px` outside to inset. Outside, its ring ran
      under the tab list's bottom rule and was cut by any clipping ancestor.
      The brief lists "Tabs' panel" among the inset controls.
    - A `Tab` keeps `-2px`.
  - **`:focus-visible` on `Input` and `Select`**, and their
    `:hover:not(:focus)` guards become `:not(:focus-visible)`, so a control is
    never left with neither a ring nor a hover border. Chromium matches
    `:focus-visible` on both after a pointer click (measured), so nothing
    visible changes there.
  - **Focus rules where there were none**, each with a new colour token
    aliasing `--psi-border-focus`:
    - `--psi-menu-focus-ring`, on a Menu item;
    - `--psi-dialog-focus-ring`, on the `<dialog>` and its panel.
  - **Toast gets no rule and no token.** This departs from the brief, on the
    measurement in item 6. The brief's rule would have been
    `.action :focus-visible`, a descendant rule over a slot that holds a Psi
    control carrying its own ring. At equal specificity, stylesheet order
    would decide which colour token wins, so a consumer who overrides
    `--psi-button-focus-ring` could see it ignored inside a Toast. The rule
    adds a way to be wrong and covers nothing the slot contract allows. For
    the same reason Dialog's footer and body get no descendant rule.
  - **Two gates.**
    - **A stylelint rule, `psi/focus-ring`**, on component CSS Modules. It
      reports a literal number in `outline`, `outline-width` or
      `outline-offset`, and an `outline` declared under a selector without
      `:focus-visible`. `psi/component-tokens-only` admits the `focus-ring`
      scale family.
    - **A browser sweep**, `apps/storybook/vr/focus-ring.interaction.spec.ts`.
      It loads every story, presses *Tab* through it, and fails on any tab
      stop whose computed outline is not `solid`, the token width, and one of
      the two token offsets. It reads the token values from the page, so it
      follows them if they change. It takes no screenshots, so it runs on
      macOS (`pnpm test:e2e`) as well as in CI's `vr` job.
    - One allowance, stated in the spec file with its reason: the Tooltip
      stories' trigger is a raw `<button>` standing in for the consumer's own
      element, which Psi does not style.
    - The sweep replaces the brief's "a test that Menu items and the Toast
      action have a `:focus-visible` rule". A test over CSS text can show a
      rule exists; it cannot show the ring is drawn, and it is what would have
      kept item 6 wrong.
  - **Border width tokens are out**, as the brief says: fifteen literal `1px`
    declarations work, and nothing in the portal needs another width.
  - **The ring's colour is not newly gated.** The margins in item 7 are wide.
    A new pair in the contrast matrix would also apply to every consumer theme
    built with `psi-theme` (D81 made the gates one implementation), so it
    could fail a build that passes today. That is its own decision.
  - **`apps/promo`'s own focus rule binds the tokens too**
    (`promo.css:49`), so the public site shows the ring Psi ships.

## Verification

- **Tests first.** Each went red before its change:
  - the scale: `scales.test.ts` for the three values and their emitted
    custom properties; `emit-json.test.ts` and `emit-dtcg.test.ts` for the
    machine-readable copies;
  - the colour tokens: `menu-tokens.test.ts` and `dialog-tokens.test.ts`;
  - the lint rule: `stylelint-focus-ring.test.ts`, then `pnpm lint:css` red
    on today's component CSS;
  - the sweep: red on `main`'s build for Menu items, the drawer panel, and
    the `-1px` of `Input` and `Select`.
- **The five gates** of `CLAUDE.md`, and `pnpm test:e2e` for the sweep.
- **Byte-level check on the token build**: `packages/tokens/dist` diffed
  against the pre-change build. The only differences allowed are the three
  scale properties, the two colour tokens, and their machine-readable copies.

## Consequences

- **Visual regression.** These baselines change by design and must be
  refreshed from CI's `vr-baselines` artifact, per
  `apps/storybook/vr/README.md`:
  - every story that opens a Menu (its first item is focused): the browser's
    ring becomes Psi's;
  - `drawer-long-content`: the panel's ring becomes Psi's;
  - any story that renders a focused `Input`, `Select` or `TabPanel`.
  Stories with no focused element are pixel-identical.
- **Consumers see two changes without touching their code:** the ring on
  `Input` and `Select` sits one pixel further in, and a `TabPanel`'s ring is
  drawn inside the panel. Both are `minor`.
- **Safari and Firefox were not measured.** Only Chromium is installed for
  Playwright here. If either does not match `:focus-visible` on a `Select`
  after a pointer click, that `Select` shows no ring until the keyboard is
  used, which is how `Button` already behaves everywhere.
- **Every later component of this release** (D83–D88) inherits the sweep: a
  new story with a tab stop that does not draw the ring fails CI.
- **Not done here, recorded for later:** the long drawer's panel taking the
  dialog's initial focus is the browser's choice of focus delegate, and
  belongs to the `Dialog` initial-focus work listed for Psi 0.22.
