# One focus ring: a width and two offsets as tokens, and a gate that tabs through every story (D82)

Date: 2026-09-30. Status: **Implemented** on branch `d82-focus-ring`.

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
the focused element. 130 stories.

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
5. **Dialog draws the browser's ring in two places**, and
   `dialog.module.css` has no focus rule. Chromium makes a scroll container
   keyboard-focusable, and both of these are scroll containers:
   - the `<dialog>` itself is a tab stop in `form-dialog` and in all three
     drawer stories;
   - in `drawer-long-content` the scrolling `.panel` takes the dialog's
     initial focus, so the drawer opens with the browser's ring around it.
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
    - The family is unscoped under D46, as `size` and `radius` are. It joins
      the scale-family prefixes a semantic token name may not start with.
  - **One shape.** Every focus rule is
    `outline: var(--psi-focus-ring-width) solid var(--psi-<name>-focus-ring)`
    with `outline-offset` bound to one of the two offsets. The per-component
    `-focus-ring` colour tokens stay; they are what a consumer overrides.
  - **Inset where an outside ring would be clipped or would land on a
    neighbour**: `Input`, `Select`, a `Tab`, a Menu item, the `<dialog>` and
    its scrolling panel. Everything else draws outside.
    - Inset means `-2px`, the ring wholly inside the control's border box.
      `-1px`, which `Input` and `Select` used, leaves half the ring outside,
      where a drawer against the viewport edge would lose it.
    - So `Input` and `Select` move from `-1px` to `-2px`. This is the one
      change a consumer sees.
    - A `Tab` keeps `-2px`. A `TabPanel` keeps `2px` outside. The brief lists
      "Tabs' panel" among the inset controls; it has the two the wrong way
      round. An inset panel ring was tried and looked at: a panel has no
      padding of its own, so the ring is drawn over the first pixels of its
      content.
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
      `outline-offset`; an `outline` declared under a selector without
      `:focus-visible`; and `outline: none`. `psi/component-tokens-only`
      admits the `focus-ring` scale family.
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
      kept item 6 wrong. It also found what the brief did not list: the
      `<dialog>` as a tab stop in four stories.
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
  - the scale, its machine-readable copies and the prefix guard: 5 tests
    across `scales.test.ts`, `emit-json.test.ts`, `emit-dtcg.test.ts` and
    `validator.test.ts`;
  - the colour tokens: `menu-tokens.test.ts` and `dialog-tokens.test.ts`;
  - the lint rule: 9 tests in `stylelint-focus-ring.test.ts`. Then
    `pnpm lint:css` on the unchanged component CSS: **26 errors across 10
    modules** (22 literals, 4 declarations keyed on `:focus`);
  - the sweep, against a build with the tokens and the unchanged CSS:
    **24 of 130 stories red** — seven Menu stories, four Dialog stories, and
    thirteen holding an `Input` or a `Select`. The other 106 passed.
- **After the change:** `pnpm lint:css` clean; the sweep 130 of 130; the
  whole interaction set 144 of 144.
- **The five gates** of `CLAUDE.md` green: 2297 tests in 92 files (2284 in 91
  before), docs drift at 34 components and 13 patterns, site gate 9 of 9.
- **The token build, diffed against the pre-change `dist`.** The only
  differences are the three scale properties in `base.css`, the two colour
  tokens in `components.css` and their `.vars.css` files, `focusRing` in the
  four `resolved` and four DTCG files, the guidance line, and the validator's
  prefix list. No colour and no existing token moved.
- **Looked at, not only measured**, in light and ember: the open Menu, a long
  drawer before and after scrolling, the `<dialog>` as a tab stop, a focused
  `Input`, `Select`, `Tab` and `TabPanel`. The panel's ring stays on the
  scrollport and above the content as the drawer scrolls.

## Consequences

- **Visual regression.** These baselines change by design and must be
  refreshed from CI's `vr-baselines` artifact, per
  `apps/storybook/vr/README.md`:
  - every story that opens a Menu, because its first item is focused: the
    browser's ring becomes Psi's;
  - `drawer-long-content`: the panel's ring becomes Psi's.
  A story with no focused element is pixel-identical, which includes every
  `Input` and `Select` story.
- **Consumers see one change without touching their code:** the ring on
  `Input` and `Select` sits one pixel further in. It is a `minor`.
- **Safari and Firefox were not measured.** Only Chromium is installed for
  Playwright here. If either does not match `:focus-visible` on a `Select`
  after a pointer click, that `Select` shows no ring until the keyboard is
  used, which is how `Button` already behaves everywhere.
- **Every later component of this release** (D83–D88) inherits the sweep: a
  new story with a tab stop that does not draw the ring fails CI. The sweep
  is not one of the five local gates; run `pnpm test:e2e` after `pnpm build`.
- **Not done here, recorded for later:** a long drawer's panel taking the
  dialog's initial focus is the browser's choice of focus delegate. It
  belongs to the `Dialog` initial-focus work listed for Psi 0.22.
