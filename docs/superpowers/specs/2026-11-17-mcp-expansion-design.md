# An MCP that answers like the docs, checks JSX, and makes a theme (D129)

Date: 2026-11-17. Status: **Implemented** on branch `d129-mcp-expansion`.

Provenance: the second of the three site projects the owner set out in D121 — a
demo homepage, a real docs section, and "a fully capable MCP". D121 built the
docs and deferred four MCP items to their own spec. They are this spec.

The number is the first free `## Decisions` entry when this branch started.
D126 and D128 are on `main`; D127 is claimed by the branch
`d127-pagination-fixes`. A search of every branch and every worktree found no
D129. **Check again when the PR opens** — numbers in
this repo collide late.

## What's there today

Measured on `origin/main` at `dc25cd4`.

- **Two read-only tools.** `@handamade/psi-mcp` serves `search(query)` and
  `get(id)` over one index baked at publish time from `manifest.json`,
  `guidance.json`, `resolved/<theme>.json`, `patterns.json` and the generated
  per-export docs. The same server runs on stdio (`npx @handamade/psi-mcp`)
  and as a stateless Streamable HTTP function at `https://psi.kurkin.de/mcp`.
  Its runtime dependencies are `@modelcontextprotocol/sdk` and `zod`.
- **`get` returns JSON.** A component's detail is its manifest entry plus the
  full generated doc as a string; a token is its formula and values; a pattern
  is its recipe; a topic is a guidance object.
- **D43 drew a line:** "Psi's MCP documents the system; it does not write code."
- **The docs site says more than the MCP.** Every docs page has a markdown twin
  at its URL plus `.md` (D121). A component page's twin carries the page's
  live example code under `## Examples`, every member's props, keyboard and
  theming sections, and the rules — and the MCP has none of the examples. The
  twins are built by `apps/site/src/lib/markdown.ts`, which reads files and a
  Vite virtual module, from sources that live only in `apps/site`: 40 examples
  in 37 folders, 37 component pages, 6 token pages, 5 guides.
- **A theme generator exists and needs no model.**
  `@handamade/psi-tokens/generate` (published) turns a `BrandVector` — hue,
  chroma word, mode, radius, name — into a light and dark pair with an AA
  solver (`deriveTheme`), and each member carries `customProperties`. The
  homepage's `/api/theme` uses Claude only to turn a free-text brief into that
  vector.
- **Nothing checks an agent's JSX.** An agent that writes `size="md"` or
  `variant="primary"` finds out from a type error, if it type-checks at all.
- **The data a checker needs is half there.** `manifest.json` lists each
  export's declared props with literal unions, defaults and `required`, and
  20 `slots.json` files carry the D45 slot contracts. Two things are missing:
  which HTML element's attributes a component passes through (Button
  `extends ButtonHTMLAttributes`, so `onClick` is valid but is not in the
  manifest), and which components need an accessible name — `a11y-meta.ts`
  says so only in prose, three times ("Requires an accessible name — pass
  aria-label").

## Decisions

### D129 — the MCP answers with the docs' own markdown, and gains `theme` and `check`

The tool surface becomes four tools. Each returns text and none has side
effects:

| Tool | Status | Returns |
|---|---|---|
| `search(query)` | unchanged contract, two new kinds | compact briefs with ids |
| `get(id)` | **now markdown** for every kind | the docs page, byte-identical to the site |
| `theme(input)` | new | a theme's CSS, its contrast table, install lines |
| `check(code)` | new | findings on a JSX snippet |

**D43 is amended, not dropped.** The new line: *tools may return generated
code as text; they never write the consumer's files and never call a model* —
on stdio and hosted alike. A theme stylesheet and an example are returned for
the agent to place; a JSX check reports and never rewrites.

#### 1. One docs source, two readers

A new private workspace package, **`packages/docs`** (`@handamade/psi-docs`,
`"private": true`, never published), holds everything that defines what a docs
page says:

- `examples/<slug>/<name>.tsx` — the live examples, moved from
  `apps/site/src/examples` (with the registry's `FRAMED` set).
- `pages.ts` — the component page list (slug, title, members), the token page
  list (slug, title, covers) and the guide order, moved from
  `component-pages.ts`, `token-pages.ts` and `docs-nav.ts`.
- `guides/*.mdx` — the five guides.
- `markdown.ts` — `componentPageMd`, `tokenPageMd`, `guideMd`, `overviewMd`,
  plus new `tokenMd`, `patternMd` and `topicMd`, rewritten as **pure functions
  over one input object** (manifest, generated docs, guidance, resolved
  themes, patterns, facts, example sources). They read no files and import no
  virtual module.

The two readers:

- **The site** imports pages, examples, guides and builders from
  `@handamade/psi-docs`. Its `.md` routes pass in data it already loads. The
  HTML pages do not change. The site's content collection points its glob
  loader at the package's `guides/` folder.
- **`psi-mcp`'s build-index** calls the same builders at publish time and bakes
  each page's markdown into the index. `@handamade/psi-docs` is a
  devDependency, like `psi-react` and `psi-tokens` already are, so the
  published package gains no docs dependency and still answers offline, from
  the version installed.

Why not `psi-mcp` itself: the examples are React components the site renders
live; they do not belong in a published server package, and the site should
not import from an MCP server to draw its pages. Why not bake from
`apps/site/dist` or fetch the live site at runtime: the first makes a
published package depend on a private app's build output and reverses the
build order; the second makes a local install answer from whatever is deployed
rather than the version installed, and fail offline.

`tools/publish.mjs` publishes only public packages; the plan verifies it skips
a `"private": true` folder under `packages/` (it skipped non-packages since
#168).

#### 2. `get(id)` returns markdown

| Id | Returns |
|---|---|
| `component:TableRow` or bare `TableRow` | the whole page that holds the export (`table`), equal to `/docs/components/table.md` — examples, members' props, keyboard, theming, rules |
| `tokens:color` (new kind) | a token page, equal to `/docs/tokens/color.md` |
| `guide:theming` (new kind) | a guide, equal to `/docs/get-started/theming.md` |
| `token:bgPrimary` | one token: its formula and its value in the four themes, as markdown |
| `pattern:<id>`, `topic:<name>` | today's content, rendered as markdown by `patternMd` / `topicMd` |

`patternMd` lives in `psi-docs` so the deferred pattern pages reuse it.
Ids keep today's forms; a bare name resolves as today, with guides and token
pages added to the lookup. The largest page (Toast) is about 20.5k characters;
`get` keeps no budget, as today.

`search` gains the `guide` and `tokens` kinds: a keyword query returns their
briefs like any other. Its 6,000-character response budget stays. The
empty-query overview measured 5,813 characters at `dc25cd4` with only the
8-component floor, so one brief per guide and token page (about 1,700
characters) would break the D61 envelope. Instead, the overview gains **one
index row per new kind** — `guide:*` listing the five guide names and
`tokens:*` listing the six page names — charged as fixed cost like the topics.
The budget tests cover both rows.

#### 3. `theme(input)`

Input (zod-validated): exactly one of `color` — a hex (`#3b82f6`) or an
`oklch(…)` string — or `hue` (0–359). Optional: `chroma`
(`muted | calm | balanced | vivid | electric`), `radius` (`4 | 6 | 8 | 12`),
`name` (kebab-case; default `brand-<hue>`, e.g. `brand-264`).

- A `color` is reduced to a `BrandVector`: its OKLCH hue, and the nearest
  chroma word unless `chroma` is given. Then `deriveTheme` and its AA solver
  run unchanged — the same path the homepage generator takes after the model
  step.
- Output is markdown with three parts: **CSS** — two rules in the layers
  `emit/css.ts` uses for built-in themes: `[data-psi-theme="<name>"]` for the
  light member and `[data-psi-theme="<name>-dark"]` for the dark one, each
  with its custom properties and its `color-scheme` (D116), plus any
  component-token overrides the derivation produces (D34); a **contrast
  table** — each gated pair and its ratio in both members; **install lines** —
  the five stylesheets plus this file, imported after `light.css`, and the
  `data-psi-theme` attribute to set.
- No model call. The tool description tells the calling agent to choose the
  inputs itself when it starts from a brief ("calm fintech").
- `@handamade/psi-tokens` becomes a **runtime** dependency of `psi-mcp` at the
  lockstep version (`./generate` is already an export; its one dependency is
  `culori`).

#### 4. `check(code)`

**Parsing.** `@babel/parser` with the `jsx` and `typescript` plugins, a new
runtime dependency — pure JavaScript with no dependencies of its own, chosen
over native or WASM parsers because the hosted function runs on Vercel, where
a WASM runtime import has already failed a build (D121). Input is a module or
a bare JSX fragment, at most 20,000 characters.

**What is a Psi element.** If the code imports from `@handamade/psi-react`,
only those names (aliases followed) are checked. With no import, a
capitalized name that matches an export is checked; any other capitalized
name is listed as *not checked*, never as an error — it is probably the
user's own component.

**Rules** (all errors):

| Rule | Example |
|---|---|
| `unknown-export` | `import { Modal }` → nearest export (`Dialog`) |
| `unknown-prop` | `<Button color="…">` → nearest prop |
| `invalid-value` | `size="md"`, `variant="primary"` → the valid literals |
| `missing-required` | a required prop is absent |
| `slot` | a child a slot does not accept, or a wrong count (D45 contracts) |
| `accessible-name` | `<TabList>` with no `aria-label` |

Nearest means smallest edit distance, offered only under a threshold so a
wild guess is not suggested.

**Two new manifest fields**, emitted by `packages/react`'s manifest script:

- **`attributes`** — the React attributes interface a component passes
  through, read from its props interface (`extends ButtonHTMLAttributes<…>` →
  `ButtonHTMLAttributes`; `null` when none). The exact attribute names for each
  interface are written to `dist/attributes.json`, from `@types/react` at build
  time, and the index build reads them from there, so
  `onClick` on a Button is not an `unknown-prop`. `aria-*`, `data-*`, `key`
  and `ref` are always allowed.
- **`accessibleName`** — a machine-readable rule per component that needs a
  name, e.g. `{ oneOf: ["aria-label", "aria-labelledby"] }`, authored beside
  the prose in `a11y-meta.ts`. A test fails when a note says "requires an
  accessible name" and no rule exists.

**Output** is markdown: one line per finding — `line:col  rule  message` —
then a summary of what was checked and what was skipped. Spread props
(`{...rest}`) and non-literal values cannot be judged; they are listed as
skipped, never guessed. `missing-required` is skipped on an element with a
spread.

The check does not type-check, rewrite code, or judge house rules (one accent
per group, `danger` only for destructive actions, hardcoded colours).

#### 5. Errors

- `get` with an unknown id → `isError`, as today, plus the three nearest ids.
- `theme` with an unparseable colour, a hue out of range, both `color` and
  `hue`, or an off-scale radius → `isError` naming what is accepted. If the
  solver cannot reach AA for a pair → `isError` naming the pair; the tool never
  returns a theme that fails the gate.
- `check` with a parse error → not `isError`: one `parse` finding at its line
  and column, so the agent can fix the snippet. Over 20,000 characters →
  `isError`.

## File map

- **New** `packages/docs/` — `package.json` (private), `examples/`,
  `guides/`, `pages.ts`, `markdown.ts`, `__tests__/`.
- **Moved out of** `apps/site/src/` — `examples/`, `content/guides/`,
  `content/component-pages.ts`, `content/token-pages.ts`, the page order in
  `content/docs-nav.ts`, and `lib/markdown.ts` (its builders become pure). The
  site's pages, routes and `.md` twins import from `@handamade/psi-docs`.
- `packages/mcp/` — `scripts/build-index.ts` (bake markdown, attribute sets),
  `src/types.ts` (index shape), `src/store.ts` (markdown `get`, new kinds),
  `src/server.ts` (four tools), new `src/theme.ts`, new `src/check.ts`,
  `src/init.ts` (AGENTS.md names the tools), `package.json` (runtime deps
  `@handamade/psi-tokens`, `@babel/parser`; devDep `@handamade/psi-docs`),
  `README.md`, `llms.txt`.
- `packages/react/` — `src/a11y-meta.ts` (`accessibleName`), the manifest
  script (`attributes`, `accessibleName`).
- `apps/site/site-gate/` — the parity test.
- Prose that says "two tools" or "search/get": `packages/mcp/README.md`,
  `packages/mcp/llms.txt`, the AI guide, root `llms.txt`, `CLAUDE.md`'s trail
  line, `packages/react/llms.txt` if it says so.
- `vitest.workspace.ts`, `pnpm-workspace.yaml` as needed for the new package.
- A changeset: minor, stating that **`get` now returns markdown instead of
  JSON**.

## Verification

All five gates, in this order:

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site
```

`vr` runs in CI only; Storybook is untouched, so no baseline should move.

- **`packages/docs`** — the site's builder tests move here and run against the
  pure functions with fixture input.
- **Parity, in `test:site`** — for every docs page, the built `.md` twin
  equals the MCP's `get` output from the baked index. `test:site` already
  reads built artifacts from the repo root, so this adds no build order.
- **`theme`** — a known hex gives the expected vector; every gated pair in the
  output meets its threshold in both members; the same vector gives the same
  values as `deriveTheme` called directly; each invalid input is rejected.
- **`check`** — a fixture table per rule, and false-positive guards:
  `onClick` on Button, `aria-*` and `data-*`, a user's own `<Card>`, a spread,
  an expression value, a parse error. A coverage test ties `accessibleName`
  rules to the a11y-meta prose; a test covers `attributes` extraction for a
  component that extends HTML attributes and one that does not.
- **Server and HTTP** — four tools listed; each called over Streamable HTTP
  through `createMcpHandler`; `init`'s AGENTS.md names all four.
- **After publish** — `pnpm verify:published <version>` installs the real
  `psi-mcp` tarball, which now has `psi-tokens` and `@babel/parser` as runtime
  dependencies; the plan adds a smoke call of `theme` and `check` against the
  installed package to that script.

## Out of scope

- Writing files, on stdio or hosted.
- Calling a model from any tool.
- House-rule linting in `check`.
- MCP resources and prompts.
- Auth or rate limits on `/mcp` (the tools are CPU-only and input-capped).
- Pattern docs pages — `patternMd` is their seed only.
- The homepage demo, the third site project, with its own spec.
