# A frame with a rounded surface: `AppShell`'s background and `<main>`'s corner (D110)

Date: 2026-11-02. Status: **Implemented** on branch
`claude/app-shell-surface-tokens-43fcf2`.

Provenance: the Web Portal's review of a Figma option for its app frame
(*AppShell (option)*, `vega`, node 246:1262). The header and the sidebar share
one colour with no line between them, and the main region is a surface with a
rounded top-start corner. The hand-off is
`psi-handoffs/2026-11-02-psi-app-shell-surface-handoff.md`, outside this
repository. The user chose new Psi tokens over a CSS rule in the Portal. The
Portal has not decided to adopt the design, so every default keeps today's look.

The number is the first free `## Decisions` entry when this branch started:
D109 was the highest claimed, and no PR was open.

## What's there today

Measured on 0.27.0 (`ef26485`) in Chromium against the built Storybook, with
inline styles on the `AppShell` stories standing in for the tokens.

1. **Nothing can paint the corner.** `.appShell` and `.main` paint no
   background, and `.main` has no radius. `AppShell` has no prop that reaches
   `<main>`, and a wrapper inside `<main>` would scroll the corner away, because
   `<main>` is the scroller. `overflow: auto` already clips scrolled content to
   a radius on `<main>`.
2. **The root's colour cannot alias the semantic layer from the page's scope.**
   The root sits under the page's theme, the header and the sidebar under a dark
   sub-theme, and custom properties inherit downward only, so no `var()` on the
   root can name the sub-theme's `--psi-bg-primary`. The nearest semantic token
   is `--psi-bg-inverted`, which the Portal's preview uses:

   | Page theme | Page's `bgInverted` | `dark`'s `bgPrimary`, on the header and sidebar | Result |
   | --- | --- | --- | --- |
   | `light` | `#222f3c` | `#080c0f` | A visible wedge, lighter than the chrome |
   | `ember` | `#f3ede6` | `#080c0f` | A bright wedge on a dark frame |

   So the value has to be the sub-theme's colour, written where a value can be
   written: a theme file's `componentOverrides`, or a literal on the root. The
   `dark` theme's is `oklch(0.15 0.01 250)`.
3. **A theme reaches these tokens as it reaches any other.** `componentOverrides`
   emits under `[data-psi-theme="<name>"]` in `psi.components`, which beats the
   defaults' zero-specificity `:where(:root, [data-psi-theme])`. Tokens set on a
   page's theme do not cross into a sub-themed element: that `:where` resets them
   there. So the header's tokens belong on the sub-theme or on the `NavBar`.
4. **The skip link's ring follows the corner.** With a 12px radius, tabbing to
   the skip link and pressing *Enter* focuses `<main>`. Its outline (2px, offset
   -2px, computed `solid`) follows the curve in LTR and in RTL, at 6x with no gap
   or crossing. RTL moves the corner to the top right, because the property is
   logical. The Portal's preview had not checked this. No change is needed.
5. **A transparent `--psi-navbar-border` still takes 1px**, so
   `--psi-navbar-height: 56px` gives a bar of 57px. The line cannot be seen,
   since the bar's background runs under its border, but the size is wrong in a
   system whose sizes are pixel-true.
6. **A closed sidebar leaves the corner at the window's edge.** `<main>` reaches
   x = 0, and the corner shows as a small notch against the viewport with nothing
   beside it.

## Decisions

- **D110 — `AppShell` paints two backgrounds and one radius from tokens, all
  invisible by default. The corner exists only where a header and a sidebar both
  meet `<main>`. `NavBar`'s line gets a width token.**
  - **Three tokens**, in `packages/tokens/src/components/app-shell.ts`:

    | Token | Paints | Default |
    | --- | --- | --- |
    | `--psi-app-shell-bg` | `.appShell` `background` | `transparent` |
    | `--psi-app-shell-main-bg` | `.main` `background` | `transparent` |
    | `--psi-app-shell-main-radius` | `.main` `border-start-start-radius` | `0` |

    - **The defaults are not semantic aliases.** `var(--psi-bg-primary)` on
      `<main>` would paint over whatever a consumer paints behind the frame, and
      this work must change nothing for a consumer that does not set them.
      Today's look is "no paint", and `transparent` says so, as `card`'s `bg` and
      `button`'s `ghost-bg` do.
    - **The radius has its own token** because `--psi-surface-radius` also
      rounds Dialog, Panel, Menu, Table and Toast, so an alias would tie the
      frame's corner to them.
    - **No contrast pair.** Nothing is set on the root except the wedge. `<main>`
      takes page content, so `fgPrimary` on `bgPrimary`, already gated in every
      theme, covers the expected value. A theme that sets another `main-bg` picks
      a surface, as a theme overriding `--psi-card-bg` does. The scope gate
      already refuses a text token on a `-bg` key, and a test pins that for these
      two.
  - **`headerTheme`: no prop. `data-psi-theme` on the `NavBar` is the way.**
    `sidebarTheme` exists because the shell owns the sidebar's element and a
    consumer cannot reach it any other way. The header's element is the
    consumer's own `NavBar`, and its rest props already land on `<header>`. A prop
    would be a second way to do one thing. It stays cheap to add later, and
    removing one would be a breaking change. The cost is that the attribute is
    not in the manifest's prop list, so the doc comment and `llms.txt` say it.
  - **The 1px: `--psi-navbar-border-width`, default `1px`.** `0` removes the line
    and its pixel, so a height token means what it says. The alternative,
    `--psi-navbar-height: calc(56px - 1px)`, works today and puts a private number
    of Psi's in the consumer. Including the border in the height would move every
    `NavBar` by 1px and every baseline holding one. This is a fourth token, on
    `NavBar`, beyond the three the hand-off listed; it is the one the hand-off's
    question proposed.
  - **The corner with a closed sidebar: it squares.** The corner marks the place
    where the frame's two arms meet the surface. With no sidebar there is one arm,
    and finding 6's notch belongs to nothing. A class on `<main>` sets the radius
    to 0, so a consumer writes no state of its own. The same condition covers a
    shell with no header, where the corner would sit against the viewport's top,
    and a shell with no sidebar content. A consumer who wants the corner kept
    cannot have it today; if one appears, a token can add it.
  - **The `app-shell` pattern gains no preset; the docs carry the frame.** A
    pattern is theme-independent and the root's colour is not (finding 2), so a
    preset would hold a literal that is right for one sub-theme. It is also one
    consumer's undecided option. Adding one later costs one count bump.
    `packages/react/patterns/app-shell.json` is unchanged.

  **What this changes.** Four tokens with defaults that paint nothing and keep
  today's sizes, and one class on `<main>` when the corner has no place. No new
  prop, component, pattern or contrast pair.

  **What a consumer writes** for the frame, in a theme file or on the elements:

  ```tsx
  <AppShell
    sidebarTheme="dark"
    style={{
      "--psi-app-shell-bg": "oklch(0.15 0.01 250)", // the sub-theme's bgPrimary
      "--psi-app-shell-main-bg": "var(--psi-bg-primary)",
      "--psi-app-shell-main-radius": "var(--psi-radius-12)",
    }}
    header={
      <NavBar
        fluid
        data-psi-theme="dark"
        style={{ "--psi-navbar-bg": "var(--psi-bg-primary)", "--psi-navbar-border-width": "0" }}
      />
    }
  />
  ```

  Weighed and not taken:

  - **A `mainTheme` prop**, with the root under the dark theme. Every colour would
    then be an alias and the root's literal would go, and the header and sidebar
    would need no attribute. But the consumer would have to name the page's theme
    a second time and keep it in step with a theme switch, and it is a wider API
    than the request. It is the natural next step if a literal in a theme file
    proves a burden.
  - **Painting the wedge from the sidebar**, with a shadow reaching under `<main>`.
    It needs no root colour, but it depends on paint order and fails with no
    sidebar.
  - **`--psi-bg-inverted` as the documented value.** Finding 2's table.

## Consequences

- A theme can draw this frame with no consumer CSS. The Portal's `.frame` rule,
  `background: var(--psi-bg-primary)`, is unlayered and would beat
  `--psi-app-shell-bg`; dropping it is the Portal's work if it adopts the design.
- The root's colour is a second copy of the sub-theme's canvas. If the two drift,
  a wedge shows. The story's copy is pinned by a browser test in both themes; a
  theme file holds its own and owns that.
- `ember` shows the frame only faintly: its canvas (`#0c0a09`) is close to
  `dark`'s (`#080c0f`). The light theme carries the story's point.

## Verification

- **Tests first**, red before the change:
  - `packages/tokens/__tests__/app-shell-tokens.test.ts`: the three defaults and
    `--psi-navbar-border-width`; a surface alias passes the scope gate on both
    `-bg` keys and a text token is flagged.
  - `AppShell.test.tsx`: the module binds the three tokens; `<main>` takes the
    square class closed, with no header and with no sidebar content, and not when
    both arms are there.
  - `NavBar.test.tsx`: the module binds the width token.
- **`app-shell.interaction.spec.ts` (`@interaction`)**, in Chromium:
  - the default stories paint nothing: root and `<main>` are transparent and the
    radius is 0;
  - the default bar is the height token plus 1px;
  - in `Frame`, in light and ember, the root, the sidebar and the header paint one
    colour, and `<main>` paints the page's canvas with a 12px corner;
  - `Frame`'s bar is exactly its height token;
  - closed, `<main>`'s corner is square;
  - focused by the skip link in `Frame`, `<main>` draws the shared ring with the
    radius in place.
- **Baselines.** The default stories and the preset are compared with the 0.27.0
  build in Chromium, as pixels, in light and ember. `pnpm vr` runs only in CI, and
  CI runs on a PR, so the new stories' four baselines are CI's to render.
- **Gates:** `pnpm build`, `check-docs-drift`, `pnpm test`, `pnpm lint`, the promo
  build and `pnpm test:site`.

### Measured

- **Red first.** Unit: 6 failed on assertion before the change, and the 3 scope-gate
  cases passed, since they pin behaviour the gate already has. Browser, run against
  the 0.27.0 Storybook: the 5 specs on `Frame` failed and the other 10 passed,
  including the 3 new guards that the defaults paint nothing and the bar is its
  height plus 1px.
- **No baseline moves.** Every story in the 0.27.0 build, 204 stories and 420
  renders across the VR matrix, was rendered from both builds at VR's viewport and
  settle and compared byte for byte: 420 identical, 0 differing. This ran in
  Chromium on macOS, not CI's Linux render, so it shows the two builds agree. CI's
  `vr` remains the gate.
- **New baselines: 4**, `components-appshell--frame` and
  `components-appshell--frame-sidebar-closed` in light and ember. They are not
  committed. CI's first `vr` run should fail on exactly these four, and its renders
  are the files to commit. A local render is not one: the README allows generating
  only on Linux, and the Playwright Docker image has measured as a poor match for CI.
- **Local gates:** build, docs drift (52 components, 24 patterns), `pnpm test` (119
  files, 2649 tests), lint, promo build, `test:site` (9), and `test:e2e` (467,
  including the focus-ring sweep over the new stories).
