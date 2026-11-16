# A page heading in the display face — `PageHeading` (D118)

Date: 2026-11-16. Status: **Approved**, not implemented. Branch
`d118-page-heading`.

Provenance: a consumer's request. Every screen of its app has exactly one page
heading. Psi has no way to draw it, so the app sets the heading's face in its
own CSS on three screens, and a heading built from Psi's utilities alone
renders in the body face rather than the brand's display face.

The number was allocated by the coordinating session on 2026-11-16, after a
search of `origin/main` and every open branch for a claimed D118 found none.
D117 is the highest on `main`. Check again when the PR opens.

## What's there today

- **`Text` stops at `h4` and 18px.** `as` takes
  `p | span | div | h2 | h3 | h4`, `size` takes `12 | 14 | 16 | 18`, and every
  size binds a `--psi-text-*` style in the sans face (D109). It has no `h1`,
  no size above 18px, and no way to choose a face.
- **`--psi-font-display` exists, but no text style uses it.** It defaults to
  `var(--psi-font-sans)`, and a brand sets it (`ember` → Archivo, D29). Only
  the fluid `--psi-display-*` tier (D28) binds it. Those tokens use unitless
  line heights and `clamp()` sizes, and their `.psi-display-*` utilities set
  uppercase and negative tracking. That is a marketing headline, not an app's
  page title.
- **The `--psi-text-*` tier already has faces.** `comboName` prefixes a role
  (`serif-18-28-regular`, `mono-15-24-medium`) and `comboFontVar` binds
  `--psi-font-{role}`. `ComboRole` is `sans | serif | mono`. It has no
  `display`.
- **`guidance.json` already names the size.** `typographyDefaults.heading` is
  `24-32-medium`. `psi-text-24-32-medium` gives that size, but in the body
  face.
- **A pattern tree can't hold a bare `h1`.** Every compose node names a
  manifest component, so a utility class alone could never put a page heading
  into a pattern.
- **Psi's own frame works around it.** `AppShell.stories.tsx` renders a bare
  `<h1>Sales</h1>`, and `AppShell.stories.css` styles it
  (`main h1 { font: var(--psi-text-24-32-medium) }`), leaving the browser's
  default margin. D113's browser test reads that margin. With no banner, the
  heading starts "one block padding plus its own margin" below `<main>`'s top,
  and the test asserts only `> 24`.

## Decisions

- **D118 — `PageHeading`: the page's one `h1`, at 24/32 medium in the display
  face, margin 0. It rests on a new text style,
  `--psi-text-display-24-32-medium`.**
  - **The text style.** `ComboRole` gains `"display"`, and `typographyCombos`
    gains one line: `{ fontSize: 24, lineHeight: 32, weight: "medium", role:
    "display" }`. The existing generators then emit:
    - `--psi-text-display-24-32-medium: 500 1.5rem/2rem var(--psi-font-display)`
      in `base.css`;
    - the `.psi-text-display-24-32-medium` utility and its roster entry, so a
      consumer outside React gets the face from one class;
    - a DTCG `typography` entry with `fontFamily: {fontFamily.display}`, a
      family the DTCG output already declares.
    Because it lives in the `--psi-text-*` tier, it has fixed px, a px line
    height, no tracking and no case change, like every other app text style.
    The fluid `--psi-display-*` tier is unchanged.
  - **Component tokens** (`packages/tokens/src/components/page-heading.ts`,
    registered as `page-heading`):

    | Token | Default |
    | --- | --- |
    | `--psi-page-heading-font` | `var(--psi-text-display-24-32-medium)` |
    | `--psi-page-heading-fg` | `var(--psi-fg-primary)` |

    `fg` maps to the `text` scope group by suffix, and `font` already exists as
    a key (`textarea`'s). `fgPrimary` is gated at 4.5 on every surface, so
    there is no new contrast pair. A brand that wants another page-heading
    style overrides `page-heading-font` in `componentOverrides`, as `ember`
    does with `button-font`.
  - **The component.** `<PageHeading>` renders an `h1` with `margin: 0`,
    `font: var(--psi-page-heading-font)` and
    `color: var(--psi-page-heading-fg)`. Its props are `children: ReactNode`,
    `ref`, `className` and the `h1`'s host props, so `id` works for
    `aria-labelledby`. It has no `as`, `size`, `weight`, `face` or `tone`:
    a page heading is always the `h1`, always this style.
  - **`children` is a slot.** `PageHeading/slots.json` declares one `body`
    slot (`accepts: {}`, `0..*`), like `Text`'s, so a compose tree and the MCP
    can fill it.
  - **Margin 0 is also what lines a page up under a banner.** D113 made
    `<main>`'s top spacing padding, so the page starts one block padding below
    the header, or one block padding below a banner. A heading with its own
    top margin adds to both, and nothing in Psi controls that margin. With
    margin 0 the heading's top is the padding edge in both cases.
  - **`Text` is unchanged.** It stays `h2`–`h4`, so the page's one `h1` has
    one source. Sub-headings remain `Text as="h2"` and `as="h3"`.
  - **One per screen is guidance, not enforcement.** `PageHeading` does not
    count its siblings at runtime. `llms.txt`, its doc comment and
    `a11y-meta` say: one `PageHeading` per screen, the first thing in the
    page. Inside an `AppShell` that means the first child of the page, after
    any `banner`, which sits outside the page.
  - **`guidance.json`** gains `typographyDefaults.pageHeading:
    "display-24-32-medium"`. `heading` stays `24-32-medium`, because agents
    may already read it as the style for a section title, and that meaning
    should not change under them.
  - **The `app-shell` pattern draws it.** Its `body` slot becomes
    `[PageHeading "{content:title}", "{content:page}"]`, with new content
    `"title": "[page title]"`. An agent composing a frame gets the page's
    heading with it. The count stays at 24 patterns.

  Weighed and not taken:

  - **Extending `Text`** with `as="h1"`, `size={24}` and `face="body|display"`.
    No new component, but `face="display"` at 12px and `size={24}` on a `<p>`
    become legal, and nothing discourages several `h1`s on a page.
  - **A utility class only** (`.psi-text-display-24-32-medium` and `.psi-m-0`
    on a hand-written `h1`). It ships anyway as a side effect of the token,
    but a pattern tree cannot render a bare `h1`, so agents could not produce
    it from a pattern.
  - **A size prop over a display scale** (`24 | 30`, or `20 | 24 | 30`).
    Nothing has asked for a second size. Adding one later is one combo line
    plus a prop.
  - **A `PageHeader`** with trailing actions or a subtitle row. Not asked
    for. A page that needs actions beside its title puts `PageHeading` and a
    `Toolbar` in a row of its own.

## Consequences

- **Catalog 52 → 53 components.** D115 (`FieldStack`) also takes the count to
  53. Whichever merges second updates `check-docs-drift`'s claims to 54. The
  coordinating session is told before the PR opens.
- **Changeset:** `minor`. The three packages version in lockstep.
- **Nothing a consumer has today moves.** The new token, utility and
  component are additions. `Text`'s API and every existing style are
  unchanged.
- **Stories.**
  - New `PageHeading.stories.tsx`: `Default`, plus `InAPage` (a
    `PageHeading` over `Text` lines in a `Stack`), so a reviewer sees the
    heading against body text.
  - `AppShell.stories.tsx` replaces its bare `<h1>Sales</h1>` with
    `<PageHeading>Sales</PageHeading>`, and `AppShell.stories.css` drops its
    `main h1` rule.
  - The VR baselines for the AppShell stories and the `app-shell` preset
    move: the heading loses its browser margin and, under `ember`, takes the
    display face.
- **Docs.** The generated `docs/PageHeading.md`; a `PageHeading` line in
  `packages/react/llms.txt` beside `Text`'s, and `Text`'s line naming
  `PageHeading` for the `h1`; the tokens' `llms.txt` and README where they
  list the text tiers; the count in every prose claim `check-docs-drift`
  checks.

## File map

| File | Change |
| --- | --- |
| `packages/tokens/src/scales/typography.ts` | `ComboRole` + `"display"`; one combo |
| `packages/tokens/src/components/page-heading.ts` | new: `pageHeadingVars` |
| `packages/tokens/src/components/registry.ts` | register `page-heading` |
| `packages/tokens/src/guidance.ts` | `typographyDefaults.pageHeading` |
| `packages/tokens/__tests__/page-heading-tokens.test.ts` | new |
| `packages/tokens/__tests__/scales.test.ts` | the display combo's name, CSS and utility |
| `packages/tokens/llms.txt`, `packages/tokens/README.md` | the display text style |
| `packages/react/src/PageHeading/PageHeading.tsx` | new |
| `packages/react/src/PageHeading/page-heading.module.css` | new |
| `packages/react/src/PageHeading/slots.json` | new: `body` |
| `packages/react/src/PageHeading/PageHeading.test.tsx` | new |
| `packages/react/src/PageHeading/PageHeading.stories.tsx` | new |
| `packages/react/src/index.ts` | export |
| `packages/react/scripts/emit-manifest.ts` | add to the component list |
| `packages/react/src/a11y-meta.ts` | entry |
| `packages/react/src/a11y.axe.test.tsx` | a case |
| `packages/react/scripts/slots.test.ts` | pin `PageHeading`'s `body` |
| `packages/react/patterns/app-shell.json` | `PageHeading` in `body`; `title` content |
| `packages/react/scripts/render-preset.test.ts` | the preset renders one `h1` |
| `packages/react/src/AppShell/AppShell.stories.tsx`, `.stories.css` | use `PageHeading`; drop `main h1` |
| `apps/storybook/vr/app-shell.interaction.spec.ts` | the heading sits exactly one block padding down |
| `packages/react/llms.txt`, `packages/react/docs/PageHeading.md` | docs (`.md` generated) |
| `README.md`, `packages/react/README.md`, `packages/mcp/README.md` | 52 → 53 |
| `.changeset/page-heading.md` | new |
| `apps/storybook/vr/stories.spec.ts-snapshots/…` | new and moved baselines, after the user's OK |

## Verification

Tests first, each red on its assertion before the code exists.

- **Tokens.** `base.css` declares
  `--psi-text-display-24-32-medium: 500 1.5rem/2rem var(--psi-font-display);`;
  `utilities.css` has `.psi-text-display-24-32-medium`; the DTCG entry's
  `fontFamily` is `{fontFamily.display}`; `--psi-page-heading-font` and
  `--psi-page-heading-fg` alias as above; a theme may override each; under
  `ember` the resolved `--psi-font-display` is Archivo's stack.
- **Component** (`PageHeading.test.tsx`): it renders one `h1` with the text;
  it forwards `ref`, `id` and `className`; it carries the module class.
- **Axe:** a page of a `PageHeading` over `Text`s passes.
- **Pattern:** the `app-shell` preset renders exactly one `h1`, inside
  `<main>`, and it is the page's first element.
- **In a browser** (`app-shell.interaction.spec.ts`), where the stylesheet is
  real:
  - the heading's computed `margin-top` is `0px` and its `font-family` is the
    resolved `--psi-font-display`;
  - with no banner, it starts exactly one block padding (24px) below
    `<main>`'s top. The old `> 24` becomes `toBe(24)`;
  - under a banner, it starts the same distance below the banner.
- **Gates:** `pnpm build && node tools/check-docs-drift.mjs && pnpm test &&
  pnpm lint && pnpm --dir apps/promo build && pnpm test:site`, then CI's `vr`.
