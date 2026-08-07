# D74 Public Site Cycle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `apps/promo` true and well-built, and gate both properties so neither can rot again.

**Architecture:** Every number the site states is derived from `manifest.json` / `package.json` through a Vite virtual module, so typing a count becomes impossible. Two new gates back that up: `check-docs-drift` learns the promo app, and a headless-Chromium Playwright project asserts zero axe violations and zero horizontal overflow at three widths. Craft fixes land only after the gate that proves them is red.

**Tech Stack:** React 19, Vite 6, plain CSS over `--psi-*` tokens, Playwright 1.61 (headless Chromium, **no screenshots** — this project is not `vr` and must run locally), axe-core 4.12, vitest 3.2, changesets.

## Global Constraints

- Node 24 (`.nvmrc`). Run `node -v` before the first pnpm command; `nvm use` if it reports 20.
- **Verify with all four gates:** `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint`. `check-docs-drift` is a separate CI step and is *not* part of build/test/lint.
- **`pnpm vr` is CI-only.** This cycle adds no stories; if `vr` moves, something unintended changed. Never run it locally.
- Never hardcode colors in CSS — bind `var(--psi-*)`. The custom stylelint plugin enforces this.
- Sizes are px numbers (`24 | 32 | 40 | 48`), never S/M/L. Variants are flat: `accent | accent-subtle | neutral | neutral-subtle | ghost | danger | danger-subtle | outline`.
- Consumers import **five** stylesheets: `base.css`, one theme css, `components.css`, `utilities.css`, plus `@handamade/psi-react/styles`.
- Branch is `d74-promo-site` in the worktree at `.claude/worktrees/d73-promo-site/`. All commands run from the worktree root.
- **Out of scope, do not drift into it:** adding `fgTertiary` to `contrast-matrix.ts`; the D75 preset render gate; the Figma parity question; any art-direction change.

## Prerequisite (blocks Task 5 onward)

`preview_start` reads the **shared** repo's `.claude/launch.json`, so the worktree needs an absolute-path entry there before any browser verification. Dmitry runs this once:

```bash
cd /Users/dmytrokurkin/Projects/dku/ds && node -e 'const f=".claude/launch.json",fs=require("fs"),j=JSON.parse(fs.readFileSync(f));const w="/Users/dmytrokurkin/Projects/dku/ds/.claude/worktrees/d73-promo-site";j.configurations.push({name:"promo-wt",runtimeExecutable:w+"/apps/promo/node_modules/.bin/vite",runtimeArgs:[w+"/apps/promo","--port","5174","--strictPort"],port:5174});fs.writeFileSync(f,JSON.stringify(j,null,2)+"\n");console.log("added promo-wt")'
```

Tasks 1–4 and 9 do not need it. Task 5's Playwright project starts its own server and does not need it either — it is only for interactive inspection.

## File Structure

| File | Responsibility |
|---|---|
| `packages/react/scripts/emit-manifest.ts` (modify) | Emit `icons: string[]` beside `components` |
| `packages/react/scripts/emit-manifest.test.ts` (create) | Assert the icon roster is present, sorted, and matches disk |
| `apps/promo/vite-plugin-psi-facts.ts` (create) | `virtual:psi-facts` — counts and names read from the generated artifacts at config time |
| `apps/promo/src/virtual-psi-facts.d.ts` (create) | Ambient types for the virtual module |
| `apps/promo/vite.config.ts` (modify) | Register the plugin |
| `apps/promo/src/sections/{Hero,Playground,Roadmap}.tsx` (modify) | Consume facts instead of literals |
| `apps/promo/src/content/updates.ts` (modify) | Feed entries for 0.9.0 → 0.14.1 |
| `apps/promo/src/promo.css` (modify) | Contrast, overflow, measure, card stretch, scrim |
| `apps/promo/site-gate/playwright.config.ts` (create) | Headless project, own static webServer, no snapshots |
| `apps/promo/site-gate/site.spec.ts` (create) | axe + overflow assertions |
| `tools/check-docs-drift.mjs` (modify) | Learn `apps/promo` claims |
| `tools/assemble-site.mjs` (modify) | Copy the three `llms.txt` files into `site-dist` |
| `.github/workflows/ci.yml` (modify) | Run the site gate |
| `.changeset/*.md` (create) | `minor` — `manifest.json` gains `icons` |

---

### Task 1: The icon roster becomes an artifact

**Files:**
- Modify: `packages/react/scripts/emit-manifest.ts:1-7, 153-157`
- Test: `packages/react/scripts/emit-manifest.test.ts` (create)

**Interfaces:**
- Produces: `dist/manifest.json` gains `icons: string[]` — sorted `Icon*` names, e.g. `["IconAlertCircle", …, "IconX"]`. Task 2 reads `manifest.icons.length`.

- [ ] **Step 1: Write the failing test**

Create `packages/react/scripts/emit-manifest.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(
  readFileSync(join(root, "dist", "manifest.json"), "utf8"),
) as { components: unknown[]; icons: string[] };

describe("manifest icon roster", () => {
  it("lists every Icon*.tsx in src/icons", () => {
    const onDisk = readdirSync(join(root, "src", "icons"))
      .filter((f) => f.startsWith("Icon") && f.endsWith(".tsx"))
      .map((f) => f.replace(/\.tsx$/, ""))
      .sort();
    expect(manifest.icons).toEqual(onDisk);
  });

  it("is sorted and non-empty", () => {
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.icons).toEqual([...manifest.icons].sort());
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run packages/react/scripts/emit-manifest.test.ts`
Expected: FAIL — `manifest.icons` is `undefined` (the current manifest has only `components`).

- [ ] **Step 3: Emit the roster**

In `packages/react/scripts/emit-manifest.ts`, extend the fs import on line 1 and the write on lines 153-157:

```ts
import { writeFileSync, mkdirSync, readdirSync } from "node:fs";
```

```ts
// The icon roster has no other machine-readable form: emit-patterns reads
// src/icons off disk and throws the list away, which is why "22 icons" could
// rot on the public site undetected while component counts at least had a
// source to check against (D74).
const icons = readdirSync(join(root, "src", "icons"))
  .filter((f) => f.startsWith("Icon") && f.endsWith(".tsx"))
  .map((f) => f.replace(/\.tsx$/, ""))
  .sort();

writeFileSync(
  join(root, "dist", "manifest.json"),
  JSON.stringify({ components: manifest, icons }, null, 2) + "\n",
);
console.log(
  `[react] wrote dist/manifest.json (${manifest.length} components, ${icons.length} icons)`,
);
```

- [ ] **Step 4: Rebuild and run the test**

Run: `pnpm --filter @handamade/psi-react build && pnpm exec vitest run packages/react/scripts/emit-manifest.test.ts`
Expected: PASS, 2 tests. Build log prints `34 components, 26 icons`.

- [ ] **Step 5: Confirm nothing else regressed**

Run: `pnpm build && pnpm test`
Expected: build green; 2113 + 2 tests pass. `manifest.json` is git-tracked output under `dist/` — confirm `git status` shows only the two source files plus expected dist churn.

- [ ] **Step 6: Commit**

```bash
git add packages/react/scripts/emit-manifest.ts packages/react/scripts/emit-manifest.test.ts
git commit -m "feat(react): manifest carries the icon roster (D74)"
```

---

### Task 2: `virtual:psi-facts`

The manifest is 57KB — too heavy to bundle into a marketing page. A virtual module computes the facts at config time and ships only the values.

**Files:**
- Create: `apps/promo/vite-plugin-psi-facts.ts`
- Create: `apps/promo/src/virtual-psi-facts.d.ts`
- Modify: `apps/promo/vite.config.ts`

**Interfaces:**
- Consumes: `manifest.icons` from Task 1.
- Produces: module `virtual:psi-facts` exporting `componentCount: number`, `iconCount: number`, `patternCount: number`, `version: string`, `componentNames: string[]`, `iconNames: string[]`. Tasks 3 and 4 import from it.

- [ ] **Step 1: Write the plugin**

Create `apps/promo/vite-plugin-psi-facts.ts`:

```ts
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Plugin } from "vite";

const require = createRequire(import.meta.url);

/**
 * Exposes the package's own generated artifacts to the site as `virtual:psi-facts`.
 *
 * D74: the site stated "18 components" for six releases because the numbers were
 * typed. They are now read from manifest.json at config time — a wrong count is
 * no longer expressible. Only the resolved values reach the bundle; the 57KB
 * manifest does not.
 */
export function psiFacts(): Plugin {
  const VIRTUAL = "virtual:psi-facts";
  const RESOLVED = "\0" + VIRTUAL;

  return {
    name: "psi-facts",
    resolveId: (id) => (id === VIRTUAL ? RESOLVED : null),
    load(id) {
      if (id !== RESOLVED) return null;

      const read = (spec: string) =>
        JSON.parse(readFileSync(require.resolve(spec), "utf8"));

      const manifest = read("@handamade/psi-react/manifest.json") as {
        components: { name: string }[];
        icons: string[];
      };
      const patterns = read("@handamade/psi-react/patterns.json") as {
        patterns: unknown[];
      };
      const pkg = read("@handamade/psi-react/package.json") as {
        version: string;
      };

      if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
        throw new Error(
          "psi-facts: manifest.json has no icon roster — rebuild @handamade/psi-react (D74 Task 1)",
        );
      }

      const facts = {
        componentCount: manifest.components.length,
        iconCount: manifest.icons.length,
        patternCount: patterns.patterns.length,
        version: pkg.version,
        componentNames: manifest.components.map((c) => c.name),
        iconNames: manifest.icons,
      };

      return Object.entries(facts)
        .map(([k, v]) => `export const ${k} = ${JSON.stringify(v)};`)
        .join("\n");
    },
  };
}
```

- [ ] **Step 2: Declare the module's types**

Create `apps/promo/src/virtual-psi-facts.d.ts`:

```ts
declare module "virtual:psi-facts" {
  export const componentCount: number;
  export const iconCount: number;
  export const patternCount: number;
  export const version: string;
  export const componentNames: string[];
  export const iconNames: string[];
}
```

- [ ] **Step 3: Register the plugin**

In `apps/promo/vite.config.ts`, import `psiFacts` from `./vite-plugin-psi-facts` and add `psiFacts()` to the `plugins` array after `react()`.

- [ ] **Step 4: Prove the values are real, not guessed**

Add a temporary probe to `apps/promo/src/main.tsx`:

```ts
import * as facts from "virtual:psi-facts";
console.log("[psi-facts]", facts.componentCount, facts.iconCount, facts.patternCount, facts.version);
```

Run: `pnpm --dir apps/promo build`
Expected: build succeeds. Then confirm the resolved numbers by grepping the bundle:

```bash
grep -o "34\|26\|13\|0\.14\.1" apps/promo/dist/assets/*.js | sort -u | head
```

Expected: the emitted values are 34 / 26 / 13 / `0.14.1`, matching `pnpm exec node -e "const m=require('./packages/react/dist/manifest.json');console.log(m.components.length,m.icons.length)"`.

- [ ] **Step 5: Remove the probe**

Delete the two probe lines from `main.tsx`. Re-run `pnpm --dir apps/promo build` and confirm it still succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/promo/vite-plugin-psi-facts.ts apps/promo/src/virtual-psi-facts.d.ts apps/promo/vite.config.ts
git commit -m "feat(promo): virtual:psi-facts derives every count from the manifest (D74)"
```

---

### Task 3: The site stops typing numbers, and the gate learns to check

This task is the fail-then-pass cycle the spec requires: wire the gate first, watch it reject the current site, then fix the site.

**Files:**
- Modify: `tools/check-docs-drift.mjs:17-25`
- Modify: `apps/promo/src/sections/Hero.tsx:4-10`
- Modify: `apps/promo/src/sections/Playground.tsx:35-44, 70, 293-319`
- Modify: `apps/promo/src/sections/Roadmap.tsx:4`

**Interfaces:**
- Consumes: `virtual:psi-facts` from Task 2.

- [ ] **Step 1: Teach the checker about the promo app**

In `tools/check-docs-drift.mjs`, after the `np` constant add the icon count, and extend `claims`:

```js
const ni = manifest.icons.length;
```

```js
const claims = [
  ["README.md", /(\d+) React 19 components/, nc],
  ["packages/react/README.md", /(\d+) React 19 components/, nc],
  ["packages/react/llms.txt", /(\d+) React 19 components/, nc],
  ["packages/mcp/README.md", /(\d+) React 19 components/, nc],
  ["packages/react/llms.txt", /(\d+) composition patterns/, np],
  ["packages/mcp/README.md", /(\d+) composition patterns/, np],
  ["packages/mcp/llms.txt", /(\d+) composition patterns/, np],
  // D74: the public site is a prose artifact too. It stated "18 components"
  // across six releases precisely because nothing here looked at apps/promo.
  // These entries are belt-and-braces over virtual:psi-facts — the plugin makes
  // a wrong number inexpressible, and this makes a reintroduced literal fail CI.
  ["apps/promo/src/sections/Hero.tsx", /(\d+) components/, nc],
  ["apps/promo/src/sections/Hero.tsx", /(\d+) icons/, ni],
  ["apps/promo/src/sections/Roadmap.tsx", /(\d+) components/, nc],
  ["apps/promo/src/sections/Roadmap.tsx", /(\d+) icons/, ni],
];
```

- [ ] **Step 2: Run the gate and watch it reject the site**

Run: `node tools/check-docs-drift.mjs`
Expected: **exit 1**, with four `DRIFT:` lines — `Hero.tsx claims 18, expected 34`, `Hero.tsx claims 22, expected 26`, and the same pair for `Roadmap.tsx`. **Do not proceed until you have seen this output.** A check added and a check proven are not the same thing.

- [ ] **Step 3: Derive the hero stats**

In `apps/promo/src/sections/Hero.tsx`, replace the literal `STATS` array (lines 4-10):

```tsx
import { componentCount, iconCount } from "virtual:psi-facts";

const STATS = [
  `${componentCount} components`,
  `${iconCount} icons`,
  "4 themes",
  "0 runtime deps",
  "AA enforced at build",
];
```

- [ ] **Step 4: Derive the playground heading, filters and index**

In `apps/promo/src/sections/Playground.tsx`:

Add the import and replace `INITIAL_FILTERS` (line 44):

```tsx
import { componentCount, componentNames, version } from "virtual:psi-facts";

const INITIAL_FILTERS = ["psi-tokens", version, "wcag-aa"] as const;
```

Replace the heading on line 70:

```tsx
<h2>{componentCount} production components. All live — try them.</h2>
```

Replace the hand-typed Storybook index (lines 293-319) with the derived roster. Only top-level components get their own docs page, so filter the compound members out by their parent prefix:

```tsx
<p className="pg-index annot">
  Full docs in Storybook:{" "}
  {componentNames
    .filter((name) => !/^(Table.|Menu(Item|Separator)|Tab(List|Panel)?$|Toast(Region|Provider)|DescriptionItem)/.test(name))
    .map((name, index) => (
      <span key={name}>
        {index > 0 && " · "}
        <a href={storybookDocs(`Components/${name}`)}>{name}</a>
      </span>
    ))}
  {" · "}
  <a href={storybookDocs("Icons/Gallery")}>Icons</a>
  {" · "}
  <a href={storybookDocs("Tokens and Assets/Color Tokens")}>Tokens</a>
</p>
```

- [ ] **Step 5: Derive the roadmap's first row**

In `apps/promo/src/sections/Roadmap.tsx`, add the import and replace the first `SHIPPED` entry (line 4). The full `SHIPPED` rewrite is Task 4; this step only removes the two typed numbers:

```tsx
import { componentCount, iconCount, componentNames } from "virtual:psi-facts";
```

```tsx
[`${componentCount} components, ${iconCount} icons`, componentNames.join(", ")],
```

Note `SHIPPED` is `as const` — change it to a plain `const SHIPPED: ReadonlyArray<readonly [string, string]> = [...]` so the computed strings typecheck.

- [ ] **Step 6: Run the gate and watch it pass**

Run: `pnpm --dir apps/promo build && node tools/check-docs-drift.mjs`
Expected: build succeeds; drift check prints `docs drift check passed: 34 components, 13 patterns stated consistently` and exits 0.

Then confirm the rendered strings, not just the source:

```bash
grep -c "34 components" apps/promo/dist/assets/*.js
```
Expected: at least 1.

- [ ] **Step 7: Commit**

```bash
git add tools/check-docs-drift.mjs apps/promo/src/sections/Hero.tsx apps/promo/src/sections/Playground.tsx apps/promo/src/sections/Roadmap.tsx
git commit -m "feat(promo): counts derive from the manifest, and drift-check gates the site (D74)"
```

---

### Task 4: Six releases of content

**Files:**
- Modify: `apps/promo/src/content/updates.ts:16` (prepend entries)
- Modify: `apps/promo/src/sections/Roadmap.tsx` (`SHIPPED` tail, `NEXT`)
- Modify: `apps/promo/src/sections/Playground.tsx:184, 247, 238-242`
- Modify: `apps/promo/src/sections/Pipeline.tsx:6-7, 43-54`

- [ ] **Step 1: Publish the missing releases**

Prepend to `UPDATES` in `apps/promo/src/content/updates.ts`, newest first. Dates are the release commit dates; verify each with `git log --format='%ad %s' --date=short --grep='^release' -20`.

```ts
  {
    date: "2026-08-07",
    tag: "release",
    title: "0.14.1 — the manifest describes children",
    body: "Compound components now declare what nests inside them, and patterns can set aria-* on the elements they compose. The manifest is what agents read, so a prop it cannot describe is a prop that gets guessed.",
  },
  {
    date: "2026-08-07",
    tag: "components",
    title: "0.14.0 — DescriptionList, and patterns that render themselves",
    body: "DescriptionList/DescriptionItem give a detail drawer a real <dl> instead of a hand-rolled grid, and the composition presets became generated JSX rather than prose to copy. Plus IconMoreHorizontal, the ellipsis glyph a row-actions trigger wanted.",
  },
  {
    date: "2026-08-06",
    tag: "release",
    title: "0.13.0 — Tabs",
    body: "Roving keyboard, automatic activation, and a panel that stays associated with its tab. The fifth and last component the pattern catalog declared as a gap.",
  },
  {
    date: "2026-08-06",
    tag: "components",
    title: "0.12.0 — a drawer is a Dialog placement, not a component",
    body: "Dialog gains placement=\"center | inline-start | inline-end\". The inline values pin the panel full-height to that edge; modality, the focus trap, aria-modal, focus restore and the dismissal reasons are identical. Logical, so RTL flips for free — and there is no Drawer to import.",
  },
  {
    date: "2026-08-06",
    tag: "components",
    title: "0.11.0 — Toast",
    body: "Status messaging lands: variants route to the right live region, a visually-hidden prefix names the severity, and toasts carrying an action or an error stay until dismissed. Three new status glyphs come with it.",
  },
  {
    date: "2026-08-05",
    tag: "components",
    title: "0.10.0 — the Table family and Pagination",
    body: "Six compound components on native <table> semantics, controlled-only: sorting and selection are props, and the consumer owns the state. Pagination is standalone — a numbered pager with ellipsis truncation, not a Table feature.",
    link: { label: "Browse the Storybook", href: "/storybook/" },
  },
  {
    date: "2026-08-05",
    tag: "docs",
    title: "0.9.0 — the machine-readable surface widens",
    body: "The composition catalog reaches 13 patterns, each declaring the components it still lacks, and the MCP search overview now allocates its budget per kind so growth shortens summaries instead of dropping items.",
  },
```

- [ ] **Step 2: Bring the roadmap current**

In `apps/promo/src/sections/Roadmap.tsx`, append to `SHIPPED` after the existing D56 entry:

```tsx
  ["Table family + Pagination", "six compound components on native <table> semantics, controlled-only; a standalone numbered pager (D62–D63)"],
  ["Toast", "status messaging with severity-routed live regions and a visually-hidden prefix (D64–D65)"],
  ["Drawer as a placement", "Dialog placement=\"inline-start|inline-end\" — same modality, focus trap and dismissal reasons (D66)"],
  ["Tabs", "roving keyboard, automatic activation, panel association (D67)"],
  ["DescriptionList", "a real <dl> for detail views; the body of the detail-drawer pattern (D70)"],
  ["Self-rendering patterns", "presets are generated JSX, and the manifest describes compound children (D71–D73)"],
```

Replace `NEXT` — "Custom listbox Select" and "Tooltip on the Popover API" still stand; "Theme console" is still unstarted:

```tsx
const NEXT = [
  ["Theme console", "a prompt in, a real customers/<name>.ts out — Palette, SlotMap and control radius, applied live"],
  ["Custom listbox Select", "v1 ships a styled native <select>; a fully custom listbox is v2"],
  ["Tooltip on the Popover API", "native anchor positioning once support settles"],
] as const;
```

- [ ] **Step 3: De-version the playground card headings**

Version-stamped headings are a naming convention that guarantees rot. In `apps/promo/src/sections/Playground.tsx`:

- Line 184: `Panel + Toolbar · the 0.7 surface pair` → `Panel + Toolbar · the surface pair`
- Line 247: `Menu · the 0.8 overlay tier` → `Menu · the overlay tier`
- Lines 238-242: replace `the filter-toolbar pattern from patterns.json` phrasing so it no longer implies three patterns:

```tsx
<p className="annot pg-note">
  This card is Panel — the elevated surface recipe Dialog shares. The row
  above is the filter-toolbar pattern, live: dismiss a filter and the
  Toolbar reflows.
</p>
```

- [ ] **Step 4: Stop the pipeline card faking swatches**

`Pipeline.tsx:6-7` gives FLOAT rows a color dot bound to an unrelated fill token, purely for its pixels. Replace the `FIGMA_VARS` shape so only colors carry a swatch:

```tsx
const FIGMA_VARS = [
  { name: "bg/primary", varClass: "--psi-bg-primary", note: "COLOR · 4 modes" },
  { name: "fg/accent", varClass: "--psi-fg-accent", note: "COLOR · 4 modes" },
  { name: "space/16", varClass: null, note: "FLOAT · 16" },
  { name: "radius/8", varClass: null, note: "FLOAT · 8" },
] as const;
```

And in the row renderer (lines 56-65), render the dot conditionally:

```tsx
{row.varClass ? (
  <span className="dot" style={{ background: `var(${row.varClass})` }} aria-hidden="true" />
) : (
  <span className="dot dot--none" aria-hidden="true" />
)}
```

Add to `apps/promo/src/promo.css` beside the existing `.var-row .dot` rule:

```css
/* A FLOAT variable has no color. An empty swatch is honest; a borrowed one is not. */
.var-row .dot--none {
  border-style: dashed;
  background: none;
}
```

- [ ] **Step 5: Soften the Figma parity claim**

Per the spec's scope note, §04's parity assertion is not currently true. In `apps/promo/src/sections/Pipeline.tsx:47-54`, change "The in-repo **Psi Token Sync** plugin upserts a variable collection into Figma" to describe what ships without asserting live parity:

```tsx
<p>
  The in-repo <strong>Psi Token Sync</strong> plugin publishes a variable
  collection into Figma: one mode per theme, colors grouped bg/fg/fill/border,
  floats for space, size and radius. Idempotent, with a dry-run diff and orphan
  reporting — each variable carries its derivation formula in the description.
</p>
```

- [ ] **Step 6: Verify the four gates**

Run: `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint`
Expected: all four green.

- [ ] **Step 7: Commit**

```bash
git add apps/promo/src/content/updates.ts apps/promo/src/sections/Roadmap.tsx apps/promo/src/sections/Playground.tsx apps/promo/src/sections/Pipeline.tsx apps/promo/src/promo.css
git commit -m "docs(promo): publish 0.9.0–0.14.1 and de-version the demo copy (D74)"
```

---

### Task 5: The site gate, proven red

A Playwright project with **no screenshot assertions** — unlike `vr`, this runs locally and in CI on any platform.

**Files:**
- Create: `apps/promo/site-gate/playwright.config.ts`
- Create: `apps/promo/site-gate/site.spec.ts`
- Modify: `package.json` (add `test:site` script)

**Interfaces:**
- Produces: `pnpm test:site` — the gate Tasks 6 and 7 turn green.

- [ ] **Step 1: Write the config**

Create `apps/promo/site-gate/playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

/**
 * The public site's own gate (D74). Deliberately NOT `vr`:
 * no screenshot assertions, so it is platform-independent and runs locally.
 * `vr` stays CI-only because its baselines are ubuntu renders.
 *
 * Requires `pnpm --dir apps/promo build` first — the webServer serves dist/.
 */
export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: 0,
  workers: 2,
  use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  webServer: {
    command: "npx serve -l 6210 ../dist",
    port: 6210,
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: Write the failing spec**

Create `apps/promo/site-gate/site.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:6210/";

/** axe-core ships in the repo root's node_modules; addScriptTag resolves from cwd. */
async function runAxe(page: Page) {
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
  return page.evaluate(async () => {
    // @ts-expect-error injected global
    const results = await axe.run(document, { resultTypes: ["violations"] });
    return results.violations.map((v: { id: string; nodes: unknown[] }) => ({
      id: v.id,
      count: v.nodes.length,
    }));
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`no axe violations (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("psi-theme", t), theme);
    await page.goto(BASE, { waitUntil: "networkidle" });
    expect(await runAxe(page)).toEqual([]);
  });
}

// The counts must be right *on the page*, not just in source. check-docs-drift
// can only see source text, so it cannot catch the stat line being deleted, or
// an interpolation rewired to the wrong fact (`${iconCount} components`), or a
// spelled-out word like the "Eighteen production components" heading that
// started this. Only a rendered assertion closes those. (Task 3 review finding.)
test("the rendered page states the package's real counts", async ({ page }) => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  const { readFileSync } = await import("node:fs");
  const manifest = JSON.parse(
    readFileSync("packages/react/dist/manifest.json", "utf8"),
  ) as { components: unknown[]; icons: string[] };

  const body = await page.locator("body").innerText();
  expect(body).toContain(`${manifest.components.length} components`);
  expect(body).toContain(`${manifest.icons.length} icons`);
  expect(body).not.toMatch(/\bEighteen\b/i);
});

// Every Storybook link the site generates must resolve to a real docs page —
// three of them 404'd when the roster was first derived (Task 3 finding I1).
test("no Storybook link points at a missing docs page", async ({ page }) => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>("a[href*='/docs/']")].map(
      (a) => new URL(a.href, location.href).searchParams.get("path") ?? "",
    ),
  );
  expect(ids.length).toBeGreaterThan(0);
  expect(ids.filter((id) => !id.startsWith("/docs/"))).toEqual([]);
});

// 320 is the WCAG reflow floor. 760 sits inside the band where the nav is still
// shown but no longer fits — the failure the 720px breakpoint alone missed.
for (const width of [320, 760, 1440]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(BASE, { waitUntil: "networkidle" });
    const { scrollW, clientW, offenders } = await page.evaluate(() => {
      const clientW = document.documentElement.clientWidth;
      const offenders: string[] = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > clientW + 1) {
          offenders.push(
            `${el.tagName}.${String(el.className).split(" ")[0]}@${Math.round(r.right)}`,
          );
        }
      }
      return {
        scrollW: document.documentElement.scrollWidth,
        clientW,
        offenders: [...new Set(offenders)].slice(0, 5),
      };
    });
    expect(offenders, `elements past the viewport edge at ${width}px`).toEqual([]);
    expect(scrollW).toBe(clientW);
  });
}
```

- [ ] **Step 3: Add the script**

In the root `package.json` scripts, after `"test:e2e"`:

```json
"test:site": "playwright test -c apps/promo/site-gate",
```

- [ ] **Step 4: Run the gate and watch it fail**

Run: `pnpm --dir apps/promo build && pnpm test:site`
Expected: **FAIL**, and you must see all three of these before proceeding:
- `no axe violations (light)` — one violation, `{ id: "color-contrast", count: 46 }`.
- `no horizontal overflow at 320px` — offenders include `DIV.theme-switch@337`, `scrollW` 337 vs 320.
- `no horizontal overflow at 760px` — `scrollW` 863 vs 760.

Four tests are expected to **pass** on first run, and a failure in any of them is a real finding, not a mis-written test: `no axe violations (dark)` (dark measures 4.51:1), `no horizontal overflow at 1440px`, and the two Task 3 regression guards — `the rendered page states the package's real counts` and `no Storybook link points at a missing docs page`. Report which of the seven passed and which failed.

- [ ] **Step 5: Commit the red gate**

```bash
git add apps/promo/site-gate package.json
git commit -m "test(promo): the site gates itself on axe and reflow (D74)"
```

---

### Task 6: The 46 contrast failures

**Files:**
- Modify: `apps/promo/src/promo.css:69-74, 654-661`

- [ ] **Step 1: Rebind `.annot`**

`.annot` carries real prose — the hero stat line, four `.pg-note` paragraphs, theme captions, `roadmap-foot`, footer notes. `--psi-fg-tertiary` measures 2.84:1 on `bg-primary` and 2.90:1 on Panel; `--psi-fg-secondary` measures 4.86:1 and 5.08:1 at the same sizes.

In `apps/promo/src/promo.css`, line 73:

```css
/* Mono annotation — the page's signature detail.
 * fg-secondary, not fg-tertiary: .annot carries prose, and tertiary is the one
 * foreground absent from the token contrast matrix, so it measured 2.84:1 here
 * and shipped 46 axe failures on the page that advertises the AA gate (D74). */
.annot {
  font: var(--psi-text-12-16-regular);
  font-family: var(--psi-font-mono);
  letter-spacing: 0.03em;
  color: var(--psi-fg-secondary);
}
```

And line 656, `.var-row .val`:

```css
.var-row .val {
  margin-inline-start: auto;
  color: var(--psi-fg-secondary);
  min-width: 0;
}
```

(The `white-space`/`overflow`/`text-overflow` lines are removed here — Task 8 covers why.)

- [ ] **Step 2: Run the gate**

Run: `pnpm --dir apps/promo build && pnpm test:site -g "axe"`
Expected: both axe tests PASS. If any violation remains, read its `id` and `count` — do not suppress a rule.

- [ ] **Step 3: Commit**

```bash
git add apps/promo/src/promo.css
git commit -m "fix(promo): .annot carries prose, so it binds fg-secondary (D74)"
```

---

### Task 7: The two overflow bands

**Files:**
- Modify: `apps/promo/src/promo.css:92-97, 808-860`

- [ ] **Step 1: Let the header wrap, and hide the nav where it stops fitting**

The nav is hidden only below 720px, but wordmark + 6 links + a 4-button switch stop fitting at ~960px. In `apps/promo/src/promo.css`, give the header row a wrap fallback (lines 92-97):

```css
.site-header .container {
  display: flex;
  align-items: center;
  gap: var(--psi-space-12) var(--psi-space-24);
  min-height: 64px;
  flex-wrap: wrap;
  padding-block: var(--psi-space-8);
}
```

Move the nav-hiding rule from the 720px block to the 960px block. In the `@media (max-width: 960px)` block add:

```css
  .site-nav {
    display: none;
  }

  .site-header .container {
    justify-content: space-between;
  }
```

And delete `.site-nav { display: none }` and the `.site-header .container { justify-content: space-between }` rule from the `@media (max-width: 720px)` block — they are now redundant.

- [ ] **Step 2: Let the theme switch wrap at the narrowest width**

At 320px the four buttons still exceed the content box. In the `@media (max-width: 720px)` block add:

```css
  .theme-switch {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
```

- [ ] **Step 3: Run the gate**

Run: `pnpm --dir apps/promo build && pnpm test:site -g "overflow"`
Expected: all three overflow tests PASS, `scrollWidth === clientWidth` at 320, 760 and 1440.

- [ ] **Step 4: Sweep the band the gate does not sample**

The gate checks three widths; the failure was a *band*. Confirm the whole range with a one-off probe:

```bash
node -e '
import("@playwright/test").then(async ({ chromium }) => {
  const b = await chromium.launch();
  for (const w of [320,360,400,560,720,760,860,960,1024,1280,1440,1920]) {
    const c = await b.newContext({ viewport: { width: w, height: 800 } });
    const p = await c.newPage();
    await p.goto("http://localhost:6210/", { waitUntil: "networkidle" });
    const r = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    console.log(String(w).padStart(5), r[0] === r[1] ? "ok" : "OVERFLOW " + r.join(" vs "));
    await c.close();
  }
  await b.close();
});'
```

Expected: `ok` on all twelve. (Start the server first with `npx serve -l 6210 apps/promo/dist`.)

- [ ] **Step 5: Commit**

```bash
git add apps/promo/src/promo.css
git commit -m "fix(promo): the header wraps, and the nav yields at 960 not 720 (D74)"
```

---

### Task 8: Layout and type craft

Each item is independent; none is gated by an automated assertion, so verify each visually at 1440px and 320px.

**Files:**
- Modify: `apps/promo/src/promo.css`
- Modify: `apps/promo/src/sections/Hero.tsx`

- [ ] **Step 1: Stretch the principle cards**

Panel heights measure 250 / 228 / 227 / 227 because the grid stretches the `<article>` and not the `Panel` inside it. In `apps/promo/src/promo.css` after the `.principles-grid` rule:

```css
.principle {
  display: grid;
}

.principle > .card {
  height: 100%;
}
```

- [ ] **Step 2: Let the var-row value wrap instead of truncating**

Two of eight rows currently ellipsis away real prose with no expanded view. Task 6 already removed the truncation; align the column so the left edges stop laddering:

```css
.var-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(0, 1.4fr);
  align-items: start;
  gap: var(--psi-space-12);
  padding: var(--psi-space-8) var(--psi-space-12);
  background: var(--psi-bg-primary);
  font: var(--psi-text-12-16-regular);
  font-family: var(--psi-font-mono);
  min-width: 0;
}
```

The `ARTIFACTS` list has no dot, so give those rows a leading spacer or set `grid-column: 2` on their first child — check both lists render aligned before committing.

- [ ] **Step 3: Cap the measure on annotation prose**

`.pg-note` measures 1166px at 12px — about 180 characters per line, on a page whose `.update p` already caps at 70ch:

```css
.pg-note,
.roadmap-foot,
.derive p {
  max-width: 70ch;
}
```

(`.roadmap-foot` already sets `max-width: 70ch` — fold it into this rule and delete the duplicate.)

- [ ] **Step 4: Stop the update cards being half empty**

Each card is 1216px around a 617px text column, eleven times:

```css
.updates-list {
  max-width: 78ch;
}
```

- [ ] **Step 5: Stop headings ghosting through the header**

At `--psi-scrim-heavy` (0.82 alpha) 32px display headings resolve as words behind the nav links:

```css
.site-header {
  background: var(--psi-bg-primary);
}
```

Keep the `backdrop-filter` line — it still softens anything that scrolls beneath the wrapped rows at narrow widths.

- [ ] **Step 6: Move the derive swatch labels off the swatches**

White at 0.9 opacity over the accent fill measures 4.38:1 at rest and 2.88:1 at Δ +0.12 — a contrast demo that fails contrast.

**Clamping the slider cannot fix this.** Measured pure white (opacity removed) over `oklch(L 0.21 260)`: 5.04:1 at L 0.55, 4.25:1 at L 0.59, 3.91:1 at L 0.61, 3.20:1 at L 0.67. Only Δ ≤ +0.02 clears 4.5:1, which collapses the range the demo exists to show.

So the label leaves the swatch instead. The swatch becomes pure color; the caption sits on the panel background, where `.annot` already clears AA after Task 6. Keep the full ±0.12 range.

In `apps/promo/src/sections/Hero.tsx`, restructure each swatch (lines 99-109):

```tsx
<div className="derive-row" aria-hidden="true">
  {[
    ["base", "derive-swatch--base"],
    ["l−0.04", "derive-swatch--hover"],
    ["l−0.08", "derive-swatch--active"],
  ].map(([label, cls]) => (
    <div className="derive-cell" key={cls}>
      <div className={`derive-swatch ${cls}`} />
      <span className="annot">{label}</span>
    </div>
  ))}
</div>
```

In `apps/promo/src/promo.css`, replace the `.derive-swatch` block (lines 295-309):

```css
.derive-cell {
  flex: 1;
  display: grid;
  gap: var(--psi-space-4);
  min-width: 0;
}

/* The label sits below the swatch, not on it: white-on-accent measures
 * 3.2:1 at the slider's far end, and this demo is *about* contrast (D74). */
.derive-swatch {
  height: 64px;
  border-radius: var(--psi-radius-6);
}
```

Leave the three `--base` / `--hover` / `--active` background rules untouched, and leave `max={0.12}` alone.

- [ ] **Step 7: Straight apostrophes in the display type**

`Hero.tsx:25-27` uses `&apos;` and `index.html:10` uses `'` in running prose. Replace both with `’` (U+2019). Leave straight quotes inside code blocks and `.annot` mono.

- [ ] **Step 8: Verify and commit**

Run: `pnpm --dir apps/promo build && pnpm test:site && pnpm lint`
Expected: all five site-gate tests pass; stylelint clean.

Inspect at 1440 and 320 via `preview_start` `promo-wt` (needs the prerequisite entry) and confirm: four principle cards share a bottom edge, no ellipsis in either var list, no heading visible behind the header.

```bash
git add apps/promo/src/promo.css apps/promo/src/sections/Hero.tsx apps/promo/index.html
git commit -m "fix(promo): shared card edges, capped measure, opaque header (D74)"
```

---

### Task 9: Keyboard and navigation correctness

**Files:**
- Modify: `apps/promo/src/App.tsx`
- Modify: `apps/promo/src/promo.css`
- Modify: `apps/promo/src/sections/Hero.tsx:41-62`
- Modify: `apps/promo/src/sections/Header.tsx:6-13`

- [ ] **Step 1: Add a skip link**

Seven chrome tab stops precede `<main>`. In `apps/promo/src/App.tsx`, make it the first element:

```tsx
<a className="skip-link" href="#main">Skip to content</a>
<Header theme={theme} onTheme={setTheme} />
<main id="main" tabIndex={-1}>
```

And in `apps/promo/src/promo.css`:

```css
.skip-link {
  position: absolute;
  inset-inline-start: -9999px;
  z-index: var(--psi-z-overlay);
}

.skip-link:focus-visible {
  inset-inline-start: var(--promo-pad-x);
  top: var(--psi-space-8);
  padding: var(--psi-space-8) var(--psi-space-16);
  border-radius: var(--psi-radius-8);
  background: var(--psi-fill-accent);
  color: var(--psi-fg-on-accent);
  font: var(--psi-text-14-20-medium);
}
```

- [ ] **Step 2: The hero CTAs become links**

They navigate, so they must support Cmd/Ctrl/middle-click and carry the URL hash. `Button` has rendered as an `<a>` when given `href` since D33/D34. In `apps/promo/src/sections/Hero.tsx`, replace both `onClick` handlers:

```tsx
<Button variant="accent" size={48} href="#components">
  Explore the components
</Button>
<Button variant="neutral-subtle" size={48} href="#theming">
  See theming in action
</Button>
```

The `useState`/`CSSProperties` imports stay — the Δ slider still uses them.

- [ ] **Step 3: Complete the nav**

Sections 05 and 06 are numbered on the page but absent from the nav. In `apps/promo/src/sections/Header.tsx:6-13`:

```tsx
const NAV = [
  ["Principles", "#principles"],
  ["Components", "#components"],
  ["Theming", "#theming"],
  ["Pipeline", "#pipeline"],
  ["Agents", "#agents"],
  ["Roadmap", "#roadmap"],
  ["Updates", "#updates"],
  ["Storybook", STORYBOOK_BASE],
] as const;
```

Two more links widen the header — re-run the overflow gate, which is exactly why it exists.

- [ ] **Step 4: Verify keyboard behavior**

Run: `pnpm --dir apps/promo build && pnpm test:site`
Expected: all five tests pass, including overflow at 760 with the two new nav links.

Then confirm by hand in `promo-wt`: Tab once from page load → the skip link is visible and focused; Enter → focus lands on `<main>`; the hero CTAs offer "Open link in new tab" on right-click.

- [ ] **Step 5: Commit**

```bash
git add apps/promo/src/App.tsx apps/promo/src/promo.css apps/promo/src/sections/Hero.tsx apps/promo/src/sections/Header.tsx
git commit -m "fix(promo): skip link, CTAs as links, complete nav (D74)"
```

---

### Task 10: Serve what the site advertises, and wire CI

**Files:**
- Modify: `tools/assemble-site.mjs`
- Modify: `.github/workflows/ci.yml`
- Create: `.changeset/public-site-cycle.md`

- [ ] **Step 1: Copy the llms.txt files into the built site**

§04 advertises `llms.txt` as a shipped artifact while `assemble-site.mjs` copies only promo and storybook. After the two `cp` calls:

```js
// The site advertises these in §04 — serve them at the advertised URLs (D74).
await cp(path.join(repo, "llms.txt"), path.join(out, "llms.txt"));
await cp(
  path.join(repo, "packages/tokens/llms.txt"),
  path.join(out, "tokens-llms.txt"),
);
await cp(
  path.join(repo, "packages/react/llms.txt"),
  path.join(out, "react-llms.txt"),
);
```

Confirm the root `llms.txt` exists first (`ls llms.txt`); if the filenames above do not match what §04 states, make the copy match the copy on the page, not the other way round.

- [ ] **Step 2: Prove it**

Run: `pnpm build:web && ls site-dist/*.txt`
Expected: three `.txt` files listed.

- [ ] **Step 3: Add the gate to CI**

In `.github/workflows/ci.yml`, after the `pnpm vr` step and its failure-artifact upload, before `pnpm lint`:

```yaml
      # The public site is a prose artifact and a product: axe + reflow (D74)
      - run: pnpm test:site
```

Chromium is already installed by the preceding `playwright install` step, so no new install is needed. Place it after `vr` so a site failure never masks a component regression.

- [ ] **Step 4: Add the changeset**

`manifest.json` gaining `icons` is user-visible. Create `.changeset/public-site-cycle.md`:

```markdown
---
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
"@handamade/psi-mcp": minor
---

The manifest carries the icon roster. `manifest.json` gains `icons: string[]`,
so the icon set has a machine-readable form for the first time — consumers and
agents no longer have to read the barrel to know what exists.
```

- [ ] **Step 5: Run all four gates plus the new one**

Run: `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site`
Expected: all green. Do **not** run `pnpm vr` — it is CI's.

- [ ] **Step 6: Commit and open the PR**

```bash
git add tools/assemble-site.mjs .github/workflows/ci.yml .changeset/public-site-cycle.md
git commit -m "ci(promo): serve the advertised llms.txt and gate the site (D74)"
git push -u origin d74-promo-site
gh pr create --title "feat: the public site is true, and gated (D74)" --body "..."
```

Then arm auto-merge **and verify it armed** — `gh pr merge --auto` exits 0 while leaving it off:

```bash
gh pr merge <n> --auto --squash
gh pr view <n> --json autoMergeRequest
```

If `autoMergeRequest` is `null`, use the `enablePullRequestAutoMerge` GraphQL mutation.

---

## Self-Review

**Spec coverage.** D74 half one → Tasks 1, 2, 3 (derived numbers), 4 (feed + roadmap + de-versioning + Figma softening), 10 (llms.txt). D74 half two → Tasks 5 (gate), 6 (contrast), 7 (overflow), 8 (craft), 9 (keyboard). "The gate, which is the actual decision" → Tasks 3 step 1 and 5, both proven red first. Gates section → Task 3 step 2 and Task 5 step 4 assert failure before the fix; `vr` untouched throughout. Changeset → Task 10. Out-of-scope items appear only in Global Constraints as prohibitions.

**Placeholder scan.** One deliberate soft spot: Task 10 Step 1's `llms.txt` filenames depend on what §04 actually states — the step says to make the copy match the page and to verify the root file exists rather than assuming a name. Task 8 Step 2's `ARTIFACTS`-row alignment says to check both lists render before committing, because the two lists have different column counts. Everything else carries literal code.

**Type consistency.** `virtual:psi-facts` exports the same six names in the plugin (Task 2 Step 1), the ambient declaration (Task 2 Step 2), and all three consumers (Task 3 Steps 3-5) — `componentCount`, `iconCount`, `patternCount`, `version`, `componentNames`, `iconNames`. `manifest.icons` is written in Task 1 and read in Tasks 2 and 3. `SHIPPED` changes from `as const` to `ReadonlyArray<readonly [string, string]>` in Task 3 Step 5 before Task 4 Step 2 appends computed strings to it.

**Known ordering hazard.** Task 9 Step 3 adds two nav links, which widens the header after Task 7 fixed the overflow. That is intentional — the gate written in Task 5 is what catches it, and Task 9 Step 4 re-runs it.
