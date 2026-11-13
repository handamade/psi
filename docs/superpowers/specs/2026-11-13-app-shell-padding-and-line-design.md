# A padded main region with a banner slot (D113), and a line at the sidebar's edge (D114)

Date: 2026-11-13. Status: **Approved**, not implemented. Branch
`d113-app-shell-padding`.

Provenance: a consumer's review of its app frame built on `AppShell`. Its page
heading started at the sidebar's edge, its page banner touched the heading
below it, and with the sidebar and the page on one background nothing set the
two apart. Two requests came out of it: padding for the main region with a
set space below a page banner, and a line between the sidebar and the main
region.

The numbers are the first free `## Decisions` entries when this branch
started. D112 is the highest on `main`
(`2026-11-02-navbar-text-colour-design.md`), and a search of every branch and
worktree for a higher one found none. Check again when the PR opens.

Two decisions share this spec and one PR, as D111 and D112 did: both edit the
same token file, stylesheet and stories, so the baselines are refreshed once.

## What's there today

- **`<main>` has no padding and no token for it.** `.main` in
  `packages/react/src/AppShell/app-shell.module.css` sets its grid row, its
  sizes, `overflow: auto`, and D110's background and corner. A page starts at
  the sidebar's edge and under the header's line.
- **Psi's own story works around it.** `AppShell.stories.tsx` wraps its page
  in `<div style={{ padding: "var(--psi-space-24)" }}>`. The `app-shell`
  pattern has no such wrapper, so its preset renders the page flush.
- **A page banner has no place and no spacing.** The `page-banner` pattern
  calls it "a full-width, page-level message above the content". `Banner` is
  `width: 100%` with no margin, and `AppShell` renders only `children` inside
  `<main>`. A consumer that pads its page gets an inset banner; one that does
  not gets a banner that touches the heading under it.
- **Nothing draws a line at the sidebar's edge.** The sidebar paints
  `--psi-app-shell-sidebar-bg`, which defaults to `--psi-bg-primary`, the
  page's own colour. The header has a line: `--psi-navbar-border` and
  `--psi-navbar-border-width`, `1px` by default.
- **The tokens.** `--psi-app-shell-sidebar-width`, `-sidebar-bg`,
  `-sidebar-fg`, `-focus-ring`, and D110's `-bg`, `-main-bg` and
  `-main-radius`.

## Decisions

- **D113 — `<main>` pads its page from two tokens, 24px by default, and
  `AppShell` takes a `banner` that sits edge to edge above the page and
  scrolls with it.**
  - **Two tokens**, in `packages/tokens/src/components/app-shell.ts`:

    | Token | Sets | Default |
    | --- | --- | --- |
    | `--psi-app-shell-main-padding-inline` | `.main` `padding-inline` | `var(--psi-space-24)` |
    | `--psi-app-shell-main-padding-block` | `.main` `padding-block` | `var(--psi-space-24)` |

    - **The default is a real value, not `0`.** D110's tokens paint nothing by
      default because paint over a consumer's frame would be wrong. A page
      that touches its frame's edges is not a look anyone wants, and the
      `app-shell` preset should render what an app would. 24px is what Psi's
      own stories already use.
    - **The keys carry no `bg`, `fg` or `border` segment**, so they stay out of
      the colour scope map, as the control geometry keys do (D54).
  - **The padding is on `<main>` itself**, not on a wrapper around `children`.
    The page stays a direct child of `<main>`, so a consumer's layout inside it
    keeps its shape: a child with `height: 100%` still resolves against
    `<main>`, now less the padding.
  - **A new prop, `banner?: ReactNode`.** It renders inside `<main>`, before
    `children`, in a `<div>` of the shell's own:

    ```css
    .banner {
      margin-block: calc(var(--psi-app-shell-main-padding-block) * -1) var(--psi-app-shell-main-padding-block);
      margin-inline: calc(var(--psi-app-shell-main-padding-inline) * -1);
    }
    .banner:empty {
      display: none;
    }
    ```

    - **Edge to edge.** The negative margins cancel the padding on three
      sides, so the banner reaches the sidebar, the far edge and the top of
      `<main>`. This is what the `page-banner` pattern's "full-width" means.
    - **No gap token.** The space below the banner is the block padding, which
      the margin puts back. Every screen gets the same space with nothing to
      set.
    - **That space is a margin, so it collapses with the page's first child.**
      A heading with a top margin of its own starts one block padding below the
      banner, not that plus its margin: the gap is the larger of the two.
      Without a banner the two add up, because padding does not collapse. A
      page therefore sits a little closer under a banner than under the header.
      This is the behaviour chosen, and the browser test measures the gap
      itself.
    - **`0` without a unit works.** `calc(0 * -1)` is a number, not a length,
      so the margin is invalid at computed-value time and falls back to its
      initial `0`, which is the right answer.
    - **It scrolls with the page.** The banner is the first thing in the
      scroller and leaves the view as the user scrolls. Pinning it would let
      content scroll under it, and the shell exists so that a focused element
      is never hidden (D88). A pinned banner can come later as its own
      decision.
    - **One banner or several.** The prop takes any node. Two banners stack
      with no space between them.
    - **A banner that renders nothing takes no space.** A consumer writes
      `banner={stale && <Banner …/>}`. The wrapper is rendered whenever the
      prop is neither `null` nor `undefined`, and `:empty` removes it from the
      layout when React renders nothing inside. An empty wrapper's two
      margins cancel, but they collapse through it and swallow up to one block
      padding of the first child's own top margin, which pulls the page up.
    - **In the accessibility tree** the banner is inside `<main>`, before the
      page, and its action is a tab stop at that place. `Banner` is not a live
      region (D86), so showing one announces nothing; that stays the
      application's job.
    - **D110's corner holds.** `<main>` is the scroller and clips the banner
      to its rounded top-start corner.
  - **Not decided here: a maximum width for the page.** It stays the page's
    job. `.psi-container` adds a gutter of its own, so inside a padded
    `<main>` a page that wants a maximum width sets `max-inline-size` itself.

- **D114 — the sidebar can draw a line on its inline-end edge, from two
  tokens, off by default.**
  - **Two tokens**, the same pair as the header's line:

    | Token | Sets | Default |
    | --- | --- | --- |
    | `--psi-app-shell-sidebar-border` | the line's colour | `var(--psi-border-faint)` |
    | `--psi-app-shell-sidebar-border-width` | the line's width | `0` |

    ```css
    .sidebar {
      border-inline-end: var(--psi-app-shell-sidebar-border-width) solid var(--psi-app-shell-sidebar-border);
    }
    ```

  - **The width key sits in the border scope group**, as `navbar`'s
    `border-width` does: the scope gate reads a key's segments from the end
    and stops at `border`. Its values are lengths, which the gate does not
    inspect, so `0` and `1px` pass.
  - **Off by default, unlike the header's.** At `0` there is no line and no
    pixel, so today's look holds, and a frame with D110's surface needs
    nothing extra. `1px` draws it. A transparent colour would have kept the
    pixel, which is what D110 found on `NavBar`.
  - **The colour resolves under the sidebar's theme**, because the line is on
    the sidebar element. Under `sidebarTheme="dark"` it is the dark theme's
    faint border. A line is for a sidebar that shares the page's background;
    a sidebar in another theme is already set apart.
  - **Under `sidebarTheme`, the width must come from that theme.** Component
    tokens are declared under `:where(:root, [data-psi-theme])`, so a themed
    sidebar declares the default `0` on itself, and a width set on the shell's
    root does not reach it. A theme's `componentOverrides` does. The
    `SidebarLine` story leaves the sidebar on the page's theme.
  - **Logical, so it mirrors.** `border-inline-end` is on the right in
    left-to-right and on the left in right-to-left.
  - **A closed sidebar is `hidden`**, so its line goes with it.
  - **No contrast pair.** The line separates two regions and identifies no
    control, so WCAG 1.4.11 does not apply, as with `NavBar`'s line.
  - **The header needs nothing new**: it has had this pair since D110.

## Consequences

- **A visible change for consumers.** A page inside `AppShell` gains 24px of
  padding. A consumer that pads its own page sets both tokens to `0`, or drops
  its own padding. The changeset says so. Nothing else moves unless a consumer
  sets a new token or passes `banner`.
- **Changeset:** `minor` for `@handamade/psi-tokens` and
  `@handamade/psi-react`. The packages move in lockstep.
- **Stories.** The shared demo in `AppShell.stories.tsx` drops its inline
  wrapper. Two new stories: `WithBanner`, and `SidebarLine` with the sidebar on
  the page's theme and the width at `1px`.
- **Patterns.** No new pattern, so the counts hold at 52 components and 24
  patterns. `page-banner`'s intent gains one sentence: inside an `AppShell`,
  pass the banner to its `banner` prop. `app-shell` is unchanged in source.
- **Docs.** `AppShell`'s doc comment, the generated `docs/AppShell.md`, and the
  `AppShell` section of `packages/react/llms.txt` name the four tokens and the
  prop.
- **`banner` is a slot, not only a prop.** `AppShell/slots.json` declares it,
  accepting `Banner`, between `sidebar` and `body`, so a compose tree and the
  MCP can fill it. The first draft of this spec left the slot out and the
  whole-branch review caught it: without the entry a pattern that fills
  `banner` throws.

## Verification

Tests first, each red on its assertion before the code exists.

- **Tokens** (`packages/tokens/__tests__/app-shell-tokens.test.ts`): the two
  padding tokens default to `var(--psi-space-24)`; the border colour aliases
  `--psi-border-faint`; the border width defaults to `0`; a theme may override
  each, and the scope gate refuses a surface token on `app-shell-sidebar-border`.
- **Component** (`AppShell.test.tsx`): a `banner` renders inside `<main>`,
  before the page; with no `banner` there is no wrapper; two banners both
  render, in order.
- **In a browser** (`apps/storybook/vr/app-shell.interaction.spec.ts`), where
  the stylesheet is real:
  - `<main>`'s computed padding is 24px on all four sides by default;
  - the banner's box starts at `<main>`'s top and spans its full width, and
    the page starts 24px below the banner;
  - with both padding tokens at `0`, the banner and the page keep `<main>`'s
    edges;
  - a `banner` that renders nothing leaves the page where it is without one;
  - by default the sidebar's border width computes to `0`; at `1px` a 1px line
    sits on its inline-end edge, and on the left under `dir="rtl"`;
  - the existing sweep still finds no tab stop under the header.
- **Visual baselines**, from CI only (D89):
  - `Default`, `SidebarClosed`, `Frame` and `FrameSidebarClosed` are expected
    not to move: the padding moves from an inline wrapper to `<main>`. If one
    moves, explain it before committing it.
  - the `app-shell` preset's baselines move: its page is now inset by 24px;
  - the two new stories add baselines.
- **Gates:** `pnpm build && node tools/check-docs-drift.mjs && pnpm test &&
  pnpm lint && pnpm --dir apps/promo build && pnpm test:site`, and
  `pnpm test:e2e` for the interaction specs.
