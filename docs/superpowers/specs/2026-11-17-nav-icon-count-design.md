# An icon and a count in the navigation tree — `NavItem`, `NavGroup` and `Count` (D124)

Date: 2026-11-17. Status: **Implemented** on branch `d124-nav-icon-count`.

Provenance: two requests from a consumer's sidebar review. One asks for an icon
before an entry or a group label. The other asks for a count after an entry,
such as *Cards 238*. The component gap analysis
(`docs/research/2026-10-29-component-gap-analysis.md`) ranks a count fourth.

The number was given out by the coordinating session on 2026-11-17. D123 and
D125 are in flight on other branches at the same time. All three change the
shared counts in `llms.txt`, the READMEs and the docs, so whichever merges
second merges `origin/main` and runs `check-docs-drift` again.

## What's there today

- **`NavItem` takes only `children`, `href` and `current`, and `NavGroup`
  takes `label`, `open` and `onOpenChange`.** Neither has an icon. The tree's
  tokens (`nav-tree.ts`) are colours, a radius and a focus ring. None of them
  sizes or spaces an icon, and `nav-tree.module.css` has no rule for an icon
  inside an entry. A consumer can put an icon inside their link or inside
  `label`, but Psi then neither sizes, aligns nor colours it.
- **Psi has no count.** `Tag` is a status label, not a number. Nothing places
  a number after an entry's text.
- **Router links come in as the child.** A router app passes its own link as
  `NavItem`'s only child, and `NavItem` clones it to add
  `aria-current="page"` only when `current` is set (D93). Anything that has to
  sit inside the link's hit area and take the link's colour must therefore be
  put *into* that child.
- **The slot loader can't hold slots for a part that shares a folder.**
  `loadSlotContracts` reads `src/<Name>/slots.json`. `NavItem` and `NavGroup`
  live in `src/NavTree/`, so both get `[]`. `NavGroup`'s existing `label`, a
  `ReactNode`, is listed nowhere.
- **`fg-tertiary` is not gated on any surface.** It is the placeholder colour,
  which is exempt from 1.4.3. The only quiet text colour that the gate checks on
  the hover surface (`fillNeutral3`) and the current surface (`fillNeutral4`) is
  `fg-secondary`.
- **`fill-tint-warning` is translucent** (alpha 0.12 in the light themes, 0.15
  in the dark ones). The gate checks `fgWarning` on it after compositing it
  onto `bgPrimary`. Over the tree's current surface, the result is different.
  Measured `fgWarning` on the bare tint:

  | Theme | over `bgPrimary` (gated) | over `fillNeutral3` | over `fillNeutral4` |
  | --- | --- | --- | --- |
  | light | 4.87 | 4.63 | **4.43** |
  | dark | 6.94 | 5.70 | 5.23 |
  | ember | 6.98 | 5.64 | 5.15 |
  | acme | 4.96 | 4.72 | 4.52 |

  A bare tint pill on the current entry fails AA in the light theme.
- **No 16px size token.** The size scale is `24 | 32 | 40 | 48`. D97 derives
  an icon's size from its control's height (`calc(height / 2)`), and Psi's own
  chevron in `NavGroup` is 16.
- **Precedents this design rests on.** D93 (cloning a router child), D97 (an
  icon size derived from the control), D119 (a token test that measures a
  composite per theme), and `Banner`'s use of the global `psi-sr-only` class
  inside a component.

## Decisions

- **D124 — An icon before a navigation entry or group label, and a count after
  an entry. The icon is a prop on both parts. The count is a new public
  component, `Count`, that `NavItem` places and that `Tab` or `TableCaption` can
  hold as a child. A count is neutral or `attention`. Its visible text joins the
  link's name, and it is never a live region.**

  **The count**

  - **`Count` is a public component** (`packages/react/src/Count/`). The
    catalog goes from 55 to 56. It is shared rather than a `count` prop on
    `NavItem`, by the user's choice on 2026-11-17, so that `Tab` and a table
    caption use the same mark later without a second decision.
  - **Props.**
    - `value: number`, required. A non-negative integer.
    - `max?: number`, default `999`. A `value` above `max` shows as `` `${max}+` ``
      (*999+*). The digits are plain, not locale-formatted: at the default
      cap a count has at most three of them.
    - `tone?: "neutral" | "attention"`, default `"neutral"`.
    - `label?: string`. See *Accessible name* below.
    - `className`, `ref` (to the `<span>`), and the rest of a span's attributes.
  - **Markup.** One inline `<span>` with `font-variant-numeric: tabular-nums`
    (the same value `.psi-tabular` applies), `white-space: nowrap`, and no
    `role` and no `aria-live`. A count that changes is never a live region of
    its own. The consumer's own announcer, if they have one, speaks a change.
  - **`neutral`** is a bare number: `--psi-text-12-16-regular`, coloured
    `--psi-count-fg` → `fg-secondary`. It reads as quiet through its smaller
    size and regular weight. `fg-secondary` is the quiet colour the gate checks
    on every surface the tree paints. `fg-tertiary` is not used for this,
    because the gate doesn't check it on any surface.
  - **`attention`** is a filled pill: `--psi-text-12-16-medium`, a
    `--psi-radius-full` corner, inline padding `--psi-count-attention-padding-x`
    → `space-6`, foreground `--psi-count-attention-fg` → `fg-warning`. It
    differs from `neutral` in shape (the pill) and weight (medium) as well as
    colour, so colour is never the only signal. The warning hue was the user's
    choice on 2026-11-17. It reads as "needs a look" and doesn't compete with
    the accent bar on the current entry. `danger` stays for destructive
    actions.
  - **The pill paints its tint over a backdrop of its own.**
    `background-color: var(--psi-count-attention-backdrop-bg)` (→ `bg-primary`)
    under `background-image: linear-gradient(var(--psi-count-attention-bg),
    var(--psi-count-attention-bg))` (→ `fill-tint-warning`). The pill is then
    always the composite the gate already checks, `fgWarning` on
    `fillTintWarning` over `bgPrimary` (4.87–6.98), whatever surface it sits on.
    On the current entry in the light theme, a bare tint measured 4.43. Under a
    `data-psi-theme="dark"` sidebar, the backdrop resolves to the dark
    `bgPrimary`, as every component token does.
  - **No new contrast pair, and no pair changes.** `fgSecondary` on
    `fillNeutral1`–`6` and `fgWarning` on `fillTintWarning` are already in
    `wcagAAPairs`, so the pinned pair count does not move. A token test
    measures the backdrop composite per theme, as D119's does, so a palette
    change can't quietly break it.
  - **Accessible name.** By default the visible text is the count's text, and
    it joins the name of the link it sits in: *Cards 238*, *Cards 999+*.
    `label` replaces it for a screen reader. Pass it when the number alone
    doesn't say what it counts or why it asks for attention. With `label`,
    the visible number is wrapped in `aria-hidden="true"` and the label is
    rendered in a `psi-sr-only` span: `label="4 stuck"` makes the entry *Cards
    4 stuck*. The docs say three things:
    - start the label with the number shown, so a speech user can still name
      what they see;
    - an `attention` count should always carry a label, because the tone is
      visual only;
    - nothing about a change is announced.
  - **Inside `Tab` and `TableCaption`**, `Count` is an ordinary inline child,
    after a space: `<Tab>Inbox <Count value={3} /></Tab>`. Neither component
    changes in D124.

  **The icon**

  - **`icon?: ReactNode` on `NavItem` and on `NavGroup`**, an `Icon*` element
    passed without a size. It is a prop rather than a styled `svg` child (the
    D97 route), so that Psi decides where it goes and that it is always
    decorative.
  - **Always decorative.** Psi wraps it in `<span aria-hidden="true">`, so the
    text is the name even when a consumer forgets to hide their icon.
  - **Size.** `--psi-nav-tree-icon-size` → `calc(var(--psi-size-32) / 2)`, half
    the entry's height (16). That matches D97's ramp at 32 and the group's
    chevron. A CSS width and height on the `svg` inside the wrapper beat the
    attributes an icon writes, as in D97, so the token wins over the icon's
    `size` prop.
  - **Gap.** `--psi-nav-tree-icon-gap` → `space-8`, between the icon and the
    label. It is the same space as the group button's existing gap.
  - **Colour follows the state through `currentColor`.** The icon takes the
    colour of the link: `item-fg` at rest and on hover (hover changes only the
    surface), and `item-fg-current` for `aria-current="page"` and for the parent
    mark `aria-current="true"` (D96). In a group label, it takes `group-fg`.
    There is no icon colour token and no new pair: an icon in the text's colour
    clears 3:1 wherever the text clears 4.5.
  - **A group's icon stays when the group is closed.** Closing a group hides its
    list. Its button, label and icon stay, and only the chevron turns.
  - **No icon rail.** A closed sidebar is `hidden` (D88), so there is no
    icon-only state for the icon to serve. A rail is out of scope.

  **Placement in an entry**

  - **Order inside the link:** icon, label, count. The count is pushed to the
    inline end of the row. With `href`, `NavItem` builds this inside the `<a>`
    it renders. With a router link, it clones the child and gives it this
    content in place of its children. The child's own props and handlers stay,
    and `aria-current` is still added only for `current` (D93).
  - **Wrappers.** The icon is in `span.icon` (`display: flex; flex: none`). The
    label is in `span.label` (`flex: 1 1 auto; min-width: 0`), so a long label
    wraps and the count stays at the end. The count is in `span.countSlot`
    (`flex: none; margin-inline-start: auto; padding-inline-start:
    --psi-nav-tree-icon-gap`). A space text node sits between the label and
    the count slot, so the name reads *Cards 238*, not *Cards238*, in any
    accessibility tree, including jsdom, which applies no CSS. In a flex row it
    draws nothing, and in a real browser the blockified flex items add the space
    anyway.
  - **Nothing moves without an icon or a count.** With neither prop set,
    `NavItem` renders exactly what it renders today: no wrappers, and no clone
    unless `current` is set. Every existing story keeps its pixels.
  - **A router child that can't take them.** If `children` is not a single
    element, such as a string or a fragment, there is no link to put the icon
    and count into. They are not rendered, and a development warning says
    why, once, and never in production.
  - **`NavGroup` order inside the button:** icon, label, chevron. The chevron
    gains `margin-inline-start: auto`. With two items this changes nothing
    (`space-between` already put it at the end), and with three it keeps the
    label next to the icon instead of centring it.
  - **Under a group with an icon, the items line up with the label's text.**
    The group's `<li>` takes a `withIcon` class, and its list is inset by
    `calc(var(--psi-nav-tree-icon-size) + var(--psi-space-8))`: the icon plus
    the button's own gap. Without it, the items' text started 12px before the
    label's. The user chose this on 2026-11-17, after seeing CI's renders. A
    group without an icon keeps its one-step indent and its pixels.
  - **`count` is on `NavItem` only.** A count on a group, such as a total for
    its entries, was not asked for.

  **Slots**

  - **The loader learns one slot file per part in a shared folder.** For a
    component whose folder is not its own name (the `COMPONENT_DIR` map in
    `emit-manifest.ts`), `loadSlotContracts` reads `src/<Dir>/<Name>.slots.json`.
    A folder's owner keeps `slots.json`. The loader takes the map as an
    argument and validates both files the same way.
  - **`NavTree/NavItem.slots.json`:** `icon` (`0..1`, open), `body` (`0..*`,
    open; `0..*` because a preset fills an entry through `content`, not a
    `body` slot, and the pattern check counts an unfilled slot as 0), and
    `count` (`0..1`, accepts `Count`).
  - **`NavTree/NavGroup.slots.json`:** `label` (`0..1`, open), `icon` (`0..1`,
    open), and `body` (`1..*`, accepts `NavItem`).
  - **No preset uses them yet.** A pattern fills a prop slot with a component
    node or a string, and an icon is neither a manifest component nor a
    string, so `app-shell` keeps its plain entries. Teaching patterns to fill a
    prop slot with an icon is a follow-up, if a preset needs one.

  Weighed and not taken:

  - **A `count` prop on `NavItem`** (`count?: number`). Smaller, and the catalog
    stays at 55, but `Tab` and a caption would each grow their own count later.
    Not taken by the user's choice.
  - **Neutral only.** A count that asks for attention, such as stuck items, is
    in the request. Not taken by the user's choice.
  - **A solid accent pill**, the usual unread badge, would be a second accent
    beside the current-page bar. **A solid warning pill** is the loudest
    option. Neither was taken.
  - **The exact value in the name** (*999+* on screen, *1204* in the name).
    Then what is shown and what is read disagree. `label` covers the case where
    the number needs words, and the consumer chooses those words.
  - **CSS only, no icon prop.** Psi would size a direct `svg` child of the link
    or the label, but it could not make the icon `aria-hidden` or decide where
    it goes.
  - **The icon and count as siblings of the link, laid over it.** This would
    leave the router child untouched. But the count would then sit outside the
    link's name, and the icon outside its hit area unless it had
    `pointer-events: none`.
  - **A bare tint pill.** It measures 4.43 on the current entry in the light
    theme (above).

## Consequences

- **Catalog 55 → 56 components.** D123 and D125 add no component. Merge the
  latest `origin/main` before the PR and fix every count `check-docs-drift`
  names.
- **Changeset:** `minor`. The three packages version in lockstep.
- **Nothing a consumer has today moves.** The props, the component and the
  tokens are additions. With neither `icon` nor `count`, `NavItem`'s markup is
  unchanged, and the chevron's new auto margin draws the same pixels. One
  thing is new for a consumer: `NavGroup`'s `label` and `body` are listed
  slots in the manifest.
- **Stories.**
  - `Count.stories.tsx`: `Neutral`, `Attention`, `Capped` (998, 999, 1000, and
    `max={99}` at 100), `WithLabel`, and `InTabAndCaption`.
  - `NavTree.stories.tsx`: `WithIcons` (icons on entries and group labels, one
    group closed, one entry current, one a parent) and `WithCounts` (neutral and
    attention counts, a capped one, a long label that wraps, and the current
    entry with a count).
  - All are new VR baselines. No existing story moves.
- **Docs.**
  - The generated `docs/Count.md`.
  - A `Count` line in `packages/react/llms.txt`, and the `NavItem`/`NavGroup`
    line updated for `icon` and `count`.
  - A `guidance.ts` rule for `Count`: neutral by default, `attention` with a
    `label`, never a live region.
  - A site page for `Count` with its example.
  - The count in every prose claim `check-docs-drift` checks.

## File map

| File | Change |
| --- | --- |
| `packages/tokens/src/components/count.ts` | new: `countVars` (`fg`, `attention-fg`, `attention-bg`, `attention-backdrop-bg`, `attention-padding-x`) |
| `packages/tokens/src/components/nav-tree.ts` | `icon-size`, `icon-gap` |
| `packages/tokens/src/components/registry.ts` | register `count` |
| `packages/tokens/src/guidance.ts` | a `Count` rule, and `icon`/`count` in the tree's |
| `packages/tokens/__tests__/count-tokens.test.ts` | new: aliases, scope gate, the backdrop composite ≥ 4.5 per theme |
| `packages/tokens/__tests__/…` | the nav-tree tokens' new keys, wherever they are pinned |
| `packages/react/src/Count/Count.tsx`, `count.module.css` | new |
| `packages/react/src/Count/Count.test.tsx`, `Count.stories.tsx` | new |
| `packages/react/src/NavTree/NavItem.tsx`, `NavGroup.tsx`, `nav-tree.module.css` | `icon`, `count`, the wrappers |
| `packages/react/src/NavTree/NavItem.slots.json`, `NavGroup.slots.json` | new |
| `packages/react/src/NavTree/NavTree.test.tsx`, `NavTree.stories.tsx` | cases and two stories |
| `packages/react/scripts/slots.ts`, `slots.test.ts` | per-part slot files; pin the new slots |
| `packages/react/scripts/emit-manifest.ts` | `Count` in the list; pass `COMPONENT_DIR` to the loader |
| `packages/react/scripts/emit-docs.ts` | `Count`'s doc page, if the map needs it |
| `packages/react/src/index.ts` | export `Count` |
| `packages/react/src/a11y-meta.ts`, `a11y.axe.test.tsx` | `Count` entry and case; `NavItem`/`NavGroup` text for the icon and count |
| `packages/react/llms.txt`, `packages/react/docs/*.md` | docs (`.md` generated) |
| `apps/site/src/content/component-pages.ts`, `apps/site/src/examples/count/` | a `Count` page |
| `README.md`, `packages/react/README.md`, `packages/mcp/README.md`, … | 55 → 56, wherever the drift check says |
| `CLAUDE.md` | decision range, to what `main` holds at merge |
| `.changeset/nav-icon-count.md` | new |
| `apps/storybook/vr/…-snapshots/…` | new baselines from CI, after the user's OK |

## Verification

Tests first, each red on its assertion before the code exists.

- **Tokens** (`count-tokens.test.ts`, the nav-tree token test):
  - `components.css` declares each new key with its alias, and a theme may
    override each.
  - The scope gate refuses a text token on `attention-bg` and a surface token
    on `fg`.
  - For each shipped theme, `fgWarning` on `fillTintWarning` composited over
    `bgPrimary` clears 4.5.
- **`Count`** (`Count.test.tsx`):
  - It renders `value` as text, and `` `${max}+` `` above `max`, at the default
    and a custom cap.
  - `tone` sets the class, and `neutral` is the default.
  - It has no `role` and no `aria-live`.
  - With `label`, the number is `aria-hidden` and the label is in a
    `psi-sr-only` span.
  - `ref` and `className` are forwarded.
- **`NavItem` and `NavGroup`** (`NavTree.test.tsx`):
  - With `href` and an icon and a count: the `<a>` holds icon, label and count
    in order. The icon is inside `aria-hidden`. The link's name is
    `"Cards 238"`, or the label form with `label`.
  - With a router child and an icon and a count: the child is cloned, keeps
    its handlers and class, and holds the same content. `current` still adds
    `aria-current="page"`, and without `current`, its own `aria-current`
    survives.
  - With neither prop: the markup equals today's, for both forms.
  - A string child with an icon renders the string, renders no icon, and warns
    once in development.
  - `NavGroup` with an icon: the icon is in the button, before the label,
    `aria-hidden`. The button's name is the label. The icon is still there
    when `open` is false.
- **Slots** (`slots.test.ts`): `NavItem` has `icon`, `body` and `count`, with
  `count` accepting `Count`. `NavGroup` has `label`, `icon` and `body`. A part
  file naming an unknown component throws. `NavTree` keeps its `body`.
- **Axe:** a tree with icons, counts (one `attention` with a label) and a
  current entry passes. A `Count` alone passes.
- **Gates:**

  ```sh
  pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && CI=1 pnpm test:site
  ```

  then CI's `vr`. Show the user the new renders from the `vr-baselines`
  artifact before committing them.

## Follow-ups

- An icon-only rail for a narrowed sidebar.
- A count on `NavGroup`, such as a total for a closed group.
- `count` props on `Tab` and `TableCaption`, if a slot is wanted rather than a
  child.
- Patterns: fill a prop slot with an icon, so a preset can show a tree with
  icons.
