# Market comparison: Psi vs UI SDK (Vercel Labs)

Date: 2026-11-20. Sources: ui-sdk.dev (home, `/llms.txt`, the Core, Agents, Guides and React `llms.txt` bundles, `web.md`, `web.css`), the `vercel-labs/ui` GitHub repo (README, `size-budget.json`, contributors, open issues), and npm. Psi facts from this repo at 0.38.0. Vendor claims are marked as claims; the benchmark numbers are theirs, not reproduced here.

## TL;DR

UI SDK is **not a design system and not a direct Psi competitor**. It is a **headless behavior layer**: a framework-free TypeScript core of 50+ interaction "behaviors" (roving focus, typeahead, popups, selection, drag and drop, resize, virtualization) plus 56 **unstyled** components rendered by adapters for React, Vue, Svelte, Solid and Web Components. It sits in the Radix / Ark / React Aria lane, one layer *below* Psi.

Two things make it matter to Psi:

1. **Its runtime agent bridge is genuinely new.** `createAgent()` lets an agent read component state and call component actions directly (no screenshots, no accessibility-tree clicking), with an `allow` permission callback, `data-agent-confirm` marks for actions that need a person, undo history, and WebMCP registration. Psi's agent story is entirely design-time (MCP search/get/theme/check). Psi has nothing for an agent *operating* a Psi UI.
2. **It covers most of Psi's remaining component gaps.** Accordion, Popover, Date Picker, Progress, Meter, Avatar, Slider and Tree are all in UI SDK; all are open rows in Psi's 2026-10-29 gap analysis.

It is also **shadcn's project**: 566 of 682 commits are his, with Benjamin Canac (Nuxt UI) and Shu Ding (Vercel) behind him. Its optional `web.css` already uses shadcn-shaped tokens (`--ui-background`, `--ui-primary`, `--ui-destructive`, OKLCH neutrals). Inference, not stated anywhere: this is likely to become the behavior substrate under a future shadcn/ui, which would put it in front of most React teams.

**Recommendation:** watch the core, don't build on it yet (beta, open license question, size). Do two cheap things now: (a) a **Psi theme for UI SDK**, mapping `--ui-*` onto `--psi-*` so UI SDK's components pick up Psi's contrast-gated themes; (b) a spec for a **runtime agent contract** in Psi, borrowing the `agent: { actions }` key and `data-agent-confirm` ideas, tied to Psi's existing `danger` rule.

---

## What UI SDK is

| | |
|---|---|
| Tagline | "A library of behaviors for agents to build the next generation of user interfaces." |
| Owner | Vercel Labs (`vercel-labs/ui`), Apache-2.0 |
| Launched | Repo created 2026-10-26; public launch and npm 2026-11-12 |
| Version | `0.1.0-beta.13` for all six packages (8 days of betas); covered by Vercel's Public Beta Agreement (an open issue asks whether that applies to the npm packages) |
| Traction | 6.2k stars, 215 forks, 69 open issues at day 8 |
| Packages | `@ui-sdk/core` (behaviors, utilities, testing) + `react`, `vue`, `svelte`, `solid`, `web` adapters. React adapter needs React 19 |
| Contributors | shadcn 566 commits, benjamincanac 66, shuding 37 |

### The model

- **Behaviors** (`createRovingFocus`, `createTypeahead`, `createPopup`, `createSelection`, `createReorder`, `createResize`, `createViewport`, `createVirtualizer`, `createLasso`, `createCellRange`, `createSpans`, `createTreeReorder`, ...). Each one owns an interaction plus its ARIA and screen-reader announcements.
- **Primitives** via `definePrimitive({ name, state, api, slots, agent })`: state plus API plus parts. Behaviors compose inside `api`.
- **Adapters** via `createParts(primitive, { trigger: "button", ... })`: the same primitive renders in all five frameworks.
- **Styling** is entirely the consumer's: every part has `data-slot="<primitive>-<slot>"`, state shows up as `data-*` / ARIA attributes, continuous values as CSS variables (`--volume`). The `@ui-sdk/web` path ships an optional `web.css` "default look" built on `--ui-*` custom properties (shadcn naming, OKLCH neutrals).
- **Utilities**: text (fuzzy match, locale), numbers, dates, **colors** (parse/convert any CSS color incl. OKLCH, gamut mapping, contrast), images, storage, platform, mobile, and `createPreference` / `createColorScheme` for theme and density preferences.
- **Testing kit** (`@ui-sdk/core/testing`): `checkPattern(root, "tabs")` checks roles, names, states, part references and keyboard against 15 APG patterns, deliberately stricter than APG (requires Home/End, named tablists, `aria-modal`). Plus `mount` for testing primitives and server-output checks.

### Components (56, unstyled)

Accordion, Alert Dialog, Autocomplete, Avatar, Button, Calendar, Carousel, Checkbox, Collapsible, Color Picker, Combobox, Command, Date Input, Date Picker, Dialog, Drawer, Field, File Input, Hover Card, Image Cropper, Input, Label, Listbox, Menu, Menubar, Meter, Navigation Menu, Number Input, OTP Input, Pagination, Password Input, Popover, Preferences, Progress, Radio, Rating, Resizable, Scroll Area, Segmented Control, Select, Separator, Slider, Switch, Tabs, Textarea, Time Input, Timeline, Toast, Toggle, Token Input, Toolbar, Tooltip, Tree, Trigger Menu, Waterfall.

No table, no layout or app-shell components, no typography, no cards or surfaces. That whole half is left to the consumer.

### The agent story (two halves)

**Agents build components.** A `ui-sdk` skill (`npx skills add vercel-labs/ui --skill ui-sdk`, also shipped inside `@ui-sdk/core/skills/` so it matches the installed version), per-framework `llms.txt` bundles, and Markdown docs inside each package. The quick-start prompt writes a note into the consumer's `AGENTS.md`. This is the same shape as Psi's `psi-mcp init` and llms.txt trail.

**Agents use components (the new part).**
- `createAgent()` → `snapshot()` returns every component with `ref`, `component`, `label`, current value and `actions`; `act({ steps })` calls those actions through the component's own API; `query()` finds list items; `subscribe()` streams changes.
- Custom primitives opt in with `agent: { actions: ["rate"] }`. Without it the bridge guesses from method names (`setX`, `open`, `toggle`, `clear`).
- Changes flow through the normal change callbacks with `source: "agent"`, so the app can cancel them.
- **Permissions**: `allow({ component, label, action, args })` can approve, refuse, or return a Promise and ask the person (5-min timeout). `data-agent-confirm="Charges $20 to your card"` marks a control or subtree as needing a person; the snapshot carries the sentence, so the agent knows before trying.
- History and undo of the agent's changes, a server-side tool-declaration mode, and **WebMCP** registration so a browser's built-in agent can drive the page.

**Their benchmark (vendor claim).** One settings-screen task, Sonnet via Claude Code, medians of 3 runs. Agent bridge vs browser tools on Base UI / Ark UI (React): 7 vs 17 tool calls, 69.5k vs 291.7k tokens, 31 s vs 53 s, $0.044 vs $0.139. Similar 39–45 % time gains in Vue (vs Reka) and Svelte (vs Bits). They state the same UI SDK screen with browser tools costs about the same as the others, so the gain is the bridge, not the components. Runnable from `benchmarks/agent` in the repo.

---

## Comparison matrix

| Dimension | Psi 0.38.0 | UI SDK 0.1.0-beta.13 |
|---|---|---|
| Layer | Styled, themed design system | Headless behavior layer + unstyled components |
| Frameworks | React 19 | React 19, Vue, Svelte, Solid, Web Components (+ no-build `web.js`) |
| Components | 60 (incl. Table family, AppShell, NavBar/NavTree, Card, Panel, Stack, Text, PageHeading, DescriptionList, Banner, InlineAlert, Skeleton, Toast) | 56 unstyled, heavy on rich interaction (date/time, color, slider, tree, drawer, resizable, command, token input) |
| Custom-component story | Compose existing components; 24 patterns in `patterns.json` with generated presets | `definePrimitive` + 50+ behaviors; the core pitch |
| Styling | CSS Modules bound to `--psi-*` tokens; stylelint bans literals | Consumer-owned, via `data-slot` / `data-*` / CSS vars; optional `web.css` |
| Color model | OKLCH **formulas**, semantic tokens resolved per theme | None in the components; a color *utility* module (OKLCH parse/convert, gamut, contrast) for building color UIs |
| Themes / dark | 4 themes (light, dark, acme, ember) + brand overrides | `createColorScheme` preference + light/dark in `web.css`; no theme system |
| Contrast | **WCAG AA gate in the token build** (throws) | None; visual layer is the consumer's |
| Behavior a11y | Hand-rolled per component, axe tests, `a11y-meta` keyboard docs; some components lean on native (`Select` is native options, `Toolbar` deliberately has no roving tabindex) | Behaviors own focus/keys/ARIA/announcements; `checkPattern` for 15 APG patterns; SSR and RTL covered in the testing kit |
| Naming discipline | px sizes, flat variants, one-accent rule, `danger` only for destructive | Not opinionated (no sizes or variants at all) |
| Design-time agent tooling | llms.txt trail, `manifest.json`, `guidance.json`, resolved tokens, **MCP** (search, get, theme, **check**), `init` writes AGENTS.md, generation eval | llms.txt per framework, versioned docs in `node_modules`, **skill**, quick-start writes AGENTS.md |
| Runtime agent tooling | **None** | **Agent bridge** (snapshot/act/query/subscribe), permissions, confirm marks, undo, WebMCP |
| Validation of generated code | MCP `check` validates generated JSX against Psi's rules | `checkPattern` validates generated components' a11y behavior |
| Figma | Hand-built library, stamped to a version | None |
| Size (shipped JS) | Whole React lib: 118 KB raw, **30 KB gzip** (60 components) | `size-budget.json`: React Select 47.6k, Combobox 50.7k, Menu 41.4k, Tabs 18.3k (bytes; minified vs gzip not stated) |
| Runtime deps | Zero (peer: React, psi-tokens) | Adapter + `@ui-sdk/core` peer |
| Maturity | 0.38.0, five local gates + Linux-pinned VR, `verify:published` after every release | Beta, APIs may change, 69 open issues incl. focus and animation edge cases |
| License / backing | MIT, solo | Apache-2.0, Vercel + shadcn |

## Where Psi is ahead

- **The visual layer exists and is enforced.** Tokens, themes, contrast gate, naming rules. UI SDK hands all of that to the consumer, and an agent building on it is back to inventing colors and spacing. This is the exact gap Psi fills.
- **Validation of output against a system's rules.** Psi's MCP `check` and pattern presets that pass it (D143) have no counterpart: UI SDK checks a11y behavior, not whether the result matches a design system.
- **Composition guidance.** 24 patterns with clarifying parameters vs none.
- **App-level building blocks.** Table, AppShell, NavBar, NavTree, DescriptionList, Banner, PageHeading: UI SDK has none of these.
- **Weight.** Psi's entire React library gzips to about the size of one or two UI SDK components' budget entries (unit caveat above).
- **Release discipline and stability** at 0.38 vs a week-old beta.
- **Figma.**

## Where UI SDK is ahead

- **Runtime agent operation.** The bridge, permissions and confirm marks are a real capability Psi lacks, with a credible (if vendor-run) cost argument.
- **Interaction breadth and depth.** Date/time inputs, calendar, color picker, slider, tree, drawer, resizable, command palette, token input, virtualization, lasso and range selection. Psi's richest interactions (Menu, Combobox, Tabs) are hand-rolled one by one.
- **A way to build what isn't shipped.** Behaviors let an agent build a kanban board or icon picker with correct focus and ARIA. Psi has no equivalent; an agent wanting a new interactive component has to hand-roll it.
- **Executable a11y checks for consumers.** `checkPattern` is the executable version of what Psi's `a11y-meta` keyboard tables describe.
- **Multi-framework.**
- **Distribution.** Vercel + shadcn, 6k stars in its first week.

## Options for Psi

1. **Psi theme for UI SDK (cheap, recommended now).** Ship a small stylesheet that maps UI SDK's `--ui-*` properties onto Psi semantic tokens, so `web.css` users get Psi's contrast-gated themes. It is a distribution play in the same spirit as the v0 note in the July comparison, and it shows where Psi sits: on top of behavior layers, not against them. Risk is low: a CSS file plus a docs page. Needs its own decision number.
2. **Runtime agent contract (spec now, build later).** Borrow the two best ideas:
   - an `agent.actions` entry per component in `manifest.json` (Psi already has a `contracts` section), so an agent knows what each Psi component can do at runtime;
   - a confirm mark tied to Psi's existing rule that `danger` is only for destructive actions. Every `danger` Button and `danger` MenuItem is by definition something an agent should not press unasked. Psi can make that machine-readable for free.
   A full bridge like `createAgent` is a large build; a spec first decides whether Psi wants it or only the metadata.
3. **Executable a11y checks.** Turn `a11y-meta`'s keyboard tables into tests in the spirit of `checkPattern` (or run UI SDK's `checkPattern` against Psi's rendered Menu, Tabs, Combobox, RadioGroup as a dev-only test dependency, which would be a cheap independent audit).
4. **Build future interactive components on `@ui-sdk/core` (not yet).** It would close the Popover / Date Picker / Slider / Tree / Accordion gaps faster than hand-rolling. Against it today: beta churn, the open Public Beta Agreement question, Psi's zero-runtime-deps stance, and size (one UI SDK Select is in the range of Psi's whole bundle). Revisit when it reaches 1.0 or when Psi starts its first of those components. A one-component spike (Popover or Date Picker) would answer the size and styling questions.
5. **Ignore.** Defensible for the components, not for the agent-runtime idea: if shadcn/ui adopts it, "agents can operate the UI" becomes an expected feature.

## Watchlist

- Whether shadcn/ui moves onto `@ui-sdk/core`.
- 1.0 and a clear license answer for the npm packages (Apache-2.0 repo vs Beta Agreement).
- WebMCP browser support, which decides whether the runtime bridge matters outside custom agents.
- Whether `web.css` grows into a real theme system, which would make it a Psi competitor at the token layer.

## Sources

- https://ui-sdk.dev/ and https://ui-sdk.dev/llms.txt
- https://ui-sdk.dev/docs (Get Started), `/docs/core/llms.txt`, `/docs/agents/llms.txt` (incl. Benchmark, Agent Key, Permissions), `/docs/guides/llms.txt`, `/docs/react/llms.txt`, `/docs/react/components`, `/docs/core/changelog`
- https://ui-sdk.dev/web.md and https://ui-sdk.dev/web.css
- https://github.com/vercel-labs/ui: README, `size-budget.json`, contributors, open issues (2026-11-20)
- npm: `@ui-sdk/{core,react,vue,svelte,solid,web}` at 0.1.0-beta.13
- Psi: `packages/react/dist/manifest.json`, `packages/react/llms.txt`, `packages/react/src/a11y-meta.ts`, `docs/research/2026-10-29-component-gap-analysis.md`
