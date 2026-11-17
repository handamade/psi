# Docs pages that follow the theme, on the latest Storybook (D123)

Date: 2026-11-17. Status: **Proposed**, branch `d123-storybook-docs-theme`.

Provenance: reported by Dmitry on 2026-11-17 with a screenshot of the `Switch`
docs page in Dark. The theme toolbar changed the story's colours, but the
preview box stayed white, so the label read light grey on white. The same
report asked to move Storybook to its latest release.

D123 was checked against every `## Decisions` entry on `origin/main`
(highest D122, with D121 on `main` too), the remote branches and the open PRs
(none).

## What's there today

Measured on `main` at `82e1c49`, Storybook 10.4.6, on
`iframe.html?viewMode=docs&id=components-switch--docs&globals=theme:dark`:

| Element | Background |
| --- | --- |
| `html`, `body` | `oklch(0.15 0.01 250)`, Psi's dark `bg-primary` |
| `.sbdocs-wrapper` (the docs page) | `rgb(255, 255, 255)` |
| `.sbdocs-preview` (the bordered box around a story) | `rgb(255, 255, 255)` |
| `.docs-story` (the story area inside that box) | transparent |
| the `Switch` label's colour | `oklch(0.93 0.01 250)`, dark theme's `fg-primary` |

1. **The decorator themes the document, but Storybook paints the docs page
   over it.** `preview.ts` sets `data-psi-theme` on `<html>`, and
   `preview.css` paints `html` and `body` with `--psi-bg-primary`. That is
   right for a story on its own canvas. On a docs page, Storybook's own
   `.sbdocs-wrapper` and `.sbdocs-preview` paint white, and `.docs-story` is
   transparent, so every story on the page sits on white. The story's tokens
   still switch, so a dark theme puts dark-theme foregrounds on a light
   surface.
2. **All 45 docs pages are affected.** Every one is generated (`autodocs`);
   there is no MDX page with its own markup.
3. **Text a story places loose takes the docs page's colour and font.**
   `.sbdocs-wrapper` sets Storybook's own colour and Nunito Sans, and
   `.docs-story` inherits them. A story's components set their own type, but
   plain text inherits whatever the docs page has. That is the docs-mode
   version of what D107 fixed for the canvas.
4. **Storybook is 10.4.6; the latest is 10.6.7** (published 2026-11-10). All
   four Storybook packages move together. A minor upgrade inside 10.x needs no
   migration.

## Decisions

### D123. A docs page's story box is an app root

`.docs-story`, the area inside each docs preview box, gets the same three
app-root declarations as the canvas's `body`: `background:
var(--psi-bg-primary)`, `color: var(--psi-fg-primary)` and `font:
var(--psi-text-14-20-regular)`. The theme toolbar then changes every story
box on a docs page, on every docs page, and loose text in a story reads as
it would in an app.

- **Only the story box, not the whole docs page.** The title, the
  description, the args table and "Show code" stay in Storybook's light docs
  theme. They describe the component and are not part of what it renders.
  Theming them would mean swapping Storybook's docs theme per global, and
  Storybook's docs theme is static.
- **Unlayered, unlike the rest of `preview.css`.** Storybook's docs styles
  are unlayered Emotion rules, and an unlayered rule beats any layered one.
  The rule only styles the `.docs-story` element. Its colour and font reach
  stories by inheritance, and every Psi component sets its own, so it cannot
  override Psi's component layer (D94).
- **The canvas is untouched.** `vr` and the interaction specs load stories
  with `viewMode=story`, where `.docs-story` does not exist. No baseline
  should change because of this rule.

### Storybook 10.4.6 → 10.6.7

`storybook`, `@storybook/react-vite`, `@storybook/addon-docs` and
`@storybook/addon-a11y` go to `^10.6.7`. The upgrade comes in its own commit,
before the fix, so any baseline change `vr` reports traces to the upgrade
alone. If CI's `vr` fails on the upgrade, its renders are committed over the
baselines in this PR, with the counts in the PR body.

## Tests

- A new `docs-theme.interaction.spec.ts`: for each of the four themes, on
  the `Switch` docs page, every `.docs-story` has the theme's
  `--psi-bg-primary` as its computed background and its `--psi-fg-primary`
  as its colour. It fails on `main` today: the box is transparent over white,
  and the colour is Storybook's.
- The existing gates: build, `check-docs-drift`, test, lint, the site build
  and `test:site` (it reads `storybook-static/index.json`, so it also proves
  the upgrade kept the story ids).

## Not in scope

- A dark Storybook UI (manager) or docs chrome.
- `manager.ts` still titles the sidebar "DS design system", a name from
  before the Psi rename. It is a separate fix.
- No published package changes, so no changeset: `apps/storybook` is private,
  and the hosted Storybook picks the fix up from `main`.
