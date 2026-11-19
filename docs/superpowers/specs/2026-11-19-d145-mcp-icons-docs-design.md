# Icons and hooks in the MCP, a hint in Psi's own words, and component pages that describe their own component (D145)

Date: 2026-11-19. Status: **Designed**; lands after #200 (D143), which
rewrites the pattern presets this decision also touches.

Provenance: the 2026-11-18 inspection's generation test. A fresh agent with
only the four MCP tools built a 599-line screen that compiled and rendered,
and stumbled in five places where the MCP and the docs disagree with
themselves or say nothing. Each section below is one of them.

D143 is #200 and D144 is a parallel session's. D145 was the next number with
no `## Decisions` entry on `origin/main` or on any `origin/*` branch on
2026-11-19. **Check it again when the PR opens.**

## What's there today

Measured on 0.37.0's built index (`packages/mcp/dist/psi-index.json`):

1. **Icons are invisible.** `manifest.icons` lists 38 names and the index
   never reads it. `search "IconMoreHorizontal"` returns `[]`; `get` doesn't
   know the id; `check` puts `<IconSearch />` under "Not checked: a Psi export
   with no manifest entry" and never looks at its props. The test agent found
   names by putting 52 guesses through `check`. Every icon file declares the
   same `IconProps extends SVGAttributes<SVGSVGElement> { size?: number }`,
   defaults `size` to 20 and renders `aria-hidden="true"` before the spread;
   one of 38 has a TSDoc comment, so the names are the only description there
   is.
2. **The empty-query overview** is 5,880 of its 6,000 characters: 14 topics
   (1,668), the guides and token-page rows (279), 24 patterns (1,648) and the
   D61 floor of 8 component briefs (2,289). The patterns get what is left,
   and at 24 that is an intro cap of 0: every summary is one word and an
   ellipsis (`"The…"`, `"Transient…"`). Nothing says there are 60 components;
   the overview reads as if there were 8.
3. **`check`'s hint** is the nearest name by edit distance over the
   component's own props and its DOM attributes together. `onValueChange` on
   `Combobox` is 2 edits from the DOM's `onVolumeChange` and 5 from
   `Combobox`'s own `onChange`, so the hint is "did you mean
   `onVolumeChange`". `onValueChange` is `SegmentedControl`'s word for the same
   thing.
4. **"Variant guidance"** (`emit-docs.ts`) is guidance.json's whole list,
   which is Button's, on every component with a `variant` prop: ten pages.
   Tag's page describes `ghost`, `outline`, `accent-subtle`, which Tag rejects;
   Card (`stacked | featured`) and Skeleton (`text | block`) get nine entries,
   none of them theirs. The `success | warning` entry says "(Tag only)" while
   Toast, Banner and InlineAlert take both.
5. **`useToast()`** is in the Toast page's example and nowhere else: no table
   of what the handle does, and `search "useToast"` finds only the
   `announcer` pattern, which mentions it in passing.
6. **`destructive-confirm` and the Dialog page disagree.** After #200 the
   preset's Cancel is `ghost` and the Dialog is dismissible (close button,
   backdrop, Escape). The Dialog page's example uses `neutral` and is also
   dismissible, while the page's own prop table says "a consequential
   confirmation is `dismissible={false} closeOnEscape`" (D101), and the
   Storybook story `ConsequentialConfirm` is exactly that with `neutral`.

## Decisions

### D145 — icons, hooks and the component total are in the index; `check` validates icons and hints in Psi's own words first; a page's variant guidance is its own; a destructive confirmation is `neutral` Cancel, `dismissible={false} closeOnEscape`

#### 1. Icons are data, from the source

**Manifest.** `emit-manifest.ts` parses every `src/icons/Icon*.tsx` with the
same docgen parser it uses for components (one program, all 38 files) and
emits, next to the unchanged `icons: string[]`:

```json
"iconDetails": {
  "props": [{ "name": "size", "type": "number", "required": false, "default": "20", "description": "…" }],
  "attributes": "SVGAttributes",
  "keywords": { "IconMoreHorizontal": ["ellipsis", "more", "overflow", "row actions"], … }
}
```

It throws if two icons' props differ, so the one shared prop table cannot go
stale silently; `attributes.json` gains `icons: <set index>`, the SVG
attribute names an icon passes to its `<svg>`. `icons` stays a string array
because the site and the drift gate count it (D76).

**Keywords** are the meaning the names lack. They are authored in
`src/icons/keywords.json`, a few words per icon (what it depicts, what it is
used for), and `emit-manifest` throws unless its keys are exactly the roster,
so a new icon without keywords fails the build.

**Pages** (`@handamade/psi-docs`, so the MCP and any later site page share the
text, as D129 does for everything else): `icons:all` lists all 38 with their
keywords and the shared props table, plus the two facts an agent cannot
guess: icons are `aria-hidden` and take `currentColor`, so the control they
sit in carries the name (IconButton's `aria-label`, a Button's text). One
`icon:<Name>` page per icon: its import line, keywords and the props table.
A bare `get IconTrash` and a bare `get icons` resolve.

**Search.** One brief per icon, `kind: "icon"`, title the name, summary its
keywords. `search "IconMoreHorizontal"` is an exact title hit; `search "more"`
and `search "ellipsis"` find it; so does `search "delete"` for `IconTrash`.

**Check.** An icon element is checked like a component: `size` and the SVG
attribute set are its props, `aria-*`, `data-*`, `key`, `ref` pass as for any
component, and an unknown prop gets a hint from the same ranking as §3.
It is no longer "not checked".

#### 2. The overview states the totals and gives patterns room

The eight full component briefs become one row:

```json
{ "id": "component:*", "kind": "component", "title": "Components",
  "summary": "60 components — get component:<Name>; search a word for variants and sizes: AppShell, AspectRatio, …" }
```

every name, about 700 characters against 2,289, plus an icons row
(`icons:all`, "38 icons — get icons:all, or search what you need to show").
The ~1,400 characters freed go to the patterns' derived intro cap (D61's
mechanism, unchanged), so each pattern row carries the start of its intent
instead of one word. If budget is left after the patterns at their full cap,
full component briefs fill it, best-known first, as before.

This revises D61's component floor: the floor guaranteed the overview
"carries components", and a list of all 60 names does that better than 8
briefs. `measure-overview-envelope.ts` and the store tests change with it;
the envelope is now bounded by the names row, which grows by about eleven
characters per component.

#### 3. The hint ranks the component's own words, then Psi's, then the DOM's

`nearest.ts` gains `hint(target, tiers)`: the first tier with a match wins.

1. **The component's own props**, matched by edit distance (today's
   threshold) **or by camelCase words**: a prop whose words all appear in the
   target, or the target's in it, sharing at least two (`onChange` ⊂
   `onValueChange`; `label` vs `dismissLabel` shares one, so no).
2. **The DOM attributes it passes through**, by edit distance only.

And when the unknown prop is another Psi component's prop, the message says
so: Psi's vocabulary is consulted before the DOM's.

> `Combobox` has no prop `onValueChange` (it is `SegmentedControl`'s); did
> you mean `onChange`?

Done when that probe gets exactly that hint. The same `hint` serves the
icon props of §1; `unknown-export` keeps `nearest` over exports.

#### 4. Variant guidance is filtered by the component's own `variant` union

`emit-docs.ts` keeps a guidance entry only when one of its variants
(`"success | warning"` splits) is a member of the component's `variant`
literal union, and drops the section when none is. Tag keeps `accent`,
`neutral`, `danger`, `success | warning`; Card and Skeleton lose the section;
IconButton keeps its four. `guidance.ts` drops "(Tag only)" from the
`success | warning` intent, since four components take those values.

The text of the kept entries is still the button-centred guidance; for the
status components (Toast, Banner, InlineAlert) `neutral` reads "Secondary
actions, toolbar buttons". Guidance per family is a follow-up, not this
decision.

#### 5. `useToast()`'s API is generated from `useToast.ts`

`emit-manifest.ts` reads hooks with the TypeScript checker (`HOOKS =
[{ name: "useToast", file: "Toast/useToast.ts" }]`) and emits `hooks:
[{ name, description, returns, members, types }]`: the returned interface's
members (`show`, `announce`, `dismiss`, `clear`) with signature and TSDoc, and
the option interfaces they take (`ToastOptions`, `AnnounceOptions`) with each
field's type, default and description. Generated, so it cannot drift from
the source.

The Toast page (`componentPageMd`, so `get component:Toast`, the site's `.md`
and the site's HTML page alike) gets a `## useToast()` section: the hook's
description, a Method | Signature | Description table and one table per
options type. A page entry in `pages.ts` lists its hooks (`toast: hooks:
["useToast"]`), and `createStore` throws if an exported `use*` name has no
page, as it does for components. The index has one brief per hook, `kind:
"hook"`, id `hook:useToast`, whose `get` returns the Toast page, and bare
`get useToast` resolves.

#### 6. A destructive confirmation: `neutral` Cancel, `dismissible={false} closeOnEscape`

The page is right, and the preset and the page's own example follow it:

- **`neutral`, not `ghost`.** guidance.json: `neutral` is "Secondary actions",
  `ghost` is "Icon-only triggers, compact toolbars". Cancel next to a `danger`
  Delete is the secondary action of the group; the group has no accent and
  one `danger`, which is the destructive action. `ghost` would make the safe
  choice the quieter one, which is the wrong way round in this dialog.
- **`dismissible={false} closeOnEscape`.** D101's prop documentation says a
  consequential confirmation is exactly this: no close button, no backdrop
  dismissal (a stray click outside never reads as an answer), and Escape
  cancels. "[what is permanently lost]" is the preset's own body, so every
  destructive-confirm is consequential. Without the close button, the
  platform's first-focusable rule puts focus on Cancel, which is what D101's
  `initialFocus` example does by ref, so the preset needs no ref.

Changes: `patterns/destructive-confirm.json` (Cancel `neutral`; Dialog props
`dismissible: false`, `closeOnEscape: true`), `docs/examples/dialog/confirm.tsx`
(adds the two props), and the Storybook `Dialog` `Default` story's Cancel
(`ghost` → `neutral`), the third copy of the same choice. The preset's story
and `Default` move in `vr`; their baselines are refreshed from CI's render.

## Out of scope, follow-ups

- A site page for icons (`/docs/icons/`): the markdown is built in psi-docs,
  so a page is a route and a template.
- Variant guidance per family: what `neutral` and `danger` mean on a status
  component, not a button.
- `check` could flag an icon with `aria-label` and no `aria-hidden={false}`,
  whose label is never read. Psi has no rule yet for a standalone meaningful
  icon; the icons page says to name the control instead.
- Native props in `get` (Switch's `checked` and `onChange` come only from an
  example): a separate request, not one of these five.

## Verification

All five gates, plus the MCP server run locally over the built index
(`node packages/mcp/dist/cli.js` over stdio), with the probes from the
inspection:

| probe | before | after |
|---|---|---|
| `search "IconMoreHorizontal"` | `[]` | `icon:IconMoreHorizontal` first |
| `search "ellipsis"` | `[]` | `icon:IconMoreHorizontal` |
| `get icon:IconTrash`, `get icons` | unknown id | the pages |
| `check <IconSearch size={16} foo="x" />` | not checked | `foo` unknown |
| `check <Combobox onValueChange={f} …/>` | `onVolumeChange` | `onChange`, names SegmentedControl |
| `search ""` | 8 components, one-word patterns | `component:*` with 60 names, `icons:all`, pattern intros |
| `get component:Tag` variant guidance | 9 entries | accent, neutral, danger, success/warning |
| `get component:Card` | 9 entries | no section |
| `get component:Toast` | no API | `## useToast()` tables |
| `search "useToast"` | `announcer` only | `hook:useToast` first |
| `get pattern:destructive-confirm` | `ghost`, dismissible | `neutral`, `dismissible={false} closeOnEscape`; `check` clean |
