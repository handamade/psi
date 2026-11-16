# A docs site built with Psi, and a homepage that is HTML (D121)

Date: 2026-11-16. Status: **Approved design**, not planned, not implemented.
Branch `d121-docs-site`.

Provenance: a review of psi.kurkin.de against three reference sites the owner
named — webawesome.com (and its `/docs/`), ui.shadcn.com and panelui.dev —
with mui.com noted as good but too big a model for a personal design system.
The owner wants three things from the site: the homepage as a demo and promo,
a real docs section, and a fully capable MCP. This spec is the first of those
three projects, the docs; the other two are under *Deferred*.

The number is the first free `## Decisions` entry when this branch started.
D115–D118 are on `main` (D118 in `2026-11-16-page-heading-design.md`), D119 is
reserved for a branch in flight (per `2026-11-16-field-border-design.md` on
`d120-field-border`), and D120 is that branch. A search of every branch and
worktree for D121 found nothing. **Check again when the PR opens** — numbers
in this repo collide late.

## What's there today

Measured on `origin/main` at `093eb79` (0.30.0).

- **The homepage is empty without JavaScript.** `apps/promo` is a Vite SPA.
  Fetching `https://psi.kurkin.de/` returns a `<title>`, a meta description, a
  theme script and an empty `#root`. Search engines and AI fetchers that do
  not run scripts see one line. A fetch of the page through a
  markdown-converting reader returned only the title.
- **"Docs" is Storybook at `/storybook/`.** 34 story files across components,
  token pages and a Welcome story styled inline. There is no installation
  guide (so the five-stylesheet rule lives only in READMEs and llms.txt), no
  theming or dark-mode guide, no AI guide, no cross-site search, no
  per-page markdown.
- **The machine trail is ahead of the human one.** `manifest.json` (54
  exports from 35 component folders), `guidance.json`, `resolved/<theme>.json`
  for light, dark, acme and ember, `contracts.json`, `a11y-meta.ts`, and
  `packages/react/docs/<Export>.md` — one markdown file per export, generated
  by `scripts/emit-docs.ts` with description, variant guidance, rules, props,
  keyboard table and the component's theming variables. The hosted MCP at
  `/mcp` serves `search` and `get` over the same data.
- **What the references do that Psi does not.** shadcn's component pages run:
  title and Copy Page, a live preview with a code tab, install commands,
  usage, a list of examples each with preview and code, a props table, and an
  "On this page" list. Its sidebar groups Get Started, Components, Theming,
  CLI, llms.txt and MCP. Web Awesome leads with install paths and has a
  "Using with AI" page (skills and llms.txt; no MCP). PanelUI's homepage makes
  concrete claims (component counts, themes) and links a Getting Started path.
  All three — and Primer, Carbon, Polaris, MUI — build their docs with their
  own components.

## Decisions

- **D121 — The public site is one Astro app, `apps/site`, built with Psi's own
  components. It serves the existing homepage as HTML, and adds generated docs
  for components and tokens plus hand-written guides.**

  - **Why Astro.** Compared against a Vite + React Router prerender, Next.js
    static export with Fumadocs, and Eleventy (owner's question). Astro
    renders every page to HTML at build, ships no JavaScript unless a
    component asks for it, and hydrates React components as islands with
    `client:*` directives. MDX, content collections and Shiki highlighting
    are built in. Eleventy renders JSX only through `renderToStaticMarkup`
    and leaves client hydration to the site; React Router prerender hydrates
    every page in full and leaves MDX, TOC and highlighting to the site;
    Next's server components require `"use client"` markers Psi does not
    ship. Astro's cost is one new framework and its `.astro` template
    syntax, which this site keeps to layouts and data loading.
  - **Why Psi for the site's own chrome.** It is standard practice, and it
    makes the site the case study: whatever a docs site needs that Psi lacks
    becomes a recorded gap (see *Gaps found*), not a silent workaround.
  - **`apps/site` replaces `apps/promo`.** The promo source moves with
    `git mv` so its history follows. One build, one theme script, one header.

### URLs

```
/                                 homepage — today's <App/>, rendered to HTML, hydrated
/docs/                            overview and "start here"
/docs/get-started/<guide>         five guides (below)
/docs/components/<slug>           35 pages, one per component folder
/docs/tokens/<group>              one page per token group
/docs/**.md                       markdown twin of every docs page
/docs/llms.txt                    generated index of the twins
/pagefind/                        static search index
/sitemap-index.xml                sitemap
/storybook/                       unchanged — workbench and vr baseline source
/mcp, /llms.txt, /packages/*/llms.txt   unchanged (root llms.txt gains one line)
```

### Layout

- **Docs pages:** `AppShell` with
  - `header` — the homepage's existing `Header` component, gaining one
    **Docs** link. That link is the only visible change to the homepage.
    On docs pages only, the header also shows search (⌘K) and, under the
    sidebar breakpoint, a menu `IconButton` driving `AppShell`'s
    `sidebarOpen`; `Header` takes these as optional props, so the homepage
    renders without them.
  - `sidebar` — a `NavTree`: Get started, Components, Tokens.
  - main — `PageHeading`, Copy page, the content, and on wide screens an
    "On this page" `NavTree` of anchor links (no scroll tracking in v1).
- **Homepage:** unchanged layout. `App` is rendered by Astro as one island
  with `client:load`, so the HTML carries every section's content and the
  page hydrates as it does today.
- **Islands:** the homepage, the theme toggle, the search dialog, the mobile
  menu button, the example preview/code tabs and live previews, and Copy
  buttons. Everything else ships as HTML.

### Rendering to HTML

- The homepage's theme hook (`apps/promo/src/theme.ts`) reads `localStorage`
  and `matchMedia` inside `useState` initialisers, which throws at build.
  Those reads move into a `useLayoutEffect`: the server renders light with
  no brand, and the client corrects to the stored values before first
  paint, so hydration never mismatches. The inline theme script in
  `index.html` moves into the Astro layout's `<head>` unchanged, so first
  paint still has the right theme and cached brand.
- **A Psi component that cannot render on the server is a package bug.** It
  is fixed in `packages/react` with a patch changeset and its own `vr`
  refresh if it moves pixels — not worked around in the site, because every
  SSR consumer would hit it.

### Content

- **Component pages — one per component folder, 35 pages for 54 exports.**
  `Table` covers `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`,
  `TableCell`, `TableCaption`; `Tabs` covers `TabList`, `Tab`, `TabPanel`;
  and so on. A map in `apps/site/src/content/component-pages.ts` assigns
  every export to a page. Each page, in order:
  1. Name and description, from `manifest.json`.
  2. Import snippet with a Copy button.
  3. Examples, each in Psi `Tabs` with Preview and Code.
  4. Props, one Psi `Table` per member export: name, type, default,
     description — from the manifest.
  5. Keyboard and assistive tech, from `a11y-meta.ts`.
  6. Theming variables, from the component's `*.vars.css`, as `emit-docs`
     already renders them.
  7. A link to the component's Storybook stories.

  Hand-written usage prose per component is not in v1: the description,
  examples and generated sections carry the page. A per-page prose file can
  be added when a page needs one.
- **Examples are their own files**, `apps/site/src/examples/<slug>/<name>.tsx`,
  each default-exporting a small component written as a consumer would
  write it. Storybook stories are not reused: they set props through args,
  so their source is not code anyone can paste. The page renders the module
  as an island and shows its source, imported with `?raw` and highlighted
  by Shiki at build. **Every page has at least one example.** The site's
  typecheck covers the example files, so an invented prop, variant or size
  fails `pnpm build`.
- **Token pages — six, mirroring the existing Storybook token pages:**
  Color, Typography, Display, Spacing, Motion, Layout. Data comes from
  `resolved/<theme>.json`: its 39 semantic colour `tokens`, its 22
  `typography` combos, its `display` combos, and its `scales` (space, size,
  radius, focusRing on Spacing; motion on Motion; layout on Layout).
  `scales.scopes` is metadata (`{"space":["gap"]}`: which utility families a
  scale feeds) and is shown as a note on the Spacing page. A unit test checks
  that the six pages cover every key. Each row: token name, CSS variable,
  a swatch or value for each of the four themes, and for semantic colours
  the OKLCH formula. Group notes come from `guidance.json` (motion, layout,
  geometry, typographyDefaults).
- **Guides — MDX in an Astro content collection**, five in v1:
  1. Installation — both packages, the **five** stylesheets and why the
     fifth matters, first component.
  2. Theming and brand derivation.
  3. Dark mode.
  4. Using Psi with AI — hosted and local MCP, `init`, llms.txt.
  5. Sizes and variants — the px sizes and the flat variant list.

  Guides may embed live examples (the same example files) and Psi
  components. **No guide states a count by hand**: counts come from the
  existing `vite-plugin-psi-facts`, moved into `apps/site`.

### Search and agent surfaces

- **Search is Pagefind**, run on `apps/site/dist` after `astro build`. Only
  docs content is indexed (`data-pagefind-body` on the content area). The
  dialog loads Pagefind's script on first open. No server, no third party.
- **Markdown twins.** Every docs page has a `.md` at its URL plus `.md`.
  - Component pages: the member exports' `packages/react/docs/<Export>.md`,
    concatenated, with the page's examples inserted as code blocks. No
    second markdown generator.
  - Token pages: a small renderer over `resolved/<theme>.json`, in
    `apps/site/src/lib/markdown.ts`.
  - Guides: the MDX body with each embedded example replaced by its source.
  - Each HTML page links its twin with
    `<link rel="alternate" type="text/markdown">`.
- **Copy page** on every docs page copies the twin. The twin is embedded at
  build so the button has a value without a fetch.
- **`/docs/llms.txt`** is generated at build: every twin's URL with a
  one-line summary. The tracked root `llms.txt` gains one line pointing to
  it; it is not rewritten at build.
- **Sitemap** via `@astrojs/sitemap`.
- **The MCP is unchanged.** Markdown twins are built from the same artifacts
  `get` reads, which is the seam the MCP project will use.

## Gaps found

What the site needs, and where it comes from. Site-only pieces live in
`apps/site/src/components`, bind only `var(--psi-*)` (the stylelint rule
already covers `apps/**/*.css`), and none is promoted into Psi here —
promotion is a decision of its own. Every row goes into the private register
when the PR merges.

| Need | Built from | Status |
| --- | --- | --- |
| Code block: highlighted code, Copy, optional filename | `Panel` + `CopyButton` + Shiki output themed with `--psi-*` | Site-only; candidate component |
| Search dialog (⌘K) | `Dialog` + `Input` + a list of result links | Site-only. The missing primitive — a combobox/listbox with arrow-key selection — is recorded, not built |
| MDX text styles: headings, lists, inline code, tables | Site stylesheet over Psi type and spacing tokens | Site-only; candidate utility |
| Token swatch | Site component over `--psi-*` | Site-only |
| Heading anchor links | Site component | Site-only |
| "On this page" list | `NavTree` + `NavItem` | Psi |
| Copy feedback | `CopyButton` announces nothing by design (D86). Each island is its own React root, so a copy dispatches a `psi-site:announce` DOM event and the docs shell, which owns the one `ToastProvider`, speaks it with `useToast().announce()` | Psi |
| Mobile sidebar | `AppShell` `sidebarOpen` + `IconButton` | Psi |
| Back-button scroll position | `AppShell`'s `<main>` is its own scroller; browsers restore window scroll, not an inner scroller's | **Watch.** If returning to a long docs page lands at the top, record it as an `AppShell` finding rather than patch it in the site |

## Verification

Tests first, each red on its assertion before the code exists.

- **Moves.** `apps/promo` → `apps/site` in `vitest.workspace.ts`, the
  `test:site` script (`-c apps/site/site-gate`), the CI workflow and its
  comments, `tools/assemble-site.mjs`, `tools/check-docs-drift.mjs`, the
  root `dev:web` script, and the gate line in `CLAUDE.md`. The existing
  site-gate tests carry over unchanged against `/`: axe in both themes, the
  derive labels at AA, real counts, Storybook links, no overflow from 320 to
  1920px. The existing promo unit tests carry over unchanged.
- **New site-gate tests** (Playwright, no screenshots, local and CI):
  1. With JavaScript disabled, `/`, one component page, one token page and
     one guide each contain their `h1` and main text.
  2. axe on every docs page, light and dark.
  3. Every docs page has a non-empty `.md` twin, and `/docs/llms.txt` lists
     exactly those twins.
  4. No internal link on any docs page points at a missing page (the
     existing Storybook-link test, widened).
  5. No horizontal overflow at 320px on one page of each type.
  6. ⌘K, type "button": the Button page is among the results.
- **Unit tests** (`apps/site`, vitest):
  - every manifest export is on exactly one component page;
  - every component page has at least one example;
  - every semantic token, typography combo, display combo and scale (but
    `scopes`) in the resolved files is on exactly one token page;
  - the token markdown renderer against fixed resolved-token data.
- **Build checks:** `astro check` and a typecheck of `src/examples/**` run in
  `apps/site`'s `build`.
- **`check-docs-drift`:** paths move to `apps/site`, and the guides' content
  folder joins the must-not-hardcode rule **as a folder**, which also closes
  known carry #3 of D76 (the tool enumerating promo files by name).
- **`vr`:** untouched — Storybook does not change. Only an SSR fix in
  `packages/react` (above) could move a baseline.
- **Changesets:** `apps/site` is private and needs none. An SSR fix in a
  package gets a patch changeset.
- **Gates:**

  ```bash
  pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site
  ```

## Out of scope

- Pattern pages. The catalog stays in Storybook and the MCP for now.
- Any redesign of the homepage beyond the Docs link.
- Promoting a site-only piece into Psi.
- Scroll tracking in "On this page".
- "Open in ChatGPT / Claude" buttons, a CLI, blocks or templates, versioned
  docs.

## Deferred

- **The MCP project.** New tools — example code for a component, deriving a
  theme from a brand colour, checking a JSX snippet for props and variants
  that do not exist — and `get` returning the same markdown as the docs page.
  Its own spec and number.
- **The homepage project.** Tighten the homepage into a demo that leads into
  the docs, now that it is HTML and shares the docs' app. Its own spec and
  number.
- **Pattern pages**, generated from the patterns catalog with recipe and
  preset, once the component pages have settled.
