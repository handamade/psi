# Icons for the sections of a navigation tree, and the notice they ship with (D137)

## The need

A navigation tree with one icon per section (D124 gave `NavItem` and
`NavGroup` an `icon` slot) needs more glyphs than Psi has. Of its 30 icons,
only `IconSimCard` and `IconSettings` read as a section of an application. A
sidebar trial chose one icon for each section and asked for eight more:
a shield with a check, building blocks, a file with a cog, a crosshair, a
play button in a circle, a column chart, a scroll of text, and an activity
trace.

Lucide is the source. It is Feather's maintained fork, drawn on the same
24px grid with a 2px stroke and round caps and joins, which is what Psi's
icons use. Lucide's `menu`, `search`, `settings` and `user` were measured to
draw the same as Psi's own at the sizes Psi ships.

## What's there today

- 30 icons in `packages/react/src/icons/`, one component per file, all the
  same shape: `size = 20`, a 24-unit `viewBox`, `stroke="currentColor"`,
  `strokeWidth={2}`, round caps and joins, `aria-hidden="true"`, props spread
  last so a caller can override any of it.
- `manifest.json`'s `icons` roster is read from the file names (D76), so the
  site's icon count and `check-docs-drift` follow the folder.
- `packages/react/LICENSE` is Psi's MIT licence. It names neither Feather nor
  Lucide, and nothing in the package names a third party.
- Prose that lists icons by hand: `packages/react/llms.txt` says
  `## Icons (26)` and lists 26; the root `README.md` says `+ 30 icons`. The
  llms.txt section has been four short since D81 added `IconMenu`,
  `IconChevronLeft`, `IconLogOut` and `IconSimCard`. `check-docs-drift` does
  not check either line.
- The Storybook gallery (`Icons/Gallery`) shows 26 of the 30. The D64 status
  glyphs and the D70 ellipsis were never added to it.

## Where Psi's existing icons come from

Each existing icon was compared, element by element, with
`feather-icons@4.29.2` (`dist/icons.json`) and with Simple Icons. The
comparison is by element and attribute, so attribute order and self-closing
tags do not count as differences.

| Source | Icons | Licence |
|---|---|---|
| Feather 4.29.2, identical | ArrowDown, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Close (`x`), Copy, Edit, ExternalLink, Eye, Instagram, Loader, LogOut, Menu, Minus, Plus, Search, Trash, User | MIT, Cole Bemis |
| Feather 4.29.2, edited | AlertCircle, AlertTriangle, Info (the dot ends at `12`, not `12.01`; Info's stem runs 11→16), EyeOff (one path split into three), Settings (the same gear with shorter arc commands) | MIT, Cole Bemis |
| Simple Icons | GitHub (identical to 16.38.0), LinkedIn and X (identical to 10.0.0; LinkedIn was later removed from Simple Icons at the brand's request) | CC0-1.0 |
| Psi's own | MoreHorizontal (three filled dots, r 1.5), SimCard | MIT, Psi |

So 24 of Psi's 30 icons are Feather's work. Feather's MIT licence requires its
copyright and permission notice in every copy, and the package has never
carried it. The notice this decision adds covers them as well. Simple Icons
is CC0: no notice is owed, though the marks remain their owners' trademarks.

## Decisions

### D137 — Eight Lucide icons for navigation sections, and a third-party notice that ships in the package

**The icons**

| Component | Lucide name |
|---|---|
| `IconShieldCheck` | `shield-check` |
| `IconBlocks` | `blocks` |
| `IconFileCog` | `file-cog` |
| `IconCrosshair` | `crosshair` |
| `IconCirclePlay` | `circle-play` |
| `IconChartColumnBig` | `chart-column-big` |
| `IconScrollText` | `scroll-text` |
| `IconActivity` | `activity` |

- **Each name is Lucide's name in PascalCase.** A reader can find the source
  glyph from the component name alone. `IconChartColumnBig` keeps `Big`: Lucide
  also has a `chart-column` with three bars, and a shorter Psi name would
  point at the wrong one. The existing icons keep their Feather-era names
  (`IconAlertCircle`, not Lucide's `circle-alert`): renaming them would break
  consumers for no gain.
- **The paths are copied, not redrawn.** They come from
  `lucide-static@1.75.0` (`icons/<name>.svg`, npm integrity
  `sha512-vtAnJzxoH8jp0++Ydf22CPAAL3WfQQjmDG+OuRlG+CXouLCrlfTz7zWuDvHkTtj61czkhJAISChHDXkxLLqKRw==`).
  Every element and attribute value is kept as published. Only the JSX
  spelling of the root attributes changes.
- **Each file has the shape of `IconSimCard.tsx`:** `size = 20`,
  `stroke="currentColor"`, `strokeWidth={2}`, round caps and joins,
  `aria-hidden="true"`, props spread last. One line above the component names
  the source glyph, the version, and the notice file.
- **Lucide's `crosshair` is itself one of Feather's.** Lucide's own licence
  lists it as derived from Feather, so the notice lists it under both.

**The notice**

- `packages/react/THIRD-PARTY-NOTICES.md` carries, in full, Lucide's ISC
  licence and Feather's MIT licence. Each section lists the Psi components it
  covers. It also names Simple Icons' CC0 for the three brand marks, so the
  file accounts for every icon not drawn for Psi.
- **A separate file, not an addition to `LICENSE`.** `LICENSE` stays Psi's own
  MIT licence, which licence scanners read as one SPDX identifier. npm packs
  `LICENSE` whatever `files` says but not other names, so
  `THIRD-PARTY-NOTICES.md` joins `files` in `packages/react/package.json`.
  `pnpm pack` must list it, and the plan checks that it does.
- `packages/react/README.md` gets a short Licence section that points at the notice.
- `tools/verify-published.mjs` checks that the notice is in the installed
  `@handamade/psi-react`, beside its existing `LICENSE` check. The workspace
  cannot see what a tarball holds, which is why that tool exists (D75).
- A unit test reads the notice and requires every icon it lists to exist, and
  every D137 icon to be listed under Lucide. A ninth Lucide icon added without
  a notice line fails the build.

**The prose and the gallery**

- `packages/react/llms.txt` becomes `## Icons (38)` and lists all 38: the
  four D81 icons it lost, and the eight from D137 named as navigation-section
  glyphs for `NavItem`/`NavGroup`'s `icon` slot. The root `README.md` says
  `+ 38 icons`.
- The gallery shows every exported icon. It builds its list from
  `icons/index.ts`'s exports instead of a hand-kept array, so it cannot fall
  behind again; the icons appear in alphabetical order. Its `vr` baselines are
  refreshed from CI's render once the new renders are approved.

**What this does not do**

- No new icon API, no change to an existing icon, no new size.
- Lucide is not a dependency. The paths are copied at a pinned version;
  updating one is a deliberate change with its own diff.

## Tests and gates

- `icons.test.tsx`: each D137 icon renders `aria-hidden`, at 20 by default,
  with `stroke="currentColor"`, a 2px stroke, round caps and joins, and its
  own shape. Every export of `icons/index.ts` renders a 24-unit `viewBox`,
  `aria-hidden` and a default size of 20. The notice covers the eight, and
  every icon it names exists.
- `pnpm --filter @handamade/psi-react pack` lists `THIRD-PARTY-NOTICES.md`
  and `LICENSE`.
- The five gates: `pnpm build && node tools/check-docs-drift.mjs && pnpm test
  && pnpm lint && pnpm --dir apps/site build && pnpm test:site`. `vr` in CI.

## What this changes

- `@handamade/psi-react` (minor): eight new exported icons and a
  third-party notice in the tarball.
- `CLAUDE.md`: the decision range reads up to the highest decision merged
  when this merges.

## Follow-ups

- The Figma file is generated from code. If it draws Psi's icons, a Figma
  Community publish (still deferred) needs the same notice beside it.
- `check-docs-drift` does not check `## Icons (N)` in `llms.txt` or the root
  README's icon count. It could, as it does for components.
