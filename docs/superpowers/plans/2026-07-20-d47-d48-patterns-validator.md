# D47/D48 Patterns + Contract Validator Implementation Plan (HAN-15)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Patterns as parametrized composition recipes (`packages/react/patterns/*.json`), validated by a single contract validator inside `pnpm build` (throws on D48 error classes, reports `gaps`), rendered into a generated `dist/patterns.json` with deterministic preset JSX, and exposed through psi-mcp `search`/`get` with no new tools.

**Architecture:** `packages/react/scripts/patterns.ts` (loader + validator + preset renderer — the `slots.ts` D45 precedent) is consumed by a new `scripts/emit-patterns.ts` build step appended after `emit-manifest.ts` (it reads `dist/manifest.json`). psi-mcp's index-builder ingests `dist/patterns.json`; `store.ts` gains pattern briefs and `pattern:` gets. `check-docs-drift.mjs` gains pattern-count claims.

**Tech Stack:** TypeScript (tsx build scripts), vitest, JSON (no new dependencies — the validator checks structure in code; `pattern.schema.json` ships as a documentation artifact for external agents, same posture as the D45 sketches).

**Branch:** `dkurkin/han-15-d47d48-patterns-contract-validator` (Linear HAN-15). Worktree: `.worktrees/han-15-patterns`.

## Global Constraints

- Sizes are px numbers (`24 | 32 | 40 | 48`), never S/M/L. Variants are the flat vocabulary; one `accent` per visual group; `danger` only for destructive actions — house rules apply inside patterns (spec: "House rules apply inside patterns exactly as everywhere else").
- Generated artifacts live in `dist/`, never edited by hand; authored sources in `src`/`patterns/`.
- `pnpm build` is the conformance gate — validator violations THROW (D48: "same posture as the contrast gate"); `gaps` are "the one legal kind of dangling reference, and the validator prints them as a report, not an error".
- Preset JSX is "generated from the compose tree, never hand-written"; "re-render must be byte-identical" (spec Testing).
- D43 posture: psi-mcp adds NO new tools — patterns join `search`/`get`.
- Typed parameters (D48 verbatim): "a parameter's `options` must be a subset of the manifest literal union of every prop site its `{param:*}` placeholder fills".
- Verify with `pnpm build`, `pnpm test`, `pnpm lint` before every commit.

## Design decisions locked here (the spec leaves them open)

1. **Slots are props**: Psi's slot convention (Dialog D50) maps slot `body` → JSX children and every other slot → a same-named prop (`title={...}`, `footer={...}`). The preset renderer follows this rule; it is normative for patterns.
2. **Field gets `slots.json`** (D45 adoption, additive): `label` (0..1), `description` (0..1), `body` (0..*, open) — Field's label/description are prop-slots exactly like Dialog's title/footer.
3. **Slot fills** in `compose` are arrays whose entries are either a compose node or a string `"{content:<key>}"` (text fill). Text fills are legal in any slot (D45 `accepts` constrains components, not text); the content key must be declared.
4. **Parameters bind via defaults**: "zero unbound parameters" = every parameter has a `default`. Presets render for patterns with `gaps: []` by substituting defaults and content values.
5. **Prop checking**: props whose manifest type is a literal union (`"a" | "b"` or `24 | 32`) enforce membership; `boolean`-typed props must be boolean; other types pass. `{param:key}` placeholders are checked at the declaration site (options ⊆ union of every fill site), `{content:key}` only in string positions.
6. **Blocked patterns**: `gaps.length > 0` → `"blocked": true` in the index, no preset, compose nodes may reference gap-listed components freely (they are not "unknown").

---

### Task 1: Pattern loader + contract validator (`patterns.ts`)

**Files:**
- Create: `packages/react/scripts/patterns.ts`
- Test: `packages/react/scripts/patterns.test.ts`

**Interfaces:**
- Consumes: `SlotContract` + `loadSlotContracts` from `./slots.ts` (existing, unchanged); `dist/manifest.json` shape `{ components: [{ name, slots: SlotContract[], props: [{ name, type, required, default }] }] }`.
- Produces (later tasks rely on these exact names):

```ts
export interface PatternNode {
  component: string;
  props?: Record<string, unknown>;
  slots?: Record<string, Array<PatternNode | string>>;
  content?: string; // content key for text children
}
export interface Pattern {
  id: string;
  intent: string;
  match: string[];
  compose: PatternNode;
  parameters: Array<{ key: string; ask: string; options: Array<string | number>; default?: string | number }>;
  content: Record<string, string>;
  gaps: string[];
}
export interface ManifestComponent {
  name: string;
  slots: Array<{ name: string; accepts: { components?: string[]; contracts?: string[] }; cardinality: string; order?: number }>;
  props: Array<{ name: string; type: string; required: boolean; default: unknown }>;
}
export function loadPatterns(dir: string): Pattern[];               // reads *.json sorted by filename; throws on missing/mistyped required fields (id, intent, match, compose; parameters/content/gaps default to []/{}/[]).
export function parseLiteralUnion(type: string): Array<string | number> | null; // '"a" | "b"' → ["a","b"]; '24 | 32' → [24,32]; null when not a pure literal union
export function validatePatterns(
  patterns: Pattern[],
  components: ManifestComponent[],
  contracts: Record<string, string[]>,   // contracts.json
): { gaps: Record<string, string[]> };   // patternId → gap list; THROWS Error on any violation, message prefixed `pattern "<id>":`
```

**Validator error classes** (D48; one test per class):
1. compose node names a component neither in the manifest nor in the pattern's `gaps`.
2. compose node uses a slot name the component's manifest `slots` don't declare (components with no slots: only `body` is legal — children).
3. a prop value outside the manifest literal union (respecting decision 5).
4. a slot fill violating the D45 contract: filled component ∉ `accepts.components` ∪ members of `accepts.contracts` (empty `accepts` = open); gap-listed fills are exempt.
5. cardinality: `1..1`/`1..*` slots must receive ≥1 entry; `0..1`/`1..1` must receive ≤1.
6. `{param:key}` referenced in compose but not declared in `parameters` — or a parameter declared but never referenced.
7. parameter `options` ⊄ the literal union of ANY prop site its placeholder fills (also: placeholder on a non-literal-union prop is an error — nothing to check against).
8. `{content:key}` (in string props or slot text fills) or node `content` naming an undeclared content key — or a content key never referenced.
9. (D48's scopes-entry class is enforced by the D46 token build — `validatePatterns` does not duplicate it; note this in a comment.)

- [ ] **Step 1: Write the failing tests**

`packages/react/scripts/patterns.test.ts` — follow the `slots.test.ts` mkdtemp fixture precedent for `loadPatterns`; `validatePatterns` takes inline fixtures. Minimal manifest fixture used throughout:

```ts
import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPatterns, parseLiteralUnion, validatePatterns } from "./patterns.js";
import type { ManifestComponent, Pattern } from "./patterns.js";

const button: ManifestComponent = {
  name: "Button",
  slots: [],
  props: [
    { name: "variant", type: '"accent" | "ghost" | "danger"', required: false, default: "neutral" },
    { name: "size", type: "24 | 32 | 40 | 48", required: false, default: 32 },
    { name: "disabled", type: "boolean", required: false, default: false },
  ],
};
const dialog: ManifestComponent = {
  name: "Dialog",
  slots: [
    { name: "title", accepts: { contracts: ["inline-content"] }, cardinality: "0..1", order: 1 },
    { name: "body", accepts: {}, cardinality: "0..*", order: 2 },
    { name: "footer", accepts: { components: ["Button"] }, cardinality: "1..*", order: 3 },
  ],
  props: [],
};
const tag: ManifestComponent = { name: "Tag", slots: [], props: [] };
const components = [button, dialog, tag];
const contracts = { "inline-content": ["Tag"] };

const base = (over: Partial<Pattern>): Pattern => ({
  id: "p", intent: "i", match: ["m"], parameters: [], content: {}, gaps: [],
  compose: { component: "Button" }, ...over,
});

describe("parseLiteralUnion", () => {
  it("parses string and number unions, rejects non-literals", () => {
    expect(parseLiteralUnion('"a" | "b-c"')).toEqual(["a", "b-c"]);
    expect(parseLiteralUnion("24 | 32")).toEqual([24, 32]);
    expect(parseLiteralUnion("string")).toBeNull();
    expect(parseLiteralUnion('"a" | string')).toBeNull();
    expect(parseLiteralUnion("boolean")).toBeNull();
  });
});

describe("loadPatterns", () => {
  it("loads *.json sorted by filename and applies defaults", () => {
    const dir = mkdtempSync(join(tmpdir(), "patterns-"));
    writeFileSync(join(dir, "b.json"), JSON.stringify(base({ id: "b" })));
    writeFileSync(join(dir, "a.json"), JSON.stringify({ id: "a", intent: "i", match: ["m"], compose: { component: "X" } }));
    const ps = loadPatterns(dir);
    expect(ps.map((p) => p.id)).toEqual(["a", "b"]);
    expect(ps[0].parameters).toEqual([]);
    expect(ps[0].content).toEqual({});
    expect(ps[0].gaps).toEqual([]);
  });
  it("throws on a missing required field", () => {
    const dir = mkdtempSync(join(tmpdir(), "patterns-"));
    writeFileSync(join(dir, "x.json"), JSON.stringify({ id: "x", match: [], compose: { component: "B" } }));
    expect(() => loadPatterns(dir)).toThrow(/x\.json.*intent/);
  });
  it("ignores pattern.schema.json", () => {
    const dir = mkdtempSync(join(tmpdir(), "patterns-"));
    writeFileSync(join(dir, "pattern.schema.json"), "{}");
    writeFileSync(join(dir, "a.json"), JSON.stringify(base({ id: "a" })));
    expect(loadPatterns(dir)).toHaveLength(1);
  });
});

describe("validatePatterns (one case per D48 error class)", () => {
  const ok = (p: Pattern) => validatePatterns([p], components, contracts);

  it("passes a clean pattern and reports gaps without throwing", () => {
    const blocked = base({ id: "blk", gaps: ["Toolbar"], compose: { component: "Toolbar" } });
    expect(ok(blocked).gaps).toEqual({ blk: ["Toolbar"] });
  });
  it("1: unknown component (not in manifest, not in gaps)", () => {
    expect(() => ok(base({ compose: { component: "Ghost" } }))).toThrow(/pattern "p".*unknown component "Ghost"/);
  });
  it("2: undeclared slot", () => {
    expect(() => ok(base({ compose: { component: "Dialog", slots: { header: [] } } }))).toThrow(/slot "header"/);
    expect(() => ok(base({ compose: { component: "Button", slots: { body: ["{content:t}"] }, }, content: { t: "x" } }))).not.toThrow(); // body always legal
  });
  it("3: prop outside literal union; booleans type-checked; non-union strings pass", () => {
    expect(() => ok(base({ compose: { component: "Button", props: { variant: "primary" } } }))).toThrow(/"primary".*variant/);
    expect(() => ok(base({ compose: { component: "Button", props: { size: 28 } } }))).toThrow(/28/);
    expect(() => ok(base({ compose: { component: "Button", props: { disabled: "yes" } } }))).toThrow(/disabled/);
    expect(() => ok(base({ compose: { component: "Button", props: { disabled: true, variant: "ghost" } } }))).not.toThrow();
  });
  it("4: slot fill violating the D45 contract (contract members allowed, others not)", () => {
    const fill = (c: string) => base({ compose: { component: "Dialog", slots: { title: [{ component: c }], footer: [{ component: "Button" }] } } });
    expect(() => ok(fill("Tag"))).not.toThrow();      // via inline-content contract
    expect(() => ok(fill("Button"))).toThrow(/title.*Button/); // Button not in title's accepts
  });
  it("5: cardinality", () => {
    expect(() => ok(base({ compose: { component: "Dialog" } }))).toThrow(/footer.*1\.\.\*/); // required slot empty
    const two = base({ compose: { component: "Dialog", slots: { title: ["{content:a}", "{content:b}"], footer: [{ component: "Button" }] }, content: { a: "x", b: "y" } } });
    expect(() => ok(two)).toThrow(/title.*0\.\.1/);
  });
  it("6: param referenced but undeclared, and declared but unreferenced", () => {
    expect(() => ok(base({ compose: { component: "Button", props: { size: "{param:size}" } } }))).toThrow(/param "size".*not declared/);
    expect(() => ok(base({ parameters: [{ key: "size", ask: "?", options: [32], default: 32 }] }))).toThrow(/param "size".*never referenced/);
  });
  it("7: options must be ⊆ the union of every fill site", () => {
    const p = (options: Array<string | number>) => base({
      compose: { component: "Button", props: { size: "{param:size}" } },
      parameters: [{ key: "size", ask: "?", options, default: options[0] }],
    });
    expect(() => ok(p([32, 40]))).not.toThrow();
    expect(() => ok(p([32, 28]))).toThrow(/28.*size/);
    const nonUnion = base({
      compose: { component: "Button", props: { disabled: "{param:d}" } },
      parameters: [{ key: "d", ask: "?", options: [1], default: 1 }],
    });
    expect(() => ok(nonUnion)).toThrow(/param "d".*not a literal-union prop/);
  });
  it("8: content key referenced but undeclared, and declared but unreferenced", () => {
    expect(() => ok(base({ compose: { component: "Button", content: "label" } }))).toThrow(/content "label".*not declared/);
    expect(() => ok(base({ content: { orphan: "x" } }))).toThrow(/content "orphan".*never referenced/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run packages/react/scripts/patterns.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `packages/react/scripts/patterns.ts`**

Implementation notes (write real code, ~180 lines):
- `loadPatterns`: `readdirSync(dir).filter(f => f.endsWith(".json") && f !== "pattern.schema.json").sort()`; required fields `id` (string), `intent` (string), `match` (string[]), `compose` (object) — throw `Error(\`\${file}: missing/invalid "\${field}"\`)`; default `parameters: []`, `content: {}`, `gaps: []`.
- `parseLiteralUnion`: split on `" | "`; every part must match `/^"(.*)"$/` (string literal) or `/^-?\d+(?:\.\d+)?$/` (number); one non-literal part → `null`.
- `validatePatterns`: per pattern, walk the compose tree (`walk(node, path)`):
  - component known? (`components` by name, else in `pattern.gaps`, else throw class 1). Gap components: skip all further checks on that node except recursing into its slots/props placeholders (their fills still walk).
  - collect `{param:key}` / `{content:key}` refs from props (string values matching `/^\{param:([a-z0-9-]+)\}$/` / `/^\{content:([a-z0-9-]+)\}$/`), node `content`, and string slot fills; check props per decision 5 against `parseLiteralUnion(prop.type)` (unknown prop NAME on a known component: throw — it's a compose typo; note: manifest props include `ref`/`className` etc., so name lookup suffices).
  - slots: name must be `body` or declared (class 2); each node fill checked against `accepts` (class 4 — resolve `accepts.contracts` through the `contracts` map; empty accepts object = open); cardinality after collecting fills (class 5 — declared slots with no entry count 0).
  - after the walk: parameters declared vs referenced (class 6 both directions); per parameter, every fill site's union must contain every option (class 7; non-union site → throw); content declared vs referenced (class 8 both directions).
  - error messages all prefixed `pattern "<id>": `.
  - return `{ gaps: Object.fromEntries(patterns.filter(p => p.gaps.length).map(p => [p.id, p.gaps])) }`.
- Comment near the top: `// D48's "scopes entry" class is enforced by the D46 token build (packages/tokens); not duplicated here.`

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/react/scripts/patterns.test.ts` — PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/react/scripts/patterns.ts packages/react/scripts/patterns.test.ts
git commit -m "feat(react): D48 pattern loader + contract validator (all error classes)"
```

---

### Task 2: Field slots.json, pattern schema, three seed patterns

**Files:**
- Create: `packages/react/src/Field/slots.json`, `packages/react/patterns/pattern.schema.json`, `packages/react/patterns/settings-form-row.json`, `packages/react/patterns/destructive-confirm.json`, `packages/react/patterns/filter-toolbar.json`
- Test: `packages/react/scripts/seed-patterns.test.ts`

**Interfaces:**
- Consumes: Task 1's `loadPatterns`/`validatePatterns`; real `dist/manifest.json` + `src/contracts.json` (run `pnpm build` first if manifest missing).
- Produces: three authored patterns later tasks emit; Field manifest entry gains `slots`.

- [ ] **Step 1: `packages/react/src/Field/slots.json`** (D45 prop-slot convention, decision 2):

```json
{
  "slots": [
    { "name": "label", "accepts": {}, "cardinality": "0..1", "order": 1 },
    { "name": "body", "accepts": {}, "cardinality": "1..*", "order": 2 },
    { "name": "description", "accepts": {}, "cardinality": "0..1", "order": 3 }
  ]
}
```

- [ ] **Step 2: `pattern.schema.json`** — JSON Schema (draft 2020-12) documenting the Pattern shape for external agents: `id`/`intent` strings (required), `match` string array (required, minItems 1), `compose` recursive node (`component` required; `props` object; `slots` object of arrays of node-or-string; `content` string), `parameters` array of `{key, ask, options, default}` (key/ask/options required), `content` object of strings, `gaps` string array. Header comment field `"$comment": "Documentation artifact — the build validator (scripts/patterns.ts) is the enforcement point (D48)."`

- [ ] **Step 3: The three seeds** (exact JSON below; these are the shipped artifacts):

`settings-form-row.json`:

```json
{
  "id": "settings-form-row",
  "intent": "Labeled settings row: a self-labeled control with a group label and helper text",
  "match": ["settings row", "form row", "labeled switch", "preference toggle", "settings form"],
  "compose": {
    "component": "Field",
    "props": { "group": true },
    "slots": {
      "label": ["{content:row-label}"],
      "body": [
        { "component": "Switch", "props": { "size": "{param:control-size}" }, "content": "control-label" }
      ],
      "description": ["{content:row-description}"]
    }
  },
  "parameters": [
    { "key": "control-size", "ask": "Control size?", "options": [24, 32], "default": 24 }
  ],
  "content": {
    "row-label": "<setting name>",
    "control-label": "<what turning it on does>",
    "row-description": "<one-line consequence of the setting>"
  },
  "gaps": []
}
```

`destructive-confirm.json` (the spec's worked example, un-gapped now that Dialog shipped, title/footer realistic):

```json
{
  "id": "destructive-confirm",
  "intent": "Dialog confirming a destructive action",
  "match": ["delete confirmation", "are you sure", "destructive dialog", "confirm delete"],
  "compose": {
    "component": "Dialog",
    "slots": {
      "title": ["{content:title}"],
      "body": ["{content:consequence}"],
      "footer": [
        { "component": "Button", "props": { "variant": "ghost", "size": "{param:size}" }, "content": "cancel-label" },
        { "component": "Button", "props": { "variant": "danger", "size": "{param:size}" }, "content": "confirm-label" }
      ]
    }
  },
  "parameters": [
    { "key": "size", "ask": "Button size?", "options": [32, 40], "default": 32 }
  ],
  "content": {
    "title": "<Delete the object?>",
    "consequence": "<what is permanently lost>",
    "cancel-label": "Cancel",
    "confirm-label": "<verb the object>"
  },
  "gaps": []
}
```

CHECK before committing: Dialog's `title` slot accepts `{ contracts: ["inline-content"] }` — a TEXT fill (decision 3) is legal there; the `footer` accepts must allow Button (it does). Switch's manifest `size` union — verify `[24, 32]` ⊆ it (read the manifest; if Switch sizes differ, adjust options to a true subset and note it).

`filter-toolbar.json` (deliberately blocked — exercises the gaps-as-backlog path in shipped artifacts):

```json
{
  "id": "filter-toolbar",
  "intent": "Toolbar of filter controls: search, category select, active-filter tags",
  "match": ["filter toolbar", "filter bar", "search and filter", "faceted filters"],
  "compose": {
    "component": "Toolbar",
    "slots": {
      "body": [
        { "component": "Input", "props": { "placeholder": "{content:search-placeholder}" } },
        { "component": "Select" },
        { "component": "Tag", "props": { "dismissible": true }, "content": "example-filter" }
      ]
    }
  },
  "parameters": [],
  "content": {
    "search-placeholder": "<Search {domain}…>",
    "example-filter": "<active filter>"
  },
  "gaps": ["Toolbar"]
}
```

CHECK: `Input`'s manifest `placeholder` prop type (likely `string` — a `{content:}` ref in a string prop is legal per decision 5) and `Tag`'s `dismissible` prop name/type — adjust to the real manifest if different (e.g. `onDismiss` presence instead of a boolean → drop the prop and keep the content fill).

- [ ] **Step 4: The seed test** — `packages/react/scripts/seed-patterns.test.ts` (real-dist posture):

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPatterns, validatePatterns } from "./patterns.js";

const root = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "dist/manifest.json"), "utf8"));
const contracts = JSON.parse(readFileSync(join(root, "src/contracts.json"), "utf8"));
const patterns = loadPatterns(join(root, "patterns"));

describe("seed patterns against the real manifest", () => {
  it("all three load and validate; only filter-toolbar is gapped", () => {
    const { gaps } = validatePatterns(patterns, manifest.components, contracts);
    expect(patterns.map((p) => p.id).sort()).toEqual(["destructive-confirm", "filter-toolbar", "settings-form-row"]);
    expect(gaps).toEqual({ "filter-toolbar": ["Toolbar"] });
  });
  it("Field declares its prop-slots in the manifest", () => {
    const field = manifest.components.find((c: { name: string }) => c.name === "Field");
    expect(field.slots.map((s: { name: string }) => s.name)).toEqual(["label", "body", "description"]);
  });
});
```

- [ ] **Step 5: Rebuild + run** — `pnpm --filter @handamade/psi-react build && pnpm vitest run packages/react/scripts/seed-patterns.test.ts packages/react/scripts/slots.test.ts` (slots.test.ts must stay green with the new Field slots.json). Then FULL `pnpm test` (a Field manifest change may touch mcp index-builder tests asserting slots).

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/Field/slots.json packages/react/patterns/ packages/react/scripts/seed-patterns.test.ts
git commit -m "feat(react): pattern schema + three seed patterns; Field slot contracts (D47)"
```

---

### Task 3: Deterministic preset JSX renderer

**Files:**
- Modify: `packages/react/scripts/patterns.ts` (add `renderPreset`)
- Test: `packages/react/scripts/render-preset.test.ts`

**Interfaces:**
- Produces: `export function renderPreset(pattern: Pattern, components: ManifestComponent[]): string | null` — null when `gaps.length > 0` or any parameter lacks a `default`; otherwise a JSX string.

**Rendering rules (normative, all in service of byte-identical re-render):**
- Substitute `{param:key}` → the parameter's `default`; `{content:key}` → the content value.
- Props: alphabetical by name; string values as `name="value"`, numbers/booleans as `name={32}` / `name={true}`; skip props equal to the manifest default? NO — render exactly what the compose tree declares (explicit is stable).
- Slots: non-`body` slots render as props whose value is JSX: single text fill → `title="text"`; single node fill → `title={<Tag …/>}`; multiple fills → `footer={<>…</>}` fragment. Slot-props sort into the same alphabetical prop order.
- `body` fills and node `content` render as children. No children → self-close.
- Indentation: 2 spaces per depth, children each on their own line; the root at depth 0; trailing newline. Text children rendered raw (angle-bracket placeholders like `<verb the object>` stay literal — copy-paste-then-edit artifacts).

- [ ] **Step 1: Failing tests** — `render-preset.test.ts` with the Task 1 fixture components:

```ts
import { describe, expect, it } from "vitest";
import { renderPreset } from "./patterns.js";
// reuse button/dialog/components fixtures — copy the fixture block from patterns.test.ts

describe("renderPreset", () => {
  const confirm = { /* the destructive-confirm pattern JSON, gaps: [], inline */ };
  it("renders the fully-bound pattern deterministically", () => {
    const jsx = renderPreset(confirm, components);
    expect(jsx).toBe(
`<Dialog
  footer={<>
    <Button size={32} variant="ghost">Cancel</Button>
    <Button size={32} variant="danger"><verb the object></Button>
  </>}
  title="<Delete the object?>"
>
  <what is permanently lost>
</Dialog>
`);
  });
  it("re-render is byte-identical", () => {
    expect(renderPreset(confirm, components)).toBe(renderPreset(confirm, components));
  });
  it("returns null for gapped patterns and for defaultless parameters", () => {
    expect(renderPreset({ ...confirm, gaps: ["Toolbar"] }, components)).toBeNull();
    const noDefault = { ...confirm, parameters: [{ key: "size", ask: "?", options: [32] }] };
    expect(renderPreset(noDefault, components)).toBeNull();
  });
});
```

(The exact expected string above is the CONTRACT — implement to it. If implementation forces a deviation, change the implementation, not the expectation, unless the expectation is internally inconsistent; then fix both and say so in the report.)

- [ ] **Step 2:** Run — FAIL (renderPreset not exported).
- [ ] **Step 3:** Implement `renderPreset` per the rules (~80 lines; pure string building; recursive `renderNode(node, depth)`).
- [ ] **Step 4:** Run — PASS. Also re-run Task 1 tests (same file changed).
- [ ] **Step 5: Commit** — `git commit -m "feat(react): deterministic preset JSX renderer (D47 presets)"`

---

### Task 4: `emit-patterns.ts` build step + `dist/patterns.json` + docs drift

**Files:**
- Create: `packages/react/scripts/emit-patterns.ts`
- Modify: `packages/react/package.json` (build script), `tools/check-docs-drift.mjs`, `packages/react/llms.txt`, `packages/mcp/README.md`
- Test: `packages/react/scripts/emit-patterns.test.ts`

**Interfaces:**
- Produces `packages/react/dist/patterns.json`:

```json
{
  "patterns": [
    { "id": "...", "intent": "...", "match": [...], "compose": {...}, "parameters": [...], "content": {...}, "gaps": [...], "blocked": false, "preset": "<Dialog…>\n" | null }
  ]
}
```

sorted by id; `blocked = gaps.length > 0`; `preset` from Task 3 (null when blocked/unbound).

- [ ] **Step 1:** Failing test `emit-patterns.test.ts` (real-dist posture): after running the emit (import and call its exported `emitPatterns(rootDir)` — structure the script like `emit-manifest.ts`: exported function + `main` guard), parse `dist/patterns.json`; assert 3 patterns sorted by id; `destructive-confirm.blocked === false` with a non-null preset containing `variant="danger"`; `filter-toolbar.blocked === true` with `preset === null`; byte-identical: run emit twice, compare file bytes.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implement: read `dist/manifest.json` + `src/contracts.json` + `loadPatterns("patterns")`; `validatePatterns` (throws → build gate); print the gaps report (`console.log("  pattern gaps (backlog): filter-toolbar → Toolbar")` style — "printed as a report, not an error"); write `dist/patterns.json` (2-space JSON + trailing newline). Wire into `packages/react/package.json` build: `… && tsx scripts/emit-manifest.ts && tsx scripts/emit-patterns.ts && tsx scripts/emit-docs.ts`.
- [ ] **Step 4:** Docs-drift: add to `packages/react/llms.txt` a line `- dist/patterns.json: 3 composition patterns (D47) — gap-annotated recipes with clarifying parameters; presets are generated JSX, never hand-written` and to `packages/mcp/README.md` a sentence containing `3 composition patterns`. Extend `tools/check-docs-drift.mjs`: read `packages/react/dist/patterns.json`, `const np = patterns.patterns.length`, claims `[["packages/react/llms.txt", /(\d+) composition patterns/], ["packages/mcp/README.md", /(\d+) composition patterns/]]` checked against `np` (mirror the existing loop — refactor the loop to take (file, re, expected) tuples rather than duplicating it).
- [ ] **Step 5:** `pnpm build && pnpm vitest run packages/react && node tools/check-docs-drift.mjs` — all green.
- [ ] **Step 6: Commit** — `git commit -m "feat(react): emit dist/patterns.json in the build; docs-drift guards pattern count (D47/D48)"`

---

### Task 5: psi-mcp — patterns join search/get (no new tools, D43)

**Files:**
- Modify: `packages/mcp/src/types.ts`, `packages/mcp/src/index-builder.ts`, `packages/mcp/scripts/build-index.ts` (add patterns.json input path if paths are explicit there), `packages/mcp/src/store.ts`, `packages/mcp/src/server.ts` (tool descriptions only), `packages/mcp/src/init.ts` (AGENTS.md house rule)
- Test: extend `packages/mcp/__tests__/store.test.ts` + `packages/mcp/__tests__/index-builder.test.ts` (+ `init.test.ts` if it asserts AGENTS.md content)

**Interfaces:**
- `PsiIndex` gains `patterns: PatternEntry[]` where `PatternEntry` = the emitted pattern shape (id, intent, match, compose, parameters, content, gaps, blocked, preset).
- `Brief.kind` and `Detail` unions gain `"pattern"`.
- Brief for a pattern: `id: "pattern:<id>"`, `title: <id>`, `summary: "<intent> — <match phrases joined ", ">, <N> parameters" + (blocked ? ", blocked (gaps: …)" : "")` — match phrases in the summary feed the existing keyword `score()`.
- `get("pattern:<id>")` → `{ kind: "pattern", ...entry }`.
- `init.ts` AGENTS.md gains (spec verbatim posture): `Before composing multi-component UI, search for a matching pattern and ask its clarifying parameters; only freehand when no pattern matches.`

- [ ] **Step 1:** Failing tests. `index-builder.test.ts` (real-dist posture): `index.patterns.length >= 3`; the destructive-confirm entry has `blocked === false` and a preset string. `store.test.ts`: `search("delete confirmation")` returns `pattern:destructive-confirm` first; `get("pattern:destructive-confirm")` returns kind "pattern" with parameters; blocked pattern brief summary contains "blocked". `init` test: generated AGENTS.md contains "search for a matching pattern".
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implement (follow the existing component/topic/token patterns in each file; server.ts: extend the two tool descriptions to mention patterns).
- [ ] **Step 4:** `pnpm build && pnpm test` — green (mcp builds after react topologically).
- [ ] **Step 5: Commit** — `git commit -m "feat(mcp): patterns join search/get; init AGENTS.md gains the pattern-first rule (D43/D44 posture)"`

---

### Task 6: Docs, changesets, final verify

**Files:**
- Modify: `packages/react/llms.txt` (rules section: pattern usage rule mirroring the AGENTS.md house rule)
- Create: `.changeset/d47-d48-patterns-validator.md`

- [ ] **Step 1:** `packages/react/llms.txt` rules addition: `- Before composing multi-component UI, consult dist/patterns.json (or psi-mcp search) for a matching pattern and honor its clarifying parameters; presets are copy-paste JSX generated from the compose tree.`
- [ ] **Step 2:** Changeset:

```md
---
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

D47/D48 patterns + contract validator: composition recipes with clarifying parameters in `patterns/*.json` (seeds: settings-form-row, destructive-confirm, filter-toolbar), validated in `pnpm build` by the single contract validator (all D48 error classes throw; `gaps` print as the machine-readable backlog); generated `dist/patterns.json` carries gap-annotated recipes and deterministic preset JSX. psi-mcp: pattern intents join `search`, `get pattern:<id>` returns full recipes (no new tools, D43); `init` AGENTS.md gains the pattern-first composition rule. Field declares D45 slot contracts (label/body/description).
```

- [ ] **Step 3:** Full gate: `pnpm build && pnpm test && pnpm lint && node tools/check-docs-drift.mjs` — all green.
- [ ] **Step 4: Commit** — `git commit -m "docs(react,mcp): pattern rules in llms.txt + changeset (D47/D48)"` (push + PR handled by the controller after the final whole-branch review).

---

## Self-Review Notes

- **Spec coverage**: pattern fields incl. `match`/`content`/`gaps` (T1/T2) ✓; schema shipped in-repo (T2) ✓; validator in `pnpm build`, throws, all D48 classes, gaps-as-report (T1/T4) ✓; typed parameter check options ⊆ union of every fill site (T1 class 7) ✓; blocked-in-index (T4) ✓; preset only for zero-gap/fully-defaulted, generated, byte-identical re-render (T3/T4) ✓; psi-mcp search briefs = id+intent+param count+blocked, get returns full recipe, no new tools (T5) ✓; AGENTS.md house rule (T5) ✓; check-docs-drift pattern count (T4) ✓; validator unit tests one per class + gaps-only fixture passing with report (T1) ✓; preset snapshot + byte-identical (T3/T4) ✓; manifest-merge real-dist posture (T2/T5) ✓.
- **Known judgment points for the executor**: T2's CHECK notes (Switch size union, Input placeholder, Tag dismissible — verify against the real manifest, adjust seeds and say so); T3's expected-string contract; T5's init test depends on how init.ts is currently tested — read first.
- **Deliberate scope exclusions**: D48's scopes-entry class lives in the D46 token build (HAN-14, separate branch — no dependency between the branches; the validator comment records it). No slot contracts added beyond Field (YAGNI).
