# A guide line in the navigation tree, and icon colours apart from the text — `NavTree` tokens (D138)

Date: 2026-11-18. Status: **Implemented** on branch `d138-nav-tree-guide`.

Provenance: a consumer trialled a sidebar on 2026-11-18, a light page with a
dark sidebar sub-theme. It chose a look Psi's tokens could not express, and got
it with structural CSS that reaches into Psi's hashed markup
(`nav > ul > li > button`, `li > a`). This decision turns that look into
tokens, so a theme's `componentOverrides` produces it and the consumer's CSS
goes away.

D138 was free on `origin/*` and in open PRs on 2026-11-18. D137 (icons) and
D139 (sub-theme token scope, `NavBar`, `AppShell`) are in flight on other
branches at the same time. The files are disjoint.

## The look

1. A group's label is secondary and its icon primary.
2. A top-level entry's text is primary and its icon secondary.
3. A 1px line in `--psi-border-strong` runs down an open group's entries, from
   under the group's icon.
4. The current entry is marked by a 1px accent segment on that line, beside the
   entry's text, with square ends. Its text is accent and it has no surface.

Item 4's colours already work: `--psi-nav-tree-item-fg-current` and
`--psi-nav-tree-item-bg-current` take `--psi-fg-accent` and `transparent`.

## What's there today

- **An icon is coloured by `currentColor`** (D124). In a group's button, that
  is `--psi-nav-tree-group-fg`. In an entry, it is `--psi-nav-tree-item-fg`, or
  `item-fg-current` on the page and on its parent (D96). An icon can't differ
  from its text.
- **There is no guide line.** A group's `<ul>` (`.groupList`) is a flex column
  with no positioning and no pseudo-element.
- **The current page's bar is hardcoded.**
  `.item a[aria-current="page"]::before` is `inset-block: 0`,
  `inset-inline-start: 0`, `width: 3px`, and rounded by
  `--psi-nav-tree-radius`. It is always at the link's inline start.
- **The geometry is fixed by the CSS, not by tokens.** A group's button pads
  `space-12` on the inline axis, and its icon is `--psi-nav-tree-icon-size`
  (16px), so the icon spans 12–28px of the group's `<li>` and centres on 20px.
  Under a group with an icon (`.withIcon`), the list pads
  `icon-size + space-8` (24px), so an entry's link starts at 24px (D124).
- **The consumer's overrides, measured.** A 1px line at
  `inset-inline-start: 19px` on the group's `<ul>` (made `position: relative`),
  `inset-block: space-2`. The bar narrowed to 1px, moved by `-5px` (24 − 5 = 19,
  so it lands on the line), `inset-block: 6px`, `border-radius: 0`.

## Decisions

- **D138 — `NavTree` gets seven tokens: an icon colour for an entry and one for
  a group, a guide line along an open group's entries that Psi places from the
  group's own geometry, and the current entry's bar as width, block inset and
  radius. When the guide line is drawn, the bar moves onto it, computed from the
  same geometry. Every default renders today's pixels.**

  **The tokens** (`packages/tokens/src/components/nav-tree.ts`)

  | Token | Default | What it does |
  | --- | --- | --- |
  | `--psi-nav-tree-item-icon-fg` | `currentColor` | An entry's icon at rest. `currentColor` is the entry's text colour. |
  | `--psi-nav-tree-group-icon-fg` | `currentColor` | A group's icon. `currentColor` is `group-fg`. |
  | `--psi-nav-tree-guide-width` | `0px` | The guide line's width. `0px` draws nothing. |
  | `--psi-nav-tree-guide-border` | `var(--psi-border-strong)` | The guide line's colour. |
  | `--psi-nav-tree-indicator-width` | `3px` | The current entry's bar. |
  | `--psi-nav-tree-indicator-inset-block` | `0` | The bar's distance from the link's top and bottom. |
  | `--psi-nav-tree-indicator-radius` | `var(--psi-nav-tree-radius)` | The bar's corners. |

  **Icon colours.** Two tokens, not one, because the look moves them in
  opposite directions: a group's icon is louder than its label, an entry's
  icon is quieter than its text. Both default to `currentColor`, which in
  `color` is the inherited text colour, so today's icon colours are unchanged.

  **The current entry's icon follows the current text colour. There is no
  `item-icon-fg-current`.** On a link with `aria-current="page"` or `"true"`,
  the icon is `currentColor` again, which is `item-fg-current`. The current
  entry then reads as one colour, and in the consumer's look the icon turns
  accent with its text. A secondary icon beside accent text would make the
  mark weaker. A token for it can be added later without moving any pixel,
  since its default would be `currentColor`. Nobody has asked for it.

  **The guide line**

  - It is drawn by `.withIcon > .groupList::before`: absolutely positioned on
    the group's list (now `position: relative`), with
    `inset-block: var(--psi-space-2)` and
    `border-inline-start: var(--psi-nav-tree-guide-width) solid var(--psi-nav-tree-guide-border)`.
    A border, not a background, so the colour token is bound to a border
    property and the D46 scope gate checks it like any other `-border` key.
  - **Psi computes its column. There is no column token.** It is centred
    under the group's icon, from the same values that place the icon:

    ```css
    inset-inline-start: round(down,
      calc(var(--psi-space-12) + (var(--psi-nav-tree-icon-size) - var(--psi-nav-tree-guide-width)) / 2),
      1px);
    ```

    At 16px and 1px that is 19.5px, rounded down to 19px, so the line sits on a
    whole pixel. It is the consumer's value. A 2px line covers 19–21px,
    centred on 20px. Change `icon-size` and the line follows.
  - **`round()` sits behind `@supports`.** Psi's floor is Chrome 119, and
    `round()` arrived in Chrome 125 (Firefox 118, Safari 15.4). A declaration
    that holds `var()` can't be dropped at parse time: in an engine without
    `round()` it would be invalid at computed-value time and fall to `auto`.
    So the plain `calc()` comes first, and an
    `@supports (inset-inline-start: round(down, 1.5px, 1px))` block replaces it.
    Without `round()`, the line starts at 19.5px. The browser snaps a 1px
    border to a device pixel, so it is still sharp, and the bar, computed the
    same way, lands at the same 19.5px.
  - **Only a group with an icon draws it.** Without an icon there is no
    column to centre on, and the group's entries start one step in
    (`space-12`), where a line would only crowd the text. The token does
    nothing there.
  - **Closed groups draw nothing:** a closed list is `display: none`.
  - **Logical properties only,** so it mirrors in RTL.
  - **Off by default:** width `0px` paints no pixel.
  - **Write lengths with a unit.** The guide's width is used inside `calc()`,
    where a unitless `0` is a number, not a length, and makes the
    declaration invalid. Write `0px` to turn it off.

  **The bar on the line: one mode, computed from the geometry**

  The brief asked whether the guide line should also move the bar, or whether
  two independent tokens should do it. **One mode.** When the guide line is
  drawn, the current entry's bar in that group moves onto it. Psi computes the
  offset from the geometry that places the line, so they cannot drift:

  ```css
  /* the @supports form; the fallback is the same without round() */
  .withIcon > .groupList > .item a[aria-current="page"]::before {
    inset-inline-start: clamp(
      calc(var(--psi-nav-tree-guide-width) * -1000),
      calc(round(down, calc(var(--psi-space-12) + (var(--psi-nav-tree-icon-size) - var(--psi-nav-tree-indicator-width)) / 2), 1px)
        - var(--psi-nav-tree-icon-size) - var(--psi-space-8)),
      calc(var(--psi-nav-tree-guide-width) * 1000));
  }
  ```

  - The middle term is the bar's start in the link's coordinates: centred on
    the same column as the line, minus where the link starts (24px). At 1px
    that is 19 − 24 = −5px, the consumer's value. A bar as wide as the line
    covers it exactly. A wider bar is centred on the same column.
  - The `clamp()` is the switch. CSS can't test a token's value, but it can
    scale by it: with `guide-width: 0px` both bounds are `0px` and the bar stays
    at the link's edge, as today. With any drawn width, the bounds are far
    apart and the computed offset stands.
  - The two alternatives were worse. An offset token would be a column the
    consumer computes, which the brief rules out, and it drifts when
    `icon-size` changes. A separate on/off switch (a unitless 0/1 token) is a
    second knob that can disagree with the line: a line with the bar beside
    it, or a bar on a line that isn't there.
  - The trade-off: with a guide line on, the bar can't stay at the link's
    edge in that group. That combination draws two parallel marks 5px apart,
    so it is not offered.
  - Top-level entries, and entries in a group without an icon, keep the bar at
    the link's edge. There is no line there.
  - **Width, block inset and radius are their own tokens.** The look uses a 1px
    bar, `inset-block: 6px` (`--psi-space-6`, the 20px text line inside a
    32px link) and square ends. With today's rounded corners, a 1px bar would
    show a half-pixel curve at each end. Their defaults (`3px`, `0`, the
    tree's radius) are today's values.

  **The parent of the current screen** (`aria-current="true"`, D96) still has
  no bar. Its icon follows its text, like the page's.

  **No new contrast pair.** The icons are decorative (`aria-hidden`; the text
  is the name) and the guide line is decorative: the entries' indent and the
  group's button carry the structure, so neither is WCAG 1.4.11's "graphical
  object required to understand the content". The pinned pair count does not
  move. The colours the look uses (`fg-primary`, `fg-secondary`, `fg-accent`
  as text, `border-strong` as a line) are gated already where they are text.
  The bar is a non-text accent, as before.

  **Scope gate and stylelint.** `item-icon-fg` and `group-icon-fg` end in
  `-fg`, so `scope-map.json` scopes them to `text` and the CSS binds them to
  `color`. `guide-border` ends in `-border`, so it is scoped to `border` and
  bound to `border-inline-start`. `border-strong` is a `border` token, so the
  consumer's override passes `checkOverrideScopes`. The other four keys carry
  no `-fg`, `-bg` or `-border` segment and are not scope-checked, like
  `icon-size`.

  **The `gap` scope group gains the logical insets.** The line and the bar are
  placed with `space-*` tokens in `inset-block` and `inset-inline-start`, and
  the stylelint scope rule refused them: `PROPERTY_GROUPS.gap` listed `inset`,
  `top`, `right`, `bottom` and `left`, but no logical inset. That is the same
  omission D67 found in the `border` group. `inset-block`, `inset-inline` and
  their four longhands join `gap` in `packages/tokens/src/scopes.ts`, so
  `scope-map.json` carries them.

  **The look, as a theme's overrides:**

  ```ts
  componentOverrides: {
    "nav-tree-group-icon-fg": "var(--psi-fg-primary)",
    "nav-tree-item-fg": "var(--psi-fg-primary)",
    "nav-tree-item-icon-fg": "var(--psi-fg-secondary)",
    "nav-tree-item-fg-current": "var(--psi-fg-accent)",
    "nav-tree-item-bg-current": "transparent",
    "nav-tree-guide-width": "1px",
    "nav-tree-guide-border": "var(--psi-border-strong)",
    "nav-tree-indicator-width": "1px",
    "nav-tree-indicator-inset-block": "var(--psi-space-6)",
    "nav-tree-indicator-radius": "0",
  }
  ```

  `group-fg` is already `fg-secondary`. Under a sidebar sub-theme, put these in
  the sidebar theme's `componentOverrides`. Tokens set on the page's theme do
  not reach into a sub-themed element (D110). `item-fg-current: fg-accent` on
  the dark sidebar is text the gate already checks on `bgPrimary`, but not on
  the hover surface. With `item-bg-current: transparent`, the current entry
  only takes that surface while it is hovered.

## Consequences

- **Every story renders as before.** The new rules either restate the
  inherited colour, draw a 0px border, or compute an offset of `0px`. The goal
  is zero changed `vr` stories. The one new story, `GuideLine`, needs a new
  baseline.
- **`.withIcon > .groupList` is `position: relative`.** Nothing inside it was
  positioned against an ancestor, since every link positions its own bar.
- **First use of `round()` and `clamp()` in a component's CSS.** `clamp()` is
  far inside Psi's floor (Chrome 119, Safari 18, Firefox 128). `round()` is not:
  Chrome 119–124 lacks it, so it sits behind `@supports` with an unrounded
  fallback.
- **Changeset:** `minor`. Additive tokens.
- **Docs:** `NavTree`'s description and its `llms.txt` lines name the tokens
  and the overrides. The generated `docs/NavTree.md` lists the new variables.

## File map

| File | Change |
| --- | --- |
| `packages/tokens/src/components/nav-tree.ts` | seven keys |
| `packages/tokens/src/scopes.ts`, `__tests__/scopes.test.ts` | the logical insets in the `gap` group |
| `packages/tokens/__tests__/nav-tree-tokens.test.ts` | new: defaults, scope map, the look's overrides through `buildThemeCss` |
| `packages/react/src/NavTree/nav-tree.module.css` | icon colours, the guide line, the bar's tokens and its offset |
| `packages/react/src/NavTree/NavTree.test.tsx` | the rules (jsdom has no layout) |
| `packages/react/src/NavTree/NavTree.tsx` | description: the guide line and the icon colours |
| `packages/react/src/NavTree/NavTree.stories.tsx`, `.css` | `GuideLine`: the look through tokens only, under a dark sidebar in a light page |
| `apps/storybook/vr/nav-tree.interaction.spec.ts` | the line's and the bar's pixels, LTR and RTL; colours |
| `packages/react/llms.txt`, `packages/react/docs/*.md` | docs (`.md` generated) |
| `CLAUDE.md` | decision range, to what `main` holds at merge |
| `.changeset/nav-tree-guide.md` | new |

## Verification

- **Tokens** (`nav-tree-tokens.test.ts`): `components.css` declares the seven
  keys with their defaults, and `guide-width` carries a unit. `scope-map.json`
  scopes the two icon keys to `text` and `guide-border` to `border`. The look's
  overrides pass `buildThemeCss`, which runs the scope gate, and are emitted
  in `@layer psi.components`. A text token on `guide-border` is refused.
- **CSS rules** (`NavTree.test.tsx`): the icon rules bind the tokens, the
  current icon goes back to `currentColor`, the guide line is only under
  `.withIcon`, and the bar reads its three tokens and the clamped offset.
- **In the browser** (`nav-tree.interaction.spec.ts`, Chromium):
  - In `GuideLine`, the line is 1px wide, its start is 19px from the group's
    `<li>`, and it starts and ends 2px inside the list. The bar's start equals
    the line's, it is 1px wide, and its colour differs from the line's.
  - In RTL, both measure 19px from the `<li>`'s right edge.
  - The group's icon colour differs from its label's, and an entry's icon
    colour differs from its text's. The current entry's icon has its text's
    colour.
  - In `WithIcons`, which has the default tokens: the bar is 3px at the link's
    edge, the list's `::before` is 0px wide, and every icon has its text's
    colour.
- **Gates:**

  ```sh
  pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site
  ```

  then `pnpm test:e2e` locally, and CI's `vr`. Zero changed stories, and one
  new baseline, shown to the user before it is committed.

## Follow-ups

- `item-icon-fg-current`, if a theme wants the current entry's icon apart
  from its text.
- A guide line for a group without an icon, if a consumer wants one: it needs a
  column of its own.
- A preset or pattern showing the guided tree, once there is one for an
  icon sidebar.
