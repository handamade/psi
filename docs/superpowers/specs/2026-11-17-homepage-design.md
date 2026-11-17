# A homepage that leads into the system (D133)

Date: 2026-11-17. Status: **Implemented** on branch `d133-homepage`.
Branch `d133-homepage`.

Provenance: the *homepage project* deferred by D121 (`2026-11-16-docs-site-design.md`, *Deferred*). Brainstormed with
the owner on 2026-11-17 against interactive mocks; the last one is described section by section below. The owner's
aims, in his words: make the site "less slop and more up to date", and make it reflect the course on AI and design
systems he is taking: the site as the system's front door, agents as a peer audience, and a seamless connection
between people, agents, code, docs, Storybook and the design tools. **No positioning:** this is a personal project,
and the page is not written for a buyer.

The number is the first free `## Decisions` entry: D127 to D131 are on `main`, and D132 is `SegmentedControl`
(`d132-segmented-control`, merged as #183). A search of every branch found nothing claiming D133. **Check again when
the PR opens**: numbers in this repo collide late.

## What's there today

Measured on `main` at `0016b14` (0.34.0).

- **One React island.** `apps/site/src/pages/index.astro` renders `<App client:load />`: the server renders it to
  HTML, and the client hydrates every section, static text included. The docs pages work the other way: static
  Astro, with islands only where something is interactive.
- **Seven numbered sections.** 01 Principles, 02 Components, 03 Theming, 04 Pipeline, 05 Agents, 06 Roadmap,
  07 Updates, after a hero with a stat-chip row and the theme console, and before a footer with a quick start.
- **Anchors, not pages.** Seven of the header's links are fragments of the homepage.
- **Volume.** About 5,900 words, of which the 41 release notes in Updates are about 4,000.
- **Stale.** The Roadmap's "In v1 today" stops at D71–D73, and its "Next" still lists the theme console, which
  shipped in 0.19 (D57). The section text was last refreshed by D76 on 2026-08-07.
- **Template scaffolding** the owner named: numbered eyebrows, the stat-chip row, a grid of equal cards for every
  section, and accent mono labels on everything.
- **Type:** none loaded. The site renders in the default theme's system stack.

## Decisions

- **D133 — The homepage becomes a short front door built from static Astro sections and four islands: a hero with
  the theme console, a map and trace of the surfaces every component reaches, a demo app built only from Psi, and the
  rules the build enforces. Releases move to `/docs/changelog/`, and the header links to pages, never to fragments.**

### Pages

| Route | Content |
| --- | --- |
| `/` | Hero → One source, every surface → Built only from Psi → How it's built → footer |
| `/docs/changelog/` | Every release note, newest first, from `apps/site/src/content/updates.ts`; a `.md` twin; a docs-nav entry under *Get started* |

- **Themes and Playground are off.** The mocks carried both in the header; the owner chose to leave them out until
  each has a design of its own. Nothing links to them.
- **The Roadmap goes, with no replacement.** Project B's Process page is where "what's next" will live.
- **Old fragments** (`/#theming`, `/#roadmap`) land at the top of the homepage. A server cannot redirect a fragment,
  and a script to forward them is not worth it here.

### Navigation

- **Header, wide screens:** the Ψ mark, *Docs*, *Components* (`/docs/components/`), then ⌘K search and a
  Light / Dark / System `SegmentedControl` (D132). *System* is new: today the toggle follows the OS until the first
  click and then offers no way back.
- **Below `breakpoints.md` (960px, D31):** the top bar keeps the mark and a search button. A bar fixed to the bottom of the
  viewport holds *Docs*, *Components* and *Menu*, each at least 48px tall, padded by
  `env(safe-area-inset-bottom)`; the page gets matching bottom padding.
- **Menu** opens a Psi `Dialog` with `placement="inline-end"`: the mode switch, then Storybook, Changelog (with the
  version), MCP, llms.txt and GitHub. The mocks drew a bottom sheet; `Dialog` has no bottom placement, and A uses
  what Psi has rather than site-only CSS (see *Gaps found*).
- **Shared with the docs.** `Header` is the docs' header too, so the bottom bar and the drawer appear there. On
  phones the docs' sidebar toggle becomes the drawer's first item.
- **Search** reuses the docs' `SearchDialog` and Pagefind index (D121); there is no second search.
- **Footer:** Docs, Components, Storybook, MCP, llms.txt, Changelog, GitHub; then "© 2026 handamade · MIT license" and
  "Psi v<version> · this site is built with Psi". The quick start goes: installation is a docs guide.

### Sections

No numbered eyebrows, no stat chips, no grid of equal cards. Values written `<like this>` below are generated at build (see *Data, at build time*), never typed. The page uses Psi's two breakpoints (D31) and no others. Each section is a heading, one sentence of lede, its
content, and a link into the docs.

1. **Hero.**
   - Headline: "Color isn't picked. It's *computed*." The word *computed* is set in Rubik Glitch, in the accent text
     colour, as one `<em>`; the rest is Rubik 700. A screen reader hears "computed".
   - Lede as today. Two buttons: *Get started* (accent, `/docs/get-started/installation/`) and *Browse components*
     (neutral-subtle, `/docs/components/`).
   - The stat chips are replaced by one mono line: `v<version> · <release date> · What changed →`, linking to
     `/docs/changelog/`.
   - The theme console stays as it works today (D57): a brief in, an AA-solved pair applied to the whole page, the
     Δ swatches, `copy customers/<name>.ts`, reset.
2. **One source, every surface.**
   - Lede: Docs, Storybook, Figma, the MCP server and llms.txt are generated from the same code and pass the same
     gates; none is edited by hand.
   - **The map**, a vertical SVG rendered by Astro: *Source* (`packages/react/src` with the component count,
     `packages/tokens/src`) → *Build gates* (WCAG AA across the themes, token scopes, slot contracts, visual
     regression at 0 px) → *Build output* (manifest, guidance, resolved JSON, CSS, docs markdown) → two columns,
     *For people* (Docs, Storybook, Figma, and Paper · Pencil drawn dashed as project C) and *For agents* (MCP,
     llms.txt, Markdown). Each box links to its surface.
   - **The trace**, an island: pick a component (Button, Field, Table) or a token (`--psi-fg-accent`), then a surface
     tab: Code, Docs, Storybook, Figma, MCP, llms.txt, Markdown. The tab shows that thing's real excerpt from that
     surface. Choosing a box on the map selects its tab, and the path from Source to that box is drawn in the accent
     colour with a flowing dash.
   - **The MCP tab shows `check`**, not `get`: since D129, `get` returns exactly the page's markdown, which the
     Markdown tab already shows. The excerpt is a real `check` of `<Button variant="primary">` and its answer.
   - **Below `breakpoints.md` (960px):** a *Map | Trace* `SegmentedControl` shows one view at a time, *Map* first; choosing a
     box on the map switches to *Trace* on that surface.
   - Closing line: counts and excerpts are read from the build, so they cannot drift; *Using Psi with AI →*.
3. **Built only from Psi.**
   - **Canopy**, a greenhouse monitor, replaces the mocks' first idea (an invoices ledger). An `AppShell` with a
     `NavBar`, a `NavTree` (*Zones* with a `Count`, *Alerts* with an attention `Count`), a `PageHeading` and a
     sub-line, a `Toolbar` (`Input`, `Select`, accent `Button`), and a `TableContainer` with a `Table` of zones: name,
     status `Tag` (Healthy, Dry, Offline), moisture and temperature in tabular numerals, and a watering `Switch` per
     zone. Turning a switch shows a `Toast`.
   - **It adapts to its own width**, through a container query, not the viewport: below 560px of its own width (the value of `breakpoints.sm`, written as a literal as D31 asks) the rows become a list,
     and the navigation opens as a `Dialog` drawer (`placement="inline-start"`) from a menu button.
   - A `SegmentedControl` above it switches *Preview | Code* at every width; a second one switches its theme:
     light, dark, acme, ember. Canopy also follows a theme the hero's console derives.
   - The Code view is Canopy's own source file. Each component name in it links to its docs page.
   - Below it, one link: *All <N> components →*.
4. **How it's built.** The four rules as a list with hairline dividers, each a heading, one sentence, a code sample
   where it helps, and a link to the guide that explains it:
   - Colors are formulas, not swatches → Theming
   - Names say the pixels → Sizes and variants
   - Variants say what they are → Sizes and variants
   - Contrast is a gate → Dark mode

   Then one line: "<N> decisions so far, each written down with its reasons." The link to a Process page arrives
   with project B.

### What happens to today's sections

| Today | After |
| --- | --- |
| Hero | Stays, as above |
| 01 Principles | Becomes *How it's built* |
| 02 Components (playground) | Removed; Canopy takes its place |
| 03 Theming | Removed until a Themes page; Canopy's theme switch keeps a small version |
| 04 Pipeline | Replaced by *One source, every surface* |
| 05 Agents | Its three install methods move into the *Using Psi with AI* guide |
| 06 Roadmap | Removed |
| 07 Updates | Moves to `/docs/changelog/` |
| Footer quick start | Removed |

`Principles.tsx`, `Pipeline.tsx`, `AgentReady.tsx`, `Roadmap.tsx`, `Updates.tsx`, `Theming.tsx` and `Playground.tsx`
are deleted. Their history stays in git for the Themes and Playground pages.

### Type

- **Rubik** (variable) for text and headings, **Rubik Glitch** for the one word, **IBM Plex Mono** for code.
- **Self-hosted** from `@fontsource-variable/rubik`, `@fontsource/rubik-glitch` and `@fontsource/ibm-plex-mono`
  (OFL-1.1). No request leaves the site for fonts.
- **The site sets three Psi tokens at its root:** `--psi-font-sans` and `--psi-font-display` to Rubik,
  `--psi-font-mono` to Plex Mono, each with the system stack as its fallback. Psi does not change: D29 makes font
  roles brand-level and leaves loading to the consumer. The docs pages share the root and take the same type.
- `font-display: swap`. If Rubik Glitch fails, *computed* renders in Rubik 700.

### Architecture

Astro sections render to HTML. Four islands:

| Island | Hydration | Holds |
| --- | --- | --- |
| Site chrome | `client:load` | The mode switch, search, the bottom bar's Menu and its drawer |
| Theme console | `client:load` | As today |
| Trace | `client:visible` | Component and surface selection, the map highlight, *Map / Trace* on phones |
| Canopy | `client:visible` | The demo, *Preview / Code*, its theme switch, switches and toasts |

- **Islands share state only through `<html>` and events.** The mode and a derived brand live on `<html>`
  (`data-psi-theme` and the custom properties `useBrand` writes), and `theme.ts` carries them through attributes and
  `storage` events. The mode control also fires a `MODE_EVENT` that every mode hook listens to. No island passes
  state to another directly.
- **The trace island renders the map's SVG itself.** The island is server-rendered, so with no JavaScript the map
  still shows every surface and link; the highlight is added by class.

### Data, at build time

- **`traceFor(name)`** in `packages/docs` (beside the D129 builders) returns, for a component or a token, one excerpt
  per surface:
  - Code: the import line and the first docs example.
  - Docs: the props table rows from `manifest.json`, and the page URL.
  - Storybook: the story `title` and exported story names, read from the component's `*.stories.tsx`, and the URL
    built from them. Not from `storybook-static/index.json`: `pnpm build` runs workspaces in dependency order, and
    the site does not depend on Storybook, so that file may not exist yet when the site builds. `test:site` already
    reads `index.json` after both builds, and checks that every trace URL names a story it lists.
  - Figma: the semantic tokens the component's `*.vars.css` binds, written as the Figma variable names Psi Token
    Sync gives them (`fill/accent`), with one mode per theme, and the file's link as a constant. A token's own trace
    shows that one variable.
  - MCP: a `check` call and its result, run through the MCP package's `checkMarkdown` at build. `traceFor` returns
    every surface except this one: the excerpt is added in `apps/site/src/lib/trace-data.ts`, because
    `@handamade/psi-mcp` depends on `@handamade/psi-docs`.
  - llms.txt: the lines of `packages/react/llms.txt` that name the component; when none does, the *Rules for
    generated code* lines.
  - Markdown: the head of the component's generated `.md`, and its URL.
- **A missing input fails the build**, naming what is missing: a component with no story, no example or no manifest
  entry cannot reach the page quietly.
- **Canopy** is an example in `packages/docs`, framed by the homepage (see *Implementation notes*) and shown as
  source in its Code view, the way `ExampleTabs` reads an example.
- **Counts:** the component count from `virtual:psi-facts`, as today; the version and release date from the top entry
  of `updates.ts`; the decision count from the distinct `D<n>` numbers the specs record (see *Implementation notes*).
- **`updates.ts` stays where it is.** `tools/check-docs-drift.mjs` reads its first title for the version check, and
  `/docs/changelog/` renders it.

### Failure behaviour

| Case | Behaviour |
| --- | --- |
| No JavaScript | Every section is HTML. The trace shows Button on its Docs tab; Canopy shows its static preview; the mode follows the OS |
| `/api/theme` fails | As today: the local derivation stands, and the transcript says so |
| A trace input is missing at build | The build fails and names it |
| A font fails to load | The fallback stack. *computed* falls back to Rubik 700 |
| `prefers-reduced-motion` | The map's flowing dash stops; nothing else on the page moves |

## Gaps found

- **`Dialog` has no bottom-sheet placement.** The phone menu uses `placement="inline-end"` in A. A `block-end`
  placement goes to the private request register as a request; it is not built as site CSS.

## Testing

`test:site` (`apps/site/site-gate/`) is rewritten for the homepage:

- Without JavaScript: every section's heading and content, the default trace excerpt and Canopy's markup are in the
  HTML.
- axe in light and dark, at desktop width and at 375px; reflow at 320px with no horizontal scroll.
- The bottom bar: each target at least 48px; *Menu* opens the drawer; *Escape* closes it and returns focus to *Menu*.
  The same on a docs page, since the chrome is shared.
- Every homepage link resolves (the existing internal-link check), `/docs/changelog/` and its `.md` twin included.
- The header carries no fragment links.
- Every Storybook URL in the trace names a story in `storybook-static/index.json`.

Unit tests in `packages/docs` for `traceFor`: each surface for Button and for one token, and the build error when a
story is missing.

`vr` is not affected: the homepage is not in Storybook. No changeset: `apps/site` and `packages/docs` are private, as
with D121.

### Gates

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site
```

## Implementation notes

What differed from the text above, as built.

- **The MCP excerpt is built in the site**, in `apps/site/src/lib/trace-data.ts`, not in `packages/docs`
  (`@handamade/psi-mcp` depends on `@handamade/psi-docs`). `astro.config.ts` externalises `@handamade/psi-mcp` for
  the prerender environment so `loadIndex()` finds its `dist/psi-index.json`.
- **A token's MCP tab shows `theme`, not `check`.** For `--psi-fg-accent` it shows `theme({ hue: 260 })` with its AA
  claim and the solved `--psi-fg-accent` in light and dark, because `check` has nothing to say about a token. The
  components keep `check`.
- **The trace island renders the map's SVG itself**, server-rendered, not a separate Astro component.
- **Canopy is shown in an iframe** (the owner's ruling): `/docs/examples/showcase/canopy/?theme=<name>`. Its
  `AppShell` brings its own `<main>` and `<header>`, which would nest inside the page's. Light and dark follow a
  derived brand through `storage` events; acme and ember don't take it.
- **The mode control shares state across islands** through a `MODE_EVENT` that every mode hook listens to.
- **The font override skips ember** (`:root:not([data-psi-theme="ember"])`), so ember keeps its own type in the
  Canopy frame.
- **The decision count** reads every way the specs record a decision: `## Decisions` sections, decision-log tables
  and items, and `## ... (D<n>)` headings. D74 is the one number never claimed.
- **Docs pages on a phone:** `main` gets bottom padding so content clears the fixed bar.
- **The internal-link gate exempts `/storybook/`, `/llms.txt` and `/packages/`**, which `tools/assemble-site.mjs`
  adds after the site build.

## Out of scope

- A Themes page and a Playground page.
- Glitch animation and shader effects on the homepage. The owner wants to return to them once the content is done.
- Project B: governance and process pages (the decision log, how a change gets in, release cadence, scope), which
  also replace the Roadmap.
- Project C: links between surfaces on every component and token page, Paper and Pencil sync, and the Figma file
  published as a Community resource.
- A bottom-sheet `Dialog` placement (see *Gaps found*).

## Follow-ups

- Register the bottom-sheet placement as a request.
- Design the Themes and Playground pages, each with its own number, and put them back in the header.
- The glitch-motion idea, after the content ships.
