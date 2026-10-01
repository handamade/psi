# An application shell: `AppShell`, the `NavTree` family, `SkipLink`, and a `NavBar` that labels its links (D88)

Date: 2026-10-01. Status: **Implemented** on branch `d88-app-shell`.

Provenance: the seventh and last item of the Psi 0.21 portal handoff
(`docs/superpowers/plans/2026-09-30-psi-0.21-portal-handoff.md`, brief D88,
and the measurements `2026-09-30-psi-0.21-handoff-2.md` §5 asked for). The
portal is desktop-only, 1366 × 768 and up: a full-width header, a collapsible
sidebar under a dark sub-theme holding a grouped navigation tree that marks
the current page, and a closed sidebar that disappears rather than shrinking
to icons (rules 4 and 9).

## What's there today

Measured in Chromium 149 against the built Storybook and against prototypes
injected into a page, before anything was written.

1. **`NavBar` renders `<nav>` unconditionally** (`NavBar.tsx`), and its rest
   props land on `<header>`, so the `<nav>` cannot be labelled. Its row is
   `.psi-container`: `max-width` 82rem (1312 px measured), centred, with
   `--psi-gutter` side padding.
   - **Nobody depends on the empty `<nav>`.** Neither app renders `NavBar`;
     its one story, its tests and its axe case all pass links.
   - **The brief misses a layout dependency:** `.links` carries
     `margin-inline-start: auto`, which is what pushes `actions` to the
     trailing edge. With the `<nav>` removed from the `Default` story,
     `actions` moved from x = 1222 to x = 115, against the brand.
2. **There is no skip link**, and D79's spec rejected a focusable
   screen-reader-only variant as unneeded. The portal is the need.
   - **A native fragment link is enough in Chromium.** `<a href="#main">`
     with *Enter*, onto a `<main id="main" tabindex="-1">`, focused `main`,
     and the next *Tab* landed on main's first link. No script.
   - **Top layer, measured.** With a modal `<dialog>` open, the skip link
     cannot take focus at all (`showModal()` makes the rest of the document
     inert), so it never needs to be painted over a dialog. A
     `popover="manual"` element — what `ToastRegion` is — is not modal: the
     skip link still takes focus, and a popover overlapping it is painted
     above it whatever its `z-index`. `ToastRegion`'s placements include
     `top-start`, where a skip link shows; its default is `bottom-end`.
3. **A dark sub-theme works inside a light page, both ways.** In the light
   `NavBar` story, a `div[data-psi-theme="dark"]` resolved `--psi-bg-primary`,
   `--psi-fg-primary`, `--psi-border-focus` and a component token
   (`--psi-navbar-link-fg`) to their dark values, because `components.css`
   declares component tokens under `:where(:root, [data-psi-theme])`.
   - The theme CSS paints no background: the sub-tree's own background
     measured `transparent`. The sidebar must paint `--psi-bg-primary`
     itself, as the brief says.
   - Brand font stacks apply only at `:root` (`guidance.fonts.scope`); light
     and dark share the default stacks, so a dark sidebar in a light page
     loses nothing.
4. **`scroll-padding-top` on `main` does not keep a focused element out from
   under a sticky header** — the brief's mechanism for WCAG 2.2 *Focus Not
   Obscured* (2.4.11). A prototype tabbed through 60 links in `main` below a
   64 px sticky header, then back up:
   - document scrolls, sticky header, no padding: 2 stops entirely hidden
     going down, 5 going up;
   - the same with `scroll-padding-top` on **`main`**: identical, 2 and 5 —
     `main` is not the scroller, so the property does nothing;
   - with `scroll-padding-top` on **`html`**: 0 and 0 — but that is the
     document's scroller, which a component does not own;
   - with the header in a fixed row and **`main` as its own scroller**: 0
     and 0, by construction — nothing scrolls under the header.

## Decisions

- **D88 — An application shell is a fixed header row over a sidebar and a
  `main` that scrolls on its own; navigation is a tree of native buttons and
  links; the skip link is a plain anchor.**
  - **`NavBar`** (every default unchanged):
    - renders `<nav>` only when it has children;
    - gains `navLabel?: string`, the `<nav>`'s `aria-label`;
    - gains `fluid?: boolean`: the row drops `.psi-container` for a
      full-width row that keeps the `--psi-gutter` side padding;
    - `actions` keeps the trailing edge without links: the auto margin
      applies to `actions` when no `<nav>` precedes it (finding 1);
    - rest props stay on `<header>`, as today.
  - **`SkipLink`** — `<SkipLink href="#main">Skip to content</SkipLink>`:
    - an `<a>`, no script: native fragment navigation moves focus to a target
      that is focusable, and `AppShell`'s `main` is (finding 2);
    - visually hidden until focused, then fixed at the inline-start top
      corner at `--psi-z-overlay`, on a surface, drawing the shared focus
      ring (D82);
    - it does not try to beat the top layer: a modal makes it inert, and the
      doc says not to place a `ToastRegion` at `top-start` in an app with a
      skip link (finding 2);
    - tokens `--psi-skip-link-{bg,fg,border,focus-ring}`, bound to the
      surface and focus tokens.
  - **`AppShell`** — the frame, and nothing else:
    - slots `skipLink` (rendered first), `header`, `sidebar`, `children`
      (main's content);
    - props `sidebarOpen` (controlled, default `true`), `sidebarTheme?`
      (sets `data-psi-theme` on the sidebar, which paints
      `--psi-bg-primary`), `sidebarId` (default `sidebar`), `mainId`
      (default `main`), `className`, `ref`, rest on the root;
    - **layout** (finding 4): a grid filling the viewport (`100dvh`); the
      header in its own row; below it the sidebar at the inline start,
      `--psi-app-shell-sidebar-width` wide, and `main`. Sidebar and `main`
      each scroll on their own. Nothing scrolls under the header, so
      *Focus Not Obscured* holds without `scroll-padding`; the brief's
      `scroll-padding-top` is dropped, because measured on `main` it does
      nothing;
    - **a closed sidebar is `hidden`**: out of the layout and the
      accessibility tree, and still in the DOM, so a toggle's
      `aria-controls` keeps naming an element;
    - `main` carries `id={mainId}` and `tabIndex={-1}`: the skip link's
      target, not a tab stop;
    - focused by the skip link, `main` draws the shared ring inside its box:
      `psi/focus-ring` forbids removing a ring, and it shows where focus
      landed;
    - no responsive drawer and no stored open state (handoff risk B.6).
  - **`NavTree` family** — router-agnostic, as `NavBar` styles the anchors
    passed to it:
    - `NavTree`: `<nav aria-label>` around a `<ul>`;
    - `NavGroup`: `label`, `open`, `onOpenChange`, controlled; a `<button>`
      with `aria-expanded` and `aria-controls` naming its list, and
      `IconChevronDown` turning with the state (on a duration token); the
      list is `hidden` when closed;
    - `NavItem`: an `<li>` that styles the anchor inside it. The consumer
      passes its router's link with `aria-current="page"` on the current
      one; the current link is set by weight, a surface and an inline-start
      bar — never by colour alone;
    - keyboard is native: *Tab* moves through group buttons and the links of
      open groups. No roving focus: navigation is not an ARIA menu;
    - tokens `--psi-nav-tree-{item-fg, item-fg-current, item-bg-hover,
      item-bg-current, indicator, focus-ring}`, bound to semantic tokens so
      they resolve under a dark sub-theme (finding 3): item `fgSecondary`,
      current `fgPrimary`, hover `fillNeutral3`, current `fillNeutral4`,
      indicator `fillAccent`, on the sidebar's `bgPrimary`. **No new
      contrast pair:** `wcagAAPairs` already gates `fgPrimary` and
      `fgSecondary` on `bgPrimary` and on `fillNeutral1–6` in every theme,
      dark included, so the pinned length (31) does not move.
  - **Tokens:** `--psi-app-shell-sidebar-width` (16rem: a standalone literal,
    as `--psi-toolbar-control-width` is); the header height stays
    `--psi-navbar-height`.
  - **Pattern `app-shell`**: `AppShell` with a `SkipLink`, a fluid `NavBar`
    holding a *Menu* toggle `Button` (visible text, `aria-expanded`,
    `aria-controls="sidebar"`), a brand and an actions slot, and a `NavTree`
    of two groups. The toggle carries text only: a preset Button holds text
    or an icon (D71; D87 met the same limit).
  - **Counts:** 46 components (+5), 22 patterns (+1). The MCP overview
    envelope (D61) holds through 23.

  - **As built — where the build corrected this spec**, each found by a
    lint rule, a generator or a browser:
    - **Token prefixes are kebab-case**: `--psi-skip-link-*`,
      `--psi-nav-tree-*`, `--psi-app-shell-*`, as `inline-alert` and
      `description-list` are. The draft copied `NavBar`'s historical
      `navbar`, and the docs generator then claimed the families had no
      tokens. Renamed before release, while they are not yet API.
    - **`NavBar` binds `--psi-navbar-gutter`** (aliasing `--psi-gutter`) for
      `fluid`, and **`SkipLink` binds `--psi-skip-link-radius`**:
      `psi/component-tokens-only` admits only a component's own prefix and
      the scale families.
    - **`SkipLink`'s 8 px offset rides `margin`**, not `inset-*`:
      `psi/token-scopes` binds the space scale to gap, padding and margin.
      It shows on `:focus-visible` only — it is invisible, so a pointer
      cannot reach it.
    - **`NavItem` gains `href` and `current`**: with `href` it renders its
      own `<a>` (`aria-current="page"` when `current`). A pattern can compose
      only manifest components, and a raw `<a>` is not one, so without this
      the `app-shell` preset could not hold a link. A router app still
      passes its own link as the child.
    - **`NavBar` has a `slots.json`** (`brand`, `actions`, `body`), so a
      pattern can fill its brand and actions with nodes.
    - **The sidebar pads its tree** by `--psi-space-8`: the current item's
      surface measured 0 px from the sidebar's edge. With no `sidebar`
      content, the sidebar is `hidden` and the grid has one column, so no
      empty 16rem column shows.
    - **`AppShell` must mount at the page root**, with no margin or padding
      around it: it is `100dvh`, and Storybook's 1rem story padding made the
      document scroll by 2rem and slide the header — the stories cancel it.
    - **`main`, focused by the skip link, draws the ring inset**:
      `psi/focus-ring` forbids removing a ring.
    - **The preset's `NavGroup`s carry no `onOpenChange`** (a pattern cannot
      hold a function), so clicking one in the generated preset story
      throws — the same limit `tabbed-workspace` has with `Tabs`. A consumer
      wires the callback; the type requires it.

## Implementation split

Three tasks for subagents, run one after another, because each touches the
same registration files (`index.ts`, `emit-manifest.ts`, `a11y-meta.ts`,
`a11y.axe.test.tsx`, `seed-patterns.test.ts`, `llms.txt`, the READMEs):

1. `NavBar` changes + `SkipLink` (tokens, component, stories, tests).
2. The `NavTree` family + its tokens and contrast pairs.
3. `AppShell` + pattern `app-shell` + docs, counts, changeset, and the
   browser spec.

## Verification

- **Tests first**, each red before its change, run by three sequential
  subagents (one per task of the split), each reporting red and green:
  - `NavBar`: 4 red on assertion (no `nav` without children, `navLabel`,
    `fluid` on, `fluid` off); the fifth, rest props on `header`, passed
    before and after — the regression guard. `SkipLink`: 3, red on the
    missing module.
  - `NavTree` family: 11, red on the missing modules; then `NavItem`
    `href`/`current`: 3 red, 1 regression guard green.
  - `AppShell`: 9, red on the missing module.
  - **in a browser**, `app-shell.interaction.spec.ts`: 4 of 6 red before
    `AppShell` existed (skip link hidden then shown, *Enter* focuses `main`,
    no tab stop under the header, dark tokens in the sidebar); the `NavBar`
    and `NavItem` checks were already green from tasks 1–2. A seventh, the
    sidebar's inset, red at 0 px, then green.
- **Measured** (Chromium 149, built Storybook, 1366 × 768):
  - `NavBar` `NoLinks`: actions at x = 1222.6–1294, the same as `Default`;
    `Fluid`: a full-width row with the gutter, against the 82rem container;
  - the skip link: 1 px and clipped before *Tab*; after, fixed at 8/8 px,
    126 × 32, `z-index` 1000, a solid 2 px ring; *Enter* focuses `main#main`;
  - focus under the header: header bottom 65 px; the highest focused element
    in `main` over every stop down and back up, 64.875 px — 0.125 px of
    sub-pixel scroll rounding, nothing hidden; the test allows 1 px and says
    why, and asserts the document itself never scrolls;
  - `DarkSidebar` inside the light page: link colour `oklch(0.93 …/0.7)`
    against light's `oklch(0.3 …/0.7)`; current surface `oklch(0.26 …)`
    against `oklch(0.916 …)`; current link weight 500 against 400, a 3 px
    accent bar against none;
  - the `app-shell` preset's tree: link *Skip to content*; `banner` with the
    expanded *Menu* button and no empty `navigation`; `navigation "Main"`
    with two expanded groups; `main`.
- **axe:** eight new cases — `NavBar` without links and labelled + fluid,
  `SkipLink` with a target, `NavTree` open, closed and under a dark
  sub-theme, `AppShell` open, closed and with `sidebarTheme="dark"`; no
  violations.
- **Regression.** No existing test edited; `NavBar`'s `Default` story renders
  as before (its `<nav>` is still there). `wcagAAPairs` stays at 31.
- **The six gates** green: 2479 tests in 106 files; docs drift at 46
  components and 22 patterns; site gate 9 of 9; `pnpm test:e2e` 205 of 205,
  the D82 sweep over all nine new stories included.

## Consequences

- **Visual regression: 18 new baselines, none changed** — `NavBar` `NoLinks`
  and `Fluid`, `SkipLink` `Default`, `NavTree` `Default`, `Collapsed` and
  `DarkSidebar`, `AppShell` `Default` and `SidebarClosed`, the `app-shell`
  preset, in light and ember.
- **A consumer whose document must scroll as a whole** (a long marketing
  page) does not use `AppShell`; it is an application frame, mounted at the
  root.
- **A `ToastRegion` at `top-start` can cover a focused skip link**: the top
  layer paints over it whatever its `z-index`. The docs say to choose
  another placement.
- **A dark sub-theme sidebar keeps the default font stacks** and the dark
  theme's accent, also inside ember: brand stacks apply at `:root` only.
- **The portal** renders `<AppShell skipLink={<SkipLink href="#main">…}
  header={<NavBar fluid brand={…} actions={…} />} sidebar={<NavTree
  aria-label="…">…</NavTree>} sidebarOpen={open} sidebarTheme="dark">`, its
  Menu toggle `Button` with visible text, `aria-expanded={open}` and
  `aria-controls="sidebar"`, and its router links inside `NavItem`s with
  `aria-current="page"` on the current one.
