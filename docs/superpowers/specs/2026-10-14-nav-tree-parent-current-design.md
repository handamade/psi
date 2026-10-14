# The navigation tree marks the entry above the current screen (D96)

Date: 2026-10-14. Status: **Implemented** on branch `d96-nav-tree-parent-current`.

Provenance: the second item of the Psi 0.23 portal handoff
(`psi-handoffs/2026-10-14-psi-0.23-portal-handoff.md`, brief N1). The portal's
navigation tree has entries whose screen has screens below it, and those
lower screens are not in the tree. On such a screen the portal marks the
entry's link `aria-current="true"`, and `NavTree` draws nothing for that
value, so the operator sees no current mark anywhere in the tree.

The number is the first free `## Decisions` entry when this branch started
(D95 was the highest).

## What's there today

1. **`nav-tree.module.css` styles `.item a[aria-current="page"]` only**: the
   current surface, the primary foreground, medium weight, and a 3px bar at
   the inline start drawn by `::before`.
2. **`NavItem` sets `aria-current="page"`** on the anchor it renders from
   `href`, or on a single child link under `current` (D93). It never sets any
   other value. A link that carries `aria-current="true"` looks exactly like a
   link that is not current.
3. **ARIA gives `true` its own meaning**: the current item within a set,
   without claiming to be the page itself. That is the right value for "the
   screen you are on sits under this entry". `page` on the entry would tell a
   screen reader the entry *is* this page, which it is not.

## Decisions

- **D96 — A link in a `NavTree` with `aria-current="true"` is marked as the
  entry the current screen sits under: the current foreground and medium
  weight, with no surface and no bar.**
  - **`.item a[aria-current="true"]`** sets `color:
    var(--psi-nav-tree-item-fg-current)` and `font:
    var(--psi-text-14-20-medium)`. That gives two signals, colour and
    weight, so colour is never the only one (WCAG 1.4.1). Weight is the
    signal that survives forced colours and a colour-blind reading.
  - **No raised surface and no inline-start bar.** Those two stay the marks of
    `page`, the screen itself, so the two states remain distinct when both
    are visible: the leaf has surface, bar, weight and colour, and its parent
    has weight and colour. The bar keeps meaning "this screen".
  - **No new tokens.** The parent reuses `item-fg-current`, which is
    `fg-primary`. That pair is already gated on the sidebar background and
    on `fill-neutral3` (the hover surface) in every theme, so no new
    contrast pair is introduced.
  - **No API change.** `NavItem` still sets only `page`. A router app passes
    its own link and sets `aria-current="true"` on it, as the portal already
    does. The `current` prop stays boolean.

  **Why this is a fix, not a new default.** It draws a mark where none was
  drawn, for a value Psi's own `NavItem` never produces. No consumer can
  depend on `aria-current="true"` looking like a plain link: the attribute
  states that the link is current, and showing nothing contradicts it. Every
  link with no `aria-current`, or with `page`, renders exactly as before.

  Weighed and not taken:

  - **The same mark as `page`.** Then a leaf and its parent, when both are
    visible, are indistinguishable, and the operator cannot tell which entry
    is the screen.
  - **Weight, colour and the bar, without the surface.** The bar is the
    strongest single mark, and on the parent it would claim "this screen".
  - **A lighter surface for the parent** (a new `item-bg-parent` pair). The
    brief allows it if the design wants one. Weight and colour already make
    the state visible and distinct, and a second surface adds two tokens and
    a contrast pair for no reading the weight does not already give. Add it
    if a consumer finds the parent mark too quiet.
  - **`aria-current="location"`.** ARIA defines `location` for the current
    position in a visual flow chart or map, not in a site's navigation. The
    portal uses `true`. Style `location` only if a consumer needs it.
  - **A `current="parent"` (or `"true"`) value on `NavItem`.** Router apps
    already pass their own link, and only they know which screen sits under
    which entry. A prop would duplicate what the link already says. Revisit
    it if a preset needs a parent mark, since a preset cannot hold a raw
    link.

## Consequences

- A link marked `aria-current="true"` in a `NavTree` reads as the parent of
  the current screen. A link marked `page` is unchanged.
- The portal's tree needs no code change. Its gap row for the current
  location closes once it pins the release.
- No existing baseline should move: no story sets `aria-current="true"`. Any
  VR diff outside the new story is a defect to explain.

## Verification

- **Tests first**, red before the change, on assertion:
  - `NavTree.test.tsx` reads the module's rules (jsdom does no layout, as in
    `Toolbar.test.tsx`). `.item a[aria-current="true"]` sets the current
    foreground and medium weight. The bar's `::before` rule still names only
    `page`.
  - `apps/storybook/vr/nav-tree.interaction.spec.ts` measures in a browser,
    in the new story: the parent link is medium weight (500) where a plain
    sibling is regular (400), its colour differs from the sibling's, it has
    no background, and its `::before` draws nothing.
- **A new story, `ParentCurrent`**: a tree where the current screen sits
  under a top-level entry, with no leaf marked. Its VR baselines come from
  CI.
