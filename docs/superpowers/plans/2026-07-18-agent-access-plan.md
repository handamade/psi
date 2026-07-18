# Agent Access (0.4.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@handamade/psi-mcp` — a baked-index MCP server (stdio + Streamable HTTP) with an `init` command for generated agent-context files — plus the hosted endpoint at psi.kurkin.de/mcp, per spec `docs/superpowers/specs/2026-07-18-agent-access-design.md` (D43–D44).

**Architecture:** A new workspace package bakes the sibling packages' generated artifacts (manifest.json, guidance.json, resolved tokens, per-component docs) into one JSON index at build time. A store answers `search`/`get` over that index; two transports (stdio bin, stateless HTTP handler) expose it via the official MCP SDK; `init` renders the same index into a marker-delimited AGENTS.md/CLAUDE.md block. A single Vercel function at `api/mcp.ts` serves the HTTP handler next to the existing static site.

**Tech Stack:** TypeScript 5.7 (ESM, NodeNext), `@modelcontextprotocol/sdk` ^1.x + `zod` ^3, Vitest (root workspace `packages/*` auto-discovers), tsx for build scripts, changesets.

## Global Constraints

- ESM only (`"type": "module"`), Node ≥20, pnpm 11.9.0.
- Package name `@handamade/psi-mcp`, starts at `"version": "0.3.0"` so the minor changeset lands all three packages at **0.4.0** in lockstep.
- Tools are read-only: exactly `search` and `get`. No write/scaffold tools (D43).
- `search` response budget: serialized result ≤ 6000 characters (~1.5k tokens).
- The server must have **no runtime dependency** on psi-tokens/psi-react — everything comes from the baked `dist/psi-index.json`.
- Themes are exactly `light`, `dark`, `acme`, `ember`; components come from manifest.json (11 today — never hardcode the count in prose without a drift-gate claim).
- Marker block for init: `<!-- psi:agents:start -->` … `<!-- psi:agents:end -->` (D44).
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Run every command from the repo root. Run `pnpm build` once before starting (tests read sibling `dist/` artifacts).

---

### Task 1: Package scaffold + index builder

**Files:**
- Create: `packages/mcp/package.json`
- Create: `packages/mcp/tsconfig.build.json`
- Create: `packages/mcp/src/types.ts`
- Create: `packages/mcp/src/index-builder.ts`
- Create: `packages/mcp/scripts/build-index.ts`
- Create: `packages/mcp/src/index.ts`
- Test: `packages/mcp/__tests__/index-builder.test.ts`

**Interfaces:**
- Consumes: sibling build outputs `packages/tokens/dist/{guidance.json,resolved/<theme>.json}`, `packages/react/dist/manifest.json`, `packages/react/docs/<Component>.md`.
- Produces: `buildIndex(inputs: BuildInputs): Promise<PsiIndex>` and `loadIndex(): Promise<PsiIndex>` (reads `psi-index.json` next to the compiled module). Types `PsiIndex`, `ComponentEntry`, `TokenEntry`, `PropDoc` used by every later task.

- [ ] **Step 1: Scaffold the package (no logic yet)**

`packages/mcp/package.json`:

```json
{
  "name": "@handamade/psi-mcp",
  "version": "0.3.0",
  "description": "MCP server and agent-context generator for the Psi (Ψ) design system",
  "type": "module",
  "bin": { "psi-mcp": "dist/cli.js" },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./http": { "types": "./dist/http.d.ts", "import": "./dist/http.js" }
  },
  "files": ["dist", "README.md", "llms.txt"],
  "scripts": {
    "build": "tsx scripts/build-index.ts && tsc -p tsconfig.build.json"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.16.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@handamade/psi-tokens": "workspace:*",
    "@handamade/psi-react": "workspace:*",
    "tsx": "^4.22.4",
    "typescript": "^5.7.0",
    "vitest": "^3.2.6"
  }
}
```

(The workspace devDeps exist only to force `pnpm -r build` topological order: tokens and react build before mcp. If `^1.16.0` of the SDK doesn't resolve, use the latest 1.x.)

`packages/mcp/tsconfig.build.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Write the failing test**

`packages/mcp/__tests__/index-builder.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../src/index-builder.js";

const pkgs = fileURLToPath(new URL("../..", import.meta.url));

// Runs against the REAL sibling dist output — doubles as an
// artifact-shape regression gate (spec: Testing).
const inputs = {
  tokensDist: `${pkgs}tokens/dist`,
  reactDist: `${pkgs}react/dist`,
  reactDocs: `${pkgs}react/docs`,
  version: "0.0.0-test",
};

describe("buildIndex", () => {
  it("indexes every manifest component with props and doc text", async () => {
    const index = await buildIndex(inputs);
    expect(index.components.length).toBeGreaterThanOrEqual(11);
    const button = index.components.find((c) => c.name === "Button");
    expect(button).toBeDefined();
    const variant = button!.props.find((p) => p.name === "variant");
    expect(variant!.type).toContain("accent-subtle");
    expect(button!.doc).toContain("Button");
  });

  it("indexes tokens with formula and per-theme values", async () => {
    const index = await buildIndex(inputs);
    expect(index.themes).toEqual(["light", "dark", "acme", "ember"]);
    const bg = index.tokens.find((t) => t.name === "bgPrimary");
    expect(bg!.formula).toBe("slot(canvas)");
    for (const theme of index.themes) {
      expect(bg!.values[theme].hex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(bg!.values[theme].oklch.l).toBeTypeOf("number");
    }
  });

  it("exposes guidance keys and getting-started as topics", async () => {
    const index = await buildIndex(inputs);
    for (const key of ["variants", "rules", "states", "motion", "getting-started"]) {
      expect(index.topics[key]).toBeDefined();
    }
    expect(index.scales).toHaveProperty("space");
    expect(index.version).toBe("0.0.0-test");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run packages/mcp`
Expected: FAIL — cannot resolve `../src/index-builder.js`.

- [ ] **Step 4: Implement types + builder**

`packages/mcp/src/types.ts`:

```ts
export interface PropDoc {
  name: string;
  type: string;
  required: boolean;
  default: unknown;
  description: string;
}

export interface ComponentEntry {
  name: string;
  description: string;
  props: PropDoc[];
  /** Full generated markdown doc (includes the a11y/keyboard table). */
  doc: string;
}

export interface Oklch { l: number; c: number; h: number; alpha?: number }

export interface TokenEntry {
  name: string;
  formula: string;
  values: Record<string, { oklch: Oklch; hex: string }>;
}

export interface PsiIndex {
  version: string;
  themes: string[];
  components: ComponentEntry[];
  tokens: TokenEntry[];
  scales: Record<string, unknown>;
  topics: Record<string, unknown>;
}
```

`packages/mcp/src/index-builder.ts`:

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ComponentEntry, PsiIndex, TokenEntry } from "./types.js";

const THEMES = ["light", "dark", "acme", "ember"];

export interface BuildInputs {
  tokensDist: string;
  reactDist: string;
  reactDocs: string;
  version: string;
}

/** Release-versioned onboarding facts; travels with the index (spec: topics). */
export const GETTING_STARTED = {
  install: "npm install @handamade/psi-tokens @handamade/psi-react",
  cssImports: [
    "@handamade/psi-tokens/base.css",
    "@handamade/psi-tokens/<theme>.css — one per theme you use (light|dark|acme|ember)",
    "@handamade/psi-tokens/components.css",
    "@handamade/psi-tokens/utilities.css — REQUIRED: .psi-container + reduced-motion zeroing",
  ],
  themeAttribute: 'Set data-psi-theme="light|dark|acme|ember" on <html> or a subtree root.',
  rules:
    "Sizes are px numbers (24 | 32 | 40 | 48), never S/M/L. Variants are flat " +
    "(accent, accent-subtle, neutral, neutral-subtle, ghost, danger, danger-subtle, outline); " +
    "one accent per visual group (Tags exempt, D40); danger only for destructive actions. " +
    "Never hardcode colors — bind var(--psi-*).",
};

async function readJson(path: string): Promise<any> {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function buildIndex(inputs: BuildInputs): Promise<PsiIndex> {
  const manifest = await readJson(join(inputs.reactDist, "manifest.json"));
  const guidance = await readJson(join(inputs.tokensDist, "guidance.json"));
  const resolved: Record<string, any> = {};
  for (const theme of THEMES) {
    resolved[theme] = await readJson(join(inputs.tokensDist, "resolved", `${theme}.json`));
  }

  const components: ComponentEntry[] = [];
  for (const c of manifest.components) {
    components.push({
      name: c.name,
      description: c.description,
      props: c.props,
      doc: await readFile(join(inputs.reactDocs, `${c.name}.md`), "utf8"),
    });
  }

  const light = resolved.light;
  const tokens: TokenEntry[] = Object.keys(light.tokens).map((name) => ({
    name,
    formula: light.tokens[name].formula,
    values: Object.fromEntries(
      THEMES.map((t) => [
        t,
        { oklch: resolved[t].tokens[name].oklch, hex: resolved[t].tokens[name].hex },
      ]),
    ),
  }));

  return {
    version: inputs.version,
    themes: [...THEMES],
    components,
    tokens,
    scales: light.scales,
    topics: { ...guidance, "getting-started": GETTING_STARTED },
  };
}
```

`packages/mcp/src/index.ts`:

```ts
import { readFile } from "node:fs/promises";
import type { PsiIndex } from "./types.js";

export type { PsiIndex, ComponentEntry, TokenEntry, PropDoc } from "./types.js";
export { buildIndex, GETTING_STARTED } from "./index-builder.js";

/** Loads the index baked next to the compiled module at publish time. */
export async function loadIndex(): Promise<PsiIndex> {
  const url = new URL("./psi-index.json", import.meta.url);
  return JSON.parse(await readFile(url, "utf8"));
}
```

`packages/mcp/scripts/build-index.ts`:

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../src/index-builder.js";

const pkgRoot = fileURLToPath(new URL("..", import.meta.url));
const pkgsRoot = fileURLToPath(new URL("../..", import.meta.url));
const pkg = JSON.parse(await readFile(`${pkgRoot}package.json`, "utf8"));

const index = await buildIndex({
  tokensDist: `${pkgsRoot}tokens/dist`,
  reactDist: `${pkgsRoot}react/dist`,
  reactDocs: `${pkgsRoot}react/docs`,
  version: pkg.version,
});

await mkdir(`${pkgRoot}dist`, { recursive: true });
await writeFile(`${pkgRoot}dist/psi-index.json`, JSON.stringify(index, null, 1));
console.log(
  `psi-index.json: ${index.components.length} components, ${index.tokens.length} tokens, ${index.themes.length} themes`,
);
```

- [ ] **Step 5: Install and run tests to verify they pass**

Run: `pnpm install && pnpm vitest run packages/mcp`
Expected: 3 tests PASS.

- [ ] **Step 6: Verify the package build works end-to-end**

Run: `pnpm --filter @handamade/psi-mcp build && node -e "import('./packages/mcp/dist/index.js').then(m => m.loadIndex()).then(i => console.log(i.components.length, 'components'))"`
Expected: prints `11 components` (or current manifest count); `packages/mcp/dist/psi-index.json` exists.

- [ ] **Step 7: Commit**

```bash
git add packages/mcp pnpm-lock.yaml
git commit -m "feat(mcp): @handamade/psi-mcp scaffold with baked artifact index (D43)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Store — search and get

**Files:**
- Create: `packages/mcp/src/store.ts`
- Modify: `packages/mcp/src/index.ts` (re-export)
- Test: `packages/mcp/__tests__/store.test.ts`

**Interfaces:**
- Consumes: `PsiIndex` from Task 1.
- Produces: `createStore(index: PsiIndex): Store` where `Store = { search(query: string): Brief[]; get(id: string): Detail | null }`; `Brief = { id, kind, title, summary }`; `Detail` is `{ kind: "component" } & ComponentEntry | { kind: "token" } & TokenEntry | { kind: "topic"; name: string; content: unknown }`. Ids are `component:Button`, `token:bgPrimary`, `topic:variants`; `get` also resolves bare names case-insensitively.

- [ ] **Step 1: Write the failing test**

`packages/mcp/__tests__/store.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../src/index-builder.js";
import { createStore, type Store } from "../src/store.js";

const pkgs = fileURLToPath(new URL("../..", import.meta.url));
let store: Store;

beforeAll(async () => {
  const index = await buildIndex({
    tokensDist: `${pkgs}tokens/dist`,
    reactDist: `${pkgs}react/dist`,
    reactDocs: `${pkgs}react/docs`,
    version: "0.0.0-test",
  });
  store = createStore(index);
});

describe("search", () => {
  it("ranks the Button component first for 'button'", () => {
    const briefs = store.search("button");
    expect(briefs[0].id).toBe("component:Button");
    expect(briefs[0].summary).toContain("accent");
  });

  it("finds tokens and topics", () => {
    expect(store.search("bgPrimary").some((b) => b.id === "token:bgPrimary")).toBe(true);
    expect(store.search("variants").some((b) => b.id === "topic:variants")).toBe(true);
  });

  it("stays within the response budget", () => {
    for (const q of ["", "button", "color", "a"]) {
      expect(JSON.stringify(store.search(q)).length).toBeLessThanOrEqual(6000);
    }
  });

  it("returns an overview for an empty query", () => {
    const briefs = store.search("");
    expect(briefs.some((b) => b.kind === "component")).toBe(true);
    expect(briefs.some((b) => b.kind === "topic")).toBe(true);
  });
});

describe("get", () => {
  it("returns full component detail with props and doc", () => {
    const detail = store.get("component:Button");
    expect(detail).toMatchObject({ kind: "component", name: "Button" });
    expect((detail as any).props.length).toBeGreaterThan(3);
  });

  it("resolves bare names case-insensitively", () => {
    expect((store.get("button") as any).name).toBe("Button");
    expect((store.get("BGPRIMARY") as any).name).toBe("bgPrimary");
  });

  it("returns token values for all four themes", () => {
    const detail = store.get("token:bgPrimary") as any;
    expect(Object.keys(detail.values)).toEqual(["light", "dark", "acme", "ember"]);
    expect(detail.formula).toBe("slot(canvas)");
  });

  it("returns topic content and null for unknown ids", () => {
    expect((store.get("topic:getting-started") as any).content).toHaveProperty("cssImports");
    expect(store.get("nope:nothing")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/mcp`
Expected: FAIL — cannot resolve `../src/store.js`.

- [ ] **Step 3: Implement the store**

`packages/mcp/src/store.ts`:

```ts
import type { ComponentEntry, PsiIndex, TokenEntry } from "./types.js";

export interface Brief {
  id: string;
  kind: "component" | "token" | "topic";
  title: string;
  summary: string;
}

export type Detail =
  | ({ kind: "component" } & ComponentEntry)
  | ({ kind: "token" } & TokenEntry)
  | { kind: "topic"; name: string; content: unknown };

export interface Store {
  search(query: string): Brief[];
  get(id: string): Detail | null;
}

const MAX_RESULTS = 20;

const TOPIC_SUMMARIES: Record<string, string> = {
  variants: "Variant intent and typical use for all 8 flat variants",
  rules: "House rules: accent budget, sizing, color binding",
  states: "hover/active/disabled/focus derivation formulas",
  typographyDefaults: "Default type combos per role",
  fonts: "Font roles and brand font stacks",
  motion: "Durations, easings, reduced-motion behavior, recipes",
  layout: "Breakpoints, container, z-index",
  recipes: "Composition recipes (mediaTint, sectionHeader)",
  tags: "Tag/badge rules incl. the accent exemption (D40)",
  "getting-started": "Install, the four required CSS imports, theme attribute, core rules",
};

function componentSummary(c: ComponentEntry): string {
  const axis = (name: string) => c.props.find((p) => p.name === name)?.type;
  const parts: string[] = [];
  if (c.description) parts.push(c.description);
  const variants = axis("variant");
  const sizes = axis("size");
  if (variants) parts.push(`variants: ${variants.replaceAll('"', "")}`);
  if (sizes) parts.push(`sizes: ${sizes}`);
  if (!variants && !sizes) parts.push(`props: ${c.props.map((p) => p.name).slice(0, 6).join(", ")}`);
  return parts.join(" — ").slice(0, 220);
}

export function createStore(index: PsiIndex): Store {
  const briefs: Brief[] = [
    ...index.components.map((c) => ({
      id: `component:${c.name}`,
      kind: "component" as const,
      title: c.name,
      summary: componentSummary(c),
    })),
    ...Object.keys(index.topics).map((name) => ({
      id: `topic:${name}`,
      kind: "topic" as const,
      title: name,
      summary: TOPIC_SUMMARIES[name] ?? "Guidance topic",
    })),
    ...index.tokens.map((t) => ({
      id: `token:${t.name}`,
      kind: "token" as const,
      title: t.name,
      summary: t.formula,
    })),
  ];

  function score(brief: Brief, terms: string[]): number {
    let s = 0;
    const title = brief.title.toLowerCase();
    const summary = brief.summary.toLowerCase();
    for (const term of terms) {
      if (title === term) s += 10;
      else if (title.includes(term)) s += 5;
      if (summary.includes(term)) s += 1;
    }
    return s;
  }

  function search(query: string): Brief[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      // Overview: all components + all topics (tokens are discoverable via query).
      return briefs.filter((b) => b.kind !== "token").slice(0, MAX_RESULTS + 10);
    }
    return briefs
      .map((b) => ({ b, s: score(b, terms) }))
      .filter((x) => x.s > 0)
      .sort((a, z) => z.s - a.s)
      .slice(0, MAX_RESULTS)
      .map((x) => x.b);
  }

  function get(id: string): Detail | null {
    const [prefix, rest] = id.includes(":") ? id.split(/:(.*)/s) : [null, id];
    const name = (rest ?? id).toLowerCase();
    const want = (kind: string) => prefix === null || prefix === kind;

    if (want("component")) {
      const c = index.components.find((c) => c.name.toLowerCase() === name);
      if (c) return { kind: "component", ...c };
    }
    if (want("token")) {
      const t = index.tokens.find((t) => t.name.toLowerCase() === name);
      if (t) return { kind: "token", ...t };
    }
    if (want("topic")) {
      const key = Object.keys(index.topics).find((k) => k.toLowerCase() === name);
      if (key) return { kind: "topic", name: key, content: index.topics[key] };
    }
    return null;
  }

  return { search, get };
}
```

Add to `packages/mcp/src/index.ts`:

```ts
export { createStore } from "./store.js";
export type { Store, Brief, Detail } from "./store.js";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/mcp`
Expected: all Task 1 + Task 2 tests PASS. If the budget test fails, shorten `componentSummary`'s slice — do not raise the budget.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp/src packages/mcp/__tests__
git commit -m "feat(mcp): search/get store over the baked index

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: MCP server + stdio CLI

**Files:**
- Create: `packages/mcp/src/server.ts`
- Create: `packages/mcp/src/cli.ts`
- Modify: `packages/mcp/src/index.ts` (re-export `createPsiServer`)
- Test: `packages/mcp/__tests__/server.test.ts`

**Interfaces:**
- Consumes: `createStore` (Task 2), `loadIndex` (Task 1).
- Produces: `createPsiServer(store: Store, version: string): McpServer` registering exactly two tools named `search` and `get`. `cli.ts` default action: connect stdio. (`init` subcommand arrives in Task 5 — until then unknown args just fall through to serving.)

- [ ] **Step 1: Write the failing test**

`packages/mcp/__tests__/server.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildIndex } from "../src/index-builder.js";
import { createStore } from "../src/store.js";
import { createPsiServer } from "../src/server.js";

const pkgs = fileURLToPath(new URL("../..", import.meta.url));
let client: Client;

beforeAll(async () => {
  const index = await buildIndex({
    tokensDist: `${pkgs}tokens/dist`,
    reactDist: `${pkgs}react/dist`,
    reactDocs: `${pkgs}react/docs`,
    version: "0.0.0-test",
  });
  const server = createPsiServer(createStore(index), index.version);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test", version: "0.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
});

describe("psi MCP server", () => {
  it("lists exactly the two read-only tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["get", "search"]);
  });

  it("answers search calls with briefs", async () => {
    const res: any = await client.callTool({ name: "search", arguments: { query: "button" } });
    const briefs = JSON.parse(res.content[0].text);
    expect(briefs[0].id).toBe("component:Button");
  });

  it("answers get calls with full detail", async () => {
    const res: any = await client.callTool({ name: "get", arguments: { id: "token:bgPrimary" } });
    const detail = JSON.parse(res.content[0].text);
    expect(detail.values.ember.hex).toMatch(/^#/);
  });

  it("flags unknown ids as errors without throwing", async () => {
    const res: any = await client.callTool({ name: "get", arguments: { id: "component:Dialog" } });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("search");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/mcp`
Expected: FAIL — cannot resolve `../src/server.js`.

- [ ] **Step 3: Implement server and CLI**

`packages/mcp/src/server.ts`:

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Store } from "./store.js";

export function createPsiServer(store: Store, version: string): McpServer {
  const server = new McpServer({ name: "psi", version });

  server.registerTool(
    "search",
    {
      title: "Search the Psi design system",
      description:
        "Keyword search over Psi components, semantic tokens, and guidance topics. " +
        "Returns compact briefs with ids for the get tool. Empty query returns an overview.",
      inputSchema: { query: z.string().describe("Keywords, e.g. 'button variants' or 'bg token'") },
    },
    async ({ query }) => ({
      content: [{ type: "text", text: JSON.stringify(store.search(query), null, 1) }],
    }),
  );

  server.registerTool(
    "get",
    {
      title: "Get full Psi detail by id",
      description:
        "Full detail for one id from search: component (props, defaults, a11y doc), " +
        "token (formula + resolved OKLCH/hex in all four themes), or topic (guidance). " +
        "Accepts 'component:Button', 'token:bgPrimary', 'topic:variants', or a bare name.",
      inputSchema: { id: z.string().describe("An id from search results, or a bare name") },
    },
    async ({ id }) => {
      const detail = store.get(id);
      if (!detail) {
        return {
          isError: true,
          content: [{ type: "text", text: `Unknown id "${id}". Use the search tool to discover ids.` }],
        };
      }
      return { content: [{ type: "text", text: JSON.stringify(detail, null, 1) }] };
    },
  );

  return server;
}
```

`packages/mcp/src/cli.ts`:

```ts
#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadIndex } from "./index.js";
import { createStore } from "./store.js";
import { createPsiServer } from "./server.js";

const [command] = process.argv.slice(2);

if (command === "init") {
  const { runInit } = await import("./init.js");
  await runInit({ cwd: process.cwd(), claude: process.argv.includes("--claude") });
} else {
  const index = await loadIndex();
  const server = createPsiServer(createStore(index), index.version);
  await server.connect(new StdioServerTransport());
}
```

(`./init.js` lands in Task 5; the dynamic import keeps this file final now. Until Task 5, do not run the `init` path.)

Add to `packages/mcp/src/index.ts`:

```ts
export { createPsiServer } from "./server.js";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/mcp`
Expected: all PASS. (The Task 5 dynamic import is not exercised; `tsc` will fail on the missing module only if run — that's fine, the package build re-runs in Task 5. If you must build now, create an empty `src/init.ts` exporting `runInit` that throws "not implemented".)

- [ ] **Step 5: Smoke-test the stdio bin**

Run: `pnpm --filter @handamade/psi-mcp build 2>&1 | tail -2` — if tsc fails on `./init.js`, add the placeholder from Step 4's note and rebuild. Then:
`printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}\n' | node packages/mcp/dist/cli.js | head -1`
Expected: one JSON-RPC response line containing `"name":"psi"`.

- [ ] **Step 6: Commit**

```bash
git add packages/mcp/src packages/mcp/__tests__
git commit -m "feat(mcp): MCP server with search/get tools and stdio bin

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Stateless Streamable HTTP handler

**Files:**
- Create: `packages/mcp/src/http.ts`
- Test: `packages/mcp/__tests__/http.test.ts`

**Interfaces:**
- Consumes: `createPsiServer`, `createStore`, `PsiIndex`.
- Produces: `createMcpHandler(index: PsiIndex): (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => Promise<void>` — stateless per-request (spec: hosted endpoint), works with plain Node req/res AND Vercel's body-parsed req.

- [ ] **Step 1: Write the failing test**

`packages/mcp/__tests__/http.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../src/index-builder.js";
import { createMcpHandler } from "../src/http.js";

const pkgs = fileURLToPath(new URL("../..", import.meta.url));
let server: Server;
let url: string;

const HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
};

function rpc(id: number, method: string, params: object) {
  return JSON.stringify({ jsonrpc: "2.0", id, method, params });
}

beforeAll(async () => {
  const index = await buildIndex({
    tokensDist: `${pkgs}tokens/dist`,
    reactDist: `${pkgs}react/dist`,
    reactDocs: `${pkgs}react/docs`,
    version: "0.0.0-test",
  });
  const handler = createMcpHandler(index);
  server = createServer((req, res) => void handler(req, res));
  await new Promise<void>((ok) => server.listen(0, ok));
  const addr = server.address() as { port: number };
  url = `http://127.0.0.1:${addr.port}/mcp`;
});

afterAll(() => new Promise<void>((ok) => server.close(() => ok())));

describe("streamable HTTP handler (stateless)", () => {
  it("answers initialize", async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: rpc(1, "initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "0" },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.serverInfo.name).toBe("psi");
  });

  it("answers tools/call without a session (fresh server per request)", async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: rpc(2, "tools/call", { name: "search", arguments: { query: "button" } }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const briefs = JSON.parse(body.result.content[0].text);
    expect(briefs[0].id).toBe("component:Button");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/mcp`
Expected: FAIL — cannot resolve `../src/http.js`.

- [ ] **Step 3: Implement the handler**

`packages/mcp/src/http.ts`:

```ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { PsiIndex } from "./types.js";
import { createStore } from "./store.js";
import { createPsiServer } from "./server.js";

/**
 * Stateless Streamable HTTP handler: a fresh server + transport per request,
 * no sessions, JSON responses. Suitable for a Vercel function (req.body may
 * already be parsed) and for plain node:http (body read from the stream).
 */
export function createMcpHandler(index: PsiIndex) {
  const store = createStore(index);
  return async function handleMcpRequest(
    req: IncomingMessage & { body?: unknown },
    res: ServerResponse,
  ): Promise<void> {
    const server = createPsiServer(store, index.version);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  };
}
```

If `tools/call` without prior `initialize` is rejected by the SDK version in use (error mentioning "Server not initialized"), keep the test but change it to send `initialize` and `tools/call` in one POST body as a JSON-RPC batch array — the stateless transport accepts batches; assert on the second result.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/mcp`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/mcp/src/http.ts packages/mcp/__tests__/http.test.ts
git commit -m "feat(mcp): stateless streamable HTTP handler for the hosted endpoint

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `init` — generated AGENTS.md / CLAUDE.md block

**Files:**
- Create: `packages/mcp/src/init.ts` (replace placeholder if Task 3 created one)
- Test: `packages/mcp/__tests__/init.test.ts`

**Interfaces:**
- Consumes: `PsiIndex`, `loadIndex`.
- Produces: `renderAgentsBlock(index: PsiIndex): string` (marker-delimited), `applyBlock(existing: string | null, block: string): string` (pure, idempotent), `runInit(opts: { cwd: string; claude: boolean }): Promise<void>` (writes `AGENTS.md`, plus `CLAUDE.md` when `claude`). Task 3's CLI already dispatches to `runInit`.

- [ ] **Step 1: Write the failing test**

`packages/mcp/__tests__/init.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../src/index-builder.js";
import { renderAgentsBlock, applyBlock, START_MARKER, END_MARKER } from "../src/init.js";
import type { PsiIndex } from "../src/types.js";

const pkgs = fileURLToPath(new URL("../..", import.meta.url));
let index: PsiIndex;
let block: string;

beforeAll(async () => {
  index = await buildIndex({
    tokensDist: `${pkgs}tokens/dist`,
    reactDist: `${pkgs}react/dist`,
    reactDocs: `${pkgs}react/docs`,
    version: "0.0.0-test",
  });
  block = renderAgentsBlock(index);
});

describe("renderAgentsBlock", () => {
  it("is marker-delimited and versioned", () => {
    expect(block.startsWith(START_MARKER)).toBe(true);
    expect(block.trimEnd().endsWith(END_MARKER)).toBe(true);
    expect(block).toContain("0.0.0-test");
  });

  it("carries the house rules and every component with its axes", () => {
    expect(block).toContain("24 | 32 | 40 | 48");
    expect(block).toContain("utilities.css");
    expect(block).toContain("data-psi-theme");
    for (const c of index.components) expect(block).toContain(`- ${c.name}`);
    expect(block).toContain("accent-subtle");
  });

  it("includes both MCP connection methods", () => {
    expect(block).toContain("https://psi.kurkin.de/mcp");
    expect(block).toContain("npx @handamade/psi-mcp");
  });
});

describe("applyBlock", () => {
  it("creates, preserves surroundings, and is idempotent", () => {
    const fresh = applyBlock(null, block);
    expect(fresh).toContain(START_MARKER);

    const surrounded = `# My app\n\nnotes above\n\n${block}\n\nnotes below\n`;
    const updated = applyBlock(surrounded, renderAgentsBlock({ ...index, version: "9.9.9" }));
    expect(updated).toContain("notes above");
    expect(updated).toContain("notes below");
    expect(updated).toContain("9.9.9");
    expect(updated).not.toContain("0.0.0-test");
    expect(updated.match(new RegExp(START_MARKER, "g"))!.length).toBe(1);

    expect(applyBlock(updated, renderAgentsBlock({ ...index, version: "9.9.9" }))).toBe(updated);
  });

  it("appends to a file without markers", () => {
    const out = applyBlock("# Existing content\n", block);
    expect(out.startsWith("# Existing content")).toBe(true);
    expect(out).toContain(START_MARKER);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run packages/mcp`
Expected: FAIL — `renderAgentsBlock` not exported.

- [ ] **Step 3: Implement init**

`packages/mcp/src/init.ts`:

```ts
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ComponentEntry, PsiIndex } from "./types.js";
import { loadIndex } from "./index.js";

export const START_MARKER = "<!-- psi:agents:start -->";
export const END_MARKER = "<!-- psi:agents:end -->";

function axes(c: ComponentEntry): string {
  const type = (n: string) => c.props.find((p) => p.name === n)?.type;
  const parts: string[] = [];
  const variants = type("variant");
  const sizes = type("size");
  if (variants) parts.push(`variants: ${variants.replaceAll('"', "")}`);
  if (sizes) parts.push(`sizes: ${sizes}`);
  return parts.length ? ` — ${parts.join("; ")}` : "";
}

export function renderAgentsBlock(index: PsiIndex): string {
  return [
    START_MARKER,
    `# Psi (Ψ) design system — agent guide`,
    "",
    `Generated by \`npx @handamade/psi-mcp init\` for Psi v${index.version}. Re-run after upgrades; do not edit inside the markers (D44).`,
    "",
    "## House rules",
    "- Sizes are px numbers (24 | 32 | 40 | 48), never S/M/L.",
    "- Variants are flat: accent | accent-subtle | neutral | neutral-subtle | ghost | danger | danger-subtle | outline. One accent per visual group (Tags exempt, D40); danger only for destructive actions.",
    "- Never hardcode colors — bind var(--psi-*) custom properties.",
    "- Import all four token CSS files: base.css, one theme css, components.css, utilities.css (utilities is REQUIRED — .psi-container + reduced-motion zeroing).",
    `- Themes: ${index.themes.join(" | ")} — set data-psi-theme on <html> or a subtree root.`,
    "",
    `## Components (${index.components.length})`,
    ...index.components.map((c) => `- ${c.name}${axes(c)}`),
    "",
    "## Live documentation (MCP, tools: search/get)",
    "- Hosted: https://psi.kurkin.de/mcp (Streamable HTTP)",
    "- Local: `npx @handamade/psi-mcp` (stdio)",
    END_MARKER,
  ].join("\n");
}

export function applyBlock(existing: string | null, block: string): string {
  if (existing === null || existing.trim() === "") return block + "\n";
  if (existing.includes(START_MARKER) && existing.includes(END_MARKER)) {
    const re = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`);
    return existing.replace(re, () => block);
  }
  return existing.trimEnd() + "\n\n" + block + "\n";
}

export async function runInit(opts: { cwd: string; claude: boolean }): Promise<void> {
  const index = await loadIndex();
  const block = renderAgentsBlock(index);
  const files = ["AGENTS.md", ...(opts.claude ? ["CLAUDE.md"] : [])];
  for (const name of files) {
    const path = join(opts.cwd, name);
    const existing = existsSync(path) ? await readFile(path, "utf8") : null;
    await writeFile(path, applyBlock(existing, block));
    console.log(`${existing === null ? "created" : "updated"} ${name}`);
  }
}
```

(`replace` uses a function to avoid `$`-pattern expansion from block content. Marker strings contain no regex metacharacters, so embedding them in a RegExp is safe.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/mcp`
Expected: all PASS.

- [ ] **Step 5: End-to-end smoke of the CLI**

Run: `pnpm --filter @handamade/psi-mcp build && mkdir -p /tmp/psi-init-smoke && cd /tmp/psi-init-smoke && node /Users/dmytrokurkin/Projects/dku/ds/packages/mcp/dist/cli.js init --claude && head -5 AGENTS.md CLAUDE.md && cd -`
Expected: both files created; head shows the marker + title. Run the command a second time — output says `updated`, files unchanged (`git diff` not applicable; compare with `md5`).

- [ ] **Step 6: Commit**

```bash
git add packages/mcp/src packages/mcp/__tests__
git commit -m "feat(mcp): init command generates marker-delimited AGENTS.md/CLAUDE.md (D44)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Hosted endpoint `api/mcp.ts`

**Files:**
- Create: `api/mcp.ts` (repo root)
- Modify: root `package.json` (add dependency)

**Interfaces:**
- Consumes: `loadIndex` from `@handamade/psi-mcp`, `createMcpHandler` from `@handamade/psi-mcp/http`.
- Produces: the Vercel function behind `psi.kurkin.de/mcp`. No config change needed in `vercel.json` — root `api/` functions deploy alongside `outputDirectory` static output; `pnpm build:web` already builds the mcp package via `pnpm -r build`.

- [ ] **Step 1: Add the workspace dependency to root package.json**

In root `package.json`, add a top-level `"dependencies"` block (the root currently has none):

```json
"dependencies": {
  "@handamade/psi-mcp": "workspace:*"
},
```

Run: `pnpm install`
Expected: lockfile updates; `node_modules/@handamade/psi-mcp` symlinks to `packages/mcp`.

- [ ] **Step 2: Write the function**

`api/mcp.ts`:

```ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadIndex } from "@handamade/psi-mcp";
import { createMcpHandler } from "@handamade/psi-mcp/http";

// One index + handler per warm function instance; each request still gets
// its own MCP server (stateless per spec D43).
const handlerPromise = loadIndex().then(createMcpHandler);

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
): Promise<void> {
  const handle = await handlerPromise;
  await handle(req, res);
}
```

- [ ] **Step 3: Verify locally against the built package**

Run:
```bash
pnpm build >/dev/null && node --input-type=module -e "
import { createServer } from 'node:http';
import { loadIndex } from './packages/mcp/dist/index.js';
import { createMcpHandler } from './packages/mcp/dist/http.js';
const handler = createMcpHandler(await loadIndex());
const s = createServer((q, r) => void handler(q, r));
s.listen(3123, async () => {
  const res = await fetch('http://127.0.0.1:3123/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } } }) });
  console.log(res.status, (await res.json()).result.serverInfo.name);
  s.close();
});
"
```
Expected: `200 psi`. (This exercises exactly what `api/mcp.ts` wires; the TS function itself is compiled by Vercel. Full deployment verification happens on the PR's Vercel preview: `curl -X POST https://<preview-url>/mcp` with the same initialize body.)

- [ ] **Step 4: Commit**

```bash
git add api/mcp.ts package.json pnpm-lock.yaml
git commit -m "feat(site): hosted MCP endpoint at /mcp via a single Vercel function (D43)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Docs, llms.txt trail, drift gate

**Files:**
- Create: `packages/mcp/README.md`
- Create: `packages/mcp/llms.txt`
- Modify: `README.md` (root — add MCP section)
- Modify: `llms.txt` (root)
- Modify: `packages/tokens/llms.txt`, `packages/react/llms.txt` (one-line MCP pointer each)
- Modify: `CLAUDE.md` (machine-readable trail)
- Modify: `tools/check-docs-drift.mjs` (new claim)

**Interfaces:**
- Consumes: nothing from code; states facts the drift gate verifies.
- Produces: prose containing the literal claim pattern `<n> React 19 components` in `packages/mcp/README.md` so the existing gate covers it.

- [ ] **Step 1: Write the package README and llms.txt**

`packages/mcp/README.md`:

```markdown
# @handamade/psi-mcp

MCP server and agent-context generator for the Psi (Ψ) design system. Documents the system — the 11 React 19 components, every semantic token with its OKLCH derivation formula resolved across all four themes, and the usage guidance — through two read-only tools. It does not write code.

## Connect

- **Hosted (no install):** Streamable HTTP at `https://psi.kurkin.de/mcp`
- **Local (stdio):** `npx @handamade/psi-mcp`

Tools: `search(query)` → compact briefs with ids · `get(id)` → full detail (`component:Button`, `token:bgPrimary`, `topic:variants`, or a bare name).

## Generate agent context (D44)

    npx @handamade/psi-mcp init            # writes/updates AGENTS.md
    npx @handamade/psi-mcp init --claude   # also CLAUDE.md

Content is generated from the same baked index as the MCP tools, inside `<!-- psi:agents:start/end -->` markers — re-run after upgrades; edits outside the markers are preserved.

## How it stays honest

The index is baked at publish time from the sibling packages' generated artifacts (`manifest.json`, `guidance.json`, `resolved/<theme>.json`, per-component docs) and versioned in lockstep with them — the server never answers from prose.
```

`packages/mcp/llms.txt`:

```
# @handamade/psi-mcp — MCP access to Psi (Ψ)

Two read-only tools over a baked index of the generated artifacts:
- search(query): briefs {id, kind, title, summary}; empty query = overview
- get(id): component (props/defaults/a11y doc) | token (formula + OKLCH/hex per theme) | topic (guidance)
Ids: component:<Name>, token:<name>, topic:<key>; bare names resolve case-insensitively.

Connect: https://psi.kurkin.de/mcp (Streamable HTTP) or `npx @handamade/psi-mcp` (stdio).
Agent context: `npx @handamade/psi-mcp init [--claude]` writes a marker-delimited block into AGENTS.md/CLAUDE.md (D44).
The index bakes packages/react/dist/manifest.json + packages/tokens/dist/{guidance.json,resolved/*.json} at publish; lockstep versioning keeps it truthful (D43).
```

- [ ] **Step 2: Extend the drift gate**

In `tools/check-docs-drift.mjs`, add one entry to the `claims` array:

```js
  ["packages/mcp/README.md", /(\d+) React 19 components/],
```

Run: `node tools/check-docs-drift.mjs`
Expected: `docs drift check passed: 11 components stated consistently` (now across 4 files).

- [ ] **Step 3: Update the trail (root README, llms.txt files, CLAUDE.md)**

- Root `README.md`: add an "Agent access (MCP)" subsection next to the existing machine-readable-artifacts material with the two connection methods and the `init` command (reuse the package README's Connect block verbatim, minus the heading).
- Root `llms.txt`: add under the per-package pointers: `- packages/mcp/llms.txt — MCP tools (search/get), hosted at https://psi.kurkin.de/mcp, init command for AGENTS.md`.
- `packages/tokens/llms.txt` and `packages/react/llms.txt`: append one line: `Live MCP access to this data: see packages/mcp/llms.txt (hosted: https://psi.kurkin.de/mcp).`
- `CLAUDE.md` "Machine-readable trail": add item 5: `@handamade/psi-mcp — MCP server (search/get) over manifest+guidance+resolved tokens; hosted at psi.kurkin.de/mcp; \`init\` generates consumer AGENTS.md (D43–D44).`
- Spec files under `docs/superpowers/` are historical — do not touch.

- [ ] **Step 4: Verify and commit**

Run: `node tools/check-docs-drift.mjs && pnpm lint`
Expected: drift check passes; lint clean (if eslint complains about `api/mcp.ts` or the new package, extend the relevant `ignores`/`files` globs in the root eslint config rather than disabling rules).

```bash
git add packages/mcp/README.md packages/mcp/llms.txt README.md llms.txt packages/tokens/llms.txt packages/react/llms.txt CLAUDE.md tools/check-docs-drift.mjs
git commit -m "docs: MCP trail in READMEs/llms.txt + drift-gate claim for psi-mcp

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Promo site "Agent-ready" section

**Files:**
- Create: `apps/promo/src/sections/AgentReady.tsx`
- Modify: `apps/promo/src/App.tsx` (import + render after `Pipeline`)
- Modify: `apps/promo/src/sections/Roadmap.tsx` (annot `05 · Roadmap` → `06 · Roadmap`)
- Modify: `apps/promo/src/sections/Updates.tsx` (annot `06 · Updates` → `07 · Updates`)

**Interfaces:**
- Consumes: existing promo CSS classes only (`section`, `container`, `section-head`, `annot annot--accent`, `lede`) — no new CSS, no VR impact (VR covers Storybook only).
- Produces: section `id="agents"`, annot `05 · Agents`.

- [ ] **Step 1: Write the section**

`apps/promo/src/sections/AgentReady.tsx`:

```tsx
const METHODS = [
  {
    name: "Hosted MCP",
    snippet: "https://psi.kurkin.de/mcp",
    note: "Streamable HTTP — point any MCP client at it, nothing to install",
  },
  {
    name: "Local MCP",
    snippet: "npx @handamade/psi-mcp",
    note: "stdio server for Claude Code, Cursor, and friends",
  },
  {
    name: "Agent context",
    snippet: "npx @handamade/psi-mcp init --claude",
    note: "generates AGENTS.md + CLAUDE.md from the published index — re-run to upgrade",
  },
];

export function AgentReady() {
  return (
    <section className="section" id="agents">
      <div className="container">
        <div className="section-head">
          <span className="annot annot--accent">05 · Agents</span>
          <h2>Two tools, zero hallucinated props.</h2>
          <p className="lede">
            search and get answer from the same generated artifacts the build
            gates on — every prop union, every token formula, every theme value.
          </p>
        </div>
        <div className="pipeline-grid">
          {METHODS.map((m) => (
            <div key={m.name}>
              <span className="annot annot--accent">{m.name}</span>
              <p>
                <code>{m.snippet}</code>
              </p>
              <p>{m.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

(If `pipeline-grid` styling doesn't suit a 3-item row, reuse whichever existing grid class `Pipeline.tsx`'s `ARTIFACTS` list uses — inspect the rendered page rather than adding CSS.)

- [ ] **Step 2: Wire and renumber**

In `apps/promo/src/App.tsx` add `import { AgentReady } from "./sections/AgentReady";` and render `<AgentReady />` between `<Pipeline />` and `<Roadmap />`. In `Roadmap.tsx` change the annot text to `06 · Roadmap`; in `Updates.tsx` to `07 · Updates`. Also check `Roadmap.tsx` content: if it lists "MCP server" as a future item, move/mark it shipped in this section's spirit (edit the roadmap entry text accordingly).

- [ ] **Step 3: Verify visually**

Run: `pnpm build:web` then serve: `npx serve site-dist -l 4321` (or `python3 -m http.server 4321 -d site-dist`) and load `http://localhost:4321`.
Expected: new "05 · Agents" section renders with the three methods; numbering is sequential 01–07; no layout breakage in light and ember (toggle via the header theme switch).

- [ ] **Step 4: Commit**

```bash
git add apps/promo/src
git commit -m "feat(promo): Agent-ready section with both MCP connection methods

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: v0 Design Systems 2.0 validation artifact (non-blocking)

**Files:**
- Create: `v0.json` (repo root)
- Create: `docs/research/2026-07-18-v0-import-notes.md`

**Interfaces:**
- Consumes: nothing from code. Produces: the config v0 reads at import time + the run-notes file the release-week validation appends to. Per spec this task is **not a release gate**.

- [ ] **Step 1: Author v0.json**

`v0.json` (fields per v0's published schema as of 2026-07; if the import UI rejects a field, fix it during the validation run and note the correction):

```json
{
  "version": 1,
  "referenceWorkspace": {
    "sources": [
      { "id": "psi", "repo": "handamade/psi", "ref": "main", "mount": "/" }
    ]
  },
  "starter": "v0-default"
}
```

- [ ] **Step 2: Author the run notes**

`docs/research/2026-07-18-v0-import-notes.md`:

```markdown
# v0 Design Systems 2.0 import — validation notes

Per the 0.4.0 spec (D43 companion): non-blocking release-week validation. Import Psi
into v0 (paid team plan required) using the repo-root `v0.json`, then record findings here.

## Import-notes to paste into v0's "notes" step

- Import all four token CSS files: `@handamade/psi-tokens/base.css`, one theme css
  (`light`/`dark`/`acme`/`ember`), `components.css`, and `utilities.css` (REQUIRED —
  `.psi-container` + reduced-motion zeroing live there).
- Set `data-psi-theme="<theme>"` on the root element.
- Sizes are px numbers (24 | 32 | 40 | 48), never S/M/L. Variants are flat
  (accent, accent-subtle, neutral, neutral-subtle, ghost, danger, danger-subtle, outline);
  one accent per visual group; danger only for destructive actions.
- Components: `@handamade/psi-react` (React 19, ESM). Machine-readable inventory:
  `packages/react/dist/manifest.json`; token values: `packages/tokens/dist/resolved/*.json`.

## Checklist for the run

- [ ] Sources verified (repo mount, npm packages public)
- [ ] Starter app reviewed: correct CSS imports incl. utilities.css, theme attribute present
- [ ] Generated page uses only real variants/sizes (no primary/secondary, no sm/md/lg)
- [ ] Colors bound to var(--psi-*), nothing hardcoded
- [ ] Findings + `v0.json` corrections recorded below

## Findings

(append after the run)
```

- [ ] **Step 3: Commit**

```bash
git add v0.json docs/research/2026-07-18-v0-import-notes.md
git commit -m "chore: v0 design-systems import config + validation checklist (non-blocking)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Changeset + full verification

**Files:**
- Create: `.changeset/agent-access-d43-d44.md`

**Interfaces:** none — release mechanics.

- [ ] **Step 1: Write the changeset**

`.changeset/agent-access-d43-d44.md`:

```markdown
---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

D43/D44 — agent access. New package `@handamade/psi-mcp`: an MCP server (stdio via
`npx @handamade/psi-mcp`, hosted Streamable HTTP at https://psi.kurkin.de/mcp) with two
read-only tools — `search` (briefs over components/tokens/guidance) and `get` (full props,
token formulas with resolved values in all four themes, topics) — answering from an index
baked at publish from the generated artifacts. `npx @handamade/psi-mcp init [--claude]`
generates a marker-delimited agent guide (AGENTS.md/CLAUDE.md) from the same index.
tokens/react bump in lockstep; no API changes in either.
```

- [ ] **Step 2: Full local verification (the CI gauntlet)**

Run, in order, expecting every step green:

```bash
pnpm build                          # contrast gate + all package builds incl. mcp index
node tools/check-docs-drift.mjs     # 4 files consistent
pnpm test                           # all packages incl. ~15 new mcp tests
pnpm lint                           # eslint + stylelint
pnpm vr                             # unchanged — promo isn't covered; storybook untouched
```

- [ ] **Step 3: Commit, push, open the PR**

```bash
git add .changeset/agent-access-d43-d44.md
git commit -m "chore: changeset for the 0.4.0 agent-access release

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push -u origin spec/agent-access-0-4
gh pr create --title "0.4.0 agent access: @handamade/psi-mcp, hosted /mcp endpoint, generated agent context (D43–D44)" --body "$(cat <<'EOF'
Implements docs/superpowers/specs/2026-07-18-agent-access-design.md.

- New package @handamade/psi-mcp: baked artifact index, search/get MCP tools, stdio bin + stateless Streamable HTTP handler
- Hosted endpoint api/mcp.ts → psi.kurkin.de/mcp (verify on the Vercel preview: POST an initialize request to <preview>/mcp)
- `npx @handamade/psi-mcp init [--claude]` — generated, marker-delimited AGENTS.md/CLAUDE.md (D44)
- Docs/llms.txt trail + drift-gate claim; promo "Agent-ready" section; v0.json validation artifact (non-blocking)
- Changeset: minor across all three packages → 0.4.0 lockstep

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Post-merge release-week actions (tracked, not part of this branch)**

1. Verify `https://psi.kurkin.de/mcp` answers an `initialize` POST after the production deploy.
2. `pnpm release` from clean main (release-guard enforces) → publishes 0.4.0 incl. the new package.
3. Run the v0 import per `docs/research/2026-07-18-v0-import-notes.md`; append findings.
4. Connect the hosted endpoint from a real MCP client (Claude Code) and exercise search/get once.

---

## Self-review notes

- **Spec coverage:** D43 tools/transports → Tasks 2–4, 6; baked index/no runtime dep → Task 1; D44 init → Task 5; drift gate + llms/README trail → Task 7; promo section → Task 8; v0 non-blocking → Task 9; lockstep changeset + release flow → Task 10. Testing section of spec: real-dist index test (T1), budget test (T2), transport round-trips (T3/T4), init snapshot+idempotency (T5), drift extension (T7).
- **Type consistency:** `createStore(index)` → `Store` consumed by `createPsiServer(store, version)` (T3) and `createMcpHandler(index)` (T4, constructs its own store); `renderAgentsBlock/applyBlock/runInit` names match the T3 CLI dynamic import.
- **Known judgment points for the implementer:** SDK minor-version drift (batch fallback documented in T4), eslint config include for the new package (T7), promo grid class reuse (T8), v0 schema field names (T9 — explicitly correctable during the run).
