# A text link — `Link` and `.psi-link` (D119)

Date: 2026-11-16. Status: **Implemented**. Branch
`d119-text-link`.

Provenance: a consumer's request. Psi draws no text link, so the consumer's
app keeps a CSS Module that sets the accent colour, an underline and Psi's
focus-ring tokens on a native `<a>`. The component gap analysis
(`docs/research/2026-10-29-component-gap-analysis.md`) ranks Link first: 12 of
14 benchmark systems ship one.

The number was allocated by the coordinating session on 2026-11-16, after a
search found no claimed D119. D118 is the highest on `main` and D120 is in
flight on another branch. Check again when the PR opens.

## What's there today

- **No link anywhere in Psi.** There is no `Link` component, no
  `--psi-link-*` token, and `base.css` puts no style on `<a>`, so a bare
  anchor renders in the browser's default blue.
- **`Button href` looks like a button.** It is the only anchor Psi styles
  besides `NavItem`'s and `SkipLink`'s, and both of those are navigation
  chrome, not running text.
- **The accent clears AA as text, but not against body text.** Measured on
  the four shipped themes, `fgAccent` scores 4.92–8.76 on `bgPrimary`,
  `bgSecondary`, `fillNeutral1`–`3` and `fillTintAccent`. Against
  `fgPrimary`, it scores **1.82–2.02** in every theme, under the 3:1 that
  WCAG's colour-only technique (G183) asks for. A link that dropped its
  underline would be told from the sentence around it by colour alone, which
  fails 1.4.1.
- **`fgAccent` on `bgSecondary` is ungated.** `wcagAAPairs` gates the accent
  on `bgPrimary` and on `fillTintAccent` only. `bgSecondary` is the surface
  `Panel`, `Card`, `Dialog` and `Menu` alias, so a link inside any of them
  sits on a pair nothing checks. The status foregrounds already have this
  pair (D64/D65); the accent does not.
- **Precedents this design rests on.**
  - `.psi-media-tint` (D35) is a utility class that applies a component
    token and carries a hover state, in `@layer psi.utilities`.
  - `Banner` puts the global `psi-sr-only` class on an element it renders,
    so a component applying a utility class is established.
  - `NavItem` (D88, D93) takes a router's link as its single child and
    clones it to add `aria-current="page"`, leaving the child's own props
    and handlers alone.

## Decisions

- **D119 — A text link: the `.psi-link` class holds the one ruleset, and a
  `Link` component applies it to the anchor it renders or to the router link
  it is given. The link is underlined at rest, always.**
  - **One ruleset, in `utilities.css`.** `.psi-link` and its states live in
    `@layer psi.utilities`, emitted by `scripts/emit-utilities.ts` beside
    `.psi-media-tint`, with a roster entry (D79). It is the only copy of the
    rules. Any `<a>` can take the class: a router link given a `className`,
    markdown rendered to HTML, a page with no React.
  - **The rules.**
    - Rest: `color: var(--psi-link-fg)`; `text-decoration-line: underline`;
      `text-decoration-thickness: var(--psi-link-underline-thickness)`;
      `text-underline-offset: var(--psi-link-underline-offset)`;
      `text-decoration-color: currentColor`. The font is inherited: the link
      takes the face, size and weight of the text it sits in.
    - `:hover`: `color: var(--psi-link-fg-hover)` and
      `text-decoration-thickness: var(--psi-link-underline-thickness-hover)`.
    - `transition: color, text-decoration-thickness` over
      `var(--psi-duration-150) var(--psi-ease-standard)`, which the
      reduced-motion block in the same file already zeroes (D30).
    - `:focus-visible`: `outline: var(--psi-focus-ring-width) solid
      var(--psi-link-focus-ring)`; `outline-offset:
      var(--psi-focus-ring-offset)`; `border-radius: var(--psi-link-radius)`.
    - `[aria-current="page"]`: `color: var(--psi-link-fg-current)`;
      `font-weight: var(--psi-link-font-weight-current)`;
      `text-decoration-line: none`. It keeps no hover change: the current
      page reads as "you are here", not as something to click.
  - **Component tokens** (`packages/tokens/src/components/link.ts`,
    registered as `link`):

    | Token | Default |
    | --- | --- |
    | `--psi-link-fg` | `var(--psi-fg-accent)` |
    | `--psi-link-fg-hover` | `color-mix(in oklab, var(--psi-link-fg) 70%, var(--psi-fg-primary))` |
    | `--psi-link-fg-current` | `var(--psi-fg-primary)` |
    | `--psi-link-font-weight-current` | `500` |
    | `--psi-link-underline-thickness` | `1px` |
    | `--psi-link-underline-thickness-hover` | `2px` |
    | `--psi-link-underline-offset` | `0.2em` |
    | `--psi-link-focus-ring` | `var(--psi-border-focus)` |
    | `--psi-link-radius` | `var(--psi-radius-4)` |

    The three `fg` keys map to the `text` scope group by suffix and bind only
    text-scoped tokens. The others carry no suffix and are geometry or a
    focus accent, as on `nav-tree` and `skip-link`. The offset is in `em` so
    it scales with the text the link sits in.
  - **Hover moves toward ink, in oklab.** Mixing toward `fgPrimary` darkens
    the link on a light canvas and lightens it on a dark one, so hover always
    raises contrast against the surface. oklab rather than oklch, so a red
    accent does not swing through other hues on its way to a cool ink.
    Measured, rest → hover: light 5.91 → 7.31, dark 8.76 → 10.61, acme
    6.39 → 7.86, ember 8.40 → 10.54 on `bgPrimary`, and higher on
    `bgSecondary` and `fillTintAccent` in every theme. Because both ends of
    the mix pass, and the mix lies between them, hover stays at or above the
    lower of fgAccent and fgPrimary, both gated.
  - **One new contrast pair: `{ fg: "fgAccent", bg: "bgSecondary",
    minRatio: 4.5 }`** in `wcagAAPairs`, beside the status foregrounds'
    `bgSecondary` pairs. It measures 6.45 light, 8.05 dark, 6.98 acme, 8.24
    ember. `psi-theme`'s solver (`deriveTheme`) already escalates on any
    failing pair in the matrix, so a generated theme stays clean. The pinned
    count in `generate-derive.test.ts` goes up by one.
  - **No pair for link against body text.** The underline at rest is what
    tells a link from its sentence, so 1.4.1 holds without one, and the
    ~2:1 measured above says a pair could never pass. That is why the
    underline is not a token that can be turned off: thickness and offset
    are tunable, the line is not.
  - **The component.** `Link` in `@handamade/psi-react`:

    ```ts
    interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
      href?: string;
      current?: boolean;
      children: ReactNode;
      ref?: Ref<HTMLAnchorElement>;
    }
    ```

    - **With `href`:** renders `<a>` with `className` `psi-link` merged with
      the consumer's, `aria-current="page"` when `current`, and every other
      prop and the `ref` passed through.
    - **Without `href`, one element child** (the router's link, as with
      `NavItem`, D93): clones it, merging `psi-link`, the child's own
      `className` and `Link`'s `className`. With `current`, it adds
      `aria-current="page"`. Without `current`, the child's own
      `aria-current` is left alone, so a router that marks its active link
      keeps working. The child's other props and handlers are untouched.
      `Link`'s other anchor props and `ref` are not applied in this form:
      put them on your link. The doc comment says so.
    - **Without `href`, anything else** (a string, several children, a
      Fragment): rendered as it is, and a development-only warning, once:
      `Link: pass href, or one link element as the child; nothing was
      styled.` The same effect-based, production-gated shape as `Tabs`'s
      unmatched-value warning (D93).
  - **`children` is a slot.** `Link/slots.json` declares one `body` slot
    (`accepts: {}`, `0..*`), like `Text`'s and `PageHeading`'s.
  - **Standalone links take their size from what holds them.** `Link` has no
    `size`: Psi's px sizes are control heights, and a link is text. A link
    on its own line sits in a `Text`, which sets the size and tone.
  - **Not inside `NavItem`.** A `NavItem` styles its own anchor. `.psi-link`
    is in the utilities layer, which beats the components layer, so a `Link`
    passed to a `NavItem` would draw a text link in the nav. `NavItem`'s
    child is the router's link itself. The doc comment and `llms.txt` say so.
  - **`Button href` is unchanged** and stays the answer for an action that
    should look like a button.

  Weighed and not taken:

  - **Component only**, styled by its own CSS Module. Router apps are served
    by the child form, but HTML Psi doesn't render (rendered markdown, a
    non-React page) gets nothing, and the rules could not be shared.
  - **Class only.** Simplest for routers, but no manifest entry, so the MCP
    and the patterns cannot name it.
  - **Two copies of the rules**, a CSS Module for the component and the
    utility for everything else, kept in step by a test. More to keep in
    step for nothing the single copy can't do.
  - **A visited colour**, as a token off by default or a visible default.
    App links (actions, records) should not change colour once clicked, the
    consumer doesn't want one, and adding a token later is not breaking.
  - **An `external` prop** (new tab, `rel`, a trailing icon, a hidden "opens
    in a new tab" label). The label must be localisable, which makes it a
    `dismissLabel`-sized decision (D117) of its own. Until then a consumer
    puts its own icon in `children`.
  - **A semantic `fgAccentHover`** gated per theme. Most controllable, but a
    new token in every theme and in `psi-theme`'s solver, for a colour the
    mix already keeps above the rest colour's contrast.
  - **Underline on hover only.** Fails 1.4.1 at ~2:1 against body text.

## Consequences

- **Catalog 54 → 55 components.** No other open branch adds a component.
  Merge the latest `origin/main` before the PR and fix every count by hand.
- **Changeset:** `minor`. The three packages version in lockstep.
- **Nothing a consumer has today moves.** The token family, the utility and
  the component are additions. The one new gate pair passes on every
  shipped theme, so no committed colour changes.
- **The consumer's own link CSS can go**: its wrapper renders `Link` around
  its router link, or puts `psi-link` on it.
- **Stories** (`Link.stories.tsx`): `Inline` (a link in a sentence of
  `Text`), `Standalone` (a link alone in a `Text`), `Current` (a row of
  links with one marked current), `RouterChild` (a stand-in router link
  passed as the child), and `OnSurfaces` (links on a `Panel` and in an
  accent-tinted `Banner`, so the `bgSecondary` and tint pairs are visible).
  All new VR baselines; no existing story moves.
- **Docs.** The generated `docs/Link.md`; a `Link` line in
  `packages/react/llms.txt` naming the class, the child form and the
  `NavItem` caveat; `.psi-link` in the tokens' `llms.txt` where it lists the
  utilities; the count in every prose claim `check-docs-drift` checks.

## File map

| File | Change |
| --- | --- |
| `packages/tokens/src/components/link.ts` | new: `linkVars` |
| `packages/tokens/src/components/registry.ts` | register `link` |
| `packages/tokens/src/contrast-matrix.ts` | `fgAccent` on `bgSecondary` |
| `packages/tokens/src/generate/derive.ts` | the "38 pairs" comment |
| `packages/tokens/scripts/emit-utilities.ts` | `.psi-link` rules; roster family |
| `packages/tokens/src/guidance.ts` | one `rules` line: text links are `Link` or `.psi-link`; `Button href` for an action that looks like a button |
| `packages/tokens/__tests__/link-tokens.test.ts` | new: aliases, scope gate, hover contrast per theme |
| `packages/tokens/__tests__/generate-derive.test.ts` | pinned pair count + 1 |
| `packages/tokens/__tests__/emit-css.test.ts`, `scales.test.ts` | `.psi-link` emitted and in the roster, beside `.psi-media-tint` |
| `packages/tokens/llms.txt` | `.psi-link` |
| `packages/react/src/Link/Link.tsx` | new |
| `packages/react/src/Link/slots.json` | new: `body` |
| `packages/react/src/Link/Link.test.tsx` | new |
| `packages/react/src/Link/Link.stories.tsx` | new |
| `packages/react/src/index.ts` | export |
| `packages/react/scripts/emit-manifest.ts` | add to the component list |
| `packages/react/src/a11y-meta.ts` | entry |
| `packages/react/src/a11y.axe.test.tsx` | a case |
| `packages/react/scripts/slots.test.ts` | pin `Link`'s `body` |
| `packages/react/llms.txt`, `packages/react/docs/Link.md` | docs (`.md` generated) |
| `README.md`, `packages/react/README.md`, `packages/mcp/README.md` | 54 → 55 |
| `CLAUDE.md` | decision range, to what `main` holds at merge |
| `.changeset/text-link.md` | new |
| `apps/storybook/vr/stories.spec.ts-snapshots/…` | new baselines, after the user's OK |

## Verification

Tests first, each red on its assertion before the code exists.

- **Tokens** (`link-tokens.test.ts`): `components.css` declares each
  `--psi-link-*` with the default above; a theme may override each; the
  scope gate refuses a surface token on `link-fg`; for each shipped theme,
  the oklab 70/30 mix of `fgAccent` toward `fgPrimary` clears 4.5 on
  `bgPrimary`, `bgSecondary` and `fillTintAccent`.
- **Gate:** `wcagAAPairs` contains `fgAccent`/`bgSecondary`; the contrast
  test passes on every theme; the `deriveTheme` sweep still clears every
  pair in both modes.
- **Utility:** `utilities.css` contains `.psi-link` with its rest, hover,
  focus-visible and `aria-current="page"` rules inside
  `@layer psi.utilities`, and the roster lists `psi-link`.
- **Component** (`Link.test.tsx`):
  - with `href`: one `<a>` with `psi-link` and the consumer's class, `ref`
    and props forwarded, `aria-current="page"` only with `current`;
  - with a child link: the child is rendered (not wrapped), its class keeps
    its own and gains `psi-link` and `Link`'s; its handlers fire; `current`
    adds `aria-current="page"`; without `current` the child's own
    `aria-current` survives;
  - a string child renders as text and warns once in development, never in
    production.
- **Axe:** a paragraph with an inline `Link` and a current `Link` passes.
- **Gates:** `pnpm build && node tools/check-docs-drift.mjs && pnpm test &&
  pnpm lint && pnpm --dir apps/promo build && pnpm test:site`, then CI's
  `vr`.
