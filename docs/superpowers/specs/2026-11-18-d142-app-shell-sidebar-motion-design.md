# The `AppShell` sidebar opens and closes with motion, on request (D142)

Date: 2026-11-18. Status: **Implemented** on branch `d142-sidebar-motion`, after D141.

Provenance: a consumer's sidebar trial asked for a sidebar that animates open
and closed. A consumer lab measured an approach with its own CSS (`#sidebar`,
`:has()`); this decision builds it into `AppShell` with Psi's classes and
tokens. The API was agreed before this spec: a prop chooses instant or
animated, and timing is tokens only, pointing at D141's `move` preset.

D142 was free on every `origin/*` branch and in both open PRs on 2026-11-18.
It lands after #195 (D139/D140), which owns `AppShell` and `app-shell.ts`.
**Check the number again when the PR opens.**

## What's there today

`AppShell` (D88, D110, D113, D114, D139, D140) closes its sidebar three ways
at once, and none of them can animate:
- the root gets `.sidebarClosed`, which sets `grid-template-columns:
  minmax(0, 1fr)`: one track instead of two, a discrete change;
- the sidebar element gets `hidden`, so `display: none`;
- `main` gets `.mainSquare`, `border-start-start-radius: 0` (D110).

`sidebar == null` takes the same closed layout, so there is never an empty
column.

## Measured: two tracks, a clipping sidebar and a fixed-width scroller inside it

A static page in Chromium 1254 (Playwright), 1000 × 600, a 40px header, a
16rem sidebar with 8px padding and a 1px D114 line, 41 links, `main` with a
12px corner. The same markup with and without the slide rules, then the slide
version closed and read at intervals:

| state | columns | sidebar box (x, w) | first link (x, w) | sidebar visibility, opacity |
|---|---|---|---|---|
| instant, open | `256px 744px` | 0, 256 | 8, 239 | visible, 1 |
| slide, open | `256px 744px` | 0, 256 | 8, 239 | visible, 1 |
| slide, ~50ms into closing | `99.5px 900.5px` | 0, 99.5 | 8, 239 | visible, 0.39 |
| slide, ~100ms | `22.3px 977.7px` | 0, 22.3 | 8, 239 | visible, 0.09 |
| slide, closed | `0px 1000px` | 0, 1 | 8, 239 | hidden, 0 |

The same run with `dir="rtl"`: the sidebar sits at x = 744 open and runs to
x = 999 closed, and the first link stays at x = 753 throughout. So:
1. **`grid-template-columns` interpolates** between `16rem minmax(0, 1fr)` and
   `0px minmax(0, 1fr)`: two lists with the same number of tracks.
2. **Open, the slide markup is pixel for pixel the instant one**: same box, same
   content box.
3. **The content does not reflow.** The link keeps its x and its width while
   the column runs to 0; the sidebar's edge passes over it.
4. **The D114 line rides the moving edge** (the box keeps its 1px border, so it
   ends 1px wide over a 0px track) and goes with `visibility` at the end.
5. **Focus inside a closing sidebar is dropped to `<body>`** when it goes
   `visibility: hidden`, and the next Tab starts from the top of the document.
   Today's instant close does the same through `display: none`.

## Decisions

### D142 — `sidebarMotion="slide"` animates the sidebar's column to 0 and back through `--psi-app-shell-sidebar-duration` and `-ease`, which alias D141's `move`; focus inside a closing sidebar goes to its toggle or to `main`

**The prop.** `sidebarMotion?: "instant" | "slide"`, default `"instant"`.
`"instant"` is today's behaviour, unchanged in markup and in CSS. `"slide"`
animates. The prop never takes a time: like `Card`'s `hoverLift` (D141's
`emphasis`), it turns motion on, and tokens say how long.
Later values, such as an icon rail or a sidebar that slides over `main` on a
narrow screen, are out of scope and would be new values of the same prop.

**The tokens** (`packages/tokens/src/components/app-shell.ts`):

```ts
"sidebar-duration": "var(--psi-motion-move-duration)", // 200ms
"sidebar-ease": "var(--psi-motion-move-ease)",         // --psi-ease-soft
```

Page-scoped under D139 (no colour), so a sub-theme keeps the page's timing.
D141's scope gate holds them to a duration step or a preset, in Psi's registry
and in every theme's `componentOverrides`, so reduced motion reaches them.

**The mechanism** (`app-shell.module.css`), all under a root class `.slide`
that `AppShell` adds only when `sidebarMotion="slide"` *and* there is sidebar
content:
- **Two tracks, always.** `.slide.sidebarClosed` sets `grid-template-columns:
  0px minmax(0, 1fr)` instead of one track, and `.slide` transitions
  `grid-template-columns` over the sidebar's duration and easing.
- **The sidebar clips, an inner wrapper scrolls.** In slide mode the sidebar
  element keeps `display: block` (no `hidden` attribute), drops its padding,
  and becomes `overflow: clip` with `min-inline-size: 0`. `AppShell` renders
  one `<div>` inside it, `.sidebarInner`, which carries what the sidebar
  carried: `inline-size: var(--psi-app-shell-sidebar-width)`, `block-size:
  100%`, `overflow: auto`, the padding `--psi-app-shell-sidebar-padding`, and a
  **transparent** `border-inline-end` of `--psi-app-shell-sidebar-border-width`.
  The visible D114 line stays on the sidebar element.
- **Hidden by `visibility`, faded by `opacity`.** `.slide.sidebarClosed
  .sidebar` is `visibility: hidden; opacity: 0`, both transitioned with the
  column. `visibility` interpolates discretely and stays `visible` until the
  end of a close and turns `visible` at the start of an open, so a closed
  sidebar leaves the tab order and the accessibility tree, and an opening one
  is reachable at once.
- **Main's corner** transitions `border-start-start-radius` with the column,
  so `.mainSquare`'s 0 arrives with the close and the D110 corner comes back
  with the open.

Why an inner wrapper that scrolls, and not `min-inline-size` on the child, or
the lab's `width − 2 × padding`:
- **`min-inline-size` on `.sidebar > *`** styles the consumer's element, misses
  text and several children, and does not hold the scrollbar's space.
- **Holding the content at `sidebar-width − 2 × padding`** while the sidebar
  stays the scroller is wrong by the scrollbar's width wherever scrollbars take
  space (Windows, Linux, macOS with "always show"): the content is wider than
  the space beside the scrollbar, and `overflow-x: hidden` cuts it. It is also
  wrong by the D114 line's width when that is set, and the line's default is a
  unitless `0`, which makes `calc(16rem - 0)` invalid at computed-value time.
- **The wrapper is the open sidebar's own box**, moved one level in: same
  width, same padding, its scrollbar in the same place. The transparent border
  makes its content box exactly the instant sidebar's (`width − 2 × padding −
  line`), with no `calc()` and no unit trouble, and the outer element's clip
  removes exactly that border's width, so nothing visible is cut. Open, it
  measures the same as instant (above).

What a consumer sees change in slide mode only: the scroller is
`.sidebarInner`, not the element with `id={sidebarId}`. Code that sets
`scrollTop` on `#sidebar` must use the wrapper; `scrollIntoView` and the
browser's own focus scrolling work either way. Documented on the prop.

**The D114 edge line while the column runs to 0** rides the moving edge. The
sidebar element keeps its border; over a 0px track it is 1px wide, overflows
main by 1px, and is `visibility: hidden` by then, so it paints nothing and
takes no pointer. During an open it appears at once and travels out with the
edge. It also fades with the sidebar's opacity.

**Focus inside the sidebar when it closes** (both modes). Today's instant
close drops it to `<body>` (finding 5). When `sidebarOpen` turns false and
`document.activeElement` is inside the sidebar, `AppShell` moves focus, in a
layout effect, before the sidebar is hidden:
1. to the first connected, enabled element whose `aria-controls` names
   `sidebarId`: the toggle D88 asks every consumer to wire. That is where a
   keyboard user who closed the sidebar from inside it expects to be;
2. else to `main` (`tabIndex={-1}`, D88), which draws the shared ring.

`preventScroll` is not set: the toggle is in the header, which never scrolls
(D88). This applies to `"instant"` as well: the loss is a defect of today's
close, not a feature of the new one, and the fix changes no pixel. A sidebar
that closes because its *content* went away (`sidebar` to `null`) removes the
focused node; React has removed it before any effect runs, so that case is
out of scope, as it was in D136.

**`"slide"` with no `sidebar` content** behaves as today: one track, the
sidebar `hidden`, no `.slide` class, no inner wrapper. Content arriving or
leaving is a change of track count, so it never animates.

**Right-to-left** needs nothing of its own. The grid's columns, the inner
wrapper's inline start, `border-inline-end` and `border-start-start-radius`
are all logical; measured above, the content stays anchored at the right and
the edge runs right.

**The sidebar width under a sub-theme.** The lab copied the page's width into a
property of its own on the shell's root, because a sub-theme used to re-declare
`--psi-app-shell-sidebar-width` back to Psi's default. D139 ends that: the width
is page-scoped, declared at `:root` and in a page theme's block, so a
`sidebarTheme` sidebar inherits whatever the root, the page theme or `:root`
set. One path is left: a theme whose own `componentOverrides` set the width,
applied as `sidebarTheme`, re-declares it on the sidebar element itself (D139
re-declares an override where its theme is applied). The grid track, read on
the root, would then differ from the inner wrapper. `.slide .sidebar` declares
`--psi-app-shell-sidebar-width: inherit`, in `@layer psi.components` above
`psi.theme`, so the sidebar always takes the root's width, the one its column
has. No copy, no extra property.

**Reduced motion.** Every transition here reads the two tokens, which alias
`move`, which aliases `--psi-duration-200`: `0.01ms` under
`prefers-reduced-motion: reduce` (D30, measured in D141). The sidebar opens and
closes at once; `visibility` still flips at the (now immediate) end.

## Consequences

- **No consumer sees a change by default.** `"instant"` keeps today's markup,
  CSS and pixels, except that focus no longer falls to `<body>` when the sidebar
  closes around it.
- **A consumer gets a sliding sidebar from one prop** and retimes it with two
  tokens, or by retuning `move`.
- **The sidebar's scroller moves one element in**, in slide mode only.
- **`NavBar brandAlign="sidebar"` (D140)** lines its brand up with the
  sidebar's width; it does not follow the sidebar's open state, in either mode.
  Unchanged here.

## File map

- `packages/tokens/src/components/app-shell.ts` — `sidebar-duration`,
  `sidebar-ease`, and their doc comment.
- `packages/react/src/AppShell/AppShell.tsx` — `sidebarMotion`, `.slide`, the
  inner wrapper, the focus move.
- `packages/react/src/AppShell/app-shell.module.css` — the slide rules.
- `packages/react/src/AppShell/AppShell.test.tsx` — markup in both modes, the
  focus move, `sidebar == null`.
- `packages/react/src/AppShell/AppShell.stories.tsx` — `Sliding` and
  `SlidingClosed`, with the Menu toggle.
- `apps/storybook/vr/app-shell.interaction.spec.ts` — the column mid-close, the
  closed state's visibility and tab order, the focus move, RTL, reduced motion.
- `packages/tokens/__tests__/app-shell-tokens.test.ts` — the two tokens.
- Docs: `packages/react/docs/AppShell.md`, `packages/react/llms.txt`.

## Verification

- The five gates, `check-docs-drift` and `test:site` included.
- `vr` in CI: the new `Sliding` and `SlidingClosed` stories add baselines. Every existing `AppShell`
  story is `"instant"` and must not move. Show the user the new renders before
  committing them.

## Follow-ups

- An icon rail, and a narrow-screen sidebar that slides over `main`, as further
  `sidebarMotion` values, when a consumer needs one.
- `NavBar brandAlign="sidebar"` could follow a closed sidebar; it does not today
  in either mode.
