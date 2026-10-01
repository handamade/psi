# An application shell: `AppShell`, the `NavTree` family, `SkipLink`, and a `NavBar` that labels its links (D88)

Date: 2026-10-01. Status: **Proposed** on branch `d88-app-shell`.

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
    - tokens `--psi-skiplink-{bg,fg,border,focus-ring}`, bound to the
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
      `--psi-appshell-sidebar-width` wide, and `main`. Sidebar and `main`
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
    - tokens `--psi-navtree-{item-fg, item-fg-current, item-bg-hover,
      item-bg-current, indicator, focus-ring}`, bound to semantic tokens so
      they resolve under a dark sub-theme (finding 3): item `fgSecondary`,
      current `fgPrimary`, hover `fillNeutral3`, current `fillNeutral4`,
      indicator `fillAccent`, on the sidebar's `bgPrimary`. **No new
      contrast pair:** `wcagAAPairs` already gates `fgPrimary` and
      `fgSecondary` on `bgPrimary` and on `fillNeutral1–6` in every theme,
      dark included, so the pinned length (31) does not move.
  - **Tokens:** `--psi-appshell-sidebar-width` (16rem: a standalone literal,
    as `--psi-toolbar-control-width` is); the header height stays
    `--psi-navbar-height`.
  - **Pattern `app-shell`**: `AppShell` with a `SkipLink`, a fluid `NavBar`
    holding a *Menu* toggle `Button` (visible text, `aria-expanded`,
    `aria-controls="sidebar"`), a brand and an actions slot, and a `NavTree`
    of two groups. The toggle carries text only: a preset Button holds text
    or an icon (D71; D87 met the same limit).
  - **Counts:** 46 components (+5), 22 patterns (+1). The MCP overview
    envelope (D61) holds through 23.

## Implementation split

Three tasks for subagents, run one after another, because each touches the
same registration files (`index.ts`, `emit-manifest.ts`, `a11y-meta.ts`,
`a11y.axe.test.tsx`, `seed-patterns.test.ts`, `llms.txt`, the READMEs):

1. `NavBar` changes + `SkipLink` (tokens, component, stories, tests).
2. The `NavTree` family + its tokens and contrast pairs.
3. `AppShell` + pattern `app-shell` + docs, counts, changeset, and the
   browser spec.

## Verification (to measure)

- **Tests first**: `NavBar` with no children renders no `<nav>`, `navLabel`
  names it, `fluid` drops the container class; `SkipLink` is an anchor with
  its `href` and the hidden-until-focused class; `AppShell` with
  `sidebarOpen={false}` renders the sidebar `hidden`, `sidebarTheme` sets
  `data-psi-theme` on the sidebar only, `main` has the id and
  `tabIndex={-1}`; `NavGroup` toggles `aria-expanded`, hides its list, and
  its `aria-controls` names the list; axe clean, open and closed, under the
  dark sub-theme.
- **In a browser** (`app-shell.interaction.spec.ts`): the skip link is
  invisible until *Tab*, then visible with the ring; *Enter* focuses `main`;
  every tab stop in a long `main` is fully below the header, down and up;
  `actions` stays at the trailing edge of a `NavBar` without links; the
  current `NavItem` differs from its siblings in weight, surface and bar;
  the sidebar's tokens resolve to dark values inside a light page.
- **The six gates**, the D82 sweep over the new stories included.

## Consequences

- Visual regression: new stories for every new component and the preset,
  in light and ember; `NavBar`'s existing story should not change.
- A consumer whose document must scroll as a whole (a long marketing page)
  does not use `AppShell`; it is an application frame.
- A `ToastRegion` at `top-start` can cover a focused skip link; the docs say
  to choose another placement.
