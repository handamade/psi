# Promo page refresh — catching the site up to 0.8.0

Date: 2026-07-31. Status: **Draft** — targets `apps/promo`, no package change.

**This is not a decision.** No D number is claimed. `apps/promo` is a consumer
app of `@handamade/psi-tokens` and `@handamade/psi-react`; this work brings it
level with what those packages already ship. Nothing here changes a token, a
component, or a public contract.

Provenance: 0.7.1, 0.7.2 and 0.8.0 all shipped without the site moving. The
page's last update entry is 0.7.0, its component count predates Menu, and its
Theming section argues a claim that D56 has since made *understated* — it
still describes a customer brand as colour alone.

Sequencing: this precedes D57 (the theme console, scoped in the D56 spec's
sequencing note). The radius dial specified below is deliberately the same
control D57 will later drive from a prompt, so the console replaces the dial's
*input* rather than the section around it.

## Decisions

### 1. Component count comes from the manifest, not from counting files

`dist/manifest.json` lists **18** components: the previous 15 plus `Menu`,
`MenuItem` and `MenuSeparator`, each separately propped and separately
documented. The page's old "15" tracked that file exactly, so tracking it
again is continuity, not inflation.

Three call sites move 15 → 18:

| File | Line | Now | Becomes |
| ---- | ---- | --- | ------- |
| `Hero.tsx` | 5 | `"15 components"` | `"18 components"` |
| `Playground.tsx` | 56 | "Fifteen production components." | "Eighteen production components." |
| `Roadmap.tsx` | 4 | `"15 components, 22 icons"` + 15 names | `"18 components, 22 icons"` + the three Menu entries |

Two further staleness fixes in `Playground.tsx`: the `INITIAL_FILTERS` chip
reading `"0.7.0"` (line 41) becomes `"0.8.0"`, and the `pg-index` link list
(line 234) gains `Menu`.

**Verified as already correct, and left alone:** `22 icons`
(`packages/react/src/icons` holds exactly 22 `Icon*.tsx`, excluding
`icons.stories.tsx`), `4 themes` (light, dark, acme, ember), `0 runtime deps`,
`AA enforced at build`. An earlier pass through this refresh mis-read the icon
count as 24 by counting the stories file; the number on the page was right.

### 2. Theming gains a live radius dial

One `<input type="range">` above the three existing theme cards. Dragging it
re-rounds every control inside all three cards at once — the same markup, the
same three themes, one property.

**The dial steps the published rung scale**, not free pixels: `4 | 6 | 8 | 12`
from `packages/tokens/src/scales/radius.ts`, default `8`. A continuous pixel
dial would misrepresent the contract — a theme sets a rung — and would drag
`--psi-control-radius` below `radius-4`, where Checkbox's `min()` cap starts
to bite in a way no on-scale theme can trigger. The dial should demonstrate
the real range, including the fact that Checkbox holds its floor.

**The cascade constraint is load-bearing.** `components.css` emits
`--psi-control-radius` under `:where(:root, [data-psi-theme])`. Every
`ThemePreview` card carries `data-psi-theme`, so each card **re-declares the
default on itself** — a value set on a wrapper *around* the cards is silently
overridden by the cards. The dial value must therefore land on the same node
as the theme attribute, where an inline style wins outright (`:where()` has
zero specificity):

```tsx
<div
  className="theme-card-ui"
  data-psi-theme={name}
  style={{ "--psi-control-radius": `var(--psi-radius-${radius})` } as CSSProperties}
>
```

`ThemePreview` takes one new `radius: number` prop. `Theming` owns the state.
No other component changes.

The card caption becomes `data-psi-theme="acme" · --psi-control-radius:
radius-4`, so both halves of what a theme sets read as one line.

A fourth `check-list` item states the claim the dial demonstrates — six
anchors, six slots, and one shape dial — carrying the override form:

```css
[data-psi-theme="acme"] { --psi-control-radius: var(--psi-radius-4); }
```

It must also name what deliberately does **not** move: Tag and Switch keep
`--psi-radius-full`, because pill-ness is component identity, not theme
expression (D56). Without that clause a viewer who drags the dial to `4` sees
two components ignore it and reads a bug.

Reduced motion needs no handling: this is a discrete value change with no
transition.

### 3. Playground gains a Menu card

A fourth card, "Menu · the overlay tier", beside the Panel + Toolbar card.
Live `Menu` + `MenuItem` + `MenuSeparator` off an `IconButton` trigger.

Menu is **controlled-only** (D53, following D50): `onClose(reason)` only
*reports* a dismissal, and the popover stays open until the consumer flips
`open`. The card therefore holds `open` state and handles all three reasons —
`"esc" | "outside" | "item-select"` — displaying the last reason received.
That display is the point: the section's promise is "real components, not
screenshots", and Menu is the one component whose entire story is platform
behaviour. A card that merely opened a menu would demonstrate nothing D53
actually decided.

Include one `variant="danger"` `MenuItem` and one `MenuSeparator`, so the
card covers the component's real surface rather than a single happy path.

### 4. Two update entries, not four

`content/updates.ts` documents itself as "curated announcements, not a
changelog mirror". Four releases have shipped since the last entry; two are
worth telling the outside world:

- **2026-07-31 · `release` · "0.8.0 — Menu, and shape becomes themeable"** —
  Menu on the native Popover API, and the `--psi-control-*` family completed
  by D54–D56, so a customer theme retunes control shape in one line.
- **2026-07-21 · `release` · "0.7.2 — MIT, declared"** — all three packages
  published with no `license` field, which npm reads as all-rights-reserved.
  Installable but not legally reusable, contradicting the open-core intent.
  That is a fact outside consumers need.

0.7.1 (generated docs stop fabricating API surface) stays out: it is a
correctness fix to an artifact, with no consumer-visible consequence.

### 5. Roadmap

"In v1 today" gains four rows — Menu (D53), the control ramp (D54–D55),
control radius (D56), and MIT/open-core.

"Next" gains **"Theme console — a prompt in, a real `customers/<name>.ts`
out"** alongside the two existing entries. This is a public commitment, made
deliberately: the dial in §2 is its visible groundwork, and naming the
destination is what makes the dial read as a first step rather than a toy.

## Non-goals

- **No package changes.** No token, no component, no manifest. If this
  refresh appears to need one, that is a signal to stop and spec it
  separately.
- **No new section.** The page keeps eight sections and its `01`–`06`
  numbering; a standalone "Shape" section was considered and rejected below.
- **No D57 work.** The dial is driven by a range input, not a prompt. The
  console is its own spec.
- **No changeset.** `apps/promo` is not a published package.

## Known carry (deliberately not fixed here)

**Card radius sits outside the dial.** Dragging to `radius-4` sharpens the
controls while the surfaces around them stay rounded. Two distinct causes:

1. `--psi-card-radius` is on neither the control dial nor any other, so a
   generated theme will strand Card — recorded in the D56 spec's carries as
   D57's first problem.
2. `apps/promo`'s own `.theme-card-ui` hardcodes `border-radius:
   var(--psi-radius-12)` (`promo.css:510`), independent of any Psi token.

Both are out of scope by explicit decision. Recorded here so D57 inherits the
whole picture rather than only the first half.

## Verification

- `pnpm build`, `pnpm test`, `pnpm lint` — all three clean. Node 24 per
  `.nvmrc`; run `nvm use` before the first pnpm command.
- Browser, via the promo dev server:
  - Dial each of the four rungs. All three theme cards re-round together;
    Tag and Switch stay pill at every rung; Checkbox holds its floor.
  - Open the Menu and dismiss it three ways — Esc, outside click, item
    select — confirming each reports its own reason and the menu actually
    closes (i.e. the card flips `open`).
  - Keyboard: the dial is reachable and operable by arrow keys; the Menu
    trigger announces `aria-haspopup` / `aria-expanded`.
- `pnpm vr` is **not** affected — the VR suite covers Storybook stories, and
  no package renders differently. CI remains the gate for it regardless
  (macOS runs write junk baselines).

## Rejected alternatives

- **A standalone "Shape" section.** Thorough — room for the `min()` ceiling
  story on Checkbox and Tooltip — but it adds a ninth section, renumbers
  `04`–`06`, and separates shape from the "a customer is a theme file"
  argument it belongs inside. Shape is part of the theming claim, not a
  neighbour to it.
- **A static bullet plus a code line, no dial.** The smallest honest fix, and
  the page would *state* the claim correctly. Rejected because this page's
  whole method is demonstration over assertion — the hero already derives
  hover and active states from a live Δ-lightness slider. A shape claim
  backed by a code sample would be the one place the page asserts instead of
  showing.
- **A continuous pixel dial (0–16px).** More dramatic to drag, and it would
  expose the `min()` caps. Rejected: it depicts a range no theme can set
  on-scale, so it would teach the contract wrong to sell an effect.
- **Adding Menu to the existing Panel + Toolbar card.** Cheaper than a fourth
  card, but that card's subject is the D51/D52 surface pair; Menu is the D53
  overlay tier and needs its own `open` state and reason display. Merging
  them would blur two decisions into one demo.
- **Mirroring the full changelog into the updates feed.** Contradicts the
  file's stated curation rule, and 0.7.1 has no outside-world consequence.
- **Deferring the whole refresh until D57 ships.** The console will rebuild
  the Theming section's input, but the stale counts, the missing releases and
  the absent Menu are wrong on the page today and are not D57's to fix.
