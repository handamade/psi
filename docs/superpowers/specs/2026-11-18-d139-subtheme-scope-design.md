# A sub-theme keeps the page's geometry (D139), and a NavBar brand that lines up with the AppShell sidebar (D140)

Date: 2026-11-18. Status: **Accepted**, building on branch `d139-subtheme-scope`.

**The numbers.** D139 and D140 were checked free with `git grep -w` on every
branch on `origin` and on the one open PR on 2026-11-18, before writing. D137
(icons) and D138 (NavTree tokens) belong to sessions running beside this one.
**Check again when the PR opens.**

Two decisions, not one: D139 changes how every component token is emitted and
is a behaviour change for every consumer that nests a theme; D140 is a NavBar
feature that needs D139 to work under a header sub-theme. They ship in one PR
because D140's alignment is wrong without D139.

## What's there today

1. **Every component token is declared on every theme.** `components.css`
   declares all 416 `--psi-<component>-*` tokens under
   `:where(:root, [data-psi-theme])` (`packages/tokens/scripts/emit-components.ts`).
   This is on purpose. A `var()` resolves on the element that declares it, and
   descendants inherit the result, so `--psi-nav-tree-item-fg:
   var(--psi-fg-secondary)` has to be declared again on a `data-psi-theme="dark"`
   sidebar, or the sidebar keeps the light page's colour (D88, D111).
2. **A page theme's `componentOverrides` stop at a sub-theme.** They are
   emitted under `[data-psi-theme="<theme>"]` (`src/emit/css.ts`). Inside a
   nested `data-psi-theme` element the `:where()` rule matches that element
   itself and puts Psi's default back.
3. **Measured.** A static page, Chromium (the app's browser pane): `base.css`,
   `ember.css`, `dark.css` and `components.css` from this branch's build, with
   `<html data-psi-theme="ember">` plus a page block overriding
   `app-shell-sidebar-width: 18rem`, `control-radius: 0`, `navbar-gutter:
   16px`, `button-radius: 9999px` and `card-bg: var(--psi-bg-secondary)`. A
   `data-psi-theme="dark"` element inside it reads:

   | token | page | inside the dark sub-theme |
   |---|---|---|
   | `app-shell-sidebar-width` | 18rem | **16rem** |
   | `card-radius` (ember's own shipped override) | 0 | **0.5rem** |
   | `control-radius` | 0px | **0.5rem** |
   | `navbar-gutter` | 16px | **2.5rem** |
   | `button-radius` | 9999px | **0.5rem** |
   | `nav-tree-item-fg` | ember | dark (correct) |

   So a `NavBar` under a dark `data-psi-theme`, or an `AppShell` sidebar under
   `sidebarTheme`, reads the default sidebar width, not the page's. Ember's
   square cards turn round inside any dark region. A consumer worked around it
   by copying the width into a custom property of their own on the shell's
   root.
4. **Docs already route around it.** `AppShell`'s doc comment and
   `packages/react/llms.txt` (D114) say that a sidebar border width set on the
   shell's root "does not reach" a themed sidebar and must go in that theme's
   `componentOverrides`.

## The candidate rules, measured

Three emitters, the same page, `getComputedStyle` on an element inside the
dark sub-theme, and on a second sub-theme, `dusk`, whose own
`componentOverrides` set `control-radius: 3px`. `sidebar-border-width: 1px` is
set inline on a plain wrapper around the dark sub-theme.

- **R0**, today: every token under `:where(:root, [data-psi-theme])`.
- **R1**, the brief's candidate: a token whose value holds a `var()` to
  anything but a base scale is declared on every theme; the rest (`16rem`,
  `0`, `var(--psi-space-24)`) at `:root` only.
- **R2**, chosen: a token is declared on every theme only if it can carry a
  theme's colour: its key names a colour, or its value reaches a semantic token
  or palette entry, directly or through another such token. Everything else is
  declared at `:root` only, and a theme's overrides also re-declare the
  page-scoped aliases that read them.

| inside the dark sub-theme | R0 | R1 | R2 |
|---|---|---|---|
| `app-shell-sidebar-width` (page 18rem) | 16rem | 18rem | **18rem** |
| `card-radius` (ember 0) | 0.5rem | 0 | **0** |
| `navbar-gutter` (page 16px) | 2.5rem | 16px | **16px** |
| `button-radius` (page 9999px, an alias by default) | 0.5rem | **0px** | **9999px** |
| `app-shell-sidebar-border-width` (1px on a wrapper) | 0 | 1px | **1px** |
| `card-bg` (page: ember's `bg-secondary`) | transparent | **ember's colour** | **transparent** |
| `nav-tree-item-fg` | dark | dark | dark |

| inside `dusk` (its own `control-radius: 3px`) | R0 | R1 | R2 |
|---|---|---|---|
| `control-radius` | 3px | 3px | 3px |
| `button-radius`, `input-radius`, `nav-tree-radius` | 3px | 3px | **3px** |

R1 fails twice. `card-bg`'s default is the literal `transparent`, so R1 puts it
at `:root`, and the page's resolved ember colour then reaches into the dark
sub-theme: a light-theme surface under dark text, which no contrast gate
checks. And `button-radius`, an alias of `control-radius` by default, is
declared again in the sub-theme, so a page that overrides `button-radius`
itself loses it there. R2 keeps every geometry override and keeps colours
local to their theme.

What R2 gives up, measured on the same page: a dial set **inline on a
sub-theme element** (`<div data-psi-theme="dark" style="--psi-control-radius:
3px">`) changes `control-radius` there, but `button-radius`, `input-radius` and
`nav-tree-radius` keep the page's value (`9999px`, `0px`, `0px`). R0 re-derived
them. The same dial in that theme's `componentOverrides` does re-derive them
(the `dusk` row). This is the caveat `toolbar-action-offset` already documents
(D92): an alias resolves where it is declared.

## Decisions

### D139 — A component token is declared on every theme only when it can carry a theme's colour; geometry, type and motion are declared at `:root`, so a sub-theme inherits the page's

**The rule** (`packages/tokens/src/emit/component-scope.ts`,
`classifyComponentTokens`). A component token is **theme-scoped**, declared
under `:where(:root, [data-psi-theme])` as before, when:
- its key names a colour: it has a `bg`, `fg` or `border` segment (the D46
  suffixes, `keyGroup`) and its last segment is not a measure (`width`,
  `radius`, `offset`, `size`, `height`, `gap`, `padding`, `inset`).
  `accent-bg-hover` and `inline-alert-border-danger` name colours;
  `sidebar-border-width` and `navbar-border-width` are the only shipped keys
  the exception catches; or
- its value reaches a semantic token (any key of the theme definition) or a
  palette entry (`--psi-palette-*`), directly or through another theme-scoped
  component token. This catches the colour keys without a suffix:
  `focus-ring`, `indicator`, `backdrop`.

Every other token is **page-scoped**, declared under `:where(:root)` only. A
reference to a base value (`--psi-space-*`, `--psi-radius-*`, `--psi-text-*`,
`--psi-gutter`, `--psi-focus-ring-*`) counts as page: base values are declared
once, at `:root`, by `base.css`. With D140's three new tokens that is 176
page-scoped tokens and 243 theme-scoped ones, of 419.

`components.css` keeps one `@layer psi.components` block per component, now
with up to two rules, `:where(:root)` then `:where(:root, [data-psi-theme])`.
Both have zero specificity, so D34's rule that a theme's
`[data-psi-theme="<name>"]` overrides win regardless of import order holds.

**A theme's overrides re-declare the aliases that read them**
(`overrideDependents`, used by `emitThemeCSS`). A page-scoped alias resolves
once, at `:root`: `--psi-button-radius: var(--psi-control-radius)`. A theme
applied to a narrower element that overrides `control-radius` would change the
dial and not the button. So the theme's `[data-psi-theme="<name>"]` block
declares, after its overrides, every page-scoped token that reaches an
overridden token through `var()`, with Psi's default value, unless the theme
overrides that token too. They re-resolve wherever the theme is applied. A
theme that overrides `control-radius` gets 9 such lines, the radius aliases
(`button-radius`, `input-radius`, `tooltip-radius` and the rest). Ember's three
overrides reach nothing, so `ember.css` is unchanged.

**Consequences, worked out.**
- **An alias to a geometry dial** (`nav-tree-radius: var(--psi-control-radius)`,
  `toolbar-action-offset`, every `button-<size>-height`): page-scoped. It
  follows a page theme's dial through the theme's re-declared dependents, and
  a sub-theme's dial the same way. A dial set by hand on a narrower element,
  outside any theme, does not reach it. Set the alias beside it, as
  `toolbar.ts` already says.
- **A sub-theme's own `componentOverrides`**: unchanged in kind. They apply on
  the sub-theme's element and inherit into its subtree, geometry and colour
  alike, and the nearest theme that sets a token wins. A sub-theme that sets a
  dial re-derives its aliases (the `dusk` row), over a page that set the alias
  itself: the nearer theme said something about that family.
- **A page theme's alias overrides do not reach a sub-theme when they are
  colour.** `button-accent-bg: var(--psi-fill-accent-strong)` in a page theme
  stays in the page theme: the token is theme-scoped, so a sub-theme declares
  its default again and resolves it against its own palette. That is the right
  outcome, not a gap: the page theme's override was contrast-gated against the
  page theme's palette, not the sub-theme's. **Geometry overrides do reach
  it**, whether a literal (`18rem`) or an alias (`var(--psi-space-16)`).
- **The scope gate** (`scope-gate.ts`, `checkOverrideScopes`). A
  page-scoped token is never declared again under a sub-theme, so an override
  that binds a semantic token there would carry the page's resolved colour
  into every sub-theme inside it. The gate now refuses that: an override of a
  page-scoped token may not reach a semantic token or a palette entry. The
  violation's group is `"page"`, and `ThemeGateError` says the token is
  page-scoped and why. No shipped theme trips it (ember's `media-tint` is a
  filter chain with no `var()`). Colour overrides of colour keys are checked as
  before (D46).
- **`buildThemeCss`** (`src/theme/`). It calls the same `emitThemeCSS` and
  `gateTheme`, so a consumer's theme gets the re-declared dependents and the
  new gate with no change of its own. Its contract does not change: a theme
  file still holds the theme's tokens and its overrides, and `components.css`
  is still Psi's.
- **`data-psi-theme` on `<html>` only** (the common case): no visible change.
  The page theme's element is `:root`, both rules match it, and nothing
  nests.
- **Fonts.** `--psi-font-*` and the `--psi-text-*` combos are base values and
  count as page. That changes nothing: the combos substitute their font at
  `:root` already, which is why brand fonts fully apply only on the root
  (guidance `fonts.scope`).

**Behaviour change.** Every consumer that nests a theme sees it. Inside a
nested `data-psi-theme`, geometry, type and motion tokens now keep the value of
the page around them (the page theme's `componentOverrides`, or a value set at
`:root` or on any ancestor) instead of Psi's default. Colour tokens behave as
before. A dial set inline on a nested theme element no longer re-derives its
aliases; put it in that theme's `componentOverrides`. The changeset says so in
these words.

**Docs.** `AppShell`'s doc comment, `packages/react/docs/AppShell.md` (generated)
and `packages/react/llms.txt` drop D114's "a width set on the shell's root does
not reach a themed sidebar": it now does. `app-shell.ts` and `toolbar.ts`'s
comments name the two scopes. `packages/tokens/llms.txt` states the rule.
`nav-tree.ts` keeps its comment, which says its colour keys resolve under a
dark sidebar: still true. (That file belongs to D138's session.)

### D140 — `NavBar brandAlign="sidebar"` sizes the brand slot to the AppShell sidebar, with the leading icon on the sidebar's icon column

**The ask.** In an `AppShell`, the header's leading Menu button and brand span
the sidebar's width, and the Menu icon starts on the column where the sidebar's
icons start.

**The geometry today.** The sidebar pads its tree by `space-8`, hardcoded in
`app-shell.module.css`. A `NavTree` entry pads its content by `space-12`. So
the sidebar's icons start **20px** from the frame's inline-start edge. A fluid
`NavBar` pads its row by `--psi-navbar-gutter` (`--psi-gutter`, 24px or 40px
by breakpoint), and a 32px `IconButton` centres its icon, so a 16px icon (the
size of the sidebar's, `--psi-nav-tree-icon-size`) sits 8px in. So the Menu
icon starts at 32px with the default 24px gutter, and at 24px with a 16px one.
An icon left at its default 20px sits 6px in.

**Prop, not only tokens.** `AppShell` receives the header as a `ReactNode` and
cannot style inside it, so the switch has to be on `NavBar`. A documented token
pair alone would leave every consumer to write the margin and width
arithmetic, which is what the consumer's own CSS does today. The tokens exist
anyway, so a consumer can retune them.

**API.**
- `NavBar` takes `brandAlign?: "sidebar"`. A string union, not a boolean,
  leaves room for another column without a second prop. With `"sidebar"`:
  - the row is laid out fluid (`fluid` is implied): the alignment counts from
    the bar's edge, which a centred `psi-container` column is not;
  - the brand slot starts `--psi-navbar-brand-inset` from the bar's
    inline-start edge (`margin-inline-start: calc(inset - gutter)`, negative
    when the gutter is wider) and ends at `--psi-navbar-brand-width` from it
    (`inline-size: calc(width - inset)`), `flex: none`;
  - the row's 24px gap then starts the links or actions where the page starts,
    one `main-padding-inline` (24px) into `main`;
  - all logical properties, so it mirrors in right-to-left.
- New tokens:
  - `--psi-app-shell-sidebar-padding: var(--psi-space-8)`, bound in
    `app-shell.module.css`, so the sidebar's inset is a token the header can
    follow;
  - `--psi-navbar-brand-width: var(--psi-app-shell-sidebar-width)`;
  - `--psi-navbar-brand-inset: calc(var(--psi-app-shell-sidebar-padding) +
    var(--psi-space-12) - (var(--psi-button-32-height) -
    var(--psi-nav-tree-icon-size)) / 2)`, 12px: where a 32px `IconButton`
    starts so that a 16px icon in it, the size of the sidebar's icons, lands
    on the sidebar's icon column. The doc comment names `<IconMenu size={16} />`:
    an `IconButton` does not size its icon, and a default 20px icon would sit
    2px early. `space-12` is the NavTree entry's padding, hardcoded in
    `nav-tree.module.css`. That file belongs to D138's session, so it gets no
    token here (follow-up).
  - All three are page-scoped under D139, so a header under
    `data-psi-theme="dark"` reads the page's sidebar width.
- **The brand keeps its width when the sidebar is closed**, so the Menu button
  does not move under the pointer that toggled it.
- **Where the width is set.** In a theme's `componentOverrides` or at `:root`,
  `--psi-app-shell-sidebar-width` moves the column and the brand together (the
  theme re-declares `--psi-navbar-brand-width`, D139). Set inline on the
  shell's root, it moves the column only: the brand's alias resolved at
  `:root`. Set `--psi-navbar-brand-width` beside it. The doc comment says so.
- A brand slot wider than its column overflows into the row's gap. Nothing
  clips it, so a focus ring is never cut.

**What it does not do.** No measuring in JavaScript, no change to `AppShell`'s
API, and no icon in the box: the consumer passes the Menu button, as today.
`brandAlign` without a brand renders nothing for it.

## Tests and gates

- `packages/tokens/__tests__/component-scope.test.ts`: the classification of
  colour keys, the `width` exception, value-reached colour (`focus-ring`),
  aliases through component chains, cycles, and `overrideDependents`
  (transitive, overridden tokens left out, registry order).
- `emit-components.test.ts`: the two rules, and a component with only one
  scope emits one rule.
- `emit-css.test.ts`: an override of `control-radius` re-declares
  `button-radius`, `button-24-height` does not appear, and ember's block is
  unchanged.
- `scope-gate.test.ts`: a page-scoped override binding `fgPrimary` or a palette
  entry is refused with group `"page"`; a scale or literal is accepted.
- `NavBar.test.tsx`: `brandAlign="sidebar"` marks the bar and implies fluid;
  the rule uses the two tokens and logical properties only.
- `apps/storybook/vr/app-shell.interaction.spec.ts` (runs locally under
  `pnpm test:e2e`; run it with `CI=1` so Playwright starts this worktree's
  server instead of reusing another checkout's on port 6208):
  - D139: in `Default`, `--psi-app-shell-sidebar-border-width: 1px` on the
    shell's root draws the line on the `dark` sidebar;
  - D140, in the new `BrandAligned` story: the Menu icon's inline-start edge
    equals the first sidebar icon's, 20px in, and the brand ends at the
    sidebar's edge, in LTR and in RTL; with `--psi-app-shell-sidebar-width:
    20rem` on `<html>`, the header under `data-psi-theme="dark"` follows it;
    the toggle does not move when the sidebar closes.
- Five gates: `pnpm build && node tools/check-docs-drift.mjs && pnpm test &&
  pnpm lint && pnpm --dir apps/site build && pnpm test:site`. `vr` in CI only:
  a story that nests a theme may move, and the new story needs a baseline. The
  renders go to the user before any baseline is committed.

## Follow-ups

- A NavTree entry padding token (`--psi-nav-tree-item-padding-inline` or
  similar), so `--psi-navbar-brand-inset` can alias it instead of restating
  `space-12`. Belongs with NavTree's tokens.
