# Pattern presets that hold their state (D143) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every pattern preset passes the MCP's `check`, because a pattern can declare the state it owns and the inputs its caller supplies, and a build rule plus a test keep it that way.

**Architecture:** A new `packages/react/scripts/pattern-bindings.ts` holds the five binding placeholders (parse, emit as text, resolve at runtime). `patterns.ts` validates them, renders a stateful pattern's preset as a typed component module, and mounts the same thing in Storybook. Eight pattern JSON files gain `state`/`inputs`. `validatePatterns` then rejects any unbound required prop, and an MCP test runs every preset through `runCheck`.

**Tech Stack:** TypeScript, Vitest, React 19 (`useState`, `createElement`), `@testing-library/react`, pnpm workspaces.

Spec: `docs/superpowers/specs/2026-11-19-d143-preset-state-design.md`.

## Global Constraints

- Work in the worktree `.claude/worktrees/d143-preset-state` on branch `d143-preset-state`. Node 24 (`nvm use`); run `pnpm install` once, then `pnpm build` before the first test run: the tests read `packages/react/dist/manifest.json`, `dist/attributes.json` and `dist/patterns.json`.
- A pattern with neither `state` nor `inputs` renders **byte-identically** to today, in `renderPreset`, in `renderPresetElement`, and in `dist/patterns.json`.
- Keys are camelCase: `/^[a-z][A-Za-z0-9]*$/`, unique across `state` and `inputs` together. The setter is `set` + the key with its first letter capitalised.
- The five placeholders are legal in prop positions only: `{state:k}` → `k`; `{set:k:v}` → `() => setK(v)`; `{toggle:k}` → `() => setK(!k)`; `{setter:k}` → `setK`; `{input:k}` → `k`.
- A function type is an input `type` that starts with `(`, or a manifest prop `type` that contains `=>`.
- Never hardcode colours; nothing in this repo names the private register, an id from it, or a consumer.
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `pnpm vr` passes only in CI. Do not run it locally and do not write baselines.

---

### Task 1: The binding vocabulary, loaded and validated

**Files:**
- Create: `packages/react/scripts/pattern-bindings.ts`
- Create: `packages/react/scripts/pattern-bindings.test.ts`
- Modify: `packages/react/scripts/patterns.ts` (the `Pattern` interface, `validatePatterns`)
- Modify: `packages/react/scripts/patterns-loader.ts`
- Modify: `packages/react/scripts/patterns.test.ts` (loader cases)
- Modify: `packages/react/patterns/pattern.schema.json`

**Interfaces:**
- Produces, in `pattern-bindings.ts`:
  - `type Binding = { kind: "state" | "toggle" | "setter" | "input"; key: string } | { kind: "set"; key: string; value: string | number | boolean }`
  - `parseBinding(raw: unknown): Binding | null` (throws `malformed binding "<raw>"` on a near miss)
  - `bindingExpr(b: Binding): string`
  - `interface BindingScope { values: Record<string, unknown>; setters: Record<string, (value: unknown) => void> }`
  - `bindingValue(b: Binding, scope: BindingScope): unknown`
  - `setterName(key: string): string`, `pascalCase(id: string): string`, `isFunctionType(type: string): boolean`
  - `attributesByComponent(json: { sets: string[][]; components: Record<string, number> }): Record<string, string[]>`
  - `KEY_RE: RegExp`
- Produces, in `patterns.ts`: `interface PatternState { key: string; initial: string | number | boolean }`, `interface PatternInput { key: string; type: string; story?: string | number | boolean }`; `Pattern` gains `state?: PatternState[]` and `inputs?: PatternInput[]`; `validatePatterns(patterns, components, contracts, icons = [], attributes: Record<string, string[]> = {})`.

- [ ] **Step 1: Write the failing tests**

Create `packages/react/scripts/pattern-bindings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { bindingExpr, bindingValue, isFunctionType, parseBinding, pascalCase, setterName } from "./pattern-bindings.js";
import { validatePatterns } from "./patterns.js";
import type { ManifestComponent, Pattern } from "./patterns.js";

describe("parseBinding", () => {
  it("parses the five forms", () => {
    expect(parseBinding("{state:open}")).toEqual({ kind: "state", key: "open" });
    expect(parseBinding("{set:open:false}")).toEqual({ kind: "set", key: "open", value: false });
    expect(parseBinding("{set:page:1}")).toEqual({ kind: "set", key: "page", value: 1 });
    expect(parseBinding("{set:value:all}")).toEqual({ kind: "set", key: "value", value: "all" });
    expect(parseBinding("{toggle:open}")).toEqual({ kind: "toggle", key: "open" });
    expect(parseBinding("{setter:value}")).toEqual({ kind: "setter", key: "value" });
    expect(parseBinding("{input:onConfirm}")).toEqual({ kind: "input", key: "onConfirm" });
  });
  it("returns null for anything that is not a binding", () => {
    expect(parseBinding("{param:size}")).toBeNull();
    expect(parseBinding("{content:title}")).toBeNull();
    expect(parseBinding("open")).toBeNull();
    expect(parseBinding(true)).toBeNull();
    expect(parseBinding(32)).toBeNull();
  });
  it("throws on a near miss", () => {
    expect(() => parseBinding("{state:Open}")).toThrow(/malformed binding "\{state:Open\}"/);
    expect(() => parseBinding("{toggle:}")).toThrow(/malformed binding/);
    expect(() => parseBinding("{set:open}")).toThrow(/malformed binding/);
  });
});

describe("binding helpers", () => {
  it("names setters and wrappers", () => {
    expect(setterName("sidebarOpen")).toBe("setSidebarOpen");
    expect(pascalCase("row-actions")).toBe("RowActions");
    expect(pascalCase("app-shell")).toBe("AppShell");
  });
  it("tells function types apart", () => {
    expect(isFunctionType("() => void")).toBe(true);
    expect(isFunctionType("(page: number) => void")).toBe(true);
    expect(isFunctionType("boolean")).toBe(false);
  });
  it("emits each binding's expression", () => {
    expect(bindingExpr({ kind: "state", key: "open" })).toBe("open");
    expect(bindingExpr({ kind: "input", key: "onConfirm" })).toBe("onConfirm");
    expect(bindingExpr({ kind: "setter", key: "value" })).toBe("setValue");
    expect(bindingExpr({ kind: "toggle", key: "open" })).toBe("() => setOpen(!open)");
    expect(bindingExpr({ kind: "set", key: "open", value: false })).toBe("() => setOpen(false)");
    expect(bindingExpr({ kind: "set", key: "value", value: "all" })).toBe('() => setValue("all")');
  });
  it("resolves each binding against a scope", () => {
    const calls: unknown[] = [];
    const scope = { values: { open: false, onEdit: "edit-fn" }, setters: { open: (v: unknown) => calls.push(v) } };
    expect(bindingValue({ kind: "state", key: "open" }, scope)).toBe(false);
    expect(bindingValue({ kind: "input", key: "onEdit" }, scope)).toBe("edit-fn");
    expect(bindingValue({ kind: "setter", key: "open" }, scope)).toBe(scope.setters.open);
    (bindingValue({ kind: "toggle", key: "open" }, scope) as () => void)();
    (bindingValue({ kind: "set", key: "open", value: 7 }, scope) as () => void)();
    expect(calls).toEqual([true, 7]);
  });
});

const menu: ManifestComponent = {
  name: "Menu",
  slots: [
    { name: "trigger", accepts: { components: ["Button"] }, cardinality: "1..1" },
    { name: "body", accepts: { components: ["MenuItem"] }, cardinality: "1..*" },
  ],
  props: [
    { name: "open", type: "boolean", required: true, default: null },
    { name: "onClose", type: "(reason: MenuCloseReason) => void", required: true, default: null },
    { name: "trigger", type: "ReactElement", required: true, default: null },
    { name: "children", type: "ReactNode", required: true, default: null },
  ],
};
const menuItem: ManifestComponent = {
  name: "MenuItem",
  slots: [],
  props: [
    { name: "children", type: "ReactNode", required: true, default: null },
    { name: "onSelect", type: "() => void", required: true, default: null },
  ],
};
const button: ManifestComponent = {
  name: "Button",
  slots: [],
  props: [{ name: "variant", type: '"ghost" | "danger"', required: false, default: "neutral" }],
};
const components = [menu, menuItem, button];
const attributes = { Button: ["onClick", "aria-expanded"] };

const menuPattern = (over: Partial<Pattern> = {}): Pattern => ({
  id: "row-actions", intent: "i", match: ["m"], parameters: [], gaps: [], requires: [],
  content: { trigger: "Actions", edit: "Edit" },
  state: [{ key: "open", initial: false }],
  inputs: [{ key: "onEdit", type: "() => void" }],
  compose: {
    component: "Menu",
    props: { open: "{state:open}", onClose: "{set:open:false}" },
    slots: {
      trigger: [{ component: "Button", props: { onClick: "{toggle:open}", "aria-expanded": "{state:open}" }, content: "trigger" }],
      body: [{ component: "MenuItem", props: { onSelect: "{input:onEdit}" }, content: "edit" }],
    },
  },
  ...over,
});
const ok = (p: Pattern) => validatePatterns([p], components, {}, [], attributes);
const withCompose = (edit: (c: Pattern["compose"]) => void): Pattern => {
  const p = menuPattern();
  edit(p.compose);
  return p;
};

describe("validatePatterns: state and inputs (D143)", () => {
  it("accepts a fully bound pattern", () => {
    expect(() => ok(menuPattern())).not.toThrow();
  });
  it("accepts a pass-through attribute the component forwards, and rejects one it does not", () => {
    expect(() => validatePatterns([menuPattern()], components, {}, [], {})).toThrow(/unknown prop "onClick" on component "Button"/);
  });
  it("rejects an undeclared state or input", () => {
    expect(() => ok(withCompose((c) => { c.props!.open = "{state:shown}"; }))).toThrow(/state "shown" referenced but not declared/);
    expect(() =>
      ok(withCompose((c) => { (c.slots!.body[0] as { props: Record<string, unknown> }).props.onSelect = "{input:onDelete}"; })),
    ).toThrow(/input "onDelete" referenced but not declared/);
  });
  it("rejects a declared key nothing uses", () => {
    expect(() => ok(menuPattern({ state: [{ key: "open", initial: false }, { key: "extra", initial: 0 }] }))).toThrow(
      /state "extra" declared but never referenced/,
    );
    expect(() =>
      ok(menuPattern({ inputs: [{ key: "onEdit", type: "() => void" }, { key: "onCopy", type: "() => void" }] })),
    ).toThrow(/input "onCopy" declared but never referenced/);
  });
  it("rejects {toggle:} on a state that is not boolean", () => {
    expect(() => ok(menuPattern({ state: [{ key: "open", initial: 0 }] }))).toThrow(/\{toggle:open\} needs a boolean state/);
  });
  it("rejects a callback binding on a value prop, and a value binding on a callback prop", () => {
    expect(() => ok(withCompose((c) => { c.props!.open = "{set:open:false}"; c.props!.onClose = "{state:open}"; }))).toThrow(
      /\{set:open\} on prop "open": a callback binding needs a function-typed prop/,
    );
    expect(() => ok(withCompose((c) => { c.props!.onClose = "{state:open}"; }))).toThrow(
      /\{state:open\} on prop "onClose": a value binding needs a prop that is not a function/,
    );
  });
  it("rejects a binding in a text position", () => {
    expect(() => ok(withCompose((c) => { c.slots!.body.push("{state:open}"); }))).toThrow(
      /binding "\{state:open\}" used outside a prop position/,
    );
  });
  it("rejects malformed, duplicate and storyless keys", () => {
    expect(() => ok(menuPattern({ state: [{ key: "Open", initial: false }] }))).toThrow(/state key "Open" is not a camelCase identifier/);
    expect(() => ok(menuPattern({ inputs: [{ key: "onEdit", type: "() => void" }, { key: "open", type: "boolean", story: true }] }))).toThrow(
      /key "open" declared twice/,
    );
    expect(() => ok(menuPattern({ inputs: [{ key: "onEdit", type: "() => void" }, { key: "label", type: "string" }] }))).toThrow(
      /input "label" needs a story value/,
    );
  });
});
```

Append to `packages/react/scripts/patterns.test.ts`, inside the existing `describe("loadPatterns", …)` block, before its closing `});`:

```ts
  it("loads state and inputs, defaulting both to []", () => {
    const dir = mkdtempSync(join(tmpdir(), "patterns-"));
    writeFileSync(join(dir, "a.json"), JSON.stringify(base({ id: "a" })));
    writeFileSync(
      join(dir, "b.json"),
      JSON.stringify(base({ id: "b", state: [{ key: "open", initial: false }], inputs: [{ key: "onClose", type: "() => void" }] })),
    );
    const [a, b] = loadPatterns(dir);
    expect(a.state).toEqual([]);
    expect(a.inputs).toEqual([]);
    expect(b.state).toEqual([{ key: "open", initial: false }]);
    expect(b.inputs).toEqual([{ key: "onClose", type: "() => void" }]);
  });
  it("throws on a mis-shaped state or input entry", () => {
    const write = (over: Record<string, unknown>) => {
      const dir = mkdtempSync(join(tmpdir(), "patterns-"));
      writeFileSync(join(dir, "x.json"), JSON.stringify({ ...base({ id: "x" }), ...over }));
      return () => loadPatterns(dir);
    };
    expect(write({ state: {} })).toThrow(/x\.json: "state" must be an array/);
    expect(write({ state: [{ initial: 1 }] })).toThrow(/x\.json: state\[0\]: missing\/invalid "key"/);
    expect(write({ state: [{ key: "a", initial: {} }] })).toThrow(/state\[0\]: "initial" must be a string, number or boolean/);
    expect(write({ inputs: [{ key: "a" }] })).toThrow(/x\.json: inputs\[0\]: missing\/invalid "type"/);
    expect(write({ inputs: [{ key: "a", type: "boolean", story: [] }] })).toThrow(/inputs\[0\]: "story" must be a string, number or boolean/);
  });
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm vitest run packages/react/scripts/pattern-bindings.test.ts packages/react/scripts/patterns.test.ts`
Expected: FAIL: `pattern-bindings.js` does not exist; the loader cases fail on `undefined`.

- [ ] **Step 3: Write `pattern-bindings.ts`**

```ts
/** D143: the five placeholders that bind a compose-tree prop to a pattern's
 * own state or to an input its caller supplies. Pure; shared by
 * `validatePatterns`, `renderPreset` (text) and `renderPresetElement`
 * (runtime values). */

export type Binding =
  | { kind: "state" | "toggle" | "setter" | "input"; key: string }
  | { kind: "set"; key: string; value: string | number | boolean };

const KEY = "[a-z][A-Za-z0-9]*";
export const KEY_RE = new RegExp(`^${KEY}$`);
const FORMS: Array<[Binding["kind"], RegExp]> = [
  ["state", new RegExp(`^\\{state:(${KEY})\\}$`)],
  ["set", new RegExp(`^\\{set:(${KEY}):(.+)\\}$`)],
  ["toggle", new RegExp(`^\\{toggle:(${KEY})\\}$`)],
  ["setter", new RegExp(`^\\{setter:(${KEY})\\}$`)],
  ["input", new RegExp(`^\\{input:(${KEY})\\}$`)],
];
const NEAR_MISS = /^\{(state|set|toggle|setter|input):/;

const parseSetValue = (raw: string): string | number | boolean => {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
};

/** A binding, or null when `raw` is not one. A string that starts like a
 * binding but does not parse is an authoring mistake: it throws rather than
 * render as literal text. */
export function parseBinding(raw: unknown): Binding | null {
  if (typeof raw !== "string") return null;
  for (const [kind, re] of FORMS) {
    const m = re.exec(raw);
    if (!m) continue;
    return kind === "set" ? { kind, key: m[1], value: parseSetValue(m[2]) } : { kind, key: m[1] };
  }
  if (NEAR_MISS.test(raw)) throw new Error(`malformed binding "${raw}"`);
  return null;
}

export const setterName = (key: string): string => `set${key[0].toUpperCase()}${key.slice(1)}`;

export const pascalCase = (id: string): string =>
  id.split("-").map((w) => `${w[0].toUpperCase()}${w.slice(1)}`).join("");

/** An input's declared TypeScript type is a function type when it starts
 * with `(`, as in `() => void`. */
export const isFunctionType = (type: string): boolean => type.trimStart().startsWith("(");

/** The JSX expression a binding emits in a preset. */
export function bindingExpr(b: Binding): string {
  switch (b.kind) {
    case "state":
    case "input":
      return b.key;
    case "setter":
      return setterName(b.key);
    case "toggle":
      return `() => ${setterName(b.key)}(!${b.key})`;
    case "set":
      return `() => ${setterName(b.key)}(${JSON.stringify(b.value)})`;
  }
}

export interface BindingScope {
  values: Record<string, unknown>;
  setters: Record<string, (value: unknown) => void>;
}

/** The runtime value a binding resolves to inside a mounted preset. */
export function bindingValue(b: Binding, scope: BindingScope): unknown {
  switch (b.kind) {
    case "state":
    case "input":
      return scope.values[b.key];
    case "setter":
      return scope.setters[b.key];
    case "toggle":
      return () => scope.setters[b.key](!scope.values[b.key]);
    case "set":
      return () => scope.setters[b.key](b.value);
  }
}

/** `dist/attributes.json` (D129) as component name → the attribute names it
 * passes through to its DOM element. */
export function attributesByComponent(json: { sets: string[][]; components: Record<string, number> }): Record<string, string[]> {
  return Object.fromEntries(Object.entries(json.components).map(([name, i]) => [name, json.sets[i]]));
}
```

- [ ] **Step 4: Extend `Pattern` and the loader**

In `patterns.ts`, above `export interface Pattern`, add:

```ts
/** D143: state a pattern owns; each entry is one `useState` in its preset. */
export interface PatternState {
  key: string;
  initial: string | number | boolean;
}

/** D143: a value or callback the pattern's caller supplies; each entry is a
 * typed prop of the preset's wrapper. `story` is what Storybook passes; a
 * function-typed input gets a no-op there instead. */
export interface PatternInput {
  key: string;
  type: string;
  story?: string | number | boolean;
}
```

and in `interface Pattern`, after `requires`:

```ts
  /** D143; see PatternState. */
  state?: PatternState[];
  /** D143; see PatternInput. */
  inputs?: PatternInput[];
```

In `patterns-loader.ts`, change the import to `import type { Pattern, PatternInput, PatternRequirement, PatternState } from "./patterns.js";`, add to the returned object after `requires`:

```ts
      state: parseState(raw.state, file),
      inputs: parseInputs(raw.inputs, file),
```

and append:

```ts
const isScalar = (v: unknown): v is string | number | boolean =>
  typeof v === "string" || typeof v === "number" || typeof v === "boolean";

/** D143: the optional `state` array. Key format is checked by
 * validatePatterns; this checks shape only. */
function parseState(raw: unknown, file: string): PatternState[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new Error(`${file}: "state" must be an array`);
  return raw.map((e, i) => {
    const at = `${file}: state[${i}]`;
    if (typeof e?.key !== "string") throw new Error(`${at}: missing/invalid "key"`);
    if (!isScalar(e.initial)) throw new Error(`${at}: "initial" must be a string, number or boolean`);
    return { key: e.key, initial: e.initial };
  });
}

/** D143: the optional `inputs` array. */
function parseInputs(raw: unknown, file: string): PatternInput[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new Error(`${file}: "inputs" must be an array`);
  return raw.map((e, i) => {
    const at = `${file}: inputs[${i}]`;
    if (typeof e?.key !== "string") throw new Error(`${at}: missing/invalid "key"`);
    if (typeof e.type !== "string") throw new Error(`${at}: missing/invalid "type"`);
    if (e.story !== undefined && !isScalar(e.story)) throw new Error(`${at}: "story" must be a string, number or boolean`);
    return e.story === undefined ? { key: e.key, type: e.type } : { key: e.key, type: e.type, story: e.story };
  });
}
```

- [ ] **Step 5: Validate bindings in `validatePatterns`**

In `patterns.ts`, import from the new module:

```ts
import { KEY_RE, isFunctionType, parseBinding } from "./pattern-bindings.js";
```

Add a fifth parameter to `validatePatterns`, and extend its doc comment with one line ("`attributes`: component → pass-through attribute names from `dist/attributes.json`; a prop the manifest does not list is accepted when the component forwards it (D143)"):

```ts
  icons: string[] = [],
  attributes: Record<string, string[]> = {},
): { gaps: Record<string, string[]> } {
```

Inside the per-pattern loop, right after `const prefix = …;`, add:

```ts
    // D143: the pattern's own state and its caller's inputs.
    const stateByKey = new Map((pattern.state ?? []).map((s) => [s.key, s]));
    const inputByKey = new Map((pattern.inputs ?? []).map((i) => [i.key, i]));
    const seenKeys = new Set<string>();
    for (const [kind, key] of [
      ...(pattern.state ?? []).map((s) => ["state", s.key] as const),
      ...(pattern.inputs ?? []).map((i) => ["input", i.key] as const),
    ]) {
      if (!KEY_RE.test(key)) throw new Error(`${prefix}${kind} key "${key}" is not a camelCase identifier`);
      if (seenKeys.has(key)) throw new Error(`${prefix}key "${key}" declared twice across state and inputs`);
      seenKeys.add(key);
    }
    for (const input of pattern.inputs ?? []) {
      if (!isFunctionType(input.type) && input.story === undefined) {
        throw new Error(`${prefix}input "${input.key}" needs a story value: it is not a function type`);
      }
    }
    const usedBindingKeys = new Set<string>();

    /** Validates a binding placeholder in a prop position. Returns true when
     * `value` was a binding (the caller then skips its literal checks).
     * `propType` is the manifest type, or null where there is none to
     * compare (gap nodes, intrinsics, aria-*, pass-through attributes). */
    const checkBinding = (propName: string, value: unknown, propType: string | null, path: string): boolean => {
      const binding = parseBinding(value);
      if (!binding) return false;
      usedBindingKeys.add(binding.key);
      let wantsFunction: boolean;
      if (binding.kind === "input") {
        const input = inputByKey.get(binding.key);
        if (!input) throw new Error(`${prefix}input "${binding.key}" referenced but not declared`);
        wantsFunction = isFunctionType(input.type);
      } else {
        const state = stateByKey.get(binding.key);
        if (!state) throw new Error(`${prefix}state "${binding.key}" referenced but not declared`);
        if (binding.kind === "toggle" && typeof state.initial !== "boolean") {
          throw new Error(`${prefix}${path}: {toggle:${binding.key}} needs a boolean state`);
        }
        wantsFunction = binding.kind !== "state";
      }
      if (propType !== null && propType.includes("=>") !== wantsFunction) {
        throw new Error(
          `${prefix}${path}: {${binding.kind}:${binding.key}} on prop "${propName}": ${
            wantsFunction ? "a callback binding needs a function-typed prop" : "a value binding needs a prop that is not a function"
          }`,
        );
      }
      return true;
    };
```

Make every prop position call it:

1. In `trackTextPlaceholder`, as its first statement:

```ts
      if (parseBinding(value)) {
        throw new Error(`${prefix}binding "${value}" used outside a prop position — bindings bind prop values (D143)`);
      }
```

2. In the intrinsic branch of `walk`, replace `for (const propValue of Object.values(node.props ?? {})) trackPropPlaceholders(propValue);` with:

```ts
        for (const [propName, propValue] of Object.entries(node.props ?? {})) {
          if (!checkBinding(propName, propValue, null, path)) trackPropPlaceholders(propValue);
        }
```

3. In the props loop, at the top of the `if (!manifestComponent || isGap) {` branch: `if (checkBinding(propName, propValue, null, path)) continue;`

4. In the aria branch, before `trackPropPlaceholders(propValue);`: `if (checkBinding(propName, propValue, null, path)) continue;`

5. Replace the unknown-prop block

```ts
        const propDef = manifestComponent.props.find((p) => p.name === propName);
        if (!propDef) {
          throw new Error(…);
        }
        trackPropPlaceholders(propValue);
```

with

```ts
        const propDef = manifestComponent.props.find((p) => p.name === propName);
        if (!propDef) {
          // D143: a pass-through attribute the component forwards to its DOM
          // element (dist/attributes.json), such as a trigger's onClick.
          if (attributes[node.component]?.includes(propName)) {
            if (!checkBinding(propName, propValue, null, path)) trackPropPlaceholders(propValue);
            continue;
          }
          throw new Error(
            `${prefix}${path}: unknown prop "${propName}" on component "${node.component}"`,
          );
        }
        if (checkBinding(propName, propValue, propDef.type, path)) continue;
        trackPropPlaceholders(propValue);
```

After `walk(pattern.compose, "compose");`, add:

```ts
    for (const key of stateByKey.keys()) {
      if (!usedBindingKeys.has(key)) throw new Error(`${prefix}state "${key}" declared but never referenced`);
    }
    for (const key of inputByKey.keys()) {
      if (!usedBindingKeys.has(key)) throw new Error(`${prefix}input "${key}" declared but never referenced`);
    }
```

- [ ] **Step 6: Extend the JSON Schema sidecar**

In `packages/react/patterns/pattern.schema.json`, add two entries to the top-level `properties` (the schema has `additionalProperties: false`):

```json
"state": {
  "type": "array",
  "description": "D143: state the pattern owns; each entry is one useState in its preset, bound with {state:key}, {set:key:value}, {toggle:key} or {setter:key}.",
  "items": {
    "type": "object",
    "required": ["key", "initial"],
    "additionalProperties": false,
    "properties": {
      "key": { "type": "string", "pattern": "^[a-z][A-Za-z0-9]*$" },
      "initial": { "type": ["string", "number", "boolean"] }
    }
  }
},
"inputs": {
  "type": "array",
  "description": "D143: values and callbacks the caller supplies; each entry is a typed prop of the preset's wrapper, bound with {input:key}. story is what Storybook passes; function types need none.",
  "items": {
    "type": "object",
    "required": ["key", "type"],
    "additionalProperties": false,
    "properties": {
      "key": { "type": "string", "pattern": "^[a-z][A-Za-z0-9]*$" },
      "type": { "type": "string" },
      "story": { "type": ["string", "number", "boolean"] }
    }
  }
}
```

If the schema has no `requires` property either, leave that as it is: it is not this task's.

- [ ] **Step 7: Run the tests to see them pass**

Run: `pnpm vitest run packages/react/scripts`
Expected: PASS, including every existing pattern test (no real pattern uses a binding yet).

- [ ] **Step 8: Commit**

```bash
git add packages/react/scripts/pattern-bindings.ts packages/react/scripts/pattern-bindings.test.ts packages/react/scripts/patterns.ts packages/react/scripts/patterns-loader.ts packages/react/scripts/patterns.test.ts packages/react/patterns/pattern.schema.json
git commit -m "feat: patterns declare state and inputs, bound to props by placeholder and validated (D143)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: A stateful pattern renders as a typed component, in text and in Storybook

**Files:**
- Modify: `packages/react/scripts/patterns.ts` (`renderPreset`, `renderPresetElement`)
- Create: `packages/react/scripts/render-preset-state.test.ts`
- Modify: `packages/react/scripts/render-preset-element.test.tsx`

**Interfaces:**
- Consumes (Task 1): `parseBinding`, `bindingExpr`, `bindingValue`, `BindingScope`, `setterName`, `pascalCase`, `isFunctionType` from `./pattern-bindings.js`; `Pattern.state`, `Pattern.inputs`.
- Produces: `renderPreset(pattern, components): string | null` returns a module string when the pattern declares `state` or `inputs`; `renderPresetElement(pattern, components, registry): ReactElement | null` returns an element of a cached stateful component in that case. Signatures unchanged.

- [ ] **Step 1: Write the failing text-render tests**

Create `packages/react/scripts/render-preset-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { renderPreset } from "./patterns.js";
import type { Pattern } from "./patterns.js";

const base = (over: Partial<Pattern>): Pattern => ({
  id: "row-actions", intent: "i", match: ["m"], parameters: [], content: {}, gaps: [], requires: [],
  compose: { component: "Button" }, ...over,
});

describe("renderPreset: stateful patterns render a component module (D143)", () => {
  it("renders state, inputs and every binding form", () => {
    const p = base({
      content: { trigger: "Actions", edit: "Edit" },
      state: [{ key: "open", initial: false }],
      inputs: [{ key: "onEdit", type: "() => void" }],
      compose: {
        component: "Menu",
        props: { open: "{state:open}", onClose: "{set:open:false}" },
        slots: {
          trigger: [{ component: "Button", props: { onClick: "{toggle:open}", "aria-expanded": "{state:open}" }, content: "trigger" }],
          body: [{ component: "MenuItem", props: { onSelect: "{input:onEdit}" }, content: "edit" }],
        },
      },
    });
    expect(renderPreset(p, [])).toBe(
`import { useState } from "react";
import { Button, Menu, MenuItem } from "@handamade/psi-react";

export function RowActions({ onEdit }: {
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Menu
      onClose={() => setOpen(false)}
      open={open}
      trigger={<Button aria-expanded={open} onClick={() => setOpen(!open)}>Actions</Button>}
    >
      <MenuItem onSelect={onEdit}>Edit</MenuItem>
    </Menu>
  );
}
`);
  });

  it("omits the react import without state, and the props parameter without inputs", () => {
    const inputsOnly = base({
      id: "destructive-confirm",
      content: { body: "Body" },
      inputs: [{ key: "open", type: "boolean", story: true }, { key: "onClose", type: "() => void" }],
      compose: { component: "Dialog", props: { open: "{input:open}", onClose: "{input:onClose}" }, content: "body" },
    });
    expect(renderPreset(inputsOnly, [])).toBe(
`import { Dialog } from "@handamade/psi-react";

export function DestructiveConfirm({ open, onClose }: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} open={open}>Body</Dialog>
  );
}
`);
    const stateOnly = base({
      id: "tabbed-workspace",
      content: { panels: "Panels" },
      state: [{ key: "value", initial: "all" }],
      compose: { component: "Tabs", props: { value: "{state:value}", onValueChange: "{setter:value}" }, content: "panels" },
    });
    expect(renderPreset(stateOnly, [])).toBe(
`import { useState } from "react";
import { Tabs } from "@handamade/psi-react";

export function TabbedWorkspace() {
  const [value, setValue] = useState("all");
  return (
    <Tabs onValueChange={setValue} value={value}>Panels</Tabs>
  );
}
`);
  });

  it("imports every component and icon the tree uses, sorted, and never an intrinsic", () => {
    const p = base({
      content: { icon: "[icon]" },
      requires: [{ content: "icon", kind: "icon", name: "IconMoreHorizontal" }],
      inputs: [{ key: "onChange", type: "() => void" }],
      compose: {
        component: "Toolbar",
        slots: {
          body: [
            { component: "Select", props: { onChange: "{input:onChange}" }, slots: { body: [{ component: "option", props: { value: "10" }, slots: { body: ["10"] } }] } },
            { component: "Button", content: "icon" },
          ],
        },
      },
    });
    expect(renderPreset(p, [])!.split("\n")[0]).toBe(
      'import { Button, IconMoreHorizontal, Select, Toolbar } from "@handamade/psi-react";',
    );
  });

  it("leaves a pattern with neither array a bare element", () => {
    const p = base({ content: { label: "Save" }, compose: { component: "Button", props: { variant: "accent" }, content: "label" } });
    expect(renderPreset(p, [])).toBe('<Button variant="accent">Save</Button>\n');
  });
});
```

- [ ] **Step 2: Write the failing mount tests**

Append to `packages/react/scripts/render-preset-element.test.tsx` (add `fireEvent` to the existing `@testing-library/react` import):

```tsx
describe("renderPresetElement: stateful patterns mount working state (D143)", () => {
  function Trigger({ onClick, "aria-expanded": expanded, children }: { onClick?: () => void; "aria-expanded"?: boolean; children?: React.ReactNode }) {
    return <button aria-expanded={expanded} onClick={onClick}>{children}</button>;
  }
  function Menu({ open, trigger, children }: { open: boolean; trigger: React.ReactNode; children?: React.ReactNode }) {
    return <div>{trigger}{open ? <ul role="menu">{children}</ul> : null}</div>;
  }
  function MenuItem({ onSelect, children }: { onSelect: () => void; children?: React.ReactNode }) {
    return <li role="menuitem" onClick={onSelect}>{children}</li>;
  }
  function Panel({ open, onClose, children }: { open: boolean; onClose: () => void; children?: React.ReactNode }) {
    return open ? <section role="dialog"><button onClick={onClose}>Close</button>{children}</section> : null;
  }
  const registry = { Trigger, Menu, MenuItem, Panel };
  const base = (over: Partial<Pattern>): Pattern => ({
    id: "p", intent: "i", match: ["m"], parameters: [], content: {}, gaps: [], requires: [],
    compose: { component: "Trigger" }, ...over,
  });

  it("toggles a pattern's own state, and a set binding closes it", () => {
    const p = base({
      content: { trigger: "Actions", edit: "Edit" },
      state: [{ key: "open", initial: false }],
      compose: {
        component: "Menu",
        props: { open: "{state:open}" },
        slots: {
          trigger: [{ component: "Trigger", props: { onClick: "{toggle:open}", "aria-expanded": "{state:open}" }, content: "trigger" }],
          body: [{ component: "MenuItem", props: { onSelect: "{set:open:false}" }, content: "edit" }],
        },
      },
    });
    render(renderPresetElement(p, [], registry)!);
    const trigger = screen.getByRole("button", { name: "Actions" });
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("passes a value input its story value and a function input a no-op", () => {
    const p = base({
      content: { body: "Details" },
      inputs: [{ key: "open", type: "boolean", story: true }, { key: "onClose", type: "() => void" }],
      compose: { component: "Panel", props: { open: "{input:open}", onClose: "{input:onClose}" }, content: "body" },
    });
    render(renderPresetElement(p, [], registry)!);
    expect(screen.getByRole("dialog").textContent).toContain("Details");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("returns the same component type for the same pattern, so state survives a re-render", () => {
    const p = base({ content: { t: "T" }, state: [{ key: "open", initial: false }], compose: { component: "Trigger", props: { onClick: "{toggle:open}" }, content: "t" } });
    expect(renderPresetElement(p, [], registry)!.type).toBe(renderPresetElement(p, [], registry)!.type);
  });
});
```

If the file's existing imports lack `Pattern` as a type, it already has `import type { ManifestComponent, Pattern } from "./patterns.js";` — keep it.

- [ ] **Step 3: Run the tests to see them fail**

Run: `pnpm vitest run packages/react/scripts/render-preset-state.test.ts packages/react/scripts/render-preset-element.test.tsx`
Expected: FAIL: bindings render as quoted strings (`open="{state:open}"`), no module wrapper, no state.

- [ ] **Step 4: Render bindings and the module in `renderPreset`**

In `patterns.ts`, extend the bindings import to `import { KEY_RE, bindingExpr, bindingValue, isFunctionType, parseBinding, pascalCase, setterName } from "./pattern-bindings.js";` and `import type { BindingScope } from "./pattern-bindings.js";`, and add `useState` to the `react` import.

In `renderPreset`'s `resolvePropValue`, make the first statement:

```ts
    const binding = parseBinding(raw);
    if (binding) return `{${bindingExpr(binding)}}`;
```

Replace the final `return \`${renderNode(pattern.compose, 0)}\n\`;` with:

```ts
  const element = renderNode(pattern.compose, 0);
  const state = pattern.state ?? [];
  const inputs = pattern.inputs ?? [];
  if (state.length === 0 && inputs.length === 0) return `${element}\n`;

  // D143: a pattern with state or inputs renders as a component module in the
  // docs examples' style, so a pasted preset opens, closes and switches.
  const imported = new Set<string>();
  const collect = (node: PatternNode) => {
    if (!INTRINSIC_ELEMENTS.has(node.component)) imported.add(node.component);
    if (node.content !== undefined && iconForContent.has(node.content)) imported.add(iconForContent.get(node.content)!);
    for (const fills of Object.values(node.slots ?? {})) {
      for (const fill of fills) if (typeof fill !== "string") collect(fill);
    }
  };
  collect(pattern.compose);

  const lines: string[] = [];
  if (state.length > 0) lines.push('import { useState } from "react";');
  lines.push(`import { ${[...imported].sort().join(", ")} } from "@handamade/psi-react";`, "");
  const params =
    inputs.length > 0
      ? `{ ${inputs.map((i) => i.key).join(", ")} }: {\n${inputs.map((i) => `  ${i.key}: ${i.type};`).join("\n")}\n}`
      : "";
  lines.push(`export function ${pascalCase(pattern.id)}(${params}) {`);
  for (const s of state) lines.push(`  const [${s.key}, ${setterName(s.key)}] = useState(${JSON.stringify(s.initial)});`);
  lines.push("  return (", element.split("\n").map((l) => `    ${l}`).join("\n"), "  );", "}");
  return `${lines.join("\n")}\n`;
```

`[...imported].sort()` is a code-point sort, the same order the props already use.

- [ ] **Step 5: Mount state in `renderPresetElement`**

Above `export function renderPresetElement`, add:

```ts
/** One stateful component per pattern object, so a re-render keeps its state
 * (D143). Storybook passes the same pattern object every render. */
const statefulPresets = new WeakMap<Pattern, ComponentType>();
```

Inside `renderPresetElement`, thread a scope through. Replace its `resolvePropValue` with:

```ts
  const resolvePropValue = (raw: unknown, scope: BindingScope): unknown => {
    const binding = parseBinding(raw);
    if (binding) return bindingValue(binding, scope);
    if (typeof raw === "string") {
      const paramMatch = PARAM_RE.exec(raw);
      if (paramMatch) return paramDefaults.get(paramMatch[1]);
      return resolveText(raw);
    }
    return raw; // number | boolean literal
  };
```

Change `renderNode` to `const renderNode = (node: PatternNode, scope: BindingScope): ReactElement => {`, pass `scope` to every `resolvePropValue(raw, scope)` and every recursive `renderNode(fill, scope)` / `renderNode(fills[0], scope)`. Replace the final `return renderNode(pattern.compose);` with:

```ts
  const state = pattern.state ?? [];
  const inputs = pattern.inputs ?? [];
  if (state.length === 0 && inputs.length === 0) return renderNode(pattern.compose, { values: {}, setters: {} });

  let Preset = statefulPresets.get(pattern);
  if (!Preset) {
    Preset = function StatefulPreset() {
      const scope: BindingScope = { values: {}, setters: {} };
      // A pattern's state list is fixed for the component's lifetime, so the
      // hook order is stable across renders.
      for (const s of state) {
        const [value, setValue] = useState<unknown>(s.initial);
        scope.values[s.key] = value;
        scope.setters[s.key] = setValue;
      }
      for (const input of inputs) scope.values[input.key] = isFunctionType(input.type) ? () => {} : input.story;
      key = 0;
      return renderNode(pattern.compose, scope);
    };
    statefulPresets.set(pattern, Preset);
  }
  return createElement(Preset);
```

`KEY_RE` is imported for Task 1's use; leave the import list as written even if this task adds nothing that reads it.

- [ ] **Step 6: Run the tests to see them pass**

Run: `pnpm vitest run packages/react/scripts`
Expected: PASS, including every existing `render-preset*` test unchanged.

- [ ] **Step 7: Commit**

```bash
git add packages/react/scripts/patterns.ts packages/react/scripts/render-preset-state.test.ts packages/react/scripts/render-preset-element.test.tsx
git commit -m "feat: a pattern with state or inputs renders as a typed component, and mounts with working state in Storybook (D143)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The eight patterns hold their state, and every preset passes `check`

**Files:**
- Modify: `packages/react/patterns/{destructive-confirm,detail-drawer,row-actions,account-menu,tabbed-workspace,table-pagination,cursor-pagination,app-shell}.json`
- Modify: `packages/react/scripts/emit-patterns.ts`
- Modify: `packages/react/scripts/patterns.test.ts` (the real-manifest validation call)
- Modify: `packages/mcp/src/types.ts` (`PatternEntry`)
- Create: `packages/mcp/__tests__/presets.test.ts`

**Interfaces:**
- Consumes (Tasks 1–2): `attributesByComponent`, `validatePatterns(…, attributes)`, `renderPreset`'s module form, `pascalCase`.
- Produces: `dist/patterns.json` entries carry `state`/`inputs` when non-empty (between `content` and `gaps`); `PatternEntry.state?`, `PatternEntry.inputs?`.

- [ ] **Step 1: Snapshot today's presets**

With `pnpm build` already run on this branch's Task 2 commit:

```bash
mkdir -p .superpowers && node -e 'const p=require("./packages/react/dist/patterns.json").patterns; require("fs").writeFileSync(".superpowers/d143-presets-before.json", JSON.stringify(Object.fromEntries(p.map(x=>[x.id,x.preset])),null,1))'
```

- [ ] **Step 2: Write the failing MCP test**

Create `packages/mcp/__tests__/presets.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check/rules.js";
import { loadTestIndex } from "./test-index.js";

const index = await loadTestIndex();
const presets = index.patterns.filter((p) => p.preset !== null);
const pascal = (id: string) => id.split("-").map((w) => `${w[0].toUpperCase()}${w.slice(1)}`).join("");

describe("every pattern preset passes check (D143)", () => {
  it("has presets to check", () => {
    expect(presets.length).toBeGreaterThanOrEqual(20);
  });

  it.each(presets.map((p) => [p.id, p.preset as string] as const))("%s has no findings", (_id, preset) => {
    const findings = runCheck(preset, index).findings.map((f) => `${f.line}:${f.column} ${f.rule} ${f.message}`);
    expect(findings).toEqual([]);
  });

  it("renders exactly the eight stateful patterns as components named after their id", () => {
    const stateful = presets.filter((p) => (p.state?.length ?? 0) + (p.inputs?.length ?? 0) > 0);
    expect(stateful.map((p) => p.id).sort()).toEqual([
      "account-menu",
      "app-shell",
      "cursor-pagination",
      "destructive-confirm",
      "detail-drawer",
      "row-actions",
      "table-pagination",
      "tabbed-workspace",
    ]);
    for (const p of stateful) expect(p.preset).toContain(`export function ${pascal(p.id)}(`);
  });
});
```

If `runCheck`'s return type names its findings array differently from `findings`, read `packages/mcp/src/check/rules.ts` (`interface Report`) and use its name.

- [ ] **Step 3: Run it to see it fail**

Run: `pnpm vitest run packages/mcp/__tests__/presets.test.ts`
Expected: FAIL: 8 presets with `missing-required` findings (20 in all); `p.state` is a type error or undefined.

- [ ] **Step 4: Carry `state` and `inputs` through the build**

In `packages/react/scripts/emit-patterns.ts`, import `attributesByComponent` from `./pattern-bindings.js`, read the attributes after the manifest:

```ts
  // D143: pass-through attributes (D129), so a trigger may carry onClick.
  const attributes = attributesByComponent(
    JSON.parse(readFileSync(join(rootDir, "dist", "attributes.json"), "utf8")) as {
      sets: string[][];
      components: Record<string, number>;
    },
  );
```

pass it as `validatePatterns(patterns, manifest.components, contracts, icons, attributes)`, and in the output object insert after `content: pattern.content,`:

```ts
        ...(pattern.state?.length ? { state: pattern.state } : {}),
        ...(pattern.inputs?.length ? { inputs: pattern.inputs } : {}),
```

In `packages/react/scripts/patterns.test.ts`, find the real-manifest test (it reads `dist/manifest.json` and calls `validatePatterns(patterns, manifest.components, contracts);`). Read `dist/attributes.json` the same way and pass `attributesByComponent(…)` as the fifth argument (add `[]` for `icons` if the call has none; if the test builds `icons` itself, pass that).

In `packages/mcp/src/types.ts`, in `interface PatternEntry`, after `content`:

```ts
  /** D143: state the pattern owns, when it has any. */
  state?: Array<{ key: string; initial: string | number | boolean }>;
  /** D143: values and callbacks its caller supplies, when it has any. */
  inputs?: Array<{ key: string; type: string; story?: string | number | boolean }>;
```

- [ ] **Step 5: Edit the eight patterns**

Add each pattern's arrays as top-level keys right after `"content"`, and change the props at the given compose paths (`compose.footer[0]` is the first node of the root's `footer` slot, and so on). Keep every other key and value as it is.

`destructive-confirm.json`:

```json
"inputs": [
  { "key": "open", "type": "boolean", "story": true },
  { "key": "onClose", "type": "() => void" },
  { "key": "onConfirm", "type": "() => void" }
],
```
- `compose.props`: `{ "open": "{input:open}", "onClose": "{input:onClose}" }` (it has none today)
- `compose.footer[0].props`: add `"onClick": "{input:onClose}"`
- `compose.footer[1].props`: add `"onClick": "{input:onConfirm}"`

`detail-drawer.json`:

```json
"inputs": [
  { "key": "open", "type": "boolean", "story": true },
  { "key": "onClose", "type": "() => void" },
  { "key": "onSave", "type": "() => void" }
],
```
- `compose.props`: add `"open": "{input:open}"`, `"onClose": "{input:onClose}"` beside `placement`
- `compose.footer[0].props` (Save, `accent`): add `"onClick": "{input:onSave}"`
- `compose.footer[1].props` (Close, `neutral`): add `"onClick": "{input:onClose}"`

`row-actions.json`:

```json
"state": [{ "key": "open", "initial": false }],
"inputs": [
  { "key": "onEdit", "type": "() => void" },
  { "key": "onDuplicate", "type": "() => void" },
  { "key": "onDelete", "type": "() => void" }
],
```
- `compose.props`: add `"open": "{state:open}"`, `"onClose": "{set:open:false}"`
- `compose.trigger[0].props` (`IconButton`): add `"onClick": "{toggle:open}"`, `"aria-expanded": "{state:open}"`
- `compose.body[0].props`: `{ "onSelect": "{input:onEdit}" }`
- `compose.body[1].props`: `{ "onSelect": "{input:onDuplicate}" }`
- `compose.body[3].props`: add `"onSelect": "{input:onDelete}"` beside `variant`

`account-menu.json`:

```json
"state": [{ "key": "open", "initial": false }],
"inputs": [
  { "key": "onProfile", "type": "() => void" },
  { "key": "onSignOut", "type": "() => void" }
],
```
- `compose.props`: add `"open": "{state:open}"`, `"onClose": "{set:open:false}"`
- `compose.trigger[0].props` (`Button`): add `"onClick": "{toggle:open}"`, `"aria-expanded": "{state:open}"`
- `compose.body[0].props`: `{ "onSelect": "{input:onProfile}" }`
- `compose.body[2].props`: `{ "onSelect": "{input:onSignOut}" }`

`tabbed-workspace.json`:

```json
"state": [{ "key": "value", "initial": "all" }],
```
- `compose.props`: add `"value": "{state:value}"`, `"onValueChange": "{setter:value}"`

`table-pagination.json`:

```json
"state": [{ "key": "page", "initial": 1 }],
```
- `compose.body[1].props` (`Pagination`): `"page": "{state:page}"` (was `1`), add `"onPageChange": "{setter:page}"`; `pageCount` stays `10`

`cursor-pagination.json`:

```json
"inputs": [
  { "key": "hasPrevious", "type": "boolean", "story": true },
  { "key": "hasNext", "type": "boolean", "story": true },
  { "key": "onPrevious", "type": "() => void" },
  { "key": "onNext", "type": "() => void" }
],
```
- `compose.body[1].props` (`CursorPagination`): `{ "hasPrevious": "{input:hasPrevious}", "hasNext": "{input:hasNext}", "onPrevious": "{input:onPrevious}", "onNext": "{input:onNext}" }`

`app-shell.json`:

```json
"state": [
  { "key": "sidebarOpen", "initial": true },
  { "key": "group1Open", "initial": true },
  { "key": "group2Open", "initial": true }
],
```
- `compose.props`: `"sidebarOpen": "{state:sidebarOpen}"` (was `true`)
- `compose.header[0].brand[0].props` (the Menu `Button`): `"aria-expanded": "{state:sidebarOpen}"` (was `true`), add `"onClick": "{toggle:sidebarOpen}"`
- `compose.sidebar[0].body[1].props` (`NavGroup`): `"open": "{state:group1Open}"` (was `true`), add `"onOpenChange": "{setter:group1Open}"`
- `compose.sidebar[0].body[2].props` (`NavGroup`): `"open": "{state:group2Open}"` (was `true`), add `"onOpenChange": "{setter:group2Open}"`

- [ ] **Step 6: Rebuild and run the tests**

```bash
pnpm --filter @handamade/psi-react build && pnpm --filter @handamade/psi-mcp build
pnpm vitest run packages/react/scripts packages/mcp/__tests__/presets.test.ts
```

Expected: PASS. A `validatePatterns` error names the pattern and path; fix the JSON it names. If `check` still reports a finding on a module preset, print it with `node -e 'console.log(require("./packages/react/dist/patterns.json").patterns.find(p=>p.id==="row-actions").preset)'` and compare it with the spec.

- [ ] **Step 7: Prove the other sixteen presets did not move**

```bash
node -e '
const before=require("./.superpowers/d143-presets-before.json");
const after=Object.fromEntries(require("./packages/react/dist/patterns.json").patterns.map(x=>[x.id,x.preset]));
const eight=new Set(["account-menu","app-shell","cursor-pagination","destructive-confirm","detail-drawer","row-actions","table-pagination","tabbed-workspace"]);
const moved=Object.keys(before).filter(id=>!eight.has(id)&&before[id]!==after[id]);
console.log(moved.length?"MOVED: "+moved.join(", "):"16 unchanged");'
```

Expected: `16 unchanged`. Anything else is a bug in Task 2's stateless path: stop and fix it there.

- [ ] **Step 8: Commit**

```bash
git add packages/react/patterns packages/react/scripts/emit-patterns.ts packages/react/scripts/patterns.test.ts packages/mcp/src/types.ts packages/mcp/__tests__/presets.test.ts
git commit -m "feat: eight pattern presets hold their state and pass check, held by a test (D143)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Every required prop must be bound; prose, changeset and gates

**Files:**
- Modify: `packages/react/scripts/patterns.ts` (`validatePatterns`)
- Modify: `packages/react/scripts/pattern-bindings.test.ts`
- Modify: `packages/react/llms.txt`, `packages/mcp/llms.txt`, `packages/docs/guides/ai.mdx`
- Modify: `docs/superpowers/specs/2026-11-19-d143-preset-state-design.md` (status)
- Create: `.changeset/preset-state.md`

**Interfaces:**
- Consumes: everything above. Real patterns must already bind every required prop (Task 3).

- [ ] **Step 1: Write the failing tests**

Append to `packages/react/scripts/pattern-bindings.test.ts`, inside `describe("validatePatterns: state and inputs (D143)", …)`:

```ts
  it("rejects an unbound required prop", () => {
    expect(() => ok(withCompose((c) => { delete c.props!.onClose; }))).toThrow(
      /compose: required prop "onClose" on "Menu" is not bound/,
    );
    expect(() =>
      ok(withCompose((c) => { delete (c.slots!.body[0] as { props?: Record<string, unknown> }).props; })),
    ).toThrow(/compose\.body\[0\]: required prop "onSelect" on "MenuItem" is not bound/);
  });
  it("counts a slot fill as binding its prop, and body or content as binding children", () => {
    // `trigger` is bound by the trigger slot; Menu's `children` by its body
    // fills; MenuItem's `children` by its `content` key.
    expect(() => ok(menuPattern())).not.toThrow();
    expect(() => ok(withCompose((c) => { delete (c.slots!.body[0] as { content?: string }).content; }))).toThrow(
      /required prop "children" on "MenuItem" is not bound/,
    );
  });
```

The second case leaves `content.edit` unreferenced, which also throws; the required-prop check must run during `walk`, before the unreferenced-content check, so this message is the one that surfaces.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run packages/react/scripts/pattern-bindings.test.ts`
Expected: FAIL: nothing throws for the missing `onClose`.

- [ ] **Step 3: Add the rule**

In `validatePatterns`'s `walk`, inside the `if (manifestComponent && !isGap) {` block at the end (the one that checks unfilled slot cardinality), add after its loop:

```ts
        // D143: a required prop must be bound, or the preset fails `check`'s
        // missing-required. A slot of the same name binds it; `children` is
        // bound by body fills or a content key.
        for (const propDef of manifestComponent.props) {
          if (!propDef.required) continue;
          if (propDef.name in (node.props ?? {})) continue;
          if (propDef.name in givenSlots) continue;
          if (propDef.name === "children" && ((givenSlots.body?.length ?? 0) > 0 || node.content !== undefined)) continue;
          throw new Error(
            `${prefix}${path}: required prop "${propDef.name}" on "${node.component}" is not bound — give it a value, a slot fill, or a state or input binding (D143)`,
          );
        }
```

- [ ] **Step 4: Run every pattern test, then rebuild**

```bash
pnpm vitest run packages/react/scripts
pnpm --filter @handamade/psi-react build
```

Expected: PASS and a clean build. If the real-manifest test or the build throws on a pattern outside the eight, read the message: either the manifest marks a prop required that `check` does not (compare with `packages/mcp/src/check/rules.ts`'s missing-required rule and report it as a concern rather than loosening the rule), or that pattern really is unbound.

- [ ] **Step 5: Say it in the prose**

- `packages/react/llms.txt` line 7: replace `presets are generated JSX, never hand-written` with `presets are generated, never hand-written: JSX, or a small typed component when the pattern holds state or takes inputs (D143)`.
- `packages/react/llms.txt` line 17: replace `presets are copy-paste JSX generated from the compose tree.` with `presets are copy-paste JSX generated from the compose tree; a pattern with state or inputs renders as a small component that holds its useState and takes its caller's callbacks as props (D143).`
- `packages/mcp/llms.txt` line 5: replace `gaps/blocked, preset JSX` with `gaps/blocked, preset (JSX, or a component when the pattern holds state, D143)`.
- `packages/mcp/llms.txt` line 12: replace `preset JSX)` with `preset JSX or components)`. Keep `24 composition patterns` exactly: `check-docs-drift` counts it.
- `packages/docs/guides/ai.mdx` line 31: replace `parameters, content, gaps and preset JSX` with `parameters, content, gaps, and a preset to paste: JSX, or a small component when the pattern holds state`.

Then: `git grep -n "preset JSX" -- '*.txt' '*.mdx' ':!**/CHANGELOG.md'` and confirm each remaining hit still reads true.

- [ ] **Step 6: Changeset and spec status**

Create `.changeset/preset-state.md`:

```markdown
---
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

Every pattern preset now passes the MCP's `check` (D143). A pattern can declare the `state` it owns and the `inputs` its caller supplies, and its preset then renders as a small typed component that holds its `useState`: `row-actions` and `account-menu` open and close, `tabbed-workspace` switches, `table-pagination` pages, `app-shell`'s sidebar and groups toggle, and `destructive-confirm`, `detail-drawer` and `cursor-pagination` take `open`, `onClose` and their actions as props. `patterns.json` gains optional `state` and `inputs`; the other sixteen presets are unchanged. The build now rejects a pattern that leaves a required prop unbound.
```

In the spec, change the status line to `Date: 2026-11-19. Status: **Implemented** on branch \`d143-preset-state\`.`

- [ ] **Step 7: Re-check the decision number**

```bash
git fetch -q origin
for r in $(git for-each-ref --format='%(refname)' refs/heads refs/remotes/origin); do git grep -l -w "D143" "$r" -- docs 2>/dev/null; done | sort -u | grep -v "d143-preset-state"
grep -rlw "D143" ../*/docs/superpowers/specs 2>/dev/null | grep -v d143-preset-state
```

Expected: no output. If another branch or worktree claims D143, stop and report it: renumbering is the user's call.

- [ ] **Step 8: All five gates**

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site
```

Expected: every step passes. `vr` runs in CI only; the eight `Patterns/Presets` stories are expected to change there, and no other story.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: the build rejects an unbound required prop; presets described as components where they hold state (D143)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After the plan

Opening the PR is the finishing step, not a task. Per `CLAUDE.md`:
- Arm auto-merge (`gh pr merge <n> --auto --squash`), then read it back with `gh pr view <n> --json autoMergeRequest`; if `null`, use the `enablePullRequestAutoMerge` GraphQL mutation.
- CI's `vr` will fail on the eight `Patterns/Presets` stories. Commit CI's renders from the `vr-baselines` artifact (`test-results/**/*-actual.png`) over those baselines only (D89). A ninth story failing is a bug to fix, not a baseline to accept.
- After merge: cut a release, run `pnpm verify:published <version>`, register follow-ups in the private register.
