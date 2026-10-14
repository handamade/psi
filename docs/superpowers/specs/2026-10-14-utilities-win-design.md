# Utilities win over components: component CSS moves into `@layer psi.components`, and foreground colours get utilities (D94)

Date: 2026-10-14. Status: **Implemented** on branch `d94-utilities-win`.

Provenance: the fifth item of the 0.22 consumer handoff, moved out of 0.22.0
and shipped first in 0.23 on its own, because it changes the cascade for every
consumer and must be possible to isolate and bisect
(`docs/superpowers/plans/2026-10-08-psi-0.22-plan.md`, Task 6).

## What's there today

1. **`@handamade/psi-react/styles` is unlayered.** Every token stylesheet is
   layered (`psi.base`, `psi.theme`, `psi.components`, `psi.utilities`), but the
   component rules in `dist/styles.css` sit in no layer. Unlayered rules beat
   every layered rule, so no utility can change anything a component sets:
   `<Tabs className="psi-gap-24">` renders a 16 px gap, because `.tabs { gap:
   16px }` outranks `.psi-gap-24` by layer before specificity is consulted. The
   same holds for `psi-p-*`, `psi-m-*`, `psi-text-*` and every other utility on
   a component root.
2. **There are no foreground-colour utilities.** A consumer who wants
   `fgSecondary` on a span writes `style={{ color: "var(--psi-fg-secondary)" }}`
   or a one-line class of their own, 13 times over.

## Why this is a fix, not a preference

Psi has promised ordered layers since its first design. The original system
design, row 12, chose "cascade layers base → theme → components → utilities"
for one stated reason: **"consumer overrides win predictably"**. The hardening
cycle's WS5 then emitted the explicit order statement "so import order
genuinely cannot matter", and `packages/react/llms.txt` still says that "all DS
stylesheets are order-independent". The component stylesheet was never in a
layer, so both claims were false for the one stylesheet that sets the most
properties: utilities lost to components, and the order statement in
`base.css` said nothing about a stylesheet outside every layer. D94 makes the
record true rather than rewriting it.

## Decisions

- **D94 — Component CSS ships inside `@layer psi.components`, and the 13
  foreground tokens get `psi-fg-*` utilities in `@layer psi.utilities`.**
  - **Where the wrap happens: a PostCSS plugin on each component CSS Module**
    (`packages/react/scripts/components-layer.ts`), registered in
    `packages/react/vite.config.ts` and in Storybook's `viteFinal`. One plugin
    in both builds means Storybook, and therefore `vr`, renders the same
    cascade consumers get. A post-build rewrite of `dist/styles.css` would have
    left Storybook, which compiles the modules from source, unlayered, and `vr`
    would have tested the old cascade. The plugin matches
    `packages/react/src/**/*.module.css` only, so the token stylesheets, which
    are layered already, are never wrapped twice.
  - **`styles.css` carries the order statement too.** Each wrapped module opens
    with `@layer psi.base, psi.theme, psi.components, psi.utilities;`. Without
    it, a consumer who imports `@handamade/psi-react/styles` *before*
    `base.css` would create `psi.components` first and put it *below*
    `psi.base` and `psi.theme`. With it, the import order of all five
    stylesheets genuinely does not matter, which is what `llms.txt` has claimed
    since WS5.
  - **`@keyframes` stay inside the layer.** A layered `@keyframes` is resolved
    by layer order only against keyframes *of the same name*; the names are
    CSS-Module hashed (`_dialog-enter_h5f0e_1`), so nothing can collide with
    them and the animation runs unchanged. Verified below.
  - **`::backdrop` stays inside the layer.** It is an ordinary selector; the
    rule cascades by layer like any other. Verified below.
  - **`@font-face` and `@property` are hoisted out of the layer, unlayered.**
    Neither declares styles for an element: each registers a global name.
    Psi ships neither in `styles.css` today, so this is a rule for the future,
    and its reason is that what a layer means for `@property` has varied by
    engine. Unlayered, a Psi `@property` or `@font-face` would behave exactly as
    it does in any non-layered stylesheet. Both were verified to apply when
    hoisted, and when wrapped, below.
  - **`@layer` statements, `@charset` and `@import` are also left at top
    level**, because they are not allowed, or mean something else, inside a
    layer block.
  - **`psi-fg-<kebab-role>` utilities.** `psi-fg-primary`, `psi-fg-secondary`,
    `psi-fg-tertiary`, `psi-fg-quaternary`, `psi-fg-primary-inverted`,
    `psi-fg-static-white`, `psi-fg-static-black`, `psi-fg-on-accent`,
    `psi-fg-accent`, `psi-fg-success`, `psi-fg-warning`, `psi-fg-danger`,
    `psi-fg-on-inverted`, each `color: var(--psi-fg-<role>)`. They are
    generated from the `fg*` names in the light theme definition, not listed by
    hand, and published in the utilities roster (`guidance.json` →
    `utilities`) through the same source, as D79 requires. A future `fg*` token
    gets its utility for free.

## The cascade change, in both directions

Layering component CSS changes who wins for a consumer whose own CSS touches a
Psi component. There are two directions, and the second is the larger.

1. **A consumer's *layered* CSS can now beat Psi.** Before, a consumer rule in
   any layer lost to Psi's unlayered component rules. Now it competes by layer
   order: a consumer layer declared *after* `psi.components` wins over it
   whatever the specificity; one declared before loses. This is the direction
   the handoff named, and it is the one D94 exists for.
2. **A consumer's *unlayered* CSS now beats Psi's component rules whatever the
   specificity.** Before, `button { padding: 0; font: inherit }` lost to
   `.psi-button` on specificity (0,0,1 against 0,1,0). Now the unlayered
   element selector wins outright, because unlayered rules outrank every layer.
   Resets are the common case: `* { margin: 0 }`, `a { color: inherit }`,
   `button { all: unset }`, `h1, h2, p { margin: 0 }`, and the global styles of
   an app shell or a docs site. Psi's own promo site was such a consumer (see
   Consequences).

The order of the five Psi stylesheets is unaffected either way: the order
statement fixes it.

## Migration

- **Put a reset in a layer that sits below Psi.** Either declare your own
  layer first, before importing anything from Psi:

  ```css
  @layer reset, psi.base, psi.theme, psi.components, psi.utilities;
  @layer reset {
    button { padding: 0; font: inherit; }
  }
  ```

  or add it to `psi.base`, which Psi uses only for custom properties:

  ```css
  @layer psi.base {
    * { margin: 0; }
  }
  ```

  Either way, Psi's component rules beat the reset again, and the reset still
  styles every element Psi does not.
- **To override a component on purpose, use a layer after Psi's**, or stay
  unlayered. An unlayered `.my-card { padding: 0 }` keeps working and no longer
  needs to out-specify Psi.
- **Reach for a utility first.** `psi-gap-*`, `psi-p-*`, `psi-m-*`,
  `psi-text-*` and the new `psi-fg-*` now win over a component's own value, so
  `<Tabs className="psi-gap-24">` does what it says.
- **What to look for after upgrading:** a component that suddenly lost padding,
  margin, its font or its link colour is being hit by an unlayered element
  rule. Search your global CSS for element selectors (`button`, `a`, `input`,
  `p`, `h1`–`h6`, `*`) outside any `@layer`.

## Consequences

- Utilities do what their names say on any Psi component.
- Every consumer with an unlayered reset sees a change on upgrade. That is why
  D94 is a minor release of its own and its changeset says so.
- `apps/promo/src/promo.css` moves its element rules (`*`, `html`, `body`,
  `h1–h3, p`, `a`, the `:focus-visible` outline, `code, pre`, `section`) into
  `@layer psi.base`; its class rules stay unlayered, because they are
  deliberate overrides and now win without a specificity fight. Storybook's
  `preview.css` sets only `html, body` and needs nothing.
- Every 0.23 change to component CSS (the handoff's N1–N5) lands on top of
  this cascade.

## Verification

All measured on 2026-10-14 in Chromium 149 (Playwright's bundled build, the
engine CI uses). WebKit and Firefox were not run, so their behaviour for the
four at-rules inside a layer is unmeasured; hoisting `@property` and
`@font-face` is the hedge for the two whose layered meaning has varied.

- **Tests first, red before the change.**
  - `packages/react/scripts/styles-layer.test.ts` parses the built
    `dist/styles.css` with `postcss` and asserts that no top-level rule or
    at-rule sits outside `@layer psi.components` except layer statements,
    `@keyframes`, `@property`, `@font-face`, `@charset` and `@import`; that the
    layer holds the rules (more than 100); that the order statement comes
    first; and that the Dialog's `::backdrop` and the module keyframes are
    inside. Plus three plugin cases: the wrap, the hoist, and leaving non-module
    CSS alone. Red on `main`: 4 of 4 dist assertions failed.
  - `packages/tokens/__tests__/emit-css.test.ts` asserts a `.psi-fg-<kebab>`
    class for every `fg*` token in every `dist/resolved/*.json`, the 13 in
    `light.json`, the classes inside the single `@layer psi.utilities` block,
    and the roster family. Red: 3 failed.
  - `apps/storybook/vr/tabs.interaction.spec.ts` adds `psi-gap-24` to the
    horizontal `Tabs` root in the page and reads `row-gap`. Red: **16px**.
    Green after: **24px**. The class is added in the page, not by a story, so
    no new screenshot baseline is needed.
- **The four at-rules, in a page built from the plugin's real output**, and
  again with everything forced inside `@layer psi.components`. Both ways:
  `@keyframes` applied (a paused animation held `opacity` at its keyframe
  value, 0.25); `dialog::backdrop` took its layered background
  (`rgb(1, 2, 3)`) after `showModal()`; `@property` registered (a
  `var(--len)` width resolved to the 7px initial value, where an unregistered
  property gives `auto`); `@font-face` registered and loaded
  (`document.fonts.load` returned the face). Chromium therefore needs no
  hoist; it is kept so that the two global registrations do not depend on how
  an engine layers them.
- **The real keyframes, before and after.** Recording `animationstart` on the
  built Storybook, `components-dialog--default`,
  `components-dialog--drawer-inline-end` and `feedback-toast--in-region`
  start the same animations before and after: `dialog-enter`, `drawer-enter-end`,
  `backdrop-enter` on `::backdrop`, and `toast-enter` three times.
- **No visual change in Psi's own surfaces, by computed style.** Every element
  and every `::before`, `::after` and dialog `::backdrop` of each page, all
  computed properties except custom properties, transitions and animations,
  compared between the build before D94 and after:
  - Storybook, all **178 stories** (light theme, 1000×800): **23,959 nodes,
    0 differing properties.** This is the local stand-in for `vr`, which can
    only pass in CI; it predicts zero baseline changes.
  - The promo site, *before* migrating `promo.css`: **17 differing
    properties, all on one element**, the hero's accent `Button` rendered as an
    `<a>`: `color` went from `oklch(1 0 250)` (on-accent white) to
    `oklch(0.3 0.03 250)` (ink), because the unlayered `a { color: inherit }`
    now beat `.button`. This is risk direction 2, measured on Psi's own site.
    After moving the element rules into `@layer psi.base`: **867 nodes, 0
    differing properties.**
- **`Checkbox` and `Switch` put `psi-sr-only` and their module `.input` class
  on one element**, so the utility now wins any conflict between them. There
  is none: `.input` has no rules of its own, only sibling selectors
  (`.input:checked + .indicator`). The computed-style diff agrees.
- **A clean consumer, from packed tarballs.** `pnpm pack` of tokens, react and
  mcp, installed with npm into a Vite + React project outside the workspace,
  rendering a `Button` (accent, 40), a `Tabs` with `className="psi-gap-24"`,
  and a `span.psi-fg-secondary`:

  | Page | Button `padding` (block, inline) | Tabs gap | `psi-fg-secondary` |
  | --- | --- | --- | --- |
  | Five stylesheets, no reset | 1px, 16px | 24px | applied |
  | + unlayered `button { padding: 0 }` | **0px, 0px** | 24px | applied |
  | + the same reset in `@layer psi.base` | 0px, 16px | 24px | applied |
  | Five stylesheets in reverse order, `psi-react/styles` first | 1px, 16px | 24px | applied |

  The unlayered reset strips the button, as documented. Migrated, Psi's
  inline padding wins again and the reset still zeroes the block padding Psi
  does not set (1px is the UA default). The reversed page was built on its
  own, so Vite could not merge it with the others; its bundle has
  `psi-react/styles` at byte 0 and `base.css` last, and the order statement
  keeps the cascade intact.
- **Size.** `dist/styles.css` grows from 37,313 to 39,497 bytes (+2,184; +119
  gzipped), all of it the 28 per-module order statements and layer wrappers.
  Rules (314) and declarations (873) are unchanged. The minifier does not
  merge the repeated statements; a bundle-level dedupe was judged not worth a
  second mechanism for 119 bytes.
