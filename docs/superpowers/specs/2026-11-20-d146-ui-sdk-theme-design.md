# A Psi theme for UI SDK: `@handamade/psi-tokens/ui-sdk.css` (D146)

Date: 2026-11-20. Status: **Designed**, on branch `d146-ui-sdk-theme`.

Provenance: the 2026-11-20 market comparison (`docs/research/2026-11-20-ui-sdk-comparison.md`).
UI SDK (Vercel Labs, `@ui-sdk/*`, 0.1.0-beta.13) is a headless behavior layer
with 56 unstyled components in five frameworks. Its optional default look,
`@ui-sdk/core/web.css`, is driven by about twenty `--ui-*` custom properties.
Psi is the visual layer UI SDK leaves to its consumers. This decision lets
a team that builds on UI SDK take a Psi theme, contrast gate included, with
one extra stylesheet, and puts Psi on top of behavior libraries rather than
against them.

D145 is #202. D146 was the next number with no `## Decisions` entry on
`origin/main` or on any `origin/*` branch on 2026-11-20. **Check it again
when the PR opens.**

## What's there today

Read from `https://ui-sdk.dev/web@0.1.0-beta.13.css`, the same file as
`@ui-sdk/core/web.css` at that version:

1. **One root block of tokens.** `@layer ui-sdk { :where(:root, :host) { … } }`
   sets `color-scheme: light dark` and declares, with `light-dark()` OKLCH
   neutrals: `--ui-background`, `--ui-foreground`, `--ui-muted`,
   `--ui-muted-foreground`, `--ui-border`, `--ui-input`, `--ui-primary`
   (= foreground), `--ui-primary-foreground` (= background),
   `--ui-destructive`, `--ui-ring`, `--ui-ring-border`, `--ui-overlay`,
   `--ui-shadow`, plus `--ui-radius: 0`, `--ui-spacing: 0.25rem`,
   `--ui-font-size: 0.8125rem`, `--ui-line-height: 1.5`, `--ui-font-sans`,
   `--ui-font-mono` and ten `--ui-icon-*` SVG data URIs.
2. **Component knobs** declared further down: `--ui-icon`, `--ui-icon-size`,
   `--ui-rating-color` (defaults to `--ui-primary`), `--ui-rating-direction`,
   `--ui-tree-indent`, `--ui-grid-line`, `--ui-checker`.
3. **Derived sizes.** Controls are `calc(var(--ui-spacing) * 8)` = 32px tall.
   Radii are `var(--ui-radius)`, `* 1.5` for popups, `/ 2` for small parts,
   `* 999` for pills. Text is `--ui-font-size` and steps of 1px and 2px below it.
4. **`--ui-primary` means "selected or on"**: checked Checkbox, Radio
   indicator, on Switch, Slider range and thumb, the selected Calendar day,
   Carousel indicator, Rating, filled Menu trigger and Toolbar link.
5. **The focus ring is not a token.** Nine rules draw it, eight as
   `outline: 4px solid var(--ui-ring)` and one as
   `box-shadow: 0 0 0 3px var(--ui-ring)`. Two are flat
   (`:is(a, summary):focus-visible`, `:where([data-slot]):focus-visible`).
   The rest are nested `&` rules under a part: the slider thumb and an input
   wrapper (`&:has(:focus-visible)`), the active OTP slot
   (`&[data-active]`), a colour swatch, the image-cropper handle (on its
   `::after`), the tree label, and the resizable handle (the `box-shadow`
   one). The default `--ui-ring` is `oklch(0.913 0 0)` on white, about
   1.2:1, a soft halo rather than an indicator.
6. **The whole file is one layer.** Everything sits inside a single
   `@layer ui-sdk { … }`. Imported plain, it lands in `ui-sdk`. Imported with
   `layer(components)`, as UI SDK's Tailwind instructions say, it lands in
   `components.ui-sdk`.

On Psi's side:

- Every theme is declared on `:root, [data-psi-theme="<name>"]` in
  `@layer psi.theme` and sets its own `color-scheme`. `base.css` fixes the
  order `psi.base, psi.theme, psi.components, psi.utilities`.
- Psi has no elevation tokens. Surfaces are separated by `bg-secondary` and a
  hairline (D51).
- `contrast-matrix.ts` gates `fgPrimary` and `fgSecondary` on every surface
  (`bgPrimary`, `bgSecondary`, `fillNeutral1`–`6`), `fgDanger` on
  `bgPrimary`, `fgOnAccent` on `fillAccent`, and `borderControl` on both
  backgrounds at 3:1. **Nothing gates `borderFocus`**, the colour of every
  Psi focus ring (D82).

## Decisions

### D146 — Psi ships `ui-sdk.css`, a generated bridge that aliases every `--ui-*` colour, size and font token to a Psi token and draws UI SDK's focus ring the Psi way; the contrast matrix starts gating `borderFocus`

#### 1. The file and how a consumer uses it

`packages/tokens` emits `dist/ui-sdk.css`, published through the existing
`"./*.css"` export as `@handamade/psi-tokens/ui-sdk.css`. It is a sixth,
optional stylesheet, for apps that use UI SDK. Nothing else in Psi imports
it, and Psi's React components never use UI SDK.

```css
@layer ui-sdk, psi.base, psi.theme, psi.components, psi.utilities, psi.ui-sdk;
@import "@handamade/psi-tokens/base.css";
@import "@handamade/psi-tokens/light.css";
@import "@handamade/psi-tokens/components.css";
@import "@handamade/psi-tokens/utilities.css";
@import "@ui-sdk/core/web.css";
@import "@handamade/psi-tokens/ui-sdk.css";
```

The first line is the contract. `web.css` layers itself (fact 6), so it is
imported plain. UI SDK's layer comes first and loses to everything.
`psi.theme` then decides `color-scheme`, and `psi.ui-sdk` comes last among
Psi's layers, so the bridge beats UI SDK's own token block while a
consumer's unlayered CSS still beats the bridge.

With Tailwind, `web.css` is imported with `layer(components)` and lands in
`components.ui-sdk`. The guide's line for that case is:

```css
@layer theme, base, components, psi.base, psi.theme, psi.components, psi.utilities, psi.ui-sdk, utilities;
```

Psi's layers come after Tailwind's `components`, so `psi.theme` and the
bridge beat `components.ui-sdk`. Tailwind's `utilities` stays last, so a
utility class still wins. Both orders are exercised by the fixture in §5.

`@handamade/psi-react/styles` is not needed for UI SDK components. An app
that also renders Psi components still imports it.

#### 2. The token map

Declared once, in `@layer psi.ui-sdk`, on `:root, :host, [data-psi-theme]`.
Custom properties resolve `var()` where they are declared, so declaring the
map on every theme root (not only `:root`) is what makes a nested
`data-psi-theme="dark"` subtree re-resolve its `--ui-*` values.

| `--ui-*` | Value | Reason |
|---|---|---|
| `background` | `var(--psi-bg-primary)` | page and control fill |
| `foreground` | `var(--psi-fg-primary)` | text, gated on every surface |
| `muted` | `var(--psi-fill-neutral1)` | hover rows, tracks, subtle fills |
| `muted-foreground` | `var(--psi-fg-secondary)` | gated at 4.5 on every surface, `fillNeutral1` included |
| `border` | `var(--psi-border-faint)` | decorative hairlines, as on Psi's own surfaces (D51) |
| `input` | `var(--psi-border-control)` | the boundary that identifies a field, gated at 3:1 (D106, D120) |
| `primary` | `var(--psi-fill-accent)` | "selected or on", the same token Psi's Checkbox and Switch use |
| `primary-foreground` | `var(--psi-fg-on-accent)` | gated at 4.5 on `fillAccent` |
| `destructive` | `var(--psi-fg-danger)` | gated at 4.5 on `bgPrimary` |
| `ring` | `var(--psi-border-focus)` | D82's one focus colour |
| `ring-border` | `var(--psi-border-focus)` | the border a focused input group takes |
| `overlay` | `var(--psi-scrim-medium)` | the page behind a modal |
| `radius` | `var(--psi-control-radius)` | 8px; UI SDK's `* 1.5` popup radius then lands on 12, `--psi-surface-radius` |
| `spacing` | `var(--psi-space-4)` | 4px; UI SDK's `* 8` control height lands on 32, Psi's default size |
| `font-size` | `0.875rem` | the size of `--psi-text-14-20-*`, which Psi's 32px controls use |
| `line-height` | `calc(20 / 14)` | the line of `--psi-text-14-20-*` |
| `font-sans` | `var(--psi-font-sans)` | |
| `font-mono` | `var(--psi-font-mono)` | |

`font-size` and `line-height` are the only literals. Psi's type tokens are
`font` shorthands with no separate size token. The values copy the 14/20
style, and the map's source carries a comment naming that token.

**Left as UI SDK sets them:**

- `--ui-shadow`. Psi has no elevation token to alias. UI SDK's shadow uses
  `light-dark()`, which follows the `color-scheme` that each Psi theme sets
  (§1's layer order makes `psi.theme` win), so it already tracks light and
  dark.
- The `--ui-icon-*` data URIs. They are shapes, used as CSS `mask`s, so
  their colour comes from the element's background, not from the SVG.
- `--ui-icon`, `--ui-icon-size`, `--ui-rating-*`, `--ui-tree-indent`,
  `--ui-grid-line` and `--ui-checker`. `--ui-rating-color` follows
  `--ui-primary` and becomes the accent with no entry of its own.

The bridge adds no colour of its own. Every colour value is one `var()` of an
existing Psi semantic token. Brands retune UI SDK by retuning Psi, and
`componentOverrides` reach it through the tokens it aliases.

#### 3. The focus ring rule

In the same layer, for each rule in the pinned `web.css` that draws
`outline: <width> solid var(--ui-ring)`, the bridge emits the rule's
resolved selector with:

```css
<selector> {
  outline-width: var(--psi-focus-ring-width);
  outline-offset: var(--psi-focus-ring-offset);
}
```

For the one rule that draws the ring as `box-shadow: 0 0 0 <n>px var(--ui-ring)`
(the resizable handle), it emits
`box-shadow: 0 0 0 var(--psi-focus-ring-width) var(--ui-ring)` instead. A
box-shadow has no offset, so the width is all that changes.

It sets width and offset only. The colour already comes from `--ui-ring` via
§2, and the style stays UI SDK's `solid`. For the `:has(:focus-visible)`
wrapper rules the offset is `--psi-focus-ring-offset` too, so the ring clears
the wrapper's own border exactly as Psi's Input ring does.

The selector list is not typed by hand. The build reads it from the pinned
`@ui-sdk/core/web.css` (§5): it finds every rule whose `outline` or
`box-shadow` declaration contains `var(--ui-ring)`. It resolves nested `&`
selectors, including a pseudo-element two levels down, to flat selectors
with `postcss` and `postcss-nested`, which become devDependencies of
`psi-tokens`. A UI SDK bump that adds or renames a ring rule changes the
emitted file and fails the ring test until the change is reviewed.

#### 4. The contrast matrix gates `borderFocus`

Mapping `--ui-ring` to `border-focus` routes another library's whole focus
story through a colour Psi has never gated. `contrast-matrix.ts` adds to
`nonTextPairs`:

```ts
{ fg: "borderFocus", bg: "bgPrimary", minRatio: 3 },   // focus ring, D82 (D146)
{ fg: "borderFocus", bg: "bgSecondary", minRatio: 3 }, // focus ring on Panel, Dialog, Menu
```

3:1 is WCAG 1.4.11 for the indicator against the surface beside it. This
covers Psi's own rings as much as UI SDK's. **If any of the four themes fails
it, implementation stops there.** That is a Psi colour bug, and it gets its
own fix before the bridge ships. It is not loosened to let the bridge
through.

No other pair is added. §2's colours are each in a role the matrix already
gates (text on surfaces, the accent pair, the danger foreground, the control
border), and the role test in §5 holds that true.

#### 5. Source, build and gates

- **Source.** `packages/tokens/src/bridges/ui-sdk.ts` exports
  `uiSdkTokenMap: Record<string, string>` (key without `--ui-`), the
  `uiSdkLeftAlone: string[]` list from §2, and a `uiSdkColourRoles` record
  that tags each colour key with its role (`text`, `text-on-accent`,
  `surface`, `accent-fill`, `control-border`, `focus`, `scrim`,
  `decorative`, and `danger-text` for `destructive`, which aliases `fgDanger`).
- **Emit.** `scripts/emit-bridges.ts`, called from `scripts/build.ts`, writes
  `dist/ui-sdk.css`: the layer block, the map, then the ring rules from §3.
  It reads `node_modules/@ui-sdk/core/web.css`.
- **Pin.** `@ui-sdk/core` is an exact-version **devDependency** of
  `@handamade/psi-tokens` (`0.1.0-beta.18`; see the amendment below). It is never a dependency or
  peerDependency. The published `ui-sdk.css` has no import of it. The guide
  states the UI SDK version the bridge was built against.
- **Coverage test** (`packages/tokens`, vitest). It parses every
  `--ui-[a-z0-9-]+:` declaration in the pinned `web.css`. Each name must be a
  key of `uiSdkTokenMap` or appear in `uiSdkLeftAlone`, and the reverse must
  hold too, so the map names nothing UI SDK does not declare. A UI SDK bump
  that adds a token fails here with the token's name.
- **Ring test.** It runs the §3 extraction on the pinned `web.css` and asserts
  the exact list of nine resolved selectors at the pin (eight `outline`, one
  `box-shadow`). A parsing regression that finds fewer, or a bump that changes
  one, fails with the difference.
- **Role test.** For each colour key, it checks that its value is one
  `var(--psi-…)` of a semantic token and that the role/token combination is one
  the matrix gates: `text` → `fgPrimary`/`fgSecondary` (gated on every
  surface), `text-on-accent` → `fgOnAccent`, `accent-fill` → `fillAccent`,
  `control-border` → `borderControl`, `focus` → `borderFocus` (§4).
  `decorative`, `surface` and `scrim` carry no contrast duty and are only
  checked to be semantic tokens.
- **Scope gate.** The `--ui-*` names are not `--psi-*`, so the D46 scope gate
  does not see them. Nothing is added to the component registry.
- **Layer-order fixture.** `apps/storybook/vr/ui-sdk-layers.interaction.spec.ts`,
  tagged `@interaction`, so it runs locally under `pnpm test:e2e` and in CI.
  It uses no Storybook page. It builds a page with `page.setContent`, inlining
  the four token stylesheets, the pinned `web.css` and the built
  `ui-sdk.css` behind each of §1's two layer lines (plain, and Tailwind with
  `web.css` wrapped in `@layer components { … }`). Under `light`, and inside a
  nested `data-psi-theme="dark"`, it reads the computed `--ui-background`,
  `--ui-primary`, `color-scheme`, and the `outline-width` of a focused
  `[data-slot]` button. Each must equal what the Psi token it aliases computes
  to in the same place. Inlining the CSS is deliberate. Storybook's preview
  declares Psi's layers before any story CSS loads, so a story cannot test
  an order a consumer controls.
- **VR story.** `apps/storybook/src/integrations/UiSdk.stories.tsx` renders
  UI SDK's React Switch, Checkbox, Slider, Select (open) and Calendar with
  `web.css` and the bridge, once per Psi theme. `@ui-sdk/react` is pinned
  next to `@ui-sdk/core` as a devDependency of the Storybook app only.
  a new `.storybook/layers.css`, imported by `preview.ts` before `base.css`,
  holds §1's plain layer line, so the preview's order matches §1 (see the
  amendment below). `web.css` sets global
  element rules (`a`, `hr`, `code`, `kbd`), so only this story file imports
  it. The 0-pixel `vr` gate (D89) confirms no other baseline moved. The new
  baselines come from CI's `vr-baselines` artifact (D89, D112).

#### 6. Docs

- **Guide:** `packages/docs/guides/ui-sdk.mdx`, with `"ui-sdk"` appended to
  `GUIDE_ORDER` and labelled "UI SDK". It covers what the bridge is (a theme
  for UI SDK's default look, not a set of Psi components), the six imports
  and the layer line from §1, the Tailwind variant, what is mapped and what is
  left alone (the tables of §2, rendered from `@handamade/psi-tokens/ui-sdk.json`,
  which the build emits from the source map, so they cannot
  drift), the focus ring, and the UI SDK version it was built against.
- **`packages/tokens/llms.txt`**: one section with the import block, a
  statement that the file only matters with `@ui-sdk/core/web.css`, and a
  note that brands retune it through Psi tokens, never through `--ui-*`
  directly.
- **`packages/tokens/README.md`**: one paragraph and the import block.
- **Counts.** The guide count rises from five to six. `check-docs-drift`
  catches any prose that states the old number.
- **Changeset:** minor for `@handamade/psi-tokens` (new public file), with the
  lockstep packages following.

## Out of scope, follow-ups

- **A runtime agent contract for Psi components** (per-component agent
  actions in the manifest, a confirm mark derived from `danger`). This is the
  comparison's second recommendation and gets its own spec.
- **Psi components built on `@ui-sdk/core`.** Revisit at UI SDK 1.0 or when
  Psi starts Popover, Date Picker, Slider or Tree.
- **MCP.** `theme` and `search` do not mention the bridge in this change. If
  the guide proves useful, a later change can index it like any other guide.
- **`--ui-shadow` from Psi.** This depends on Psi ever adding elevation
  tokens.
- **Figma.** The library has nothing to reflect: no new Psi token or
  component.

## Amendments, 2026-11-27 (planning)

- **Pin `0.1.0-beta.18`, not beta.13.** Five betas shipped between 19 and 26
  Nov. Measured on both: the same 36 `--ui-*` declarations and the same nine
  ring rules with the same resolved selectors. The only differences are
  child-combinator selectors on the combobox and date-picker parts. beta.18 is
  the version a team installing UI SDK today gets.
- **The Storybook layer line goes before `base.css`.** `preview.ts` imports
  `base.css` first, and `base.css` opens with Psi's layer statement, so an
  `@layer ui-sdk;` in `preview.css` (imported last) would put `ui-sdk` after
  `psi`, and UI SDK's token block would beat the bridge. A
  `.storybook/layers.css` imported first fixes the order for every story. Its
  layers are empty for every story but the UI SDK one, so no baseline moves.
- **`danger-text` role.** `destructive` aliases `fgDanger`, which the matrix
  gates on `bgPrimary` and `bgSecondary`; none of §5's roles named it.
- **`dist/ui-sdk.json`**, exported as `@handamade/psi-tokens/ui-sdk.json`:
  the map, roles, the left-alone list and the pinned UI SDK version, so the
  guide renders §2's tables the way `sizes-and-variants.mdx` renders
  `guidance.json`.
- **`borderFocus` measured before planning:** 5.91 to 8.76 on `bgPrimary` and
  6.45 to 8.24 on `bgSecondary` across the four themes. §4's stop condition does
  not trigger. The gate is shared with consumer themes (D81), so a consumer theme
  whose focus colour is under 3:1 now fails its build. The changeset says so.

## Verification

All five gates, in this order:

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site
```

- The token build passes with the two new `borderFocus` pairs on all four
  themes. If it throws, stop (§4).
- `dist/ui-sdk.css` exists and contains one map block and nine ring rules.
- `pnpm test:e2e` passes the layer-order fixture locally. It is an
  `@interaction` spec, not a pixel comparison, so it runs on macOS.
- The coverage, ring and role tests pass, and each fails when its input is
  broken: delete a map key, change the pinned `web.css` ring selector in a
  scratch copy, or map `muted-foreground` to `fg-tertiary`.
- CI's `vr` job renders the new story's baselines. Commit them from the
  `vr-baselines` artifact.
- `tools/verify-published.mjs` gains one check: `@handamade/psi-tokens/ui-sdk.css`
  resolves from the installed tarball. Today it checks the four token
  stylesheets by name, so the new file needs adding to that list. It runs
  after the release that ships this change.
