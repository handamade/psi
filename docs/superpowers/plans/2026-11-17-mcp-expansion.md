# MCP expansion (D129) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `@handamade/psi-mcp` answers `get` with the docs site's own markdown, and gains two tools: `theme`, which derives a theme from a colour, and `check`, which reports JSX that uses Psi wrongly.

**Architecture:** A new private workspace package, `packages/docs` (`@handamade/psi-docs`), becomes the single source of every docs page: the examples, page lists, guides and pure markdown builders. The Astro site renders its `.md` twins with those builders. The MCP's publish-time index build calls the same builders and bakes the output. `theme` wraps `@handamade/psi-tokens/generate`. `check` parses JSX with `@babel/parser` and checks it against the manifest, which gains `attributes`, `accessibleName` and `contracts`.

**Tech Stack:** TypeScript, pnpm workspaces, Astro 7 (site), `@modelcontextprotocol/sdk` + zod (server), `@babel/parser` (new), react-docgen-typescript (manifest), Vitest, Playwright (`test:site`).

**Spec:** `docs/superpowers/specs/2026-11-17-mcp-expansion-design.md` (D129).

## Global Constraints

- Work in the worktree `.claude/worktrees/d129-mcp-expansion` on branch `d129-mcp-expansion`. Run `node -v` first: it must print v24. If not, run `nvm use`.
- Every tool returns text and has no side effects. **Tools never write the consumer's files and never call a model**, on stdio and hosted alike (D43, amended by D129).
- `get` returns markdown for every kind. For a docs page, it is **byte-identical** to the site's `.md` twin of that page.
- `check` input is capped at **20,000 characters**. Over the cap → `isError`. A parse error is **not** `isError`; it is one `parse` finding.
- `theme` accepts exactly one of `color` (hex or `oklch(…)`) or `hue` (0–359). Optional: `chroma` (`muted | calm | balanced | vivid | electric`), `radius` (`4 | 6 | 8 | 12`), `name` (kebab-case, at most 64 characters, default `brand-<hue>`). The light rule is `[data-psi-theme="<name>"]` and the dark rule `[data-psi-theme="<name>-dark"]`, each in `@layer psi.theme` with its `color-scheme`. Component overrides go in `@layer psi.components`.
- `@handamade/psi-docs` is `"private": true`, has no build script, and exports TypeScript source. It is a **devDependency** of `psi-mcp`. Nothing under `packages/mcp/src/` may import it, because `tsc` compiles `src/` and must not pull in the package's source. Only `packages/mcp/scripts/` and `__tests__/` import it.
- New runtime dependencies of `psi-mcp`: `@handamade/psi-tokens` (`workspace:*`) and `@babel/parser` (latest 7.x). No others.
- Never hardcode colours in component CSS. This plan adds no component CSS.
- Nothing in this repository names the private register, an id from it, or a consumer.
- The decision is **D129**. Re-check that it's unclaimed when the PR opens: search every branch, every worktree and `origin`.
- The five gates, run from the worktree root, are:

  ```bash
  pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site
  ```

  `pnpm vr` runs only in CI. Do not run it locally.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File structure

| File | Responsibility |
|---|---|
| `packages/docs/package.json`, `tsconfig.json` | The private package |
| `packages/docs/examples/<slug>/<name>.tsx` | Live examples (moved) |
| `packages/docs/guides/*.mdx` | Guides (moved) |
| `packages/docs/src/pages.ts` | Component pages, token pages, guide order and labels (moved) |
| `packages/docs/src/types.ts` | `ExportInfo`, `Resolved`, `Guidance`, `ThemeName`, `ExampleSource`, `GuideSource`, `DocsInput`, `PatternLike`, `DocsPages` |
| `packages/docs/src/data.ts` | Pure helpers: `THEMES`, `kebab`, `docSection`, `summary`, `colorTokens` |
| `packages/docs/src/node.ts` | Filesystem loaders: `getExport`, `allExportNames`, `readGeneratedDoc`, `resolved`, `guidance`, `loadDocsInput` |
| `packages/docs/src/markdown.ts` | Pure builders: `componentPageMd`, `tokenPageMd`, `guideMd`, `overviewMd`, `tokenMd`, `patternMd`, `topicMd`, `buildDocsPages` |
| `packages/docs/src/index.ts` | Public surface of the package, without `node.ts` |
| `apps/site/src/content/*.ts`, `src/lib/components.ts`, `src/lib/tokens.ts` | One-line re-exports from `@handamade/psi-docs`, so existing site imports keep working |
| `apps/site/src/lib/markdown.ts` | Thin adapter: calls the builders with `loadDocsInput()` |
| `apps/site/src/examples/registry.ts` | Vite glob over `packages/docs/examples` |
| `packages/mcp/scripts/bake-docs.ts` | `withDocs(index)`: adds `docs` from `buildDocsPages` (used by the build script and tests) |
| `packages/mcp/src/nearest.ts` | `distance`, `nearest` (edit distance) |
| `packages/mcp/src/store.ts` | `get` returns markdown; new kinds; suggestions |
| `packages/mcp/src/theme.ts` | `themeMarkdown(input)` |
| `packages/mcp/src/check/parse.ts`, `check/rules.ts`, `check/index.ts` | `checkMarkdown(code, index)` |
| `packages/mcp/src/server.ts` | Four tools |
| `packages/tokens/src/generate/*` | New exports: `parseColor`, `contrastReport`, `ACCENT_CHROMA` |
| `packages/react/scripts/emit-manifest.ts`, `src/a11y-meta.ts` | `attributes`, `accessibleName`, `contracts`, `dist/attributes.json` |
| `apps/site/site-gate/docs.spec.ts` | Parity test |
| `tools/verify-published.mjs` | Installs `psi-mcp` and smoke-calls `theme` and `check` |

---

### Task 1: Create `@handamade/psi-docs` and move the docs sources into it

The site's output must not change. Everything moves. The site keeps its imports through one-line re-exports.

**Files:**
- Create: `packages/docs/package.json`, `packages/docs/tsconfig.json`, `packages/docs/src/types.ts`, `packages/docs/src/data.ts`, `packages/docs/src/node.ts`, `packages/docs/src/pages.ts`, `packages/docs/src/index.ts`
- Move: `apps/site/src/examples/<slug>/` (37 folders) → `packages/docs/examples/<slug>/`; `apps/site/src/content/guides/*.mdx` → `packages/docs/guides/`
- Move tests: `apps/site/src/__tests__/{examples,guides,component-pages,token-pages}.test.ts` → `packages/docs/__tests__/`
- Modify: `apps/site/src/content/component-pages.ts`, `token-pages.ts`, `docs-nav.ts`, `apps/site/src/lib/components.ts`, `apps/site/src/lib/tokens.ts`, `apps/site/src/examples/registry.ts`, `apps/site/src/content.config.ts`, `apps/site/package.json`, `tools/check-docs-drift.mjs`

**Interfaces:**
- Produces, from `@handamade/psi-docs`: `componentPages: ComponentPage[]`, `ComponentPage { slug; title; members: string[] }`, `tokenPages: TokenPage[]`, `TokenPage { slug; title; covers: string[] }`, `GUIDE_ORDER`, `GUIDE_LABELS`, `THEMES`, `ThemeName`, `kebab(name)`, `docSection(md, heading): string | null`, `summary(description): string`, `colorTokens(resolvedByTheme: Record<ThemeName, Resolved>): ColorToken[]`, and the types `ExportInfo`, `PropInfo`, `Resolved`, `Guidance`, `ColorToken`.
- Produces, from `@handamade/psi-docs/node`: `getExport(name): ExportInfo`, `allExportNames(): string[]`, `readGeneratedDoc(name): string`, `resolved(theme?): Resolved`, `guidance(): Guidance`, `EXAMPLES_DIR`, `GUIDES_DIR` (absolute paths).

- [ ] **Step 1: Record the site's current output, to compare against later**

```bash
pnpm build && pnpm --dir apps/site build
rm -rf /tmp/d129-before && mkdir -p /tmp/d129-before && cp -R apps/site/dist/docs /tmp/d129-before/docs
find /tmp/d129-before/docs -name '*.md' | wc -l
```

Expected: `49` (overview, 5 guides, 37 component pages, 6 token pages). Note the number you get, and use it in later steps.

- [ ] **Step 2: Create the package**

`packages/docs/package.json`:

```json
{
  "name": "@handamade/psi-docs",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./node": "./src/node.ts"
  },
  "dependencies": {
    "@handamade/psi-react": "workspace:*",
    "@handamade/psi-tokens": "workspace:*",
    "react": "^19.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.2.6"
  }
}
```

`packages/docs/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "declaration": false,
    "declarationMap": false,
    "jsx": "react-jsx",
    "types": ["node"]
  },
  "include": ["src", "examples", "__tests__"]
}
```

Add `"@handamade/psi-docs": "workspace:*"` to `dependencies` in `apps/site/package.json`, keeping the keys alphabetical. Then run `pnpm install`.

Confirm the publish script will never publish the new package. It filters out private packages:

```bash
grep -n "private" tools/publish.mjs
```

Expected: a line with `.filter((p) => !p.json.private)`. If it's missing, stop and report it.

- [ ] **Step 3: Move the examples, guides and tests with `git mv`**

```bash
mkdir -p packages/docs/examples packages/docs/guides packages/docs/__tests__
for d in apps/site/src/examples/*/; do git mv "$d" packages/docs/examples/; done
git mv apps/site/src/content/guides/*.mdx packages/docs/guides/
for t in examples guides component-pages token-pages; do git mv "apps/site/src/__tests__/$t.test.ts" "packages/docs/__tests__/$t.test.ts"; done
ls apps/site/src/examples
```

Expected: only `registry.ts` is left in `apps/site/src/examples`.

- [ ] **Step 4: Write `packages/docs/src/types.ts`**

```ts
export type ThemeName = "light" | "dark" | "acme" | "ember";

export interface PropInfo {
  name: string;
  type: string;
  required: boolean;
  default: string | number | null;
  description: string;
}

export interface ExportInfo {
  name: string;
  description: string;
  props: PropInfo[];
}

export interface Oklch {
  l: number;
  c: number;
  h: number;
  alpha?: number;
}

export interface Resolved {
  theme: string;
  colorScheme: string;
  tokens: Record<string, { name: string; oklch: Oklch; hex: string; formula: string; scopes?: string[] }>;
  typography: { name: string; fontSize: number; lineHeight: number; weight: string; cssWeight: number }[];
  display: {
    name: string;
    min: number;
    max: number;
    vw: number;
    lineHeight: number;
    weight: string;
    tracking: number;
    cssWeight: number;
  }[];
  scales: {
    space: number[];
    size: number[];
    radius: number[];
    motion: { durations: number[]; easings: Record<string, string> };
    layout: {
      breakpoints: Record<string, number>;
      container: Record<string, number>;
      zIndex: Record<string, number>;
    };
    focusRing: Record<string, number>;
    scopes: Record<string, string[]>;
  };
}

export interface Guidance {
  variants: { variant: string; intent: string; typicalUse: string }[];
  typographyDefaults: Record<string, string>;
  motion: { reducedMotion: string; recipes: Record<string, string> };
  layout: { note: string; container: string };
  geometry: { note: string; sizes: number[] };
}

export interface ColorToken {
  name: string;
  cssVar: string;
  formula: string;
  byTheme: Record<ThemeName, { hex: string; oklch: string }>;
}
```

- [ ] **Step 5: Write `packages/docs/src/data.ts`, the pure helpers moved from the site**

Copy the bodies of `docSection`, `summary`, `kebab` and the private `formatOklch` from `apps/site/src/lib/components.ts` and `apps/site/src/lib/tokens.ts` without changing them. `colorTokens` now takes the resolved themes as an argument instead of reading files.

```ts
import type { ColorToken, Oklch, Resolved, ThemeName } from "./types.js";

export const THEMES: ThemeName[] = ["light", "dark", "acme", "ember"];

export function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function docSection(md: string, heading: string): string | null {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
}

/** Plain-text summary of an export's description, for meta descriptions and
 * llms.txt: markdown marks stripped, the first complete sentence, or the first
 * two when that one is too short or only says what the component is not. A
 * sentence ends at ". " followed by a letter, never at "e.g." or "i.e.". */
export function summary(description: string): string {
  const plain = description.replace(/[`*_]{1,2}/g, "").replace(/\s+/g, " ").trim();
  const sentences = plain.split(/(?<!\be\.g|\bi\.e|\bvs|\betc)(?<=[.!?])\s+(?=[A-Za-z])/);
  let out = sentences[0];
  if ((out.length < 40 || out.startsWith("Not ")) && sentences.length > 1) {
    out = `${out} ${sentences[1]}`;
  }
  return out.replace(/[.!?]+$/, "") + ".";
}

export function formatOklch(o: Oklch): string {
  const base = `oklch(${o.l} ${o.c} ${o.h}`;
  return o.alpha != null ? `${base} / ${o.alpha})` : `${base})`;
}

export function colorTokens(resolvedByTheme: Record<ThemeName, Resolved>): ColorToken[] {
  return Object.values(resolvedByTheme.light.tokens).map((t) => ({
    name: t.name,
    cssVar: `--psi-${kebab(t.name)}`,
    formula: t.formula,
    byTheme: Object.fromEntries(
      THEMES.map((th) => {
        const v = resolvedByTheme[th].tokens[t.name];
        return [th, { hex: v.hex, oklch: formatOklch(v.oklch) }];
      }),
    ) as ColorToken["byTheme"],
  }));
}
```

- [ ] **Step 6: Write `packages/docs/src/node.ts`, the filesystem loaders moved from the site**

```ts
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { ExportInfo, Guidance, Resolved, ThemeName } from "./types.js";

const require = createRequire(import.meta.url);
const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..");

export const EXAMPLES_DIR = join(pkgDir, "examples");
export const GUIDES_DIR = join(pkgDir, "guides");

const manifestPath = require.resolve("@handamade/psi-react/manifest.json");
const reactRoot = join(dirname(manifestPath), "..");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { components: ExportInfo[]; icons: string[] };
const byName = new Map(manifest.components.map((c) => [c.name, c]));

export function allExportNames(): string[] {
  return manifest.components.map((c) => c.name);
}

export function getExport(name: string): ExportInfo {
  const found = byName.get(name);
  if (!found) throw new Error(`No export "${name}" in @handamade/psi-react's manifest.json`);
  return found;
}

/** packages/react/docs/<name>.md, generated by emit-docs.ts. */
export function readGeneratedDoc(name: string): string {
  const raw = readFileSync(join(reactRoot, "docs", `${name}.md`), "utf8");
  return raw.replace(/^<!--[^\n]*-->\n/, "");
}

const cache = new Map<ThemeName, Resolved>();
export function resolved(theme: ThemeName = "light"): Resolved {
  if (!cache.has(theme)) {
    const path = require.resolve(`@handamade/psi-tokens/resolved/${theme}.json`);
    cache.set(theme, JSON.parse(readFileSync(path, "utf8")) as Resolved);
  }
  return cache.get(theme)!;
}

let guidanceCache: Guidance | undefined;
export function guidance(): Guidance {
  guidanceCache ??= JSON.parse(
    readFileSync(require.resolve("@handamade/psi-tokens/guidance.json"), "utf8"),
  ) as Guidance;
  return guidanceCache;
}
```

- [ ] **Step 7: Write `packages/docs/src/pages.ts` and `src/index.ts`**

`pages.ts` holds the content of `apps/site/src/content/component-pages.ts` and `token-pages.ts` (the interfaces and arrays, unchanged), followed by the guide constants moved out of `docs-nav.ts`:

```ts
// …ComponentPage, componentPages, TokenPage and tokenPages, copied unchanged…

export const GUIDE_ORDER = ["installation", "theming", "dark-mode", "ai", "sizes-and-variants"] as const;
export type GuideId = (typeof GUIDE_ORDER)[number];
export const GUIDE_LABELS: Record<GuideId, string> = {
  installation: "Installation",
  theming: "Theming",
  "dark-mode": "Dark mode",
  ai: "Using Psi with AI",
  "sizes-and-variants": "Sizes and variants",
};
```

`index.ts`:

```ts
export * from "./types.js";
export * from "./data.js";
export * from "./pages.js";
```

- [ ] **Step 8: Replace the site's moved modules with re-exports**

`apps/site/src/content/component-pages.ts`:

```ts
export { componentPages, type ComponentPage } from "@handamade/psi-docs";
```

`apps/site/src/content/token-pages.ts`:

```ts
export { tokenPages, type TokenPage } from "@handamade/psi-docs";
```

In `apps/site/src/content/docs-nav.ts`, delete the local `GUIDE_ORDER` and `GUIDE_LABELS`, and import them instead. Keep the `NavLink`, `NavSection` and `docsNav` definitions as they are, and re-export `GUIDE_ORDER` for `twins.ts`:

```ts
import { GUIDE_LABELS, GUIDE_ORDER, componentPages, tokenPages } from "@handamade/psi-docs";

export { GUIDE_ORDER };
```

`apps/site/src/lib/components.ts`:

```ts
export { docSection, summary, type ExportInfo, type PropInfo } from "@handamade/psi-docs";
export { allExportNames, getExport, readGeneratedDoc } from "@handamade/psi-docs/node";
```

`apps/site/src/lib/tokens.ts`. Its `colorTokens()` took no arguments, so keep that signature:

```ts
import { colorTokens as colorTokensOf, THEMES, type ColorToken } from "@handamade/psi-docs";
import { resolved } from "@handamade/psi-docs/node";

export { THEMES, kebab, type ColorToken, type Guidance, type Resolved, type ThemeName } from "@handamade/psi-docs";
export { guidance, resolved } from "@handamade/psi-docs/node";

export function colorTokens(): ColorToken[] {
  return colorTokensOf(Object.fromEntries(THEMES.map((t) => [t, resolved(t)])) as Parameters<typeof colorTokensOf>[0]);
}
```

- [ ] **Step 9: Point the example registry and the guides collection at the package**

In `apps/site/src/examples/registry.ts`, change both globs and the path regex. The file is in `apps/site/src/examples/`, four levels below the repo root:

```ts
const modules = import.meta.glob<{ default: ComponentType }>("../../../../packages/docs/examples/*/*.tsx", { eager: true });
const sources = import.meta.glob<string>("../../../../packages/docs/examples/*/*.tsx", {
  eager: true,
  query: "?raw",
  import: "default",
});
```

and inside the `.map`:

```ts
    const [, slug, file] = path.match(/\/examples\/([^/]+)\/([^/]+)\.tsx$/)!;
```

In `apps/site/src/content.config.ts`, the glob loader's `base` resolves from the site root:

```ts
  loader: glob({ pattern: "*.mdx", base: "../../packages/docs/guides" }),
```

- [ ] **Step 10: Fix the moved tests' paths and imports**

In `packages/docs/__tests__/examples.test.ts`:
- Replace `import { componentPages } from "../content/component-pages";` with `import { componentPages } from "../src/pages";`.
- Change `dir` to `join(__dirname, "..", "examples")`.
- In the third test, the folder listing no longer contains `registry.ts`, so change its filter to `readdirSync(dir)` with no filter.

In `packages/docs/__tests__/guides.test.ts`:
- Import `GUIDE_ORDER` from `../src/pages`.
- Change `dir` to `join(__dirname, "..", "guides")`.

In `packages/docs/__tests__/component-pages.test.ts`:
- Import `componentPages` from `../src/pages`.
- Import `docSection` and `summary` from `../src/data`.
- Import `allExportNames`, `getExport` and `readGeneratedDoc` from `../src/node`.

In `packages/docs/__tests__/token-pages.test.ts`:
- Import `tokenPages` from `../src/pages`.
- Import `colorTokens`, `THEMES` and `kebab` from `../src/data`.
- Import `resolved` from `../src/node`.
- Replace each call `colorTokens()` with `colorTokens(Object.fromEntries(THEMES.map((t) => [t, resolved(t)])) as never)`.

- [ ] **Step 11: Point the drift check at the new guides folder**

In `tools/check-docs-drift.mjs`, change line 112:

```js
const guidesDir = "packages/docs/guides";
```

- [ ] **Step 12: Run the tests and the site build**

```bash
pnpm install
pnpm vitest run packages/docs apps/site
node tools/check-docs-drift.mjs
pnpm --dir apps/site build
```

Expected: all pass, and `astro check` reports 0 errors.

- [ ] **Step 13: Prove the output did not change**

```bash
diff -r /tmp/d129-before/docs apps/site/dist/docs -x '*.html' -x 'pagefind' && echo SAME-MD
for f in $(cd /tmp/d129-before/docs && find . -name '*.html'); do cmp -s "/tmp/d129-before/docs/$f" "apps/site/dist/docs/$f" || echo "DIFF $f"; done
```

Expected: `SAME-MD`, and no `DIFF` lines. If an HTML file differs only in a hashed asset filename (`/_astro/…`), that's acceptable: say so in the report, with one example line. Any other difference is a bug in this task.

- [ ] **Step 14: Run `test:site` and lint, then commit**

```bash
pnpm test:site && pnpm lint
git add -A packages/docs apps/site tools/check-docs-drift.mjs pnpm-lock.yaml
git commit -m "refactor: the docs' examples, pages and guides move to @handamade/psi-docs (D129)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 2: Pure markdown builders in `@handamade/psi-docs`, used by the site

The site's `.md` twins come from builders that take one input object and read nothing themselves. The output must stay the same as Task 1's.

**Files:**
- Modify: `packages/docs/src/types.ts` (add `ExampleSource`, `GuideSource`, `DocsInput`), `packages/docs/src/node.ts` (add `loadExamples`, `loadGuides`, `loadDocsInput`), `packages/docs/src/index.ts`
- Create: `packages/docs/src/markdown.ts`
- Move: `apps/site/src/__tests__/markdown.test.ts` → `packages/docs/__tests__/markdown.test.ts`
- Modify: `apps/site/src/lib/markdown.ts` (becomes an adapter); `apps/site/src/pages/docs/components/[slug].md.ts`, `[slug].astro`, `apps/site/src/pages/docs/get-started/[...id].md.ts`, `[...id].astro`

**Interfaces:**
- Consumes: Task 1's `pages.ts`, `data.ts`, `node.ts`.
- Produces, from `@handamade/psi-docs`:
  - `componentPageMd(input: DocsInput, page: ComponentPage): string`
  - `tokenPageMd(input: DocsInput, page: TokenPage): string`
  - `guideMd(input: DocsInput, guide: GuideSource): string`
  - `overviewMd(input: DocsInput): string`
  - types `DocsInput`, `ExampleSource`, `GuideSource`
- Produces, from `@handamade/psi-docs/node`: `loadDocsInput(): DocsInput` (memoized), `loadExamples(): ExampleSource[]`, `loadGuides(): GuideSource[]`.

- [ ] **Step 1: Add the input types to `packages/docs/src/types.ts`**

```ts
export interface ExampleSource {
  slug: string;
  name: string;
  source: string;
}

export interface GuideSource {
  id: string;
  title: string;
  description: string;
  order: number;
  /** The MDX after its frontmatter, as written. */
  body: string;
}

/** Everything a docs page is built from. The builders in markdown.ts read
 * nothing else, so the site and the MCP's index build produce the same
 * text from the same input. */
export interface DocsInput {
  /** @handamade/psi-react's version. */
  version: string;
  componentCount: number;
  iconCount: number;
  exports: ExportInfo[];
  /** packages/react/docs/<Export>.md, without its leading comment line. */
  generatedDocs: Record<string, string>;
  guidance: Guidance;
  resolved: Record<ThemeName, Resolved>;
  examples: ExampleSource[];
  guides: GuideSource[];
}
```

- [ ] **Step 2: Move the markdown tests and rewrite them against the new signatures**

```bash
git mv apps/site/src/__tests__/markdown.test.ts packages/docs/__tests__/markdown.test.ts
```

Edit `packages/docs/__tests__/markdown.test.ts`:

1. Replace the three import lines from `../content/…` and `../lib/markdown` with:

```ts
import { componentPages, tokenPages } from "../src/pages";
import { componentPageMd, guideMd, overviewMd, tokenPageMd } from "../src/markdown";
import { loadDocsInput } from "../src/node";
import type { GuideSource } from "../src/types";

const input = loadDocsInput();
```

2. The Tabs fixture passes its example through the input:

```ts
  const md = componentPageMd(
    { ...input, examples: [{ slug: "tabs", name: "basic", source: "export default function X() {}" }] },
    tabs,
  );
```

3. Change `dir` to `join(__dirname, "..", "guides")`. The `guide()` helper now returns a `GuideSource`:

```ts
function guide(file: string): GuideSource {
  const raw = readFileSync(join(dir, file), "utf8");
  const [, fm, body] = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)!;
  const get = (k: string) => fm.match(new RegExp(`^${k}: (.*)$`, "m"))![1];
  return { id: file.replace(/\.mdx$/, ""), title: get("title"), description: get("description"), order: 0, body };
}
```

4. Add `input` as the first argument to every call:
   - `tokenPageMd(p)` → `tokenPageMd(input, p)`
   - `guideMd(guide(f))` → `guideMd(input, guide(f))`
   - `overviewMd()` → `overviewMd(input)`
   - `guideMd({ data: { title: "T", description: "D" }, body: "There are {componentCount} of them.\n" })` → `guideMd(input, { id: "t", title: "T", description: "D", order: 0, body: "There are {componentCount} of them.\n" })`

5. Add one test that pins the loader to the files on disk:

```ts
describe("loadDocsInput", () => {
  it("reads every example and every guide, in a stable order", () => {
    expect(input.examples.length).toBeGreaterThan(30);
    expect(input.examples.map((e) => `${e.slug}/${e.name}`)).toEqual(
      [...input.examples.map((e) => `${e.slug}/${e.name}`)].sort((a, b) => a.localeCompare(b)),
    );
    expect(input.guides.map((g) => g.id)).toEqual(["installation", "theming", "dark-mode", "ai", "sizes-and-variants"]);
  });
});
```

- [ ] **Step 3: Run the tests and watch them fail**

Run: `pnpm vitest run packages/docs/__tests__/markdown.test.ts`
Expected: FAIL, because `../src/markdown` does not exist.

- [ ] **Step 4: Add the loaders to `packages/docs/src/node.ts`**

Add `readdirSync` to the `node:fs` import, `THEMES` from `./data.js`, and `DocsInput`, `ExampleSource`, `GuideSource` to the type import. Then append:

```ts
export function loadExamples(): ExampleSource[] {
  return readdirSync(EXAMPLES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(join(EXAMPLES_DIR, d.name))
        .filter((f) => f.endsWith(".tsx"))
        .map((f) => ({
          slug: d.name,
          name: f.replace(/\.tsx$/, ""),
          source: readFileSync(join(EXAMPLES_DIR, d.name, f), "utf8"),
        })),
    )
    .sort((a, b) => `${a.slug}/${a.name}`.localeCompare(`${b.slug}/${b.name}`));
}

export function loadGuides(): GuideSource[] {
  return readdirSync(GUIDES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const raw = readFileSync(join(GUIDES_DIR, f), "utf8");
      const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!m) throw new Error(`guides/${f}: no frontmatter`);
      const field = (k: string): string => {
        const v = m[1].match(new RegExp(`^${k}:\\s*(.*)$`, "m"));
        if (!v) throw new Error(`guides/${f}: no "${k}" in frontmatter`);
        return v[1].trim().replace(/^(["'])(.*)\1$/, "$2");
      };
      return {
        id: f.replace(/\.mdx$/, ""),
        title: field("title"),
        description: field("description"),
        order: Number(field("order")),
        body: m[2],
      };
    })
    .sort((a, b) => a.order - b.order);
}

let inputCache: DocsInput | undefined;
export function loadDocsInput(): DocsInput {
  inputCache ??= {
    version: (JSON.parse(readFileSync(join(reactRoot, "package.json"), "utf8")) as { version: string }).version,
    componentCount: manifest.components.length,
    iconCount: manifest.icons.length,
    exports: manifest.components.map(({ name, description, props }) => ({ name, description, props })),
    generatedDocs: Object.fromEntries(manifest.components.map((c) => [c.name, readGeneratedDoc(c.name)])),
    guidance: guidance(),
    resolved: Object.fromEntries(THEMES.map((t) => [t, resolved(t)])) as Record<ThemeName, Resolved>,
    examples: loadExamples(),
    guides: loadGuides(),
  };
  return inputCache;
}
```

- [ ] **Step 5: Write `packages/docs/src/markdown.ts`**

This is `apps/site/src/lib/markdown.ts` with every read replaced by a field of `input`. The text it produces must not change, so keep every string literal byte for byte.

```ts
import { colorTokens, docSection, kebab, THEMES } from "./data.js";
import type { ComponentPage, TokenPage } from "./pages.js";
import type { DocsInput, ExportInfo, GuideSource } from "./types.js";

/** A table cell value: a literal "|" would split the cell. */
const cell = (v: unknown) => String(v).replace(/\|/g, "\\|");
/** One GFM table as one string, so blocks joined by blank lines never split it. */
const table = (header: string[], rows: unknown[][]) =>
  [
    `| ${header.join(" | ")} |`,
    `|${header.map(() => "---").join("|")}|`,
    ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`),
  ].join("\n");

const fence = (lang: string, code: string) => `\`\`\`${lang}\n${code.trimEnd()}\n\`\`\``;

function exportOf(input: DocsInput, name: string): ExportInfo {
  const found = input.exports.find((e) => e.name === name);
  if (!found) throw new Error(`No export "${name}" in the docs input`);
  return found;
}

function generatedDoc(input: DocsInput, name: string): string {
  const doc = input.generatedDocs[name];
  if (doc === undefined) throw new Error(`No generated doc for "${name}" in the docs input`);
  return doc;
}

/** Drops a member doc's "# Name" title (we add "## Name") and its Rules
 * section (identical in every generated doc; the page states it once). */
function memberBody(input: DocsInput, name: string): string {
  const md = generatedDoc(input, name);
  const withoutTitle = md.replace(/^# [^\n]*\n/, "");
  const rules = docSection(md, "Rules");
  const withoutRules = rules === null ? withoutTitle : withoutTitle.replace(`## Rules\n\n${rules}`, "");
  return withoutRules.replace(/^## /gm, "### ").trim();
}

export function componentPageMd(input: DocsInput, page: ComponentPage): string {
  const main = exportOf(input, page.members[0]);
  const rules = docSection(generatedDoc(input, page.members[0]), "Rules");
  const examples = input.examples.filter((e) => e.slug === page.slug);
  return (
    [
      `# ${page.title}`,
      main.description,
      fence("ts", `import { ${page.members.join(", ")} } from "@handamade/psi-react";`),
      "## Examples",
      ...examples.map((e) => `### ${e.name}\n\n${fence("tsx", e.source)}`),
      ...page.members.map((m) => `## ${m}\n\n${memberBody(input, m)}`),
      ...(rules ? ["## Rules", rules] : []),
    ].join("\n\n") + "\n"
  );
}
```

For `tokenPageMd`, copy the whole `switch` from `apps/site/src/lib/markdown.ts` unchanged, after these replacements at the top of the function:

```ts
export function tokenPageMd(input: DocsInput, page: TokenPage): string {
  const r = input.resolved.light;
  const g = input.guidance;
  const out: string[] = [`# ${page.title} tokens`];
  switch (page.slug) {
    // …the six cases, copied unchanged, except that in "color"
    // `colorTokens()` becomes `colorTokens(input.resolved)`…
  }
  return out.join("\n\n") + "\n";
}
```

Then the guide and overview builders. Facts now come from `input`:

```ts
function variantsTable(input: DocsInput): string {
  return table(
    ["Variant", "Intent", "Typical use"],
    input.guidance.variants.map((v) => [`\`${v.variant}\``, v.intent, v.typicalUse]),
  );
}

/** Turns a guide's MDX body into plain markdown. Outside fenced code:
 * `import` lines are dropped, `{componentCount}`-style fact expressions become
 * their value, and the sizes guide's JSX variants table (mapped over
 * guidance.json) becomes a markdown table of the same rows. */
export function guideMd(input: DocsInput, guide: GuideSource): string {
  const facts: Record<string, string> = {
    componentCount: String(input.componentCount),
    iconCount: String(input.iconCount),
    version: String(input.version),
  };
  const parts = guide.body.split(/(^```[^\n]*\n[\s\S]*?^```$)/m);
  const body = parts
    .map((part, i) => {
      if (i % 2 === 1) return part; // fenced code stays as written
      return part
        .replace(/^import [^\n]*\n/gm, "")
        .replace(/<table>[\s\S]*?<\/table>/, variantsTable(input))
        .replace(/\{(componentCount|iconCount|version)\}/g, (_, k: string) => facts[k]);
    })
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return `# ${guide.title}\n\n${guide.description}\n\n${body}\n`;
}

export function overviewMd(input: DocsInput): string {
  return (
    [
      "# Psi docs",
      `Psi ${input.version}: ${input.componentCount} React 19 components on OKLCH tokens, where every semantic colour is a formula rather than a swatch. Install it, theme it, and look up every component and token. Every page is also available as markdown at its URL plus \`.md\`.`,
      "- Get started: /docs/get-started/installation/",
      "- Components: /docs/components/button/",
      "- Tokens: /docs/tokens/color/",
      "- Every page as markdown: /docs/llms.txt",
      "- MCP: https://psi.kurkin.de/mcp",
    ].join("\n\n") + "\n"
  );
}
```

`kebab` and `THEMES` are used inside the copied `switch`. If the linter reports either as unused, the switch was not copied whole.

Append to `packages/docs/src/index.ts`:

```ts
export * from "./markdown.js";
```

- [ ] **Step 6: Run the tests**

Run: `pnpm vitest run packages/docs`
Expected: PASS.

- [ ] **Step 7: Make the site's `lib/markdown.ts` an adapter, and update its callers**

Replace the whole of `apps/site/src/lib/markdown.ts` with:

```ts
import {
  componentPageMd as pageMd,
  guideMd as guideOf,
  overviewMd as overviewOf,
  tokenPageMd as tokensMd,
  type ComponentPage,
  type TokenPage,
} from "@handamade/psi-docs";
import { loadDocsInput } from "@handamade/psi-docs/node";

/** The site's twins come from the same builders and the same input as the
 * MCP's `get` (D129), so the two cannot say different things. */
export const componentPageMd = (page: ComponentPage): string => pageMd(loadDocsInput(), page);
export const tokenPageMd = (page: TokenPage): string => tokensMd(loadDocsInput(), page);
export const overviewMd = (): string => overviewOf(loadDocsInput());

export function guideMd(id: string): string {
  const input = loadDocsInput();
  const guide = input.guides.find((g) => g.id === id);
  if (!guide) throw new Error(`No guide "${id}" in @handamade/psi-docs`);
  return guideOf(input, guide);
}
```

Callers:
- `apps/site/src/pages/docs/components/[slug].md.ts`: delete the `examplesFor` import, and call `componentPageMd(page)`.
- `apps/site/src/pages/docs/components/[slug].astro` line 47: `mdSource={componentPageMd(page)}`. Keep its `examplesFor` import; line 26 still uses it to render the live previews.
- `apps/site/src/pages/docs/get-started/[...id].md.ts`: `guideMd((props.entry as { id: string }).id)`.
- `apps/site/src/pages/docs/get-started/[...id].astro` line 22: `mdSource={guideMd(entry.id)}`.

The token and index pages already call `tokenPageMd(page)` and `overviewMd()` and need no change.

- [ ] **Step 8: Build the site and prove the twins did not change**

```bash
pnpm --dir apps/site build
diff -r /tmp/d129-before/docs apps/site/dist/docs -x '*.html' -x 'pagefind' && echo SAME-MD
```

Expected: `SAME-MD`. A guide twin is now built from the file on disk instead of Astro's `entry.body`. `guideMd` trims the body, so the two should match. If one differs, show the diff in the report and fix the loader. Don't change the expected output.

- [ ] **Step 9: Run `test:site` and lint, then commit**

```bash
pnpm test:site && pnpm lint
git add -A packages/docs apps/site
git commit -m "refactor: docs markdown builders are pure functions over one input (D129)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Markdown for single tokens, patterns and topics, and one bundle of every page

**Files:**
- Modify: `packages/docs/src/types.ts` (add `PatternNodeLike`, `PatternLike`, `DocsPages`), `packages/docs/src/markdown.ts`
- Create: `packages/docs/__tests__/bundle.test.ts`

**Interfaces:**
- Consumes: Task 2's builders and `DocsInput`.
- Produces, from `@handamade/psi-docs`:
  - `tokenMd(input: DocsInput, name: string): string`
  - `patternMd(pattern: PatternLike): string`
  - `topicMd(name: string, content: unknown): string`
  - `buildDocsPages(input: DocsInput, extra: { patterns: PatternLike[]; topics: Record<string, unknown> }): DocsPages`
  - types `PatternLike`, `PatternNodeLike`, `DocsPages`

`DocsPages` is the shape Task 4 bakes into the MCP index:

```ts
export interface DocsPages {
  overview: string;
  /** By page slug. */
  components: Record<string, { title: string; members: string[]; markdown: string }>;
  /** By token page slug; title is e.g. "Color tokens". */
  tokenPages: Record<string, { title: string; markdown: string }>;
  /** By guide id. */
  guides: Record<string, { title: string; description: string; markdown: string }>;
  /** By token name, e.g. "bgPrimary". */
  tokens: Record<string, string>;
  /** By pattern id. */
  patterns: Record<string, string>;
  /** By topic name. */
  topics: Record<string, string>;
}
```

- [ ] **Step 1: Add the types**

Append `DocsPages` (above) to `packages/docs/src/types.ts`, plus the pattern shapes. These mirror `packages/mcp/src/types.ts`'s `PatternNode` and `PatternEntry` and must stay structurally compatible with them:

```ts
export interface PatternNodeLike {
  component: string;
  props?: Record<string, unknown>;
  slots?: Record<string, Array<PatternNodeLike | string>>;
  content?: string;
}

export interface PatternLike {
  id: string;
  intent: string;
  match: string[];
  compose: PatternNodeLike;
  parameters: Array<{ key: string; ask: string; options: Array<string | number>; default?: string | number }>;
  content: Record<string, string>;
  gaps: string[];
  blocked: boolean;
  preset: string | null;
}
```

- [ ] **Step 2: Write the failing tests**

`packages/docs/__tests__/bundle.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildDocsPages, componentPageMd, patternMd, tokenMd, topicMd } from "../src/markdown";
import { loadDocsInput } from "../src/node";
import { componentPages, tokenPages } from "../src/pages";
import type { PatternLike } from "../src/types";

const input = loadDocsInput();

const pattern: PatternLike = {
  id: "destructive-confirm",
  intent: "Confirm before deleting.",
  match: ["delete confirmation", "are you sure"],
  compose: {
    component: "Dialog",
    props: { open: "{param:open}" },
    slots: { title: ["{content:title}"], footer: [{ component: "Button", props: { variant: "danger" }, content: "Delete" }] },
  },
  parameters: [{ key: "open", ask: "Is it open?", options: ["open", "closed"], default: "closed" }],
  content: { title: "Delete this item?" },
  gaps: [],
  blocked: false,
  preset: "<Dialog open>…</Dialog>",
};

describe("tokenMd", () => {
  it("gives the custom property, the formula and a row per theme", () => {
    const md = tokenMd(input, "bgPrimary");
    expect(md.startsWith("# `--psi-bg-primary`\n")).toBe(true);
    expect(md).toContain(input.resolved.light.tokens.bgPrimary.formula);
    for (const t of ["light", "dark", "acme", "ember"]) expect(md).toMatch(new RegExp(`^\\| ${t} \\| oklch\\(`, "m"));
  });

  it("throws on an unknown token", () => {
    expect(() => tokenMd(input, "nope")).toThrow(/nope/);
  });
});

describe("patternMd", () => {
  const md = patternMd(pattern);
  it("states intent, matches, parameters, content and the preset", () => {
    expect(md.startsWith("# Pattern: destructive-confirm\n")).toBe(true);
    expect(md).toContain("Confirm before deleting.");
    expect(md).toContain("| `open` | Is it open? | open, closed | closed |");
    expect(md).toContain("- `title`: Delete this item?");
    expect(md).toContain("```tsx\n<Dialog open>…</Dialog>\n```");
  });

  it("draws the compose tree as a nested list", () => {
    expect(md).toContain('- `Dialog` {"open":"{param:open}"}');
    expect(md).toContain("  - footer:");
    expect(md).toContain('    - `Button` {"variant":"danger"}: Delete');
  });

  it("says when a pattern is blocked, and why", () => {
    const blocked = patternMd({ ...pattern, blocked: true, gaps: ["no Combobox"], preset: null });
    expect(blocked).toContain("Blocked. Gaps: no Combobox");
    expect(blocked).not.toContain("```tsx");
  });
});

describe("topicMd", () => {
  it("renders nested guidance as a list", () => {
    const md = topicMd("motion", { reducedMotion: "zero", recipes: { fade: "opacity", list: ["a", "b"] } });
    expect(md).toBe(
      "# Topic: motion\n\n- **reducedMotion**: zero\n- **recipes**:\n  - **fade**: opacity\n  - **list**:\n    - a\n    - b\n",
    );
  });

  it("renders a bare string as a paragraph", () => {
    expect(topicMd("note", "Just text.")).toBe("# Topic: note\n\nJust text.\n");
  });
});

describe("buildDocsPages", () => {
  const pages = buildDocsPages(input, { patterns: [pattern], topics: { motion: { a: 1 } } });

  it("holds every component, token and guide page, identical to its builder", () => {
    expect(Object.keys(pages.components)).toEqual(componentPages.map((p) => p.slug));
    expect(pages.components.tabs.markdown).toBe(componentPageMd(input, componentPages.find((p) => p.slug === "tabs")!));
    expect(Object.keys(pages.tokenPages)).toEqual(tokenPages.map((p) => p.slug));
    expect(pages.tokenPages.color.title).toBe("Color tokens");
    expect(Object.keys(pages.guides)).toEqual(input.guides.map((g) => g.id));
  });

  it("holds every token, and the patterns and topics it was given", () => {
    expect(Object.keys(pages.tokens).length).toBe(Object.keys(input.resolved.light.tokens).length);
    expect(Object.keys(pages.patterns)).toEqual(["destructive-confirm"]);
    expect(pages.topics.motion).toBe("# Topic: motion\n\n- **a**: 1\n");
  });
});
```

- [ ] **Step 3: Run the tests and watch them fail**

Run: `pnpm vitest run packages/docs/__tests__/bundle.test.ts`
Expected: FAIL, because `tokenMd` and the other builders are not exported.

- [ ] **Step 4: Add the builders to `packages/docs/src/markdown.ts`**

Add `formatOklch` to the `./data.js` import, `componentPages` and `tokenPages` to the `./pages.js` import (as values, not types), and `DocsPages`, `PatternLike`, `PatternNodeLike` to the types import. Then append:

```ts
export function tokenMd(input: DocsInput, name: string): string {
  const light = input.resolved.light.tokens[name];
  if (!light) throw new Error(`No token "${name}" in the docs input`);
  return (
    [
      `# \`--psi-${kebab(name)}\``,
      `Token \`${name}\`. Formula: \`${light.formula}\``,
      table(
        ["Theme", "OKLCH", "Hex"],
        THEMES.map((t) => {
          const v = input.resolved[t].tokens[name];
          return [t, formatOklch(v.oklch), v.hex];
        }),
      ),
    ].join("\n\n") + "\n"
  );
}

function composeTree(node: PatternNodeLike | string, indent: string): string[] {
  if (typeof node === "string") return [`${indent}- ${JSON.stringify(node)}`];
  const props = node.props && Object.keys(node.props).length > 0 ? ` ${JSON.stringify(node.props)}` : "";
  const content = node.content ? `: ${node.content}` : "";
  const lines = [`${indent}- \`${node.component}\`${props}${content}`];
  for (const [slot, children] of Object.entries(node.slots ?? {})) {
    lines.push(`${indent}  - ${slot}:`);
    for (const child of children) lines.push(...composeTree(child, `${indent}    `));
  }
  return lines;
}

export function patternMd(p: PatternLike): string {
  const out: string[] = [`# Pattern: ${p.id}`, p.intent, `Matches: ${p.match.join("; ")}.`];
  if (p.parameters.length > 0) {
    out.push(
      "## Parameters",
      table(
        ["Key", "Ask", "Options", "Default"],
        p.parameters.map((q) => [`\`${q.key}\``, q.ask, q.options.join(", "), q.default ?? "—"]),
      ),
    );
  }
  const content = Object.entries(p.content);
  if (content.length > 0) out.push("## Content", content.map(([k, v]) => `- \`${k}\`: ${v}`).join("\n"));
  out.push("## Composition", composeTree(p.compose, "").join("\n"));
  out.push("## Status", p.blocked ? `Blocked. Gaps: ${p.gaps.join("; ")}` : p.gaps.length > 0 ? `Gaps: ${p.gaps.join("; ")}` : "Ready.");
  if (p.preset) out.push("## Preset", fence("tsx", p.preset));
  return out.join("\n\n") + "\n";
}

const isScalar = (v: unknown): v is string | number | boolean => ["string", "number", "boolean"].includes(typeof v);

function topicList(v: unknown, indent: string): string {
  if (Array.isArray(v)) {
    if (v.length === 0) return `${indent}- (none)`;
    return v.map((x) => (isScalar(x) ? `${indent}- ${x}` : `${indent}-\n${topicList(x, `${indent}  `)}`)).join("\n");
  }
  if (v !== null && typeof v === "object") {
    return Object.entries(v)
      .map(([k, x]) => (isScalar(x) ? `${indent}- **${k}**: ${x}` : `${indent}- **${k}**:\n${topicList(x, `${indent}  `)}`))
      .join("\n");
  }
  return `${indent}- ${isScalar(v) ? v : "(none)"}`;
}

export function topicMd(name: string, content: unknown): string {
  return `# Topic: ${name}\n\n${isScalar(content) ? content : topicList(content, "")}\n`;
}

export function buildDocsPages(
  input: DocsInput,
  extra: { patterns: PatternLike[]; topics: Record<string, unknown> },
): DocsPages {
  return {
    overview: overviewMd(input),
    components: Object.fromEntries(
      componentPages.map((p) => [p.slug, { title: p.title, members: p.members, markdown: componentPageMd(input, p) }]),
    ),
    tokenPages: Object.fromEntries(
      tokenPages.map((p) => [p.slug, { title: `${p.title} tokens`, markdown: tokenPageMd(input, p) }]),
    ),
    guides: Object.fromEntries(
      input.guides.map((g) => [g.id, { title: g.title, description: g.description, markdown: guideMd(input, g) }]),
    ),
    tokens: Object.fromEntries(Object.keys(input.resolved.light.tokens).map((n) => [n, tokenMd(input, n)])),
    patterns: Object.fromEntries(extra.patterns.map((p) => [p.id, patternMd(p)])),
    topics: Object.fromEntries(Object.entries(extra.topics).map(([n, c]) => [n, topicMd(n, c)])),
  };
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run packages/docs`
Expected: PASS. If the `topicMd` expectation differs only in how a nested array inside an array is drawn, the test is the spec: fix `topicList`.

- [ ] **Step 6: Lint and commit**

```bash
pnpm lint
git add -A packages/docs
git commit -m "feat(docs): markdown for tokens, patterns and topics, and a bundle of every page (D129)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The MCP bakes the docs and `get` returns markdown

**Files:**
- Create: `packages/mcp/scripts/bake-docs.ts`, `packages/mcp/src/nearest.ts`, `packages/mcp/__tests__/test-index.ts`, `packages/mcp/__tests__/nearest.test.ts`
- Modify: `packages/mcp/package.json`, `packages/mcp/src/types.ts`, `packages/mcp/src/index-builder.ts`, `packages/mcp/scripts/build-index.ts`, `packages/mcp/src/store.ts`, `packages/mcp/src/server.ts`, `packages/mcp/src/index.ts`, `packages/mcp/__tests__/store.test.ts`, `server.test.ts`, `http.test.ts`
- Modify: `apps/site/site-gate/docs.spec.ts` (the parity test)

**Interfaces:**
- Consumes: Task 3's `buildDocsPages` and `DocsPages`.
- Produces:
  - `packages/mcp/src/types.ts`: `DocsPages` (a mirror of psi-docs'), `PsiIndex.docs: DocsPages`, and `BaseIndex = Omit<PsiIndex, "docs">`, which `buildIndex` now returns.
  - `packages/mcp/scripts/bake-docs.ts`: `withDocs(index: BaseIndex): PsiIndex`.
  - `packages/mcp/__tests__/test-index.ts`: `loadTestIndex(): Promise<PsiIndex>`.
  - `packages/mcp/src/nearest.ts`: `distance(a: string, b: string): number`; `closest(target: string, candidates: string[], limit: number): string[]` (no threshold); `nearest(target: string, candidates: string[]): string | null` (with a threshold, used by `check` in Task 7).
  - `packages/mcp/src/store.ts`:
    - `type DocKind = "component" | "tokens" | "guide" | "token" | "pattern" | "topic"`
    - `interface Page { id: string; kind: DocKind; title: string; markdown: string }`
    - `Store { search(query): SearchBrief[]; get(id): Page | null; suggest(id): string[] }`

- [ ] **Step 1: Add the devDependency and the index types**

In `packages/mcp/package.json` `devDependencies`, add `"@handamade/psi-docs": "workspace:*"`. Run `pnpm install`.

In `packages/mcp/src/types.ts`, copy `DocsPages` exactly as it is in Task 3, and change the end of the file to:

```ts
export interface PsiIndex {
  version: string;
  themes: string[];
  components: ComponentEntry[];
  tokens: TokenEntry[];
  patterns: PatternEntry[];
  scales: Record<string, unknown>;
  topics: Record<string, unknown>;
  /** Every docs page and every single-token, pattern and topic page, as
   * markdown, baked from @handamade/psi-docs at publish time (D129). */
  docs: DocsPages;
}

/** What `buildIndex` returns: the index before its docs are baked. */
export type BaseIndex = Omit<PsiIndex, "docs">;
```

In `packages/mcp/src/index-builder.ts`, import `BaseIndex` and change the signature to `export async function buildIndex(inputs: BuildInputs): Promise<BaseIndex>`. The body does not change.

- [ ] **Step 2: Write `scripts/bake-docs.ts`, the test helper, and wire the build**

`packages/mcp/scripts/bake-docs.ts`. It lives outside `src/` so `tsc` never compiles `@handamade/psi-docs`:

```ts
import { buildDocsPages } from "@handamade/psi-docs";
import { loadDocsInput } from "@handamade/psi-docs/node";

import type { BaseIndex, PsiIndex } from "../src/types.js";

/** Adds every docs page, rendered by the same builders the site uses (D129). */
export function withDocs(index: BaseIndex): PsiIndex {
  return { ...index, docs: buildDocsPages(loadDocsInput(), { patterns: index.patterns, topics: index.topics }) };
}
```

`packages/mcp/__tests__/test-index.ts`:

```ts
import { fileURLToPath } from "node:url";

import { withDocs } from "../scripts/bake-docs.js";
import { buildIndex } from "../src/index-builder.js";
import type { PsiIndex } from "../src/types.js";

const pkgs = fileURLToPath(new URL("../..", import.meta.url));

export async function loadTestIndex(): Promise<PsiIndex> {
  return withDocs(
    await buildIndex({
      tokensDist: `${pkgs}tokens/dist`,
      reactDist: `${pkgs}react/dist`,
      reactDocs: `${pkgs}react/docs`,
      version: "0.0.0-test",
    }),
  );
}
```

In `packages/mcp/scripts/build-index.ts`, import `withDocs` from `./bake-docs.js` and wrap the call: `const index = withDocs(await buildIndex({ … }))`. Extend the log line with `, ${Object.keys(index.docs.components).length} docs pages`.

In `store.test.ts`, `server.test.ts` and `http.test.ts`, replace each `beforeAll` call to `buildIndex({...})` with `await loadTestIndex()`, imported from `./test-index.js`, and drop the now-unused `buildIndex`, `fileURLToPath` and `pkgs` lines. `index-builder.test.ts` keeps calling `buildIndex` directly.

- [ ] **Step 3: Write `src/nearest.ts` test-first**

`packages/mcp/__tests__/nearest.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { closest, distance, nearest } from "../src/nearest.js";

describe("distance", () => {
  it("is the Levenshtein edit distance", () => {
    expect(distance("kitten", "sitting")).toBe(3);
    expect(distance("", "abc")).toBe(3);
    expect(distance("same", "same")).toBe(0);
  });
});

describe("nearest", () => {
  it("suggests a close name, case-insensitively", () => {
    expect(nearest("varient", ["variant", "size", "disabled"])).toBe("variant");
    expect(nearest("ICONBUTTON", ["Button", "IconButton"])).toBe("IconButton");
  });

  it("suggests nothing for a wild guess", () => {
    expect(nearest("color", ["variant", "size"])).toBeNull();
  });
});

describe("closest", () => {
  it("returns the n closest, nearest first, with no threshold", () => {
    expect(closest("buton", ["Button", "Banner", "Tabs", "Table"], 2)).toEqual(["Button", "Banner"]);
  });
});
```

Run: `pnpm vitest run packages/mcp/__tests__/nearest.test.ts`
Expected: FAIL (no module).

`packages/mcp/src/nearest.ts`:

```ts
/** Levenshtein edit distance. */
export function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

function ranked(target: string, candidates: string[]): Array<{ c: string; d: number }> {
  const t = target.toLowerCase();
  return candidates
    .map((c) => ({ c, d: distance(t, c.toLowerCase()) }))
    .sort((x, y) => x.d - y.d || x.c.localeCompare(y.c));
}

/** The `limit` closest candidates, nearest first, however far. */
export function closest(target: string, candidates: string[], limit: number): string[] {
  return ranked(target, candidates).slice(0, limit).map((x) => x.c);
}

/** The closest candidate if it is close enough to be a typo, else null:
 * within max(2, a third of the target's length). */
export function nearest(target: string, candidates: string[]): string | null {
  const best = ranked(target, candidates)[0];
  if (!best) return null;
  return best.d <= Math.max(2, Math.floor(target.length / 3)) ? best.c : null;
}
```

Run the test again. Expected: PASS.

- [ ] **Step 4: Rewrite the `get` tests in `store.test.ts` for markdown**

Replace the whole `describe("get", …)` block with:

```ts
describe("get", () => {
  it("returns a component's whole docs page", () => {
    const page = store.get("component:Button")!;
    expect(page).toMatchObject({ id: "component:Button", kind: "component", title: "Button" });
    expect(page.markdown).toBe(index.docs.components.button.markdown);
    expect(page.markdown).toContain("## Examples");
  });

  it("returns the page that holds a member export", () => {
    const page = store.get("TableRow")!;
    expect(page.kind).toBe("component");
    expect(page.markdown).toBe(index.docs.components.table.markdown);
  });

  it("resolves bare names case-insensitively", () => {
    expect(store.get("button")?.id).toBe("component:Button");
  });

  it("returns a token page, a guide, a token, a pattern and a topic as markdown", () => {
    expect(store.get("tokens:color")?.markdown).toBe(index.docs.tokenPages.color.markdown);
    expect(store.get("guide:theming")?.markdown).toBe(index.docs.guides.theming.markdown);
    expect(store.get("token:bgPrimary")?.markdown).toContain("| ember | oklch(");
    expect(store.get("pattern:destructive-confirm")?.markdown).toMatch(/^# Pattern: destructive-confirm\n/);
    expect(store.get("topic:variants")?.markdown).toMatch(/^# Topic: variants\n/);
  });

  it("keeps today's meaning for a bare name that is both a topic and a token page", () => {
    // "motion" is a guidance topic and a token page. Bare names keep their
    // pre-D129 resolution order, so it stays the topic.
    expect(store.get("motion")?.kind).toBe("topic");
    expect(store.get("tokens:motion")?.kind).toBe("tokens");
  });

  it("returns null for an unknown id, and suggests the three nearest", () => {
    expect(store.get("component:Buton")).toBeNull();
    expect(store.suggest("component:Buton")).toHaveLength(3);
    expect(store.suggest("component:Buton")[0]).toBe("component:Button");
  });
});
```

Add to `describe("search", …)`:

```ts
  it("finds guides and token pages by keyword", () => {
    expect(store.search("theming").some((b) => b.id === "guide:theming")).toBe(true);
    expect(store.search("typography").some((b) => b.id === "tokens:typography")).toBe(true);
  });

  it("lists the guides and token pages in one index row each in the overview (D129)", () => {
    const overview = store.search("");
    const guides = overview.find((b) => b.id === "guide:*")!;
    const tokenPages = overview.find((b) => b.id === "tokens:*")!;
    for (const id of Object.keys(index.docs.guides)) expect(guides.summary).toContain(id);
    for (const slug of Object.keys(index.docs.tokenPages)) expect(tokenPages.summary).toContain(slug);
  });
```

Run: `pnpm vitest run packages/mcp/__tests__/store.test.ts`
Expected: FAIL. `get` still returns JSON detail, and `suggest` does not exist.

- [ ] **Step 5: Change `src/store.ts`**

1. Types. Replace `Brief.kind`'s union with `DocKind`, delete the `Detail` type, and add:

```ts
export type DocKind = "component" | "tokens" | "guide" | "token" | "pattern" | "topic";

export interface Page {
  id: string;
  kind: DocKind;
  title: string;
  markdown: string;
}

export interface Store {
  search(query: string): SearchBrief[];
  get(id: string): Page | null;
  /** The three ids nearest an unknown one, for the error message. */
  suggest(id: string): string[];
}
```

Add `import { closest } from "./nearest.js";` at the top.

2. Inside `createStore`, before `briefs`, build the export-to-page map, and fail loudly if an export has no page:

```ts
  const pageOf = new Map<string, string>();
  for (const [slug, page] of Object.entries(index.docs.components)) {
    for (const member of page.members) pageOf.set(member, slug);
  }
  for (const c of index.components) {
    if (!pageOf.has(c.name)) throw new Error(`psi-mcp: export "${c.name}" has no docs page`);
  }
```

3. Append to `briefs`:

```ts
    ...Object.entries(index.docs.guides).map(([id, g]) => ({
      id: `guide:${id}`,
      kind: "guide" as const,
      title: g.title,
      summary: g.description,
    })),
    ...Object.entries(index.docs.tokenPages).map(([slug, p]) => ({
      id: `tokens:${slug}`,
      kind: "tokens" as const,
      title: p.title,
      summary: `Psi's ${p.title.toLowerCase()} with values in every theme.`,
    })),
```

4. Overview. Keyword search uses those briefs. The overview drops them and adds one index row per kind. In the empty-query branch, replace `const topics = briefs.filter((b) => b.kind === "topic");` with:

```ts
      const fixed: Brief[] = [
        ...briefs.filter((b) => b.kind === "topic"),
        {
          id: "guide:*",
          kind: "guide",
          title: "Guides",
          summary: `get guide:<name> — ${Object.keys(index.docs.guides).join(", ")}`,
        },
        {
          id: "tokens:*",
          kind: "tokens",
          title: "Token pages",
          summary: `get tokens:<name> — ${Object.keys(index.docs.tokenPages).join(", ")}`,
        },
      ];
```

Then use `fixed` wherever the branch used `topics`, in both `fits` and `out`. Update the D61 comment's first sentence to: "Topics and the two docs index rows take their full cost".

5. Replace `get` and add `suggest`:

```ts
  function get(id: string): Page | null {
    const [prefix, rest] = id.includes(":") ? id.split(/:(.*)/s) : [null, id];
    const name = (rest ?? id).toLowerCase();
    const want = (kind: DocKind) => prefix === null || prefix === kind;

    // Bare names resolve in the pre-D129 order first (component, token,
    // pattern, topic), then the new kinds, so no existing bare id changes.
    if (want("component")) {
      const c = index.components.find((c) => c.name.toLowerCase() === name);
      const slug = c ? pageOf.get(c.name)! : index.docs.components[name] ? name : null;
      if (slug) {
        const page = index.docs.components[slug];
        return { id: `component:${c?.name ?? page.members[0]}`, kind: "component", title: page.title, markdown: page.markdown };
      }
    }
    if (want("token")) {
      const t = index.tokens.find((t) => t.name.toLowerCase() === name);
      if (t) return { id: `token:${t.name}`, kind: "token", title: t.name, markdown: index.docs.tokens[t.name] };
    }
    if (want("pattern")) {
      const p = index.patterns.find((p) => p.id.toLowerCase() === name);
      if (p) return { id: `pattern:${p.id}`, kind: "pattern", title: p.id, markdown: index.docs.patterns[p.id] };
    }
    if (want("topic")) {
      const key = Object.keys(index.topics).find((k) => k.toLowerCase() === name);
      if (key) return { id: `topic:${key}`, kind: "topic", title: key, markdown: index.docs.topics[key] };
    }
    if (want("tokens")) {
      const page = index.docs.tokenPages[name];
      if (page) return { id: `tokens:${name}`, kind: "tokens", title: page.title, markdown: page.markdown };
    }
    if (want("guide")) {
      const guide = index.docs.guides[name];
      if (guide) return { id: `guide:${name}`, kind: "guide", title: guide.title, markdown: guide.markdown };
    }
    return null;
  }

  const allIds = [
    ...index.components.map((c) => `component:${c.name}`),
    ...index.tokens.map((t) => `token:${t.name}`),
    ...index.patterns.map((p) => `pattern:${p.id}`),
    ...Object.keys(index.topics).map((k) => `topic:${k}`),
    ...Object.keys(index.docs.tokenPages).map((s) => `tokens:${s}`),
    ...Object.keys(index.docs.guides).map((g) => `guide:${g}`),
  ];

  function suggest(id: string): string[] {
    const bare = id.includes(":") ? id.split(/:(.*)/s)[1] ?? id : id;
    const byBare = new Map(allIds.map((full) => [full.split(/:(.*)/s)[1], full]));
    return closest(bare, [...byBare.keys()], 3).map((b) => byBare.get(b)!);
  }

  return { search, get, suggest };
```

In `src/index.ts`, change the store type exports to `export type { Store, Brief, OverviewPatternBrief, SearchBrief, Page, DocKind } from "./store.js";`, and also export `BaseIndex` and `DocsPages` from `./types.js`.

- [ ] **Step 6: Make the `get` tool return markdown**

In `src/server.ts`, replace the `get` description and handler:

```ts
      description:
        "The docs for one id from search, as markdown: a component's whole docs page " +
        "(examples, props, keyboard, theming, rules — the same text as " +
        "psi.kurkin.de/docs/components/<page>.md), a token page ('tokens:color'), a guide " +
        "('guide:theming'), one token ('token:bgPrimary': formula and value in every theme), " +
        "a pattern ('pattern:destructive-confirm': recipe and preset), or a topic " +
        "('topic:variants'). A bare name also works.",
```

```ts
    async ({ id }) => {
      const page = store.get(id);
      if (!page) {
        const near = store.suggest(id);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Unknown id "${id}".${near.length ? ` Nearest: ${near.join(", ")}.` : ""} Use the search tool to discover ids.`,
            },
          ],
        };
      }
      return { content: [{ type: "text", text: page.markdown }] };
    },
```

In `server.test.ts`, replace the `"answers get calls with full detail"` test with:

```ts
  it("answers get calls with the docs page's markdown", async () => {
    const res = (await client.callTool({ name: "get", arguments: { id: "token:bgPrimary" } })) as ToolCallResult;
    expect(res.content[0].text).toMatch(/^# `--psi-bg-primary`\n/);
    expect(res.content[0].text).toContain("| ember | oklch(");
  });
```

Extend `"flags unknown ids as errors without throwing"` with `expect(res.content[0].text).toContain("Nearest:");`.

- [ ] **Step 7: Run the MCP tests**

Run: `pnpm build && pnpm vitest run packages/mcp`
Expected: PASS.

If `"keeps every pattern and the component floor inside the operating envelope"` fails, it's because the two index rows are new fixed cost (about 220 characters). Lower the synthetic pattern count in that test, and in `"stays within the response budget"`, to the largest value that passes, keeping the long-id case. Rewrite the test's comment to record the new edge and the reason ("D129 added two fixed index rows"). **Don't** raise the 6,000-character budget or the component floor.

- [ ] **Step 8: Add the parity test to `test:site`**

In `apps/site/site-gate/docs.spec.ts`, add `import { readFileSync } from "node:fs";` if it isn't there, and append:

```ts
test("the MCP's get returns exactly each docs page's markdown twin (D129)", async ({ request }) => {
  // test:site runs from the repo root, after `pnpm build`.
  const index = JSON.parse(readFileSync("packages/mcp/dist/psi-index.json", "utf8")) as {
    docs: {
      overview: string;
      components: Record<string, { markdown: string }>;
      tokenPages: Record<string, { markdown: string }>;
      guides: Record<string, { markdown: string }>;
    };
  };
  const pairs: Array<[string, string]> = [
    ["/docs/index.md", index.docs.overview],
    ...Object.entries(index.docs.components).map(([s, p]) => [`/docs/components/${s}.md`, p.markdown] as [string, string]),
    ...Object.entries(index.docs.tokenPages).map(([s, p]) => [`/docs/tokens/${s}.md`, p.markdown] as [string, string]),
    ...Object.entries(index.docs.guides).map(([g, p]) => [`/docs/get-started/${g}.md`, p.markdown] as [string, string]),
  ];
  expect(pairs.length).toBeGreaterThan(40);
  for (const [url, markdown] of pairs) {
    const res = await request.get(`${BASE}${url}`);
    expect(res.status(), url).toBe(200);
    expect(await res.text(), url).toBe(markdown);
  }
});
```

`BASE` already comes from `./helpers`. If `docs.spec.ts` doesn't import it yet, add it to the existing helpers import.

- [ ] **Step 9: Run every gate, then commit**

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site
git add -A packages/mcp apps/site/site-gate pnpm-lock.yaml
git commit -m "feat(mcp): get returns the docs page's markdown, baked from @handamade/psi-docs (D129)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: The `theme` tool

**Files:**
- Modify: `packages/tokens/src/generate/culori-shim.d.ts`, `solve.ts`, `palette.ts`, `derive.ts`, `index.ts`
- Create: `packages/tokens/__tests__/generate-mcp-exports.test.ts`
- Modify: `packages/mcp/package.json` (runtime dependency `@handamade/psi-tokens`)
- Create: `packages/mcp/src/theme.ts`, `packages/mcp/__tests__/theme.test.ts`
- Modify: `packages/mcp/src/server.ts`, `packages/mcp/src/index.ts`, `packages/mcp/__tests__/server.test.ts`

**Interfaces:**
- Produces, from `@handamade/psi-tokens/generate`:
  - `parseColor(input: string): { l: number; c: number; h?: number } | null`
  - `contrastReport(theme: DerivedTheme): ContrastResult[]`
  - `ACCENT_CHROMA: Readonly<Record<ChromaWord, number>>`
  - type `ContrastResult`
- Produces, from `packages/mcp/src/theme.ts`:
  - `interface ThemeInput { color?: string; hue?: number; chroma?: ChromaWord; radius?: RadiusRung; name?: string }`
  - `class ThemeError extends Error`
  - `chromaWordFor(c: number): ChromaWord`
  - `themeVector(input: ThemeInput): BrandVector` (throws `ThemeError`)
  - `themeMarkdown(input: ThemeInput): string` (throws `ThemeError`)

- [ ] **Step 1: Write the failing tokens test**

`packages/tokens/__tests__/generate-mcp-exports.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { ACCENT_CHROMA, contrastReport, deriveTheme, parseColor } from "../src/generate/index.js";

describe("parseColor", () => {
  it("reads a hex and an oklch() string", () => {
    const blue = parseColor("#3b82f6")!;
    expect(blue.h).toBeGreaterThan(250);
    expect(blue.h).toBeLessThan(270);
    expect(parseColor("oklch(0.6 0.15 30)")).toEqual({ l: 0.6, c: 0.15, h: 30 });
  });

  it("returns null for text that is not a colour", () => {
    expect(parseColor("not a colour")).toBeNull();
  });

  it("returns no hue for a grey", () => {
    expect(parseColor("#808080")!.h).toBeUndefined();
  });
});

describe("contrastReport", () => {
  it("reports every gated pair of a derived member, all passing", () => {
    const pair = deriveTheme({ hue: 264, chroma: "balanced", mode: "light", radius: 8, name: "t" });
    const report = contrastReport(pair.light);
    expect(report.length).toBeGreaterThan(30);
    expect(report.every((r) => r.pass && r.ratio >= r.minRatio)).toBe(true);
  });
});

describe("ACCENT_CHROMA", () => {
  it("maps each chroma word to a rising chroma", () => {
    expect(ACCENT_CHROMA.muted).toBeLessThan(ACCENT_CHROMA.electric);
  });
});
```

Run: `pnpm vitest run packages/tokens/__tests__/generate-mcp-exports.test.ts`
Expected: FAIL (no such exports).

- [ ] **Step 2: Add the exports to the generator**

In `packages/tokens/src/generate/culori-shim.d.ts`, inside `declare module "culori"`, add next to the other function declarations:

```ts
  export function oklch(color: string | Oklch | Rgb): Oklch | undefined;
```

In `packages/tokens/src/generate/solve.ts`, add `oklch` to the culori import and append:

```ts
/** Any CSS colour string → OKLCH, or null when it does not parse. `h` is
 * left out for a colour with no hue (a grey), where culori leaves it
 * undefined or NaN. */
export function parseColor(input: string): { l: number; c: number; h?: number } | null {
  const o = oklch(input.trim());
  if (!o || !Number.isFinite(o.l) || !Number.isFinite(o.c)) return null;
  return o.h !== undefined && Number.isFinite(o.h) ? { l: o.l, c: o.c, h: o.h } : { l: o.l, c: o.c };
}
```

In `packages/tokens/src/generate/palette.ts`, change `const ACCENT_CHROMA` to `export const ACCENT_CHROMA`.

In `packages/tokens/src/generate/derive.ts`, add `type ContrastResult` to the `../contrast-matrix.js` import and append:

```ts
/** Every gated pair of one derived member, with its ratio — the same matrix
 * deriveTheme checks before it returns. */
export function contrastReport(theme: DerivedTheme): ContrastResult[] {
  return checkContrast(theme.resolved, AA_MATRIX);
}
```

In `packages/tokens/src/generate/index.ts`:
- Add `parseColor` to the `./solve.js` export line.
- Add `contrastReport` to the `./derive.js` export line.
- Add `export { ACCENT_CHROMA } from "./palette.js";` and `export type { ContrastResult } from "../contrast-matrix.js";`.

Run the test again. Expected: PASS. If `parseColor("oklch(0.6 0.15 30)")` returns float noise such as `0.6000000001`, change that assertion to `toBeCloseTo` on each field. Don't round inside `parseColor`.

- [ ] **Step 3: Write the failing MCP theme test**

In `packages/mcp/package.json`, add `"@handamade/psi-tokens": "workspace:*"` to `dependencies` and remove it from `devDependencies`. Run `pnpm install`.

`packages/mcp/__tests__/theme.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { deriveTheme, parseColor } from "@handamade/psi-tokens/generate";

import { ThemeError, chromaWordFor, themeMarkdown, themeVector } from "../src/theme.js";

describe("themeVector", () => {
  it("reduces a hex to its hue and the nearest chroma word", () => {
    const v = themeVector({ color: "#3b82f6" });
    expect(v.hue).toBe(Math.round(parseColor("#3b82f6")!.h!) % 360);
    expect(v.chroma).toBe(chromaWordFor(parseColor("#3b82f6")!.c));
    expect(v).toMatchObject({ radius: 8, mode: "light", name: `brand-${v.hue}` });
  });

  it("takes a hue with explicit chroma, radius and name", () => {
    expect(themeVector({ hue: 30, chroma: "calm", radius: 12, name: "acme-red" })).toEqual({
      hue: 30,
      chroma: "calm",
      radius: 12,
      mode: "light",
      name: "acme-red",
    });
  });

  it("picks the nearest chroma word", () => {
    expect(chromaWordFor(0)).toBe("muted");
    expect(chromaWordFor(0.15)).toBe("balanced");
    expect(chromaWordFor(0.4)).toBe("electric");
  });

  it.each([
    [{}, /color.*or hue/],
    [{ color: "#3b82f6", hue: 10 }, /not both/],
    [{ color: "nope" }, /Could not read "nope"/],
    [{ color: "#808080" }, /no hue/],
    [{ hue: 360 }, /0 to 359/],
    [{ hue: 10, name: "Bad_Name" }, /kebab-case/],
    [{ hue: 10, radius: 5 as never }, /radius/],
    [{ hue: 10, chroma: "loud" as never }, /chroma/],
  ])("rejects %o", (input, message) => {
    expect(() => themeVector(input)).toThrow(ThemeError);
    expect(() => themeVector(input)).toThrow(message);
  });
});

describe("themeMarkdown", () => {
  const md = themeMarkdown({ hue: 264, chroma: "balanced", name: "ocean" });
  const pair = deriveTheme({ hue: 264, chroma: "balanced", mode: "light", radius: 8, name: "ocean" });

  it("emits a light and a dark rule in the theme layer, each with its color-scheme", () => {
    expect(md).toContain('@layer psi.theme {\n  [data-psi-theme="ocean"] {\n    color-scheme: light;');
    expect(md).toContain('@layer psi.theme {\n  [data-psi-theme="ocean-dark"] {\n    color-scheme: dark;');
  });

  it("puts component overrides in the components layer", () => {
    expect(md).toContain('@layer psi.components {\n  [data-psi-theme="ocean"] {\n    --psi-control-radius: var(--psi-radius-8);');
  });

  it("carries exactly the values deriveTheme computes", () => {
    for (const member of [pair.light, pair.dark]) {
      for (const [prop, value] of Object.entries(member.customProperties)) {
        expect(md).toContain(`    ${prop}: ${value};`);
      }
    }
  });

  it("tells the agent how to install it", () => {
    expect(md).toContain('import "@handamade/psi-tokens/light.css";\nimport "./ocean.css";');
    expect(md).toContain('data-psi-theme="ocean-dark"');
  });

  it("lists every gated pair, each at or above its minimum in both members", () => {
    const rows = md.split("\n").filter((l) => /^\| `\w+` on `\w+` \|/.test(l));
    expect(rows.length).toBeGreaterThan(30);
    for (const row of rows) {
      const [, , light, dark, min] = row.split("|").map((c) => c.trim());
      expect(Number(light)).toBeGreaterThanOrEqual(Number(min));
      expect(Number(dark)).toBeGreaterThanOrEqual(Number(min));
    }
  });
});
```

Run: `pnpm build && pnpm vitest run packages/mcp/__tests__/theme.test.ts`
Expected: FAIL (no `../src/theme.js`).

- [ ] **Step 4: Write `packages/mcp/src/theme.ts`**

```ts
import {
  ACCENT_CHROMA,
  CHROMA_WORDS,
  RADIUS_RUNGS,
  contrastReport,
  deriveTheme,
  parseColor,
  type BrandVector,
  type ChromaWord,
  type DerivedTheme,
  type RadiusRung,
} from "@handamade/psi-tokens/generate";

export interface ThemeInput {
  color?: string;
  hue?: number;
  chroma?: ChromaWord;
  radius?: RadiusRung;
  name?: string;
}

/** Bad input, or a theme the solver cannot bring to AA. The tool reports it
 * as isError; it never returns a theme that fails the gate. */
export class ThemeError extends Error {}

const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const DEFAULT_RADIUS: RadiusRung = 8;

export function chromaWordFor(c: number): ChromaWord {
  return CHROMA_WORDS.reduce((best, w) =>
    Math.abs(ACCENT_CHROMA[w] - c) < Math.abs(ACCENT_CHROMA[best] - c) ? w : best,
  );
}

export function themeVector(input: ThemeInput): BrandVector {
  if (input.color !== undefined && input.hue !== undefined) {
    throw new ThemeError("Pass either color or hue, not both.");
  }
  let hue: number;
  let chroma: ChromaWord = input.chroma ?? "balanced";
  if (input.color !== undefined) {
    const parsed = parseColor(input.color);
    if (!parsed) {
      throw new ThemeError(`Could not read "${input.color}" as a colour. Pass a hex such as #3b82f6, or an oklch() string.`);
    }
    if (parsed.h === undefined) {
      throw new ThemeError(`"${input.color}" has no hue (it is a grey). Pass hue (0 to 359) instead.`);
    }
    hue = Math.round(parsed.h) % 360;
    chroma = input.chroma ?? chromaWordFor(parsed.c);
  } else if (input.hue !== undefined) {
    if (!Number.isFinite(input.hue) || input.hue < 0 || input.hue >= 360) {
      throw new ThemeError("hue must be from 0 to 359.");
    }
    hue = Math.round(input.hue) % 360;
  } else {
    throw new ThemeError("Pass color (a hex such as #3b82f6, or an oklch() string) or hue (0 to 359).");
  }
  if (!CHROMA_WORDS.includes(chroma)) {
    throw new ThemeError(`chroma must be one of ${CHROMA_WORDS.join(", ")}.`);
  }
  const radius = input.radius ?? DEFAULT_RADIUS;
  if (!RADIUS_RUNGS.includes(radius)) {
    throw new ThemeError(`radius must be one of ${RADIUS_RUNGS.join(", ")}.`);
  }
  const name = input.name ?? `brand-${hue}`;
  if (!NAME.test(name) || name.length > 64) {
    throw new ThemeError("name must be kebab-case (a-z, 0-9, single hyphens), at most 64 characters.");
  }
  return { hue, chroma, mode: "light", radius, name };
}

function memberCss(selector: string, member: DerivedTheme): string {
  const overrides = member.customerTheme.componentOverrides ?? {};
  const overrideProps = new Set(Object.keys(overrides).map((k) => `--psi-${k}`));
  const lines = [
    "@layer psi.theme {",
    `  ${selector} {`,
    `    color-scheme: ${member.mode};`,
    ...Object.entries(member.customProperties)
      .filter(([prop]) => !overrideProps.has(prop))
      .map(([prop, value]) => `    ${prop}: ${value};`),
    "  }",
    "}",
  ];
  if (overrideProps.size > 0) {
    lines.push(
      "@layer psi.components {",
      `  ${selector} {`,
      ...Object.entries(overrides).map(([k, v]) => `    --psi-${k}: ${v};`),
      "  }",
      "}",
    );
  }
  return lines.join("\n");
}

export function themeMarkdown(input: ThemeInput): string {
  const vector = themeVector(input);
  let pair: ReturnType<typeof deriveTheme>;
  try {
    pair = deriveTheme(vector);
  } catch (err) {
    throw new ThemeError(`The solver could not bring this theme to WCAG AA: ${(err as Error).message}`);
  }
  const { name } = vector;
  const light = contrastReport(pair.light);
  const dark = contrastReport(pair.dark);
  const source = input.color !== undefined ? `\`${input.color}\`` : `hue ${vector.hue}`;
  return (
    [
      `# Theme: ${name}`,
      `From ${source}: hue ${vector.hue}, chroma \`${vector.chroma}\`, radius ${vector.radius}. Light and dark were each solved so every gated pair meets WCAG AA.`,
      "## CSS",
      `Save as \`${name}.css\`.`,
      "```css\n" + memberCss(`[data-psi-theme="${name}"]`, pair.light) + "\n" + memberCss(`[data-psi-theme="${name}-dark"]`, pair.dark) + "\n```",
      "## Use it",
      "Import it after `light.css`, with the other stylesheets Psi needs:",
      "```ts\n" +
        [
          'import "@handamade/psi-tokens/base.css";',
          'import "@handamade/psi-tokens/light.css";',
          `import "./${name}.css";`,
          'import "@handamade/psi-tokens/components.css";',
          'import "@handamade/psi-tokens/utilities.css";',
          'import "@handamade/psi-react/styles";',
        ].join("\n") +
        "\n```",
      `Set \`data-psi-theme="${name}"\` on \`<html>\` or a subtree for light, and \`data-psi-theme="${name}-dark"\` for dark.`,
      "## Contrast",
      [
        "| Pair | Light | Dark | Minimum |",
        "|---|---|---|---|",
        ...light.map((r, i) => `| \`${r.fg}\` on \`${r.bg}\` | ${r.ratio.toFixed(2)} | ${dark[i].ratio.toFixed(2)} | ${r.minRatio} |`),
      ].join("\n"),
    ].join("\n\n") + "\n"
  );
}
```

`contrastReport` runs the same matrix in the same order for both members, so row `i` is the same pair in each. The test checks every row against its minimum.

- [ ] **Step 5: Run the theme tests**

Run: `pnpm vitest run packages/mcp/__tests__/theme.test.ts`
Expected: PASS.

- [ ] **Step 6: Register the tool**

In `packages/mcp/src/server.ts`, import `ThemeError` and `themeMarkdown` from `./theme.js`, and register this tool after `get`:

```ts
  server.registerTool(
    "theme",
    {
      title: "Make a Psi theme from a colour",
      description:
        "Derive a light and a dark Psi theme from one brand colour or a hue, solved so every " +
        "text and control pair meets WCAG AA. Returns the CSS to save, how to import it, and " +
        "the contrast of every gated pair. It never calls a model: to start from a brief such " +
        "as 'calm fintech', choose hue, chroma and radius yourself.",
      inputSchema: {
        color: z.string().optional().describe("A brand colour: a hex such as #3b82f6, or an oklch() string. Pass this or hue."),
        hue: z.number().optional().describe("OKLCH hue, 0 to 359. Pass this or color."),
        chroma: z
          .enum(["muted", "calm", "balanced", "vivid", "electric"])
          .optional()
          .describe("How saturated the accent is. From a colour, the nearest word is picked for you."),
        radius: z
          .union([z.literal(4), z.literal(6), z.literal(8), z.literal(12)])
          .optional()
          .describe("Control corner radius in px. Default 8."),
        name: z.string().optional().describe("kebab-case theme name. Default brand-<hue>."),
      },
    },
    async (input) => {
      try {
        return { content: [{ type: "text", text: themeMarkdown(input) }] };
      } catch (err) {
        if (err instanceof ThemeError) return { isError: true, content: [{ type: "text", text: err.message }] };
        throw err;
      }
    },
  );
```

In `src/index.ts`, add `export { themeMarkdown, themeVector, ThemeError, type ThemeInput } from "./theme.js";`.

In `server.test.ts`, change the tool list assertion to `["get", "search", "theme"]` and rename the test to `"lists the read-only tools"`. Then add:

```ts
  it("answers theme calls with CSS, and bad input as an error", async () => {
    const ok = (await client.callTool({ name: "theme", arguments: { color: "#3b82f6", name: "ocean" } })) as ToolCallResult;
    expect(ok.isError).toBeFalsy();
    expect(ok.content[0].text).toContain('[data-psi-theme="ocean-dark"]');
    const bad = (await client.callTool({ name: "theme", arguments: { color: "nope" } })) as ToolCallResult;
    expect(bad.isError).toBe(true);
    expect(bad.content[0].text).toContain('Could not read "nope"');
  });
```

- [ ] **Step 7: Build, test, lint, commit**

```bash
pnpm build && pnpm vitest run packages/tokens packages/mcp && pnpm lint
git add -A packages/tokens packages/mcp pnpm-lock.yaml
git commit -m "feat(mcp): a theme tool that derives a Psi theme from a colour (D129)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The manifest says which HTML attributes pass through, which names are required, and what each contract means

**Files:**
- Modify: `packages/react/src/a11y-meta.ts`, `packages/react/scripts/emit-manifest.ts`
- Create: `packages/react/scripts/manifest-a11y.test.ts`
- Modify: `packages/react/scripts/emit-manifest.test.ts` (add assertions)

**Interfaces:**
- Produces, in `packages/react/dist/manifest.json`:
  - Each component gains `attributes: string | null`: the most specific React attribute interface its props extend, e.g. `"ButtonHTMLAttributes"`, `"HTMLAttributes"`, or `null` when it passes none through.
  - Each component gains `accessibleName: { oneOf: string[] } | null`.
  - A top-level `contracts: Record<string, string[]>`, copied from `src/contracts.json`.
- Produces `packages/react/dist/attributes.json`: `{ sets: string[][]; components: Record<string, number> }`. `components[name]` indexes `sets`: the exact attribute names that component accepts beyond its declared props (after any `Omit`). A component that passes nothing through is absent.
- Produces, in `a11y-meta.ts`: `A11yEntry.accessibleName?: { oneOf: string[] }`.

- [ ] **Step 1: Write the failing tests**

Look at the top of `packages/react/scripts/emit-manifest.test.ts` to see how it reads `dist/manifest.json`. Then add a `describe` using the same loading code. If it only parses the source, add `import { readFileSync } from "node:fs";` and read `../dist/manifest.json` and `../dist/attributes.json` relative to `import.meta.url`, as `render-preset.test.ts` does with `NodeURL`:

```ts
describe("manifest: attributes, accessible names and contracts (D129)", () => {
  type Entry = { name: string; attributes: string | null; accessibleName: { oneOf: string[] } | null };
  const manifest = JSON.parse(readFileSync(fileURLToPath(new NodeURL("../dist/manifest.json", import.meta.url)), "utf8")) as {
    components: Entry[];
    contracts: Record<string, string[]>;
  };
  const attrs = JSON.parse(readFileSync(fileURLToPath(new NodeURL("../dist/attributes.json", import.meta.url)), "utf8")) as {
    sets: string[][];
    components: Record<string, number>;
  };
  const by = (n: string) => manifest.components.find((c) => c.name === n)!;
  const attributeNames = (n: string) => new Set(attrs.sets[attrs.components[n]] ?? []);

  it("names the attribute interface each component extends", () => {
    expect(by("Button").attributes).toBe("ButtonHTMLAttributes");
    expect(by("Input").attributes).toBe("InputHTMLAttributes");
    expect(by("TableCell").attributes).toBe("TdHTMLAttributes");
    expect(by("MenuItem").attributes).toBeNull();
  });

  it("lists the attribute names that pass through, and leaves out declared props", () => {
    const button = attributeNames("Button");
    for (const a of ["onClick", "disabled", "id", "aria-describedby", "style"]) expect(button.has(a), a).toBe(true);
    expect(button.has("variant")).toBe(false);
    expect(attrs.components.MenuItem).toBeUndefined();
  });

  it("states which components need an accessible name", () => {
    expect(by("IconButton").accessibleName).toEqual({ oneOf: ["aria-label", "aria-labelledby"] });
    expect(by("TabList").accessibleName).toEqual({ oneOf: ["aria-label"] });
    expect(by("Button").accessibleName).toBeNull();
  });

  it("carries the slot contracts", () => {
    expect(manifest.contracts.interactive).toContain("Button");
  });
});
```

`packages/react/scripts/manifest-a11y.test.ts` ties the rule to the prose, so the two can't drift:

```ts
import { describe, expect, it } from "vitest";

import { a11yMeta } from "../src/a11y-meta.js";

describe("accessibleName rules (D129)", () => {
  it("exist exactly where the notes say a component requires an accessible name", () => {
    for (const [name, entry] of Object.entries(a11yMeta)) {
      const says = /requires an accessible name/i.test(entry.notes ?? "");
      expect(entry.accessibleName !== undefined, name).toBe(says);
    }
  });

  it("name only attributes, each a non-empty list", () => {
    for (const [name, entry] of Object.entries(a11yMeta)) {
      if (!entry.accessibleName) continue;
      expect(entry.accessibleName.oneOf.length, name).toBeGreaterThan(0);
      for (const a of entry.accessibleName.oneOf) expect(a, name).toMatch(/^aria-label(ledby)?$/);
    }
  });
});
```

Run: `pnpm vitest run packages/react/scripts/manifest-a11y.test.ts`
Expected: FAIL. The `accessibleName` property does not exist, so `IconButton`, `Menu` and `TabList` fail the first test.

- [ ] **Step 2: Author the rules in `a11y-meta.ts`**

Add the field to the interface:

```ts
export interface A11yEntry {
  keyboard: Array<{ keys: string; behavior: string }>;
  notes?: string;
  /** Machine-readable form of "Requires an accessible name": at least one of
   * these attributes must be present. Read by the MCP's check tool (D129). */
  accessibleName?: { oneOf: string[] };
}
```

Then add `accessibleName` to the three entries whose notes say so:
- `IconButton`: `{ oneOf: ["aria-label", "aria-labelledby"] }`. IconButton passes button attributes through, and its JSDoc says `aria-labelledby` wins when both are given.
- `Menu`: `{ oneOf: ["aria-label"] }`. Menu declares `aria-label` and passes no attributes through.
- `TabList`: `{ oneOf: ["aria-label"] }`. Same as Menu.

Run the a11y test again. Expected: PASS.

- [ ] **Step 3: Record pass-through attributes in `emit-manifest.ts`**

Add `readFileSync` to the `node:fs` import and `import { a11yMeta } from "../src/a11y-meta.js";`.

Replace the parser's `propFilter`. It keeps the same props, and now also records each prop it drops:

```ts
/** Props a component inherits from React's DOM types, per component: the
 * names (what it passes through) and the interfaces they came from. Filled
 * as a side effect of propFilter, which sees every prop before dropping it. */
const inherited: Record<string, { names: Set<string>; parents: Set<string> }> = {};

const parser = withCustomConfig(join(root, "tsconfig.json"), {
  propFilter: (prop, component) => {
    const fromReact = prop.parent?.fileName.includes("node_modules") ?? false;
    if (!fromReact || WELL_KNOWN_PASSTHROUGHS.includes(prop.name)) return true;
    const entry = (inherited[component.name] ??= { names: new Set(), parents: new Set() });
    entry.names.add(prop.name);
    if (prop.parent?.name) entry.parents.add(prop.parent.name);
    return false;
  },
  shouldExtractLiteralValuesFromEnum: true,
  shouldRemoveUndefinedFromOptional: true,
});
```

Keep the two existing comments above the old options and move them onto the new object. Then add a helper below `typeToString`:

```ts
/** The most specific React attribute interface a component's props extend:
 * ButtonHTMLAttributes over HTMLAttributes over AriaAttributes. */
function attributesOf(name: string): string | null {
  const parents = [...(inherited[name]?.parents ?? [])];
  if (parents.length === 0) return null;
  const specific = parents.filter((p) => /HTMLAttributes$/.test(p) && p !== "HTMLAttributes").sort();
  if (specific.length > 0) return specific[0];
  return parents.includes("HTMLAttributes") ? "HTMLAttributes" : parents.sort()[0];
}
```

In the object each component maps to, add after `slots`:

```ts
    attributes: attributesOf(name),
    accessibleName: a11yMeta[name]?.accessibleName ?? null,
```

Replace the final write with one that also writes the contracts and the attribute sets:

```ts
const contracts = JSON.parse(readFileSync(join(root, "src", "contracts.json"), "utf8")) as Record<string, string[]>;

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(
  join(root, "dist", "manifest.json"),
  JSON.stringify({ components: manifest, icons, contracts }, null, 2) + "\n",
);

// The names themselves go in a separate file: ~250 per component would
// quadruple manifest.json. Identical sets are stored once.
const sets: string[][] = [];
const setIndex = new Map<string, number>();
const attributeSetOf: Record<string, number> = {};
for (const name of COMPONENTS) {
  const names = [...(inherited[name]?.names ?? [])].sort();
  if (names.length === 0) continue;
  const key = names.join(",");
  let i = setIndex.get(key);
  if (i === undefined) {
    i = sets.length;
    sets.push(names);
    setIndex.set(key, i);
  }
  attributeSetOf[name] = i;
}
writeFileSync(join(root, "dist", "attributes.json"), JSON.stringify({ sets, components: attributeSetOf }) + "\n");
```

Extend the final `console.log` with `, ${sets.length} attribute sets`.

- [ ] **Step 4: Build `psi-react` and run its tests**

```bash
pnpm --filter @handamade/psi-react build && pnpm vitest run packages/react/scripts
```

Expected: PASS. If `component.name` in `propFilter` turns out not to be the display name, so that `inherited` is keyed differently and `attributeNames("Button")` is empty, key the map by whatever docgen passes. Map it back with `docs.find((d) => d.displayName === name)`, and note this in the report.

- [ ] **Step 5: Make sure nothing that reads the manifest broke**

```bash
pnpm build && pnpm test
```

Expected: PASS. Readers that pick fields (the MCP index builder, the site's loaders, emit-docs) ignore the new fields.

- [ ] **Step 6: Commit**

The changeset comes in Task 9.

```bash
git add -A packages/react
git commit -m "feat(react): the manifest names pass-through attributes, required accessible names and contracts (D129)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 7: The `check` tool: parsing, and the API rules

**Files:**
- Modify: `packages/mcp/package.json` (runtime dependency `@babel/parser`), `packages/mcp/src/types.ts`, `packages/mcp/src/index-builder.ts`, `packages/mcp/__tests__/index-builder.test.ts`
- Create: `packages/mcp/src/check/parse.ts`, `packages/mcp/src/check/rules.ts`, `packages/mcp/src/check/index.ts`, `packages/mcp/__tests__/check.test.ts`
- Modify: `packages/mcp/src/server.ts`, `packages/mcp/src/index.ts`, `packages/mcp/__tests__/server.test.ts`

**Interfaces:**
- Consumes: Task 6's manifest fields and `dist/attributes.json`; Task 4's `nearest`, `loadTestIndex`.
- Produces, in `packages/mcp/src/types.ts`:
  - `ComponentEntry` gains `attributes: string | null`, `attributeSet: number | null`, `accessibleName: { oneOf: string[] } | null`.
  - `PsiIndex` and `BaseIndex` gain `attributeSets: string[][]`, `contracts: Record<string, string[]>`, and `exports: string[]` (every name `@handamade/psi-react` exports, values and types).
- Produces, in `packages/mcp/src/check/index.ts`:
  - `MAX_CODE = 20_000`
  - `class CheckInputError extends Error`
  - `type CheckIndex = Pick<PsiIndex, "components" | "contracts" | "attributeSets" | "exports">`
  - `checkMarkdown(code: string, index: CheckIndex): string`
- Produces, in `packages/mcp/src/check/rules.ts`:
  - `type Rule = "parse" | "unknown-export" | "unknown-prop" | "invalid-value" | "missing-required" | "slot" | "accessible-name"`
  - `interface Finding { line: number; column: number; rule: Rule; message: string }`
  - `interface Report { findings: Finding[]; checked: Map<string, number>; notChecked: Map<string, string>; skipped: string[] }`
  - `runCheck(code: string, index: CheckIndex): Report`
  - `literalUnion(type: string): Array<string | number> | null`
  - Task 8 adds `checkSlots` and `checkAccessibleName` to this file.

- [ ] **Step 1: Carry the new data into the index**

In `packages/mcp/src/types.ts`, add the three fields to `ComponentEntry`:

```ts
  /** The React attribute interface its props extend, e.g. "ButtonHTMLAttributes"; null when none (D129). */
  attributes: string | null;
  /** Index into PsiIndex.attributeSets: the attribute names it passes through. */
  attributeSet: number | null;
  /** At least one of these attributes must be present (D129). */
  accessibleName: { oneOf: string[] } | null;
```

Add these to `PsiIndex`, above `docs`:

```ts
  /** Attribute names components pass through to their element, deduplicated (D129). */
  attributeSets: string[][];
  /** Slot contract name → member components (src/contracts.json). */
  contracts: Record<string, string[]>;
  /** Every name @handamade/psi-react exports, values and types. */
  exports: string[];
```

In `packages/mcp/src/index-builder.ts`:
- Add the three fields to `ManifestComponent`.
- Type the manifest read as `{ components: ManifestComponent[]; contracts: Record<string, string[]> }`.
- Read the attribute sets and the export surface:

```ts
  const attributes = (await readJson(join(inputs.reactDist, "attributes.json"))) as {
    sets: string[][];
    components: Record<string, number>;
  };
  // The export surface, as verify-published reads it: every `export { … }`
  // and `export type { … }` in the compiled entry's declarations.
  const dts = await readFile(join(inputs.reactDist, "index.d.ts"), "utf8");
  const exportNames = [...dts.matchAll(/^export\s+(?:type\s+)?\{([^}]+)\}/gm)].flatMap((m) =>
    m[1]
      .split(",")
      .map((n) => n.trim().split(/\s+as\s+/).pop()!)
      .filter(Boolean),
  );
```

- In the component loop, add:

```ts
      attributes: c.attributes,
      attributeSet: attributes.components[c.name] ?? null,
      accessibleName: c.accessibleName,
```

- Return `attributeSets: attributes.sets`, `contracts: manifest.contracts` and `exports: [...new Set(exportNames)].sort()` with the rest.

Add to `index-builder.test.ts`:

```ts
  it("carries attribute sets, contracts and the export surface (D129)", async () => {
    const button = index.components.find((c) => c.name === "Button")!;
    expect(button.attributes).toBe("ButtonHTMLAttributes");
    expect(index.attributeSets[button.attributeSet!]).toContain("onClick");
    expect(index.contracts.interactive).toContain("Button");
    expect(index.exports).toEqual(expect.arrayContaining(["Button", "ButtonProps", "IconPlus"]));
  });
```

If the file builds the index inside each test instead of in a shared `index`, follow its pattern. Run `pnpm build && pnpm vitest run packages/mcp/__tests__/index-builder.test.ts`. Expected: PASS.

- [ ] **Step 2: Add the parser dependency**

```bash
pnpm --filter @handamade/psi-mcp add @babel/parser@^7.29.0
```

`@babel/parser` depends only on `@babel/types`, which our code doesn't import. The check code uses its own minimal node type, below.

- [ ] **Step 3: Write the failing tests**

`packages/mcp/__tests__/check.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import { CheckInputError, MAX_CODE, checkMarkdown } from "../src/check/index.js";
import { literalUnion } from "../src/check/rules.js";
import type { PsiIndex } from "../src/types.js";
import { loadTestIndex } from "./test-index.js";

let index: PsiIndex;
beforeAll(async () => {
  index = await loadTestIndex();
});

const IMPORT = 'import { Button, IconButton, IconPlus } from "@handamade/psi-react";\n';
const run = (code: string) => checkMarkdown(code, index);
const lines = (md: string, rule: string) => md.split("\n").filter((l) => l.includes(`**${rule}**`));

describe("literalUnion", () => {
  it("reads string and number unions, and refuses anything else", () => {
    expect(literalUnion('"accent" | "ghost"')).toEqual(["accent", "ghost"]);
    expect(literalUnion("24 | 32 | 40 | 48")).toEqual([24, 32, 40, 48]);
    expect(literalUnion("boolean")).toBeNull();
    expect(literalUnion('"a" | string')).toBeNull();
  });
});

describe("check: the API rules", () => {
  it("passes correct code, including pass-through, aria-*, data-*, key and ref", () => {
    const md = run(
      IMPORT +
        'export const A = () => <Button variant="accent" size={32} onClick={() => {}} aria-describedby="h" data-test="x" key="k">Save</Button>;',
    );
    expect(md).toContain("No problems found.");
    expect(md).toContain("1 Psi element: Button.");
  });

  it("flags an import Psi does not export, with the nearest name", () => {
    const md = run('import { Buton } from "@handamade/psi-react";\n');
    expect(lines(md, "unknown-export")[0]).toMatch(/`1:10`.*`Buton`.*did you mean `Button`\?/);
  });

  it("flags an unknown prop, with the nearest name", () => {
    const md = run(IMPORT + '<Button varient="accent">Save</Button>');
    expect(lines(md, "unknown-prop")[0]).toMatch(/`varient`.*did you mean `variant`\?/);
  });

  it("flags a value outside the prop's union, and lists the valid ones", () => {
    const md = run(IMPORT + '<Button size="md" variant="primary">Save</Button>');
    const found = lines(md, "invalid-value");
    expect(found).toHaveLength(2);
    expect(found.join("\n")).toContain("24 | 32 | 40 | 48");
    expect(found.join("\n")).toContain('"accent"');
  });

  it("treats a number written as a string as wrong", () => {
    expect(lines(run(IMPORT + '<Button size="32">Save</Button>'), "invalid-value")[0]).toContain('"32"');
  });

  it("flags a missing required prop", () => {
    const md = run(IMPORT + "<IconButton><IconPlus /></IconButton>");
    expect(lines(md, "missing-required")[0]).toContain("`aria-label`");
  });

  it("follows an aliased import", () => {
    const md = run('import { Button as B } from "@handamade/psi-react";\n<B size="md">x</B>');
    expect(lines(md, "invalid-value")[0]).toContain("`Button`");
  });

  it("checks Psi names with no import, and leaves other components alone", () => {
    const md = run('<Button size="md">x</Button>\n<ProductCard tone="loud" />');
    expect(lines(md, "invalid-value")).toHaveLength(1);
    expect(md).toContain("Not checked: ProductCard (not a Psi export).");
  });

  it("with a Psi import, leaves a component imported from elsewhere alone", () => {
    const md = run(IMPORT + 'import { Card } from "./my-card";\n<Card tone="loud" />');
    expect(md).toContain("Not checked: Card (not imported from @handamade/psi-react).");
    expect(md).toContain("No problems found.");
  });

  it("does not judge spreads or computed values, and says so", () => {
    // Semicolons: without them, "</Button>" + newline + "<IconButton" reads as a less-than.
    const md = run(IMPORT + "<Button {...rest} size={size}>x</Button>;\n<IconButton {...p}><IconPlus /></IconButton>;");
    expect(md).toContain("No problems found.");
    expect(md).toContain("a spread on `Button` at 2:1");
    expect(md).toContain("a computed `size` on `Button` at 2:19");
  });

  it("reports a parse error as a finding, not an exception", () => {
    const md = run('<Button size="md"');
    expect(lines(md, "parse")).toHaveLength(1);
    expect(lines(md, "parse")[0]).toMatch(/^- `1:\d+`/);
  });

  it("reads sibling elements with no wrapper, at their own positions", () => {
    const code = '<Button>A</Button><Button size="md">B</Button>';
    const md = run(code);
    expect(lines(md, "invalid-value")[0]).toContain(`\`1:${code.indexOf('size="md"') + 1}\``);
  });

  it("refuses code over the cap", () => {
    expect(() => run("x".repeat(MAX_CODE + 1))).toThrow(CheckInputError);
  });
});
```

Run: `pnpm vitest run packages/mcp/__tests__/check.test.ts`
Expected: FAIL (no `../src/check/index.js`).

- [ ] **Step 4: Write `src/check/parse.ts`**

```ts
import { parse, type ParserPlugin } from "@babel/parser";

/** The few node fields the check reads. @babel/types is not a dependency of
 * this package, so nodes are typed loosely and narrowed by `type`. */
export interface AnyNode {
  type: string;
  loc?: { start: { line: number; column: number } };
  [key: string]: unknown;
}

export type Parsed =
  | { ok: true; ast: AnyNode; shift: number }
  | { ok: false; message: string; line: number; column: number };

const OPTIONS = { sourceType: "module" as const, plugins: ["jsx", "typescript"] as ParserPlugin[] };

/** Parses a module, or failing that, a run of sibling JSX elements wrapped in
 * a fragment. `shift` is the wrapper's length on line 1. */
export function parseSource(code: string): Parsed {
  try {
    return { ok: true, ast: parse(code, OPTIONS) as unknown as AnyNode, shift: 0 };
  } catch (first) {
    try {
      return { ok: true, ast: parse(`<>${code}</>`, OPTIONS) as unknown as AnyNode, shift: 2 };
    } catch {
      const e = first as { message: string; loc?: { line: number; column: number } };
      return {
        ok: false,
        message: e.message.replace(/\s*\(\d+:\d+\)$/, ""),
        line: e.loc?.line ?? 1,
        column: (e.loc?.column ?? 0) + 1,
      };
    }
  }
}

const SKIP = new Set(["loc", "start", "end", "extra", "range", "leadingComments", "trailingComments", "innerComments"]);

/** Visits every node, depth-first, in source order. */
export function walk(node: unknown, visit: (n: AnyNode) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (!node || typeof node !== "object") return;
  const n = node as AnyNode;
  if (typeof n.type === "string") visit(n);
  for (const [key, value] of Object.entries(n)) {
    if (!SKIP.has(key) && value && typeof value === "object") walk(value, visit);
  }
}

/** 1-based line and column in the code as given, undoing the wrapper. */
export function position(n: AnyNode, shift: number): { line: number; column: number } {
  const start = n.loc?.start ?? { line: 1, column: 0 };
  return { line: start.line, column: start.column + 1 - (start.line === 1 ? shift : 0) };
}

/** An element's tag as written: `Button`, `div`, `Icons.Plus`; null for a namespaced name. */
export function tagOf(name: AnyNode): string | null {
  if (name.type === "JSXIdentifier") return name.name as string;
  if (name.type === "JSXMemberExpression") {
    const object = tagOf(name.object as AnyNode);
    return object ? `${object}.${(name.property as AnyNode).name as string}` : null;
  }
  return null;
}
```

- [ ] **Step 5: Write `src/check/rules.ts`**

```ts
import { nearest } from "../nearest.js";
import type { ComponentEntry } from "../types.js";
import type { CheckIndex } from "./index.js";
import { parseSource, position, tagOf, walk, type AnyNode } from "./parse.js";

export type Rule =
  | "parse"
  | "unknown-export"
  | "unknown-prop"
  | "invalid-value"
  | "missing-required"
  | "slot"
  | "accessible-name";

export interface Finding {
  line: number;
  column: number;
  rule: Rule;
  message: string;
}

export interface Report {
  findings: Finding[];
  /** Psi component → how many elements were checked. */
  checked: Map<string, number>;
  /** Tag → why it was not checked. */
  notChecked: Map<string, string>;
  skipped: string[];
}

const PSI = "@handamade/psi-react";
const ALWAYS_ALLOWED = new Set(["key", "ref"]);

/** The literal members of a manifest type string, or null when any member is
 * not a string or number literal (then the value cannot be judged). */
export function literalUnion(type: string): Array<string | number> | null {
  const out: Array<string | number> = [];
  for (const part of type.split(" | ").map((p) => p.trim())) {
    const quoted = part.match(/^"(.*)"$/);
    if (quoted) out.push(quoted[1]);
    else if (/^-?\d+(\.\d+)?$/.test(part)) out.push(Number(part));
    else return null;
  }
  return out;
}

const show = (v: string | number | boolean) => (typeof v === "string" ? `"${v}"` : String(v));

type AttrValue =
  | { kind: "literal"; value: string | number | boolean }
  | { kind: "jsx"; node: AnyNode }
  | { kind: "computed" };

export interface Attr {
  name: string;
  value: AttrValue;
  node: AnyNode;
}

export interface Element {
  component: ComponentEntry;
  node: AnyNode;
  attrs: Attr[];
  spread: boolean;
  /** The JSX children nodes, as written. */
  children: AnyNode[];
}

function valueOf(value: AnyNode | null): AttrValue {
  if (value === null) return { kind: "literal", value: true };
  if (value.type === "StringLiteral") return { kind: "literal", value: value.value as string };
  if (value.type === "JSXElement" || value.type === "JSXFragment") return { kind: "jsx", node: value };
  if (value.type === "JSXExpressionContainer") {
    const e = value.expression as AnyNode;
    if (e.type === "StringLiteral" || e.type === "NumericLiteral" || e.type === "BooleanLiteral") {
      return { kind: "literal", value: e.value as string | number | boolean };
    }
    if (e.type === "TemplateLiteral" && (e.expressions as unknown[]).length === 0) {
      const [quasi] = e.quasis as AnyNode[];
      return { kind: "literal", value: (quasi.value as { cooked: string }).cooked };
    }
    if (e.type === "UnaryExpression" && e.operator === "-" && (e.argument as AnyNode).type === "NumericLiteral") {
      return { kind: "literal", value: -((e.argument as AnyNode).value as number) };
    }
    if (e.type === "JSXElement" || e.type === "JSXFragment") return { kind: "jsx", node: e };
  }
  return { kind: "computed" };
}

export function runCheck(code: string, index: CheckIndex): Report {
  const report: Report = { findings: [], checked: new Map(), notChecked: new Map(), skipped: [] };
  const parsed = parseSource(code);
  if (!parsed.ok) {
    report.findings.push({ line: parsed.line, column: parsed.column, rule: "parse", message: parsed.message });
    return report;
  }
  const { ast, shift } = parsed;
  const at = (n: AnyNode) => position(n, shift);
  const find = (n: AnyNode, rule: Rule, message: string) => report.findings.push({ ...at(n), rule, message });
  const where = (n: AnyNode) => `${at(n).line}:${at(n).column}`;

  const components = new Map(index.components.map((c) => [c.name, c]));
  const exported = new Set(index.exports);

  // Imports from Psi: local name → exported name.
  const psiLocals = new Map<string, string>();
  const otherLocals = new Set<string>();
  walk(ast, (n) => {
    if (n.type !== "ImportDeclaration") return;
    const fromPsi = (n.source as AnyNode).value === PSI;
    for (const spec of n.specifiers as AnyNode[]) {
      const local = (spec.local as AnyNode).name as string;
      if (!fromPsi) {
        otherLocals.add(local);
        continue;
      }
      if (spec.type !== "ImportSpecifier") continue;
      const imported = spec.imported as AnyNode;
      const name = (imported.name ?? imported.value) as string;
      if (!exported.has(name)) {
        const near = nearest(name, index.exports);
        find(imported, "unknown-export", `\`${name}\` is not exported by ${PSI}${near ? `; did you mean \`${near}\`?` : "."}`);
        continue;
      }
      psiLocals.set(local, name);
    }
  });
  const hasPsiImport = psiLocals.size > 0;

  /** The Psi component a tag names, or null (recording why in notChecked). */
  function componentFor(tag: string): ComponentEntry | null {
    if (/^[a-z]/.test(tag)) return null; // an HTML element
    if (tag.includes(".")) {
      report.notChecked.set(tag, "member expression");
      return null;
    }
    const exportName = hasPsiImport ? psiLocals.get(tag) : components.has(tag) ? tag : undefined;
    if (exportName === undefined) {
      report.notChecked.set(tag, hasPsiImport ? `not imported from ${PSI}` : "not a Psi export");
      return null;
    }
    const component = components.get(exportName);
    if (!component) report.notChecked.set(tag, "a Psi export with no manifest entry");
    return component ?? null;
  }

  const elements: Element[] = [];
  walk(ast, (n) => {
    if (n.type !== "JSXElement") return;
    const opening = n.openingElement as AnyNode;
    const tag = tagOf(opening.name as AnyNode);
    if (!tag) return;
    const component = componentFor(tag);
    if (!component) return;
    const attrs: Attr[] = [];
    let spread = false;
    for (const a of opening.attributes as AnyNode[]) {
      if (a.type === "JSXSpreadAttribute") {
        spread = true;
        continue;
      }
      const nameNode = a.name as AnyNode;
      if (nameNode.type !== "JSXIdentifier") continue; // namespaced, e.g. xlink:href
      attrs.push({ name: nameNode.name as string, value: valueOf(a.value as AnyNode | null), node: a });
    }
    elements.push({ component, node: opening, attrs, spread, children: n.children as AnyNode[] });
    report.checked.set(component.name, (report.checked.get(component.name) ?? 0) + 1);
  });

  for (const el of elements) {
    const c = el.component;
    if (el.spread) report.skipped.push(`a spread on \`${c.name}\` at ${where(el.node)}`);
    const declared = new Map(c.props.map((p) => [p.name, p]));
    const passThrough = new Set(c.attributeSet === null ? [] : index.attributeSets[c.attributeSet]);

    for (const attr of el.attrs) {
      const prop = declared.get(attr.name);
      if (!prop) {
        const allowed =
          ALWAYS_ALLOWED.has(attr.name) || attr.name.startsWith("aria-") || attr.name.startsWith("data-") || passThrough.has(attr.name);
        if (!allowed) {
          const near = nearest(attr.name, [...declared.keys(), ...passThrough]);
          find(attr.node, "unknown-prop", `\`${c.name}\` has no prop \`${attr.name}\`${near ? `; did you mean \`${near}\`?` : "."}`);
        }
        continue;
      }
      if (attr.value.kind === "computed") {
        report.skipped.push(`a computed \`${attr.name}\` on \`${c.name}\` at ${where(attr.node)}`);
        continue;
      }
      const union = literalUnion(prop.type);
      if (union === null || attr.value.kind !== "literal") continue;
      const value = attr.value.value;
      if (!union.some((member) => member === value)) {
        find(attr.node, "invalid-value", `\`${attr.name}\` on \`${c.name}\` is ${show(value)}; it takes ${union.map(show).join(" | ")}.`);
      }
    }

    if (!el.spread) {
      const given = new Set(el.attrs.map((a) => a.name));
      const hasChildren = el.children.some(
        (ch) => !(ch.type === "JSXText" && !(ch.value as string).trim()) && !(ch.type === "JSXExpressionContainer" && (ch.expression as AnyNode).type === "JSXEmptyExpression"),
      );
      for (const p of c.props) {
        if (!p.required || given.has(p.name)) continue;
        if (p.name === "children" && hasChildren) continue;
        find(el.node, "missing-required", `\`${c.name}\` needs \`${p.name}\`.`);
      }
    }
  }

  return report;
}
```

A spread is reported at its element's opening tag (`2:1`). A computed value is reported at its attribute (`2:19` for `size`). `IMPORT` occupies line 1. Note that a snippet like `<A/>` + newline + `<B/>`, written with no semicolon, does not parse as a module: `<` continues the expression as a less-than. With no import, the fragment fallback in `parseSource` handles it. With an import, the snippet needs semicolons, as the tests use.

- [ ] **Step 6: Write `src/check/index.ts`**

```ts
import type { PsiIndex } from "../types.js";
import { runCheck, type Report } from "./rules.js";

export const MAX_CODE = 20_000;

/** Input the tool refuses outright; reported as isError. */
export class CheckInputError extends Error {}

export type CheckIndex = Pick<PsiIndex, "components" | "contracts" | "attributeSets" | "exports">;

function summary(report: Report): string[] {
  const total = [...report.checked.values()].reduce((a, b) => a + b, 0);
  const names = [...report.checked.entries()].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name));
  const out = [total === 0 ? "No Psi elements found." : `${total} Psi element${total === 1 ? "" : "s"}: ${names.join(", ")}.`];
  if (report.notChecked.size > 0) {
    out.push(`Not checked: ${[...report.notChecked.entries()].map(([tag, why]) => `${tag} (${why})`).join(", ")}.`);
  }
  if (report.skipped.length > 0) out.push(`Skipped: ${report.skipped.join("; ")}.`);
  return out;
}

/** Reports Psi components, props, values, slots and accessible names in a
 * JSX snippet that do not match the manifest. Never rewrites the code. */
export function checkMarkdown(code: string, index: CheckIndex): string {
  if (code.length > MAX_CODE) {
    throw new CheckInputError(`code is ${code.length} characters; the limit is ${MAX_CODE}.`);
  }
  const report = runCheck(code, index);
  const findings = [...report.findings].sort((a, b) => a.line - b.line || a.column - b.column);
  const head =
    findings.length === 0 ? "No problems found." : `${findings.length} problem${findings.length === 1 ? "" : "s"}.`;
  return (
    [
      "# Check",
      head,
      ...(findings.length > 0
        ? [findings.map((f) => `- \`${f.line}:${f.column}\` **${f.rule}** ${f.message}`).join("\n")]
        : []),
      "## Checked",
      summary(report).join("\n\n"),
    ].join("\n\n") + "\n"
  );
}
```

- [ ] **Step 7: Run the check tests**

Run: `pnpm vitest run packages/mcp/__tests__/check.test.ts`
Expected: PASS. If one fails, fix the code, not the expectation. The tests are the spec. Two exceptions:
- **Columns:** if a column expectation is off because Babel reports a different node start, print the actual finding and adjust only the number. Say so in the report.
- **`unknown-prop` suggestions:** the nearest-name candidates include the pass-through attribute names. If a test's expected suggestion loses to an attribute name, show the actual output in the report before changing anything.

- [ ] **Step 8: Register the tool**

In `packages/mcp/src/server.ts`, import `CheckInputError` and `checkMarkdown` from `./check/index.js`. `createPsiServer` currently receives a `Store` only, and the check needs the index, so change its signature to `createPsiServer(store: Store, version: string, index: CheckIndex)`. Update the three callers:
- `src/cli.ts`: `createPsiServer(createStore(index), index.version, index)`
- `src/http.ts`: `createPsiServer(store, index.version, index)`
- `server.test.ts`: the same as `cli.ts`

Register the tool after `theme`:

```ts
  server.registerTool(
    "check",
    {
      title: "Check JSX against the Psi API",
      description:
        "Report where a JSX snippet uses Psi wrongly: a name Psi does not export, an unknown " +
        "prop, a value outside a prop's allowed values (size=\"md\", variant=\"primary\"), a " +
        "missing required prop, a child a slot does not accept, or a component without the " +
        "accessible name it needs. Reports only; never rewrites the code. Spreads and computed " +
        "values are listed as skipped, not guessed.",
      inputSchema: {
        code: z.string().describe("TSX or JSX: a module, or one or more elements. At most 20000 characters."),
      },
    },
    async ({ code }) => {
      try {
        return { content: [{ type: "text", text: checkMarkdown(code, index) }] };
      } catch (err) {
        if (err instanceof CheckInputError) return { isError: true, content: [{ type: "text", text: err.message }] };
        throw err;
      }
    },
  );
```

In `src/index.ts`, add `export { checkMarkdown, CheckInputError, MAX_CODE, type CheckIndex } from "./check/index.js";`.

In `server.test.ts`, the tool list becomes `["check", "get", "search", "theme"]`. Add:

```ts
  it("answers check calls with findings, and over-long code as an error", async () => {
    const res = (await client.callTool({ name: "check", arguments: { code: '<Button size="md">x</Button>' } })) as ToolCallResult;
    expect(res.content[0].text).toContain("**invalid-value**");
    const long = (await client.callTool({ name: "check", arguments: { code: "x".repeat(20_001) } })) as ToolCallResult;
    expect(long.isError).toBe(true);
  });
```

In `http.test.ts`, add three calls through the handler, each a copy of the `"answers tools/call without a session"` test:
- `get` with `{ id: "component:Button" }`: assert the text contains `## Examples`.
- `theme` with `{ hue: 264, name: "ocean" }`: assert it contains `[data-psi-theme=\"ocean-dark\"]`.
- `check` with `{ code: '<Button size="md">x</Button>' }`: assert it contains `invalid-value`.

- [ ] **Step 9: Build, test, lint, commit**

```bash
pnpm build && pnpm vitest run packages/mcp && pnpm lint
git add -A packages/mcp pnpm-lock.yaml
git commit -m "feat(mcp): a check tool that reports JSX using Psi's API wrongly (D129)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: `check` learns slot contracts and accessible names

**Files:**
- Modify: `packages/mcp/src/check/rules.ts`, `packages/mcp/__tests__/check.test.ts`

**Interfaces:**
- Consumes: Task 7's `Element`, `Report`, `runCheck`; the index's `contracts` and `ComponentEntry.slots` / `accessibleName`.
- Produces, in `rules.ts`:
  - `checkSlots(el: Element, index: CheckIndex, ctx: RuleContext): void`
  - `checkAccessibleName(el: Element, ctx: RuleContext): void`
  - `interface RuleContext { find(n: AnyNode, rule: Rule, message: string): void; where(n: AnyNode): string; report: Report; exportOf(tag: string): string | null }`

- [ ] **Step 1: Write the failing tests**

Append to `packages/mcp/__tests__/check.test.ts`:

```ts
describe("check: slots (D45 contracts)", () => {
  const PSI =
    'import { Banner, Button, DescriptionItem, DescriptionList, Link, Tab, TabList, TabPanel, Tabs } from "@handamade/psi-react";\n';

  it("flags a child the slot does not accept", () => {
    const md = run(PSI + "<DescriptionList><p>x</p></DescriptionList>");
    expect(lines(md, "slot")[0]).toMatch(/`DescriptionList`'s children take DescriptionItem; got <p>\./);
  });

  it("flags too few children", () => {
    const md = run(PSI + "<DescriptionList></DescriptionList>");
    expect(lines(md, "slot")[0]).toContain("`DescriptionList`'s children need at least 1 child.");
  });

  it("checks a slot passed as a prop", () => {
    const bad = run(PSI + '<Banner action={<Link href="/">Undo</Link>}>Saved.</Banner>');
    expect(lines(bad, "slot")[0]).toMatch(/`Banner`'s `action` takes .*Button.*; got <Link>\./);
    const good = run(PSI + "<Banner action={<Button>Undo</Button>}>Saved.</Banner>");
    expect(lines(good, "slot")).toHaveLength(0);
  });

  it("accepts a member of a named contract", () => {
    // Banner's action accepts the inline-content contract, which includes Tag.
    const md = run('import { Banner, Tag } from "@handamade/psi-react";\n<Banner action={<Tag>New</Tag>}>Saved.</Banner>');
    expect(lines(md, "slot")).toHaveLength(0);
  });

  it("looks through fragments, and skips computed children", () => {
    expect(lines(run(PSI + "<DescriptionList><><p>x</p></></DescriptionList>"), "slot")).toHaveLength(1);
    const md = run(PSI + "<DescriptionList>{items.map((i) => <DescriptionItem key={i} term={i}>x</DescriptionItem>)}</DescriptionList>");
    expect(lines(md, "slot")).toHaveLength(0);
    expect(md).toContain("computed children of `DescriptionList`");
  });

  it("passes a correct Tabs tree", () => {
    const md = run(
      PSI + '<Tabs value="a" onChange={() => {}}><TabList aria-label="Sections"><Tab value="a">A</Tab></TabList><TabPanel value="a">x</TabPanel></Tabs>',
    );
    expect(lines(md, "slot")).toHaveLength(0);
    expect(lines(md, "accessible-name")).toHaveLength(0);
  });
});

describe("check: accessible names", () => {
  it("flags a TabList with no name", () => {
    const md = run('import { TabList, Tab } from "@handamade/psi-react";\n<TabList><Tab value="a">A</Tab></TabList>');
    expect(lines(md, "accessible-name")[0]).toContain("`TabList` needs an accessible name: pass `aria-label`.");
  });

  it("does not repeat what missing-required already says", () => {
    // IconButton's aria-label is a required prop, so missing-required reports it.
    const md = run(IMPORT + "<IconButton><IconPlus /></IconButton>");
    expect(lines(md, "missing-required")).toHaveLength(1);
    expect(lines(md, "accessible-name")).toHaveLength(0);
  });

  it("skips an element with a spread", () => {
    expect(lines(run('import { TabList } from "@handamade/psi-react";\n<TabList {...p} />'), "accessible-name")).toHaveLength(0);
  });
});
```

`Tabs` may require other props than `value` and `onChange`. Before running, check `Tabs`' required props in `packages/react/dist/manifest.json`, and give the "correct Tabs tree" test every required prop, so it expects no findings of any rule.

Run: `pnpm vitest run packages/mcp/__tests__/check.test.ts`
Expected: the new tests FAIL. Task 7's still pass.

- [ ] **Step 2: Add the rules to `rules.ts`**

Above `runCheck`, add:

```ts
export interface RuleContext {
  find(n: AnyNode, rule: Rule, message: string): void;
  where(n: AnyNode): string;
  report: Report;
  /** The Psi export a tag names, or null. */
  exportOf(tag: string): string | null;
}

type Item = { kind: "element"; tag: string } | { kind: "text" } | { kind: "computed" };

function itemsOf(nodes: AnyNode[]): Item[] {
  const out: Item[] = [];
  for (const n of nodes) {
    if (n.type === "JSXText") {
      if ((n.value as string).trim()) out.push({ kind: "text" });
    } else if (n.type === "JSXElement") {
      const tag = tagOf((n.openingElement as AnyNode).name as AnyNode);
      out.push(tag ? { kind: "element", tag } : { kind: "computed" });
    } else if (n.type === "JSXFragment") {
      out.push(...itemsOf(n.children as AnyNode[]));
    } else if (n.type === "JSXExpressionContainer") {
      const e = n.expression as AnyNode;
      if (e.type === "JSXEmptyExpression") continue;
      if (e.type === "StringLiteral" || e.type === "NumericLiteral" || e.type === "TemplateLiteral") out.push({ kind: "text" });
      else if (e.type === "JSXElement" || e.type === "JSXFragment") out.push(...itemsOf([e]));
      else out.push({ kind: "computed" });
    } else {
      out.push({ kind: "computed" });
    }
  }
  return out;
}

const CARDINALITY: Record<string, [number, number | null]> = {
  "0..1": [0, 1],
  "1..1": [1, 1],
  "0..*": [0, null],
  "1..*": [1, null],
};

export function checkSlots(el: Element, index: CheckIndex, ctx: RuleContext): void {
  const c = el.component;
  for (const slot of c.slots) {
    const label = slot.name === "body" ? `\`${c.name}\`'s children` : `\`${c.name}\`'s \`${slot.name}\``;
    let items: Item[];
    if (slot.name === "body") {
      items = itemsOf(el.children);
    } else {
      const attr = el.attrs.find((a) => a.name === slot.name);
      if (!attr) {
        items = [];
      } else if (attr.value.kind === "jsx") {
        items = itemsOf([attr.value.node]);
      } else if (attr.value.kind === "literal") {
        items = [{ kind: "text" }];
      } else {
        items = [{ kind: "computed" }];
      }
    }
    if (items.some((i) => i.kind === "computed")) {
      ctx.report.skipped.push(
        `computed ${slot.name === "body" ? "children" : `\`${slot.name}\``} of \`${c.name}\` at ${ctx.where(el.node)}`,
      );
      continue;
    }

    const accepts = [
      ...(slot.accepts.components ?? []),
      ...(slot.accepts.contracts ?? []).flatMap((k) => index.contracts[k] ?? []),
    ];
    if (accepts.length > 0) {
      const allowed = new Set(accepts);
      const list = [...allowed].join(", ");
      for (const item of items) {
        const name = item.kind === "element" ? ctx.exportOf(item.tag) : null;
        if (name && allowed.has(name)) continue;
        const got = item.kind === "element" ? `<${item.tag}>` : "text";
        ctx.find(el.node, "slot", `${label} take${slot.name === "body" ? "" : "s"} ${list}; got ${got}.`);
      }
    }

    if (el.spread) continue; // a spread may supply children or the prop
    const [min, max] = CARDINALITY[slot.cardinality] ?? [0, null];
    const requiredProp = c.props.some((p) => p.name === slot.name && p.required);
    if (items.length < min && !requiredProp) {
      ctx.find(el.node, "slot", `${label} need${slot.name === "body" ? "" : "s"} at least ${min} ${slot.name === "body" ? "child" : "element"}.`);
    }
    if (max !== null && items.length > max) {
      ctx.find(el.node, "slot", `${label} take${slot.name === "body" ? "" : "s"} at most ${max}; got ${items.length}.`);
    }
  }
}

export function checkAccessibleName(el: Element, ctx: RuleContext): void {
  const rule = el.component.accessibleName;
  if (!rule || el.spread) return;
  const given = new Set(el.attrs.map((a) => a.name));
  if (rule.oneOf.some((a) => given.has(a))) return;
  // A required naming prop is already reported by missing-required.
  if (el.component.props.some((p) => p.required && rule.oneOf.includes(p.name))) return;
  ctx.find(
    el.node,
    "accessible-name",
    `\`${el.component.name}\` needs an accessible name: pass ${rule.oneOf.map((a) => `\`${a}\``).join(" or ")}.`,
  );
}
```

`label` is a possessive ("`X`'s children"), so for `body` the verb agrees with "children" (take, need), and for a prop slot with the singular slot name (takes, needs). The test strings above match this exactly.

- [ ] **Step 3: Call them from `runCheck`**

Inside `runCheck`, after `componentFor`, define:

```ts
  const ctx: RuleContext = {
    find,
    where,
    report,
    exportOf: (tag) => {
      if (tag.includes(".") || /^[a-z]/.test(tag)) return null;
      const name = hasPsiImport ? psiLocals.get(tag) : components.has(tag) ? tag : undefined;
      return name ?? null;
    },
  };
```

`componentFor` records not-checked tags as a side effect. `exportOf` must not, so it repeats the lookup rather than calling `componentFor`.

At the end of the `for (const el of elements)` loop body, add:

```ts
    checkSlots(el, index, ctx);
    checkAccessibleName(el, ctx);
```

- [ ] **Step 4: Run all check tests**

Run: `pnpm vitest run packages/mcp/__tests__/check.test.ts`
Expected: PASS, Task 7's tests included. If a Task 7 test now fails because a slot finding appeared, the test code is the spec. Example: `<IconButton><IconPlus /></IconButton>`, where IconButton has no slots file, so no slot finding should appear. If one does appear, the slot code is wrong. Don't add props to the old tests to silence it.

- [ ] **Step 5: Lint and commit**

```bash
pnpm lint
git add -A packages/mcp
git commit -m "feat(mcp): check reports slot contracts and missing accessible names (D129)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 9: Say so everywhere, prove the published package works, and run every gate

**Files:**
- Modify: `packages/mcp/src/init.ts`, `packages/mcp/__tests__/init.test.ts` (if it asserts the old line), `packages/mcp/README.md`, `packages/mcp/llms.txt`, `README.md`, `llms.txt`, `CLAUDE.md`, `packages/docs/guides/ai.mdx`, `apps/site/src/sections/AgentReady.tsx`, `tools/verify-published.mjs`, `docs/superpowers/specs/2026-11-17-mcp-expansion-design.md`
- Create: `.changeset/mcp-expansion.md`

**Interfaces:**
- Consumes: everything above. `themeMarkdown`, `checkMarkdown`, `createStore` and `loadIndex` are exported from `@handamade/psi-mcp`'s root.

- [ ] **Step 1: `init` names the four tools**

In `packages/mcp/src/init.ts`:
- Change `renderAgentsBlock`'s parameter type to `index: Pick<PsiIndex, "version" | "themes" | "components">`, since it reads nothing else.
- Replace the `"## Live documentation (MCP, tools: search/get)",` line with:

```ts
    "## Live documentation (MCP)",
    "- Tools: search, get (a docs page as markdown), theme (an AA-solved theme from a colour), check (JSX that uses Psi wrongly)",
```

If `__tests__/init.test.ts` asserts the old heading, update it to the new one. Run `pnpm vitest run packages/mcp/__tests__/init.test.ts`. Expected: PASS.

- [ ] **Step 2: Replace every statement of "two tools" or "search/get"**

Find them all first:

```bash
git grep -n -i "search/get\|two tools\|two read-only\|search(query)\` →\|The two tools" -- ':!docs/superpowers' ':!**/CHANGELOG.md' ':!apps/site/src/content/updates.ts'
```

`updates.ts` is a dated history and stays as written. Then edit each file:

`packages/mcp/README.md`:
- In line 3, replace "through two read-only tools. It does not write code." with "through four tools that return text and change nothing: none writes your files or calls a model."
- Replace the `Tools:` line with:

```markdown
Tools: `search(query)` → compact briefs with ids · `get(id)` → the docs page as markdown (`component:Button`, `tokens:color`, `guide:theming`, `token:bgPrimary`, `topic:variants`, or a bare name) · `theme({ color })` → an AA-solved light and dark theme as CSS · `check({ code })` → where JSX uses Psi wrongly.
```

Root `README.md`: replace its `Tools:` line with the same line.

`packages/mcp/llms.txt`: replace lines 3 to 6, from "Two read-only tools…" through the `Ids:` line, with:

```text
Four tools over a baked index of the generated artifacts. Each returns text; none writes files or calls a model (D43, D129):
- search(query): briefs {id, kind, title, summary}; empty query = overview, where pattern rows are {id, kind, summary} (the id names the pattern, D100) and guides and token pages get one row each (guide:*, tokens:*)
- get(id): markdown. component → its whole docs page, identical to psi.kurkin.de/docs/components/<page>.md (examples, props, keyboard, theming, rules) | tokens:<page> → a token page | guide:<id> → a guide | token → formula + OKLCH/hex per theme | topic → guidance | pattern → compose tree, parameters, content, gaps/blocked, preset JSX
- theme({color | hue, chroma?, radius?, name?}): CSS for an AA-solved light and dark theme ([data-psi-theme="<name>"] and "<name>-dark"), install lines, contrast table
- check({code}): findings on a JSX snippet: unknown-export, unknown-prop, invalid-value, missing-required, slot, accessible-name; spreads and computed values are skipped, never guessed
Ids: component:<Name>, tokens:<page>, guide:<id>, token:<name>, topic:<key>, pattern:<id>; bare names resolve case-insensitively.
```

Keep the last three lines (Connect, Agent context, The index bakes…). In the last one, add "+ every docs page's markdown, rendered by the same builders as the docs site (D129)" before " at publish". Keep its "24 composition patterns" wording exactly, because `check-docs-drift` counts it.

Root `llms.txt` line 5: replace `MCP tools (search/get)` with `MCP tools (search, get, theme, check)`.

`CLAUDE.md` line 11: replace `MCP server (search/get) over manifest+guidance+resolved tokens` with `MCP server (search, get, theme, check) over manifest+guidance+resolved tokens and the docs pages' markdown`, and `(D43–D44)` with `(D43–D44, D129)`.

`packages/docs/guides/ai.mdx`: replace "The Psi MCP server has two read-only tools. It does not write code." with "The Psi MCP server has four tools. Each returns text and changes nothing: none writes your files or calls a model." Replace the whole `## The two tools` section, up to `## Give your project agent context`, with:

```mdx
## The four tools

`search(query)` returns short briefs with ids. An empty query returns an overview.

`get(id)` returns the docs for one id as markdown. For a docs page it is the same text as the page's `.md` version.

| Id | What `get` returns |
| --- | --- |
| `component:Button` | The component's docs page: examples, props, keyboard and theming |
| `tokens:color` | A token page, with values in every theme |
| `guide:theming` | A guide from these docs |
| `token:bgPrimary` | One token's formula and its value in every theme |
| `topic:variants` | Usage guidance |
| `pattern:<id>` | A composition recipe: parameters, content, gaps and preset JSX |

A bare name such as `Button` also resolves, without regard to case.

`theme({ color })` derives a light and a dark theme from one brand colour, or from a hue. Both are solved so every text and control pair meets WCAG AA. It returns the CSS to save, how to import it, and the contrast of every pair. To start from a brief rather than a colour, the assistant picks the hue, chroma and radius itself.

`check({ code })` reads JSX and reports where it uses Psi wrongly: a name Psi does not export, an unknown prop, a value outside a prop's allowed values, a missing required prop, a child a slot does not accept, or a missing accessible name. It does not rewrite the code.

```

`apps/site/src/sections/AgentReady.tsx`: the heading becomes `Four tools, zero hallucinated props.`, and the lede becomes:

```tsx
            Search, get, theme and check answer from the same generated
            artifacts the build gates on — every prop union, every token
            formula, every theme value.
```

Run the grep again. Expected: no lines.

- [ ] **Step 3: The publish check installs `psi-mcp` and runs its tools**

In `tools/verify-published.mjs`:
- Add `const MCP_PKG = "@handamade/psi-mcp";` next to `REACT_PKG` and `TOKENS_PKG`.
- Add `` `${MCP_PKG}@${version}` `` to the first `install([...])` call.
- Add `MCP_PKG` to the LICENSE loop's array.

Then, after the export-resolution loop and before `// ── The public export surface`, insert:

```js
  // ── The MCP's tools run from the installed tarball (D129) ─────────────
  // psi-mcp now has runtime dependencies (psi-tokens, @babel/parser) and a
  // baked docs index; only a real install proves they resolve.
  const smoke = `
import { loadIndex, createStore, themeMarkdown, checkMarkdown } from "${MCP_PKG}";
const index = await loadIndex();
const page = createStore(index).get("component:Button");
if (!page || !page.markdown.includes("## Examples")) throw new Error("get: no Button docs page");
if (!themeMarkdown({ color: "#3b82f6", name: "smoke" }).includes('[data-psi-theme="smoke-dark"]')) throw new Error("theme: no dark rule");
if (!checkMarkdown('<Button size="md">x</Button>', index).includes("invalid-value")) throw new Error("check: missed size=md");
console.log("psi-mcp-ok");
`;
  let mcpOk = true;
  let mcpDetail = "";
  try {
    const out = String(run("node", ["--input-type=module", "-e", smoke], dir));
    mcpOk = out.includes("psi-mcp-ok");
    if (!mcpOk) mcpDetail = out.trim().split("\n")[0];
  } catch (e) {
    mcpOk = false;
    mcpDetail = String(e.stderr ?? e).split("\n").find((l) => l.includes("Error")) ?? "failed";
  }
  note(mcpOk, "psi-mcp get, theme and check run from the tarball", mcpDetail);
```

Read `run`'s definition at the top of the file. If it doesn't return stdout, use its sibling pattern for capturing output instead. It can't be run against an unpublished version, so check its syntax only:

```bash
node --check tools/verify-published.mjs
```

Expected: no output.

- [ ] **Step 4: The changeset, and the spec's status**

`.changeset/mcp-expansion.md`:

```markdown
---
"@handamade/psi-mcp": minor
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
---

The MCP answers with the docs (D129). `get` now returns each docs page's own markdown, the same text as psi.kurkin.de/docs/…/<page>.md, examples included, **instead of JSON**: anything that parsed `get`'s JSON must read markdown instead. Two new tools: `theme` derives a light and dark theme, solved to WCAG AA, from one colour or a hue, and `check` reports JSX that uses Psi's API wrongly (unknown exports, props and values, missing required props, slot contracts, missing accessible names). None of the four tools writes files or calls a model. `manifest.json` gains `attributes`, `accessibleName` and `contracts`, with the pass-through attribute names in `dist/attributes.json`; `@handamade/psi-tokens/generate` exports `parseColor`, `contrastReport` and `ACCENT_CHROMA`.
```

In the spec, change the status line to `Date: 2026-11-17. Status: **Implemented** on branch \`d129-mcp-expansion\`.`

- [ ] **Step 5: Re-check the decision number**

```bash
git fetch -q origin
for r in $(git for-each-ref --format='%(refname)' refs/heads refs/remotes/origin); do git grep -l "D129" "$r" -- docs 2>/dev/null; done | sort -u | grep -v "d129-mcp-expansion"
grep -rlw "D129" ../*/docs/superpowers/specs 2>/dev/null | grep -v d129-mcp-expansion
```

Expected: no output. If another branch or worktree claims D129, stop and report it. Renumbering touches every commit message and file in this plan, so it's the user's call.

- [ ] **Step 6: All five gates**

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site
```

Expected: every step passes. `test:site` includes the parity test from Task 4. `vr` runs in CI only. Storybook is untouched, so no baseline should move.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs: four MCP tools, everywhere they are described; publish check runs them (D129)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After the plan

Opening the PR is the finishing step, not a task. Per `CLAUDE.md`:
- Arm auto-merge (`gh pr merge <n> --auto --squash`), then read it back with `gh pr view <n> --json autoMergeRequest`. If it reads `null`, use the `enablePullRequestAutoMerge` GraphQL mutation.
- After merge, cut a release, since `.changeset/` is non-empty.
- Run `pnpm verify:published <version>`. It now exercises `psi-mcp` too.
- Register any follow-ups in the private register.
