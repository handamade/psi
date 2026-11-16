# A theme declares its color scheme (D116)

Date: 2026-11-16. Status: **Approved**, not implemented. Branch
`d116-color-scheme`.

Provenance: a consumer running Psi's dark themes found the calendar icon of a
date field drawn near-black on a dark field. The browser draws that icon, and
it draws it for a light page, because no Psi theme says otherwise.

The number was allocated for this work on 2026-11-16. D114 is the highest
`## Decisions` entry on `main` (`2026-11-13-app-shell-padding-and-line-design.md`);
D115 is claimed by a spec on another branch. Check again when the PR opens.

## What's there today

- **No theme sets `color-scheme`.** `emitThemeCSS` in
  `packages/tokens/src/emit/css.ts` writes custom properties only: the theme's
  palette, its semantic tokens and its font stacks, inside
  `@layer psi.theme { <selector> { … } }`. Light's selector is
  `:root, [data-psi-theme="light"]`; every other theme's is
  `[data-psi-theme="<name>"]`.
- **The browser therefore draws its own parts for a light page**, whatever the
  theme: the picker icon of `input[type="date"]`, the open list of a native
  `select`, spin buttons, autofill, scrollbars, and the `Canvas` and
  `CanvasText` system colours.
- **The emitter does not know whether a theme is light or dark.** It receives
  the theme's name and its assembled token definitions. The fact lives one
  level up: the built-in `light` and `dark` themes are what they are named,
  and a customer theme names its `base` (D27), `"light"` by default.
- **One emitter, two paths.** `packages/tokens/scripts/build.ts` builds Psi's
  four shipped themes, and `buildThemeCss` in `packages/tokens/src/theme/`
  (D81) builds a consumer's own theme outside the repository. Both call
  `emitThemeCSS`. The consumer that reported the defect builds its dark
  themes through the second path.
- **The rule "a theme paints no background"** is stated in
  `packages/react/llms.txt` (the programmatic theming line), in
  `packages/react/README.md`, on `AppShell`'s `sidebarTheme`, and in
  Storybook's preview. Consumers paint `--psi-bg-primary` at their root
  (D107).
- **`resolved/<theme>.json` does not say whether a theme is light or dark.** An
  agent reading `resolved/ember.json` cannot tell it is a dark theme.
- **Nothing in VR renders a date field.** `Input` accepts `type="date"` and has
  a unit test for it, but no story uses it. The VR matrix renders component
  stories in light and ember (ember is dark-based) and token pages in all four
  themes (D41).

## Decisions

- **D116 — every theme declares `color-scheme` from its base, inside its own
  token block, and the rule that a theme paints no background gains a clause
  for it.**
  - **The declaration.** `emitThemeCSS` writes `color-scheme: light;` or
    `color-scheme: dark;` as the first declaration of the theme's existing
    block, under the same selector:

    ```css
    @layer psi.theme {
      [data-psi-theme="ember"] {
        color-scheme: dark;
        --psi-palette-…: …;
        …
      }
    }
    ```

  - **The scheme comes from the theme's base.** `light` → `light`, `dark` →
    `dark`, a customer theme → its `base`, `"light"` when it names none. One
    helper holds that default, so the build and `buildThemeCss` cannot
    disagree.
  - **`emitThemeCSS` takes the scheme as a required argument.** A caller that
    forgets it fails to compile instead of shipping a theme with no scheme.
  - **A single keyword.** Not `light dark`: that lets the browser follow the
    operating system, and a theme has already decided. Not `only light` /
    `only dark`: `only` stops a browser's forced dark mode from recolouring the
    page, which overrides a user's own browser setting; Psi does not take that
    decision for its consumers.
  - **Same block, same selector as the tokens.** `color-scheme` inherits, so it
    follows the tokens wherever they apply:
    - a dark sub-tree in a light page (`sidebarTheme="dark"`, D88) gets dark
      scrollbars and pickers, and a light island in a dark page returns to
      light;
    - light keeps `:root`, so a page with no attribute declares `light`, which
      is what the browser drew anyway;
    - when two themes match one element, load order settles the scheme exactly
      as it settles the tokens, so the two cannot disagree.
  - **A consumer overrides it with any rule of its own.** The declaration sits
    in `@layer psi.theme`, so an unlayered rule or an inline style wins.
  - **The rule stands, with a clause.** *A theme paints no background. It
    declares its `color-scheme`, so the browser draws its own parts — form
    controls, scrollbars, and a root canvas nobody paints — for that scheme.*
    Why this does not break the rule: `color-scheme` fills no element. It
    changes the browser's defaults, which any background the consumer paints
    still covers. On the root element it does change the canvas a page shows
    *before* the consumer paints it (dark rather than white on a dark theme);
    on a nested scope it paints nothing at all. This is the first theme output
    that is not a custom property, and the only one this decision adds.
  - **`resolved/<theme>.json` gains a top-level `colorScheme`**, `"light"` or
    `"dark"`, beside `theme`. `guidance.json`, the DTCG files and the MCP
    server are unchanged.

## Consequences

- **A visible change for consumers on dark themes**, and the point of the
  decision: date pickers, native select lists, spin buttons and scrollbars
  render dark. A consumer that set its own `color-scheme` keeps it. On a light
  theme nothing changes.
- **A consumer's theme picks it up on its next build.** `buildThemeCss` emits
  the declaration from the theme's `base`, so a theme built with `base: "dark"`
  needs no change of its own.
- **Changeset:** `minor` for `@handamade/psi-tokens`; the packages move in
  lockstep.
- **A new story**, `Components/Input` `Date`: an `Input` with `type="date"` and
  a value, so the VR matrix renders the picker icon in light and ember.
- **Docs.** The clause goes where the rule is stated: the theming line in
  `packages/react/llms.txt`, its counterpart in `packages/react/README.md`, and
  in `packages/tokens`: `llms.txt`'s `Themes:` line, its `base: "dark"` line
  and its D81 section, and `README.md`'s Usage and "Building a theme outside
  this repo" sections. Both name `colorScheme` where they list the resolved
  JSON. `AppShell`'s `sidebarTheme` doc comment (and so the generated
  `docs/AppShell.md`) and its line in `packages/react/llms.txt` say the
  sidebar's scheme goes with its theme. Storybook's preview comment says the
  same. No component or pattern count changes; `check-docs-drift` runs anyway.
- **Baselines move.** The new story adds two. Ember renders of stories with
  browser-drawn parts move; which ones is known only from CI's render, since
  `vr` passes only on its Linux image. Each moved render is shown to the user
  before any baseline is committed. Light renders should not move: `light`
  is what the browser assumed before.

## Verification

Tests first, each red on its assertion before the code exists.

- **Emitter** (`packages/tokens/__tests__/emit-css.test.ts`): with `"dark"`
  the block holds `color-scheme: dark;` under `[data-psi-theme="<name>"]`;
  with `"light"` for the light theme it holds `color-scheme: light;` under
  `:root, [data-psi-theme="light"]`; the declaration is inside the
  `@layer psi.theme` block, not in the component-overrides block.
- **The helper**: `light` and `dark` map to themselves; a customer theme with
  `base: "dark"` maps to `dark`, one with no base to `light`.
- **The shipped build**: `dist/light.css` and `dist/acme.css` declare `light`,
  `dist/dark.css` and `dist/ember.css` declare `dark`, and each
  `dist/resolved/<theme>.json` carries the same `colorScheme`.
- **The consumer path** (`packages/tokens/__tests__/theme-build.test.ts`):
  `buildThemeCss` with `base: "dark"` emits `color-scheme: dark;`, and with no
  base emits `color-scheme: light;`.
- **In a browser** (a new `apps/storybook/vr/color-scheme.interaction.spec.ts`,
  `@interaction`), where the stylesheets are real: the computed `color-scheme`
  of the root is `light` under the light theme and `dark` under ember; of the
  date input, the same; and inside `AppShell`'s dark sidebar on a light page,
  `dark` while `<main>` stays `light`.
- **VR**: the `Date` story's two baselines, and the moved ember renders, from
  CI's render after the user's go-ahead.
- **All five gates**: `pnpm build && node tools/check-docs-drift.mjs &&
  pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site`.

## Not decided here

- **A `<meta name="color-scheme">` recommendation.** It would let the browser
  draw a dark canvas before any stylesheet loads. Psi's themes are chosen by an
  attribute set from script, so the right content of such a tag is the
  consumer's to decide; the docs do not recommend one yet.
- **A browser's forced dark mode.** Left to the user's browser, as above.
