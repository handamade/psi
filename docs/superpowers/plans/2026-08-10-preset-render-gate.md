# Preset Render Gate Implementation Plan (D77)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `Toolbar`'s direct bare form-control children stretching to full width and stacking vertically, and build a gate that mounts every one of the 13 `patterns.json` entries as a real React element with its own Storybook story and VR baseline, so this class of layout defect can't recur silently.

**Architecture:** Three independent pieces, in dependency order. (1) A new `--psi-toolbar-control-width` token and a scoped `Toolbar` CSS rule fix the bug itself. (2) `renderPresetElement()`, a sibling to the existing string-emitting `renderPreset()` in `packages/react/scripts/patterns.ts`, walks the same compose-tree/resolution logic but produces a real, mountable React element tree — requiring `loadPatterns()` (the only `node:fs`-touching export in that file) to move to its own module first, so the browser-bundled Storybook story never risks resolving `node:fs`. (3) A generated (not hand-written) Storybook story file, one static export per pattern, each calling `renderPresetElement()` against the real `@handamade/psi-react` barrel — so a 14th pattern gets a story automatically and nothing can silently go unmounted.

**Tech Stack:** TypeScript, React 19, vitest, Testing Library, Playwright, tsx (build scripts), Storybook (`@storybook/react-vite`), changesets.

**Spec:** `docs/superpowers/specs/2026-08-10-preset-render-gate-design.md`

## Global Constraints

- **Node 24** (`.nvmrc`). Run `node -v` before the first pnpm command.
- **Run single tests with `pnpm exec vitest run <path>`.** `pnpm --filter <pkg> test` runs nothing.
- **`pnpm build` must precede `check-docs-drift`** and any Storybook-build-dependent step — it regenerates `dist/manifest.json` and `dist/patterns.json`, which the generated story file and its codegen script both read.
- **Five gates, in order:** `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm test:site`.
- **`vr` IS expected to move this cycle** — unlike every D78–D80 cycle, this one adds real stories (13 new pattern stories, plus whatever `Toolbar`'s existing stories pick up from the CSS change). New baselines come from CI's `vr-baselines` artifact per `apps/storybook/vr/README.md`; `pnpm vr` cannot be trusted locally (macOS writes junk baselines).
- **Every test proven red before its fix** — including at the system level: Task 5 must observe `filter-toolbar`'s mounted story rendering *stacked* (the real bug) before Task 6's CSS fix lands, not assume it.
- **`Toolbar` currently has zero component tokens** — there is no `packages/tokens/src/components/toolbar.ts`. `panelVars` (`packages/tokens/src/components/panel.ts`) is the shape to follow: a plain `Record<string, string>`, no inline CSS fallback needed since every theme build emits the token unconditionally at `:root`.
- **`packages/react/scripts/patterns.ts`'s `exports` are internal build tooling, not a public API** — `packages/react/package.json`'s `exports` field has no path to `scripts/`. Nothing in this plan is a public API addition; the changeset is justified entirely by `Toolbar`'s behavior change and the new token.
- **Storybook's story ID is `kebab(title, "/" → "-")--kebab(exportName)`** — confirmed against `apps/storybook/storybook-static/index.json` (e.g. title `"Tokens and Assets/Color Tokens"` + export `AllColorTokens` → id `tokens-and-assets-color-tokens--all-color-tokens`).
- **VR's own convention for serving a built Storybook locally:** `npx serve -l 6208 -c apps/storybook/vr/serve.json apps/storybook/storybook-static` (from `apps/storybook/vr/playwright.config.ts`). Task 5/6's verification reuses this port.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `packages/react/scripts/patterns-loader.ts` | Create: `loadPatterns` + `parseRequires`, moved out of `patterns.ts` | 1 |
| `packages/react/scripts/patterns.ts` | Modify: remove `loadPatterns`/`parseRequires`/`node:fs` import; add `renderPresetElement` | 1, 2 |
| `packages/react/scripts/patterns.test.ts`, `seed-patterns.test.ts`, `emit-patterns.ts` | Modify: import `loadPatterns` from the new module | 1 |
| `packages/react/scripts/render-preset-element.test.tsx` | Create: `renderPresetElement` unit tests | 2 |
| `packages/tokens/src/components/toolbar.ts` | Create: `toolbarVars` (`--psi-toolbar-control-width`) | 3 |
| `packages/tokens/scripts/build.ts` | Modify: wire `toolbarVars` into `dist/components/toolbar.vars.css` + `components.css` | 3 |
| `packages/tokens/__tests__/emit-components.test.ts` | Modify: assert the new token emits | 3 |
| `apps/storybook/scripts/emit-pattern-stories.ts` | Create: codegen script writing one static story per pattern | 4 |
| `apps/storybook/scripts/emit-pattern-stories.test.ts` | Create: asserts generated exports match `patterns.json` 1:1 | 4 |
| `apps/storybook/src/patterns/Presets.stories.tsx` | Create (generated, git-tracked): the 13 static stories | 4 |
| `apps/storybook/package.json` | Modify: `build` script runs the codegen step first | 4 |
| `packages/react/src/Toolbar/toolbar.module.css` | Modify: the CSS fix | 6 |
| `.changeset/preset-render-gate.md` | Create | 7 |

---

### Task 1: `loadPatterns` moves out of `patterns.ts`

The prep step that makes Task 4's browser-bundled story safe. `patterns.ts` currently opens with `import { readdirSync, readFileSync } from "node:fs"` — if a Storybook story (Vite-bundled for the browser) ever imports anything from this file, Vite/Rollup must resolve that `node:fs` specifier during its module graph walk, which has no browser shim. Moving the only fs-touching code to its own file removes the risk outright rather than gambling on tree-shaking behavior.

**Files:**
- Create: `packages/react/scripts/patterns-loader.ts`
- Modify: `packages/react/scripts/patterns.ts:1-2` (remove the `node:fs` import and `loadPatterns`/`parseRequires`)
- Modify: `packages/react/scripts/patterns.test.ts:5`, `packages/react/scripts/seed-patterns.test.ts:5`, `packages/react/scripts/emit-patterns.ts:4`

**Interfaces:**
- Produces: `loadPatterns(dir: string): Pattern[]`, same signature as before, now exported from `patterns-loader.js` instead of `patterns.js`.

- [ ] **Step 1: Create `patterns-loader.ts` with the moved code**

```ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pattern, PatternRequirement } from "./patterns.js";

/** Loads *.json pattern files from `dir`, sorted by filename. Throws on a
 * missing/mistyped required field (id, intent, match, compose); the rest
 * default to []/{}/[]. `pattern.schema.json` (a JSON Schema sidecar, not a
 * pattern) is skipped. */
export function loadPatterns(dir: string): Pattern[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "pattern.schema.json")
    .sort();

  return files.map((file) => {
    const raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<string, unknown>;

    if (typeof raw.id !== "string") throw new Error(`${file}: missing/invalid "id"`);
    if (typeof raw.intent !== "string") throw new Error(`${file}: missing/invalid "intent"`);
    if (!Array.isArray(raw.match)) throw new Error(`${file}: missing/invalid "match"`);
    if (typeof raw.compose !== "object" || raw.compose === null) {
      throw new Error(`${file}: missing/invalid "compose"`);
    }

    return {
      id: raw.id,
      intent: raw.intent,
      match: raw.match as string[],
      compose: raw.compose as Pattern["compose"],
      parameters: (raw.parameters as Pattern["parameters"]) ?? [],
      content: (raw.content as Pattern["content"]) ?? {},
      gaps: (raw.gaps as string[]) ?? [],
      requires: parseRequires(raw.requires, file),
    };
  });
}

/** Validates the optional `requires` array's shape. A bad entry is an
 * authoring mistake and must fail loudly at load, not resolve to nothing. */
function parseRequires(raw: unknown, file: string): PatternRequirement[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new Error(`${file}: "requires" must be an array`);
  return raw.map((entry, i) => {
    const e = entry as Record<string, unknown>;
    const at = `${file}: requires[${i}]`;
    if (typeof e?.content !== "string") throw new Error(`${at}: missing/invalid "content"`);
    if (e.kind !== "component" && e.kind !== "icon") {
      throw new Error(`${at}: "kind" must be "component" or "icon", got ${JSON.stringify(e.kind)}`);
    }
    if (typeof e.name !== "string") throw new Error(`${at}: missing/invalid "name"`);
    return { content: e.content, kind: e.kind, name: e.name };
  });
}
```

- [ ] **Step 2: Remove the moved code from `patterns.ts`**

Delete lines 1-2 (`import { readdirSync, readFileSync } from "node:fs";` and `import { join } from "node:path";`) and the entire `loadPatterns` function (lines 54-84) and `parseRequires` function (lines 86-101) from `packages/react/scripts/patterns.ts`. Leave everything else — types, `parseLiteralUnion`, `validatePatterns`, `renderPreset`, and the constants (`PARAM_RE`, `CONTENT_RE`, `ARIA_PROP_RE`, `CANONICAL_CARDINALITIES`, `JSX_UNSAFE_TEXT`) — untouched.

- [ ] **Step 3: Update the three importers**

In `packages/react/scripts/patterns.test.ts:5`, replace:

```ts
import { loadPatterns, parseLiteralUnion, renderPreset, validatePatterns } from "./patterns.js";
```

with:

```ts
import { loadPatterns } from "./patterns-loader.js";
import { parseLiteralUnion, renderPreset, validatePatterns } from "./patterns.js";
```

In `packages/react/scripts/seed-patterns.test.ts:5`, replace:

```ts
import { loadPatterns, renderPreset, validatePatterns } from "./patterns.js";
```

with:

```ts
import { loadPatterns } from "./patterns-loader.js";
import { renderPreset, validatePatterns } from "./patterns.js";
```

In `packages/react/scripts/emit-patterns.ts:4`, replace:

```ts
import { loadPatterns, validatePatterns, renderPreset } from "./patterns.js";
```

with:

```ts
import { loadPatterns } from "./patterns-loader.js";
import { validatePatterns, renderPreset } from "./patterns.js";
```

- [ ] **Step 4: Run every affected test — this is a pure refactor, nothing should change**

```bash
pnpm exec vitest run packages/react/scripts/patterns.test.ts packages/react/scripts/seed-patterns.test.ts packages/react/scripts/emit-patterns.test.ts packages/react/scripts/render-preset.test.ts
```

Expected: PASS, every test, identical to before the refactor. `render-preset.test.ts` doesn't import `loadPatterns` at all, so it's included here only as a regression check that `patterns.ts` still exports everything it did (`renderPreset`, `ManifestComponent`, `Pattern`).

- [ ] **Step 5: Full package build, to catch any TypeScript reference this list missed**

```bash
pnpm --dir packages/react build
```

Expected: clean. If it fails on an unresolved import, something imports `loadPatterns` or `parseRequires` from `patterns.js` that this task's grep didn't find — locate it and fix the import path the same way as Step 3.

- [ ] **Step 6: Commit**

```bash
git add packages/react/scripts/patterns-loader.ts packages/react/scripts/patterns.ts packages/react/scripts/patterns.test.ts packages/react/scripts/seed-patterns.test.ts packages/react/scripts/emit-patterns.ts
git commit -m "refactor(react): loadPatterns moves to its own module (D77)

patterns.ts opened with a node:fs import for loadPatterns alone. Task 4's
Storybook story bundles code from this file for the browser, and node:fs
has no browser shim — moving the only fs-touching export out removes that
risk outright rather than depending on bundler tree-shaking to save it.

Pure refactor: same three call sites updated, same loadPatterns signature,
every existing test passes unchanged."
```

---

### Task 2: `renderPresetElement` — the same compose tree, as real elements

**Files:**
- Modify: `packages/react/scripts/patterns.ts` (add `renderPresetElement`, after `renderPreset`)
- Test: `packages/react/scripts/render-preset-element.test.tsx`

**Interfaces:**
- Consumes: `Pattern`, `PatternNode`, `ManifestComponent`, `PatternRequirement` (existing types in `patterns.ts`); the module-private `PARAM_RE`/`CONTENT_RE` regexes already defined there.
- Produces: `renderPresetElement(pattern: Pattern, components: ManifestComponent[], registry: Record<string, ComponentType<any>>): ReactElement | null` — Task 4's generated stories and Task 5's verification both call this by exactly this name and signature.

- [ ] **Step 1: Write the failing tests**

Create `packages/react/scripts/render-preset-element.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderPresetElement } from "./patterns.js";
import type { ManifestComponent, Pattern } from "./patterns.js";

// Minimal real-shaped fixture components — not the actual Psi components,
// so this test verifies renderPresetElement's tree-walking/resolution logic
// in isolation, the same way render-preset.test.ts's string version does.
function Button({ variant, size, children }: { variant?: string; size?: number; children?: React.ReactNode }) {
  return <button data-variant={variant} data-size={size}>{children}</button>;
}
function Dialog({ title, body, footer }: { title?: React.ReactNode; body?: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div role="dialog">
      <h2>{title}</h2>
      <div>{body}</div>
      <div>{footer}</div>
    </div>
  );
}
function Toolbar({ children, "aria-label": ariaLabel }: { children?: React.ReactNode; "aria-label"?: string }) {
  return <div role="group" aria-label={ariaLabel}>{children}</div>;
}
function IconMoreHorizontal() {
  return <svg data-testid="icon-more-horizontal" />;
}

const buttonManifest: ManifestComponent = {
  name: "Button",
  slots: [],
  props: [
    { name: "variant", type: '"ghost" | "danger"', required: false, default: "neutral" },
    { name: "size", type: "24 | 32 | 40 | 48", required: false, default: 32 },
  ],
};
const dialogManifest: ManifestComponent = {
  name: "Dialog",
  slots: [
    { name: "title", accepts: {}, cardinality: "0..1" },
    { name: "body", accepts: {}, cardinality: "0..*" },
    { name: "footer", accepts: { components: ["Button"] }, cardinality: "1..*" },
  ],
  props: [],
};
const toolbarManifest: ManifestComponent = { name: "Toolbar", slots: [], props: [] };
const components = [buttonManifest, dialogManifest, toolbarManifest];
const registry = { Button, Dialog, Toolbar, IconMoreHorizontal };

describe("renderPresetElement", () => {
  it("mounts a fully-bound pattern as real elements, not a string", () => {
    const confirm: Pattern = {
      id: "destructive-confirm",
      intent: "Dialog confirming a destructive action",
      match: [],
      compose: {
        component: "Dialog",
        slots: {
          title: ["{content:title}"],
          body: ["{content:consequence}"],
          footer: [
            { component: "Button", props: { variant: "ghost", size: "{param:size}" }, content: "cancel-label" },
            { component: "Button", props: { variant: "danger", size: "{param:size}" }, content: "confirm-label" },
          ],
        },
      },
      parameters: [{ key: "size", ask: "Button size?", options: [32, 40], default: 32 }],
      content: {
        title: "Delete the object?",
        consequence: "This cannot be undone.",
        "cancel-label": "Cancel",
        "confirm-label": "Delete",
      },
      gaps: [],
      requires: [],
    };

    const element = renderPresetElement(confirm, components, registry);
    expect(element).not.toBeNull();
    render(element!);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete the object?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    const cancelButton = screen.getByText("Cancel").closest("button")!;
    expect(cancelButton).toHaveAttribute("data-variant", "ghost");
    expect(cancelButton).toHaveAttribute("data-size", "32");
    const deleteButton = screen.getByText("Delete").closest("button")!;
    expect(deleteButton).toHaveAttribute("data-variant", "danger");
  });

  it("returns null for a pattern with unresolved gaps, same as renderPreset", () => {
    const blocked: Pattern = {
      id: "blocked-pattern",
      intent: "x",
      match: [],
      compose: { component: "NotYetShipped" },
      parameters: [],
      content: {},
      gaps: ["NotYetShipped"],
      requires: [],
    };
    expect(renderPresetElement(blocked, components, registry)).toBeNull();
  });

  it("returns null when a parameter has no default, same as renderPreset", () => {
    const noDefault: Pattern = {
      id: "no-default",
      intent: "x",
      match: [],
      compose: { component: "Button", props: { size: "{param:size}" } },
      parameters: [{ key: "size", ask: "?", options: [32, 40] }],
      content: {},
      gaps: [],
      requires: [],
    };
    expect(renderPresetElement(noDefault, components, registry)).toBeNull();
  });

  it("D71: a content key satisfied by an icon requirement renders the real icon element, not its prose placeholder", () => {
    const rowActions: Pattern = {
      id: "row-actions",
      intent: "x",
      match: [],
      compose: {
        component: "Toolbar",
        slots: {
          body: [{ component: "Button", content: "trigger-icon" }],
        },
      },
      parameters: [],
      content: { "trigger-icon": "the ellipsis glyph" },
      gaps: [],
      requires: [{ content: "trigger-icon", kind: "icon", name: "IconMoreHorizontal" }],
    };

    const element = renderPresetElement(rowActions, components, registry);
    render(element!);
    expect(screen.getByTestId("icon-more-horizontal")).toBeInTheDocument();
    expect(screen.queryByText("the ellipsis glyph")).not.toBeInTheDocument();
  });

  it("throws when the registry has no component for a name the manifest resolves", () => {
    const usesUnregistered: Pattern = {
      id: "x",
      intent: "x",
      match: [],
      compose: { component: "Toolbar" },
      parameters: [],
      content: {},
      gaps: [],
      requires: [],
    };
    expect(() => renderPresetElement(usesUnregistered, components, {})).toThrow(/no component registered for "Toolbar"/);
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

```bash
pnpm exec vitest run packages/react/scripts/render-preset-element.test.tsx
```

Expected: FAIL — `renderPresetElement is not a function` (or a TS resolution error). This is the red state.

- [ ] **Step 3: Implement `renderPresetElement`**

Append to `packages/react/scripts/patterns.ts`, after `renderPreset`'s closing brace, and add `import { createElement, type ComponentType, type ReactElement, type ReactNode } from "react";` to the top of the file alongside the existing imports:

```ts
/**
 * Renders a fully-bound pattern (D77) to a real, mountable React element
 * tree — the same compose-tree walk and {param:}/{content:} resolution
 * `renderPreset` uses to emit JSX text, but calling `createElement` against
 * `registry` instead of pushing strings. Returns null under the same two
 * conditions `renderPreset` does: unresolved gaps, or a parameter with no
 * default (not renderable as a static preset).
 *
 * No JSX-string formatting concerns apply here (block mode, indentation) —
 * those exist only for the human-readable copy-paste output. `registry` is
 * a flat name -> component map; the real barrel export names already match
 * `compose.component` strings exactly (`"Toolbar"` -> `export { Toolbar }`),
 * and the same barrel re-exports icons, so one `import * as Psi from
 * "@handamade/psi-react"` covers both `PatternNode.component` and D71 icon
 * requirements.
 */
export function renderPresetElement(
  pattern: Pattern,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for interface symmetry with renderPreset/validatePatterns; rendering only needs the compose tree, parameters and content.
  components: ManifestComponent[],
  registry: Record<string, ComponentType<any>>,
): ReactElement | null {
  if (pattern.gaps.length > 0) return null;
  if (pattern.parameters.some((p) => p.default === undefined)) return null;

  const paramDefaults = new Map(pattern.parameters.map((p) => [p.key, p.default as string | number]));
  const content = pattern.content;

  const iconForContent = new Map(
    (pattern.requires ?? []).filter((r) => r.kind === "icon").map((r) => [r.content, r.name]),
  );

  const resolveText = (raw: string): string => {
    const m = CONTENT_RE.exec(raw);
    return m ? content[m[1]] : raw;
  };

  const componentFor = (name: string): ComponentType<any> => {
    const Component = registry[name];
    if (!Component) throw new Error(`renderPresetElement: no component registered for "${name}"`);
    return Component;
  };

  /** Content children for a node with no `body` slot fills: the real icon
   * element when a D71 icon requirement satisfies the key, the content
   * string otherwise. */
  const resolveChildContent = (key: string): ReactNode => {
    const iconName = iconForContent.get(key);
    return iconName ? createElement(componentFor(iconName)) : content[key];
  };

  const resolvePropValue = (raw: unknown): unknown => {
    if (typeof raw === "string") {
      const paramMatch = PARAM_RE.exec(raw);
      if (paramMatch) return paramDefaults.get(paramMatch[1]);
      return resolveText(raw);
    }
    return raw; // number | boolean literal
  };

  let key = 0;
  const renderNode = (node: PatternNode): ReactElement => {
    const Component = componentFor(node.component);
    const props: Record<string, unknown> = { key: key++ };

    for (const [name, raw] of Object.entries(node.props ?? {})) {
      props[name] = resolvePropValue(raw);
    }

    for (const [slotName, fills] of Object.entries(node.slots ?? {})) {
      if (slotName === "body") continue;
      props[slotName] =
        fills.length === 1
          ? (typeof fills[0] === "string" ? resolveText(fills[0]) : renderNode(fills[0]))
          : fills.map((fill) => (typeof fill === "string" ? resolveText(fill) : renderNode(fill)));
    }

    const body = node.slots?.body;
    let children: ReactNode = null;
    if (body && body.length > 0) {
      children = body.map((fill) => (typeof fill === "string" ? resolveText(fill) : renderNode(fill)));
    } else if (node.content !== undefined) {
      children = resolveChildContent(node.content);
    }

    return createElement(Component, props, children);
  };

  return renderNode(pattern.compose);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
pnpm exec vitest run packages/react/scripts/render-preset-element.test.tsx
```

Expected: PASS, all five.

- [ ] **Step 5: Run the full `patterns.ts` test suite and typecheck for regressions**

```bash
pnpm exec vitest run packages/react/scripts/patterns.test.ts packages/react/scripts/render-preset.test.ts
pnpm --dir packages/react build
```

Expected: both PASS/clean. `renderPreset` and `validatePatterns` are untouched; this confirms adding `renderPresetElement` didn't disturb them.

- [ ] **Step 6: Commit**

```bash
git add packages/react/scripts/patterns.ts packages/react/scripts/render-preset-element.test.tsx
git commit -m "feat(react): renderPresetElement mounts a pattern as real React elements (D77)

renderPreset walks a pattern's compose tree and emits a JSX string for
copy-paste docs. Nothing ever mounted that tree for real, so nothing could
tell a stacked Toolbar row from a correct one — validatePatterns is blind
to layout by construction, and the string emitter never renders anything.

renderPresetElement shares the same tree-walk and {param:}/{content:}
resolution, calling createElement against a real component registry
instead of pushing text. Same registered-component-by-name contract the
manifest already uses, same D71 icon-substitution behavior, same
null-on-gaps/no-default rule as renderPreset."
```

---

### Task 3: `--psi-toolbar-control-width` token

**Files:**
- Create: `packages/tokens/src/components/toolbar.ts`
- Modify: `packages/tokens/scripts/build.ts` (wire the new vars into `components.css`)
- Test: `packages/tokens/__tests__/emit-components.test.ts`

**Interfaces:**
- Produces: CSS custom property `--psi-toolbar-control-width`, value `200px`, emitted at `:root` in every theme's built CSS. Task 6 consumes this name directly in `toolbar.module.css`.

**Confirmed real shape** (`packages/tokens/scripts/build.ts:23-44,77-97`): every component's vars object is imported individually and added as one entry to a single flat map:

```ts
const componentVars: Record<string, Record<string, string>> = {
  button: buttonVars,
  card: cardVars,
  // ...
  panel: panelVars,
  // ...
};
```

`packages/tokens/__tests__/emit-components.test.ts` asserts each component's vars via `emitComponentVarsCSS(name, vars)` directly — one `describe` block per component, e.g.:

```ts
it("emits every inputVars key as a prefixed --psi-input-* declaration", () => {
  const css = emitComponentVarsCSS("input", inputVars);
  for (const key of Object.keys(inputVars)) {
    expect(css).toContain(`--psi-input-${key}: ${inputVars[key]};`);
  }
});
```

- [ ] **Step 1: Write the failing test**

Add both an import and a new `describe` block to `packages/tokens/__tests__/emit-components.test.ts`. Add to the existing import list at the top:

```ts
import { toolbarVars } from "../src/components/toolbar.js";
```

Append a new block, matching the file's exact existing per-component shape:

```ts
describe("toolbar component tokens (D77)", () => {
  it("emits every toolbarVars key as a prefixed --psi-toolbar-* declaration", () => {
    const css = emitComponentVarsCSS("toolbar", toolbarVars);
    for (const key of Object.keys(toolbarVars)) {
      expect(css).toContain(`--psi-toolbar-${key}: ${toolbarVars[key]};`);
    }
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
pnpm exec vitest run packages/tokens/__tests__/emit-components.test.ts -t "toolbar"
```

Expected: FAIL — `Failed to resolve import "../src/components/toolbar.js"` (the file doesn't exist yet).

- [ ] **Step 3: Create `toolbar.ts`**

```ts
/** Toolbar component tokens (--psi-toolbar-*) — D77.
 *
 * A deliberate default width for Toolbar's direct, unwrapped form-control
 * children (Input/Select used bare, as the filter-toolbar preset does) —
 * without it, their own width:100% resolves as their flex-basis and the
 * row stacks vertically instead of reading as a toolbar. Field-wrapped
 * controls are unaffected: Field has no width of its own, so its flex-basis
 * already comes from content. 200px is a standalone literal, matching
 * Dialog's width={400|560|720} precedent — no shared scale reaches this
 * range (sizeScale tops at 48, spacingScale at 144, both for heights/gaps
 * not component widths).
 */
export const toolbarVars: Record<string, string> = {
  "control-width": "200px",
};
```

- [ ] **Step 4: Wire it into `build.ts`**

Add the import alongside the other component-vars imports (`packages/tokens/scripts/build.ts:23-44`):

```ts
import { toolbarVars } from "../src/components/toolbar.js";
```

Add one entry to the `componentVars` map (`packages/tokens/scripts/build.ts:77-97`), keeping the map's existing alphabetical-ish ordering (insert after `tag`, before `toast`):

```ts
  tag: tagVars,
  toolbar: toolbarVars,
  toast: toastVars,
```

No other change — `componentVars` is the single map every downstream step (writing `dist/components/*.vars.css`, `dist/components.css`, and the D46 scope-gate check) already iterates.

**Why the D46 scope gate won't reject this key:** `keyGroup()` (`packages/tokens/src/scopes.ts:86-92`) classifies a component-token key by its last `bg`/`fg`/`border`-type suffix segment; a key with no such segment returns `undefined` and is skipped by both scope gates entirely — `table.ts` and `tabs.ts` already carry this exact comment for their own geometry-only keys. `"control-width"` splits into `["control", "width"]`, neither of which matches any suffix group, so it's unscoped by the same existing rule, not a new special case.

- [ ] **Step 5: Rebuild and run the test**

```bash
pnpm --dir packages/tokens build
pnpm exec vitest run packages/tokens/__tests__/emit-components.test.ts
```

Expected: PASS. Then confirm the real built output — `emitComponentVarsCSS` emits values verbatim with no unit conversion (confirmed against `navbarVars`'s existing `blur: "12px"`, the same raw-px-string shape this token uses):

```bash
grep -n "psi-toolbar-control-width" packages/tokens/dist/components.css packages/tokens/dist/components/toolbar.vars.css
```

Expected: both files contain `--psi-toolbar-control-width: 200px;`.

- [ ] **Step 6: Commit**

```bash
git add packages/tokens/src/components/toolbar.ts packages/tokens/scripts/build.ts packages/tokens/__tests__/emit-components.test.ts
git commit -m "feat(tokens): --psi-toolbar-control-width (D77)

Toolbar had zero component tokens. Its direct, unwrapped form-control
children need a deliberate default width — without one, Input/Select's
own width:100% becomes their flex-basis and the row stacks vertically.
200px, a standalone literal like Dialog's width={400|560|720}; no shared
scale reaches this range."
```

---

### Task 4: The generated pattern-mounting Storybook stories

**Files:**
- Create: `apps/storybook/scripts/emit-pattern-stories.ts`
- Create: `apps/storybook/scripts/emit-pattern-stories.test.ts`
- Create (generated output, git-tracked like `packages/react/docs/*.md`): `apps/storybook/src/patterns/Presets.stories.tsx`
- Modify: `apps/storybook/package.json:7`

**Interfaces:**
- Consumes: `renderPresetElement` (Task 2), `packages/react/dist/patterns.json` (shape `{ patterns: Pattern[] }`), `packages/react/dist/manifest.json` (shape `{ components: ManifestComponent[] }`).
- Produces: `apps/storybook/src/patterns/Presets.stories.tsx` with one named export per pattern, PascalCase of the pattern's `id` (e.g. `filter-toolbar` -> `FilterToolbar`). Task 5/6 reference stories by the story-id formula `patterns-presets--<kebab-export-name>`.

- [ ] **Step 1: Confirm the exact shape of the built JSON this script reads**

```bash
pnpm --dir packages/react build
node -e "
const p = require('./packages/react/dist/patterns.json');
const m = require('./packages/react/dist/manifest.json');
console.log('patterns:', p.patterns.length, p.patterns.map(x => x.id).join(', '));
console.log('components:', m.components.length);
"
```

Expected: `patterns: 13 action-feedback, bulk-action-bar, data-table, date-range-filter, destructive-confirm, detail-drawer, empty-state, filter-toolbar, row-actions, settings-form-row, summary-tiles, table-pagination, tabbed-workspace` and `components: 34`. If the count or shape differs, stop and re-read the actual JSON before continuing — every step after this assumes exactly this shape.

- [ ] **Step 2: Write the failing test**

Create `apps/storybook/scripts/emit-pattern-stories.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { emitPatternStories, patternIdToExportName } from "./emit-pattern-stories.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("patternIdToExportName", () => {
  it("PascalCases a kebab-case pattern id", () => {
    expect(patternIdToExportName("filter-toolbar")).toBe("FilterToolbar");
    expect(patternIdToExportName("data-table")).toBe("DataTable");
    expect(patternIdToExportName("action-feedback")).toBe("ActionFeedback");
  });
});

describe("emitPatternStories", () => {
  it("emits one named export per pattern, matching patterns.json 1:1", () => {
    const patterns = [
      { id: "filter-toolbar" },
      { id: "data-table" },
    ];
    const source = emitPatternStories(patterns as any);
    expect(source).toContain("export const FilterToolbar: Story = {");
    expect(source).toContain("export const DataTable: Story = {");
    expect((source.match(/^export const \w+: Story = \{$/gm) ?? []).length).toBe(2);
  });

  it("double-emit is byte-identical (same discipline as emit-patterns.ts)", () => {
    const patterns = [{ id: "filter-toolbar" }];
    expect(emitPatternStories(patterns as any)).toBe(emitPatternStories(patterns as any));
  });

  it("real build output: generated file has exactly one export per real pattern.json entry", () => {
    const patternsPath = join(__dirname, "../../../packages/react/dist/patterns.json");
    const real = JSON.parse(readFileSync(patternsPath, "utf8")) as { patterns: Array<{ id: string }> };
    const source = emitPatternStories(real.patterns);
    const exportCount = (source.match(/^export const \w+: Story = \{$/gm) ?? []).length;
    expect(exportCount).toBe(real.patterns.length);
    for (const p of real.patterns) {
      expect(source).toContain(`export const ${patternIdToExportName(p.id)}: Story = {`);
    }
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
pnpm exec vitest run apps/storybook/scripts/emit-pattern-stories.test.ts
```

Expected: FAIL — `emit-pattern-stories.js` does not exist yet.

- [ ] **Step 3: Implement the codegen script**

The generated file's two JSON imports use `@handamade/psi-react`'s own package-subpath exports (`./patterns.json`, `./manifest.json` — both already declared in `packages/react/package.json`'s `exports` field), not a relative path into `dist/` — matching the existing precedent at `apps/storybook/src/token-docs/token-reader.ts:1-4` (`import resolvedLight from "@handamade/psi-tokens/resolved/light.json"`). `renderPresetElement` itself can't use this style — `scripts/` has no export path, since it's internal build tooling, not published — so that import stays a relative monorepo reach-across, the same shape `apps/storybook/.storybook/main.ts`'s own story glob already uses for `packages/react/src`. `resolveJsonModule: true` (`tsconfig.base.json:13`, inherited by `apps/storybook/tsconfig.json`) makes both static JSON imports type-check.

Create `apps/storybook/scripts/emit-pattern-stories.ts`:

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** `"filter-toolbar"` -> `"FilterToolbar"`. */
export function patternIdToExportName(id: string): string {
  return id
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

const HEADER = `// GENERATED FILE — do not hand-edit. Run \`tsx scripts/emit-pattern-stories.ts\`
// (part of \`pnpm build\`) to regenerate. One story per packages/react
// patterns.json entry (D77) — every pattern is mounted from a real,
// registered component tree via renderPresetElement, not a hand-copied
// approximation of one, so a pattern's JSON and its story cannot drift
// apart and a new 14th pattern gets a story with no hand-authoring.

import type { Meta, StoryObj } from "storybook";
import * as Psi from "@handamade/psi-react";
import { renderPresetElement } from "../../../../packages/react/scripts/patterns.js";
import patternsFile from "@handamade/psi-react/patterns.json";
import manifestFile from "@handamade/psi-react/manifest.json";

const meta: Meta = {
  title: "Patterns/Presets",
};
export default meta;
type Story = StoryObj;

function preset(id: string) {
  const pattern = patternsFile.patterns.find((p) => p.id === id);
  if (!pattern) throw new Error(\`emit-pattern-stories: no pattern "\${id}" in patterns.json\`);
  return () => renderPresetElement(pattern as any, manifestFile.components as any, Psi as any);
}
`;

/** Pure string builder — no fs. `emitPatternStories([{id:...}, ...])` given
 * only the minimal shape it needs (`id`), so the "double-emit is
 * byte-identical" test doesn't need a full Pattern fixture. */
export function emitPatternStories(patterns: Array<{ id: string }>): string {
  const blocks = patterns.map((p) => {
    const name = patternIdToExportName(p.id);
    return `export const ${name}: Story = {\n  render: preset("${p.id}"),\n};\n`;
  });
  return HEADER + "\n" + blocks.join("\n");
}

function main() {
  const patternsPath = join(__dirname, "../../../packages/react/dist/patterns.json");
  const patterns = JSON.parse(readFileSync(patternsPath, "utf8")).patterns as Array<{ id: string }>;
  const source = emitPatternStories(patterns);
  const outPath = join(__dirname, "../src/patterns/Presets.stories.tsx");
  writeFileSync(outPath, source);
  console.log(`[storybook] wrote src/patterns/Presets.stories.tsx (${patterns.length} patterns)`);
}

main();
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm exec vitest run apps/storybook/scripts/emit-pattern-stories.test.ts
```

Expected: PASS, all four assertions, including the real-build-output test (Step 1 already confirmed 13 patterns exist).

- [ ] **Step 5: Wire the codegen into `apps/storybook`'s build script**

In `apps/storybook/package.json`, replace:

```json
    "build": "storybook build"
```

with:

```json
    "build": "tsx scripts/emit-pattern-stories.ts && storybook build"
```

(Matches `packages/react/package.json`'s own build-script-chains-multiple-tsx-steps convention exactly.)

- [ ] **Step 6: Generate the file for real and inspect it**

```bash
cd apps/storybook && tsx scripts/emit-pattern-stories.ts && cd ../..
cat apps/storybook/src/patterns/Presets.stories.tsx
```

Expected: a real `.tsx` file, 13 `export const X: Story` blocks, one per pattern. Confirm by eye it's syntactically sane (this is git-tracked generated output, same convention as `packages/react/docs/*.md` — never hand-edit it, only regenerate).

- [ ] **Step 7: Build Storybook itself and confirm no `node:fs` resolution error**

```bash
pnpm --dir apps/storybook build 2>&1 | tail -40
```

Expected: a clean Storybook build with no error mentioning `node:fs`, `readdirSync`, or `readFileSync`. This is the concrete proof Task 1's refactor actually removed the risk it existed to remove — if this fails on an fs-resolution error, Task 1 missed an importer; re-check `patterns.ts` has zero `node:` imports left (`grep -n "node:" packages/react/scripts/patterns.ts` should print nothing).

- [ ] **Step 8: Commit**

```bash
git add apps/storybook/scripts/emit-pattern-stories.ts apps/storybook/scripts/emit-pattern-stories.test.ts apps/storybook/src/patterns/Presets.stories.tsx apps/storybook/package.json
git commit -m "feat(storybook): generate one story per pattern from patterns.json (D77)

No gate ever mounted a preset — validatePatterns resolves names/slots/
props and is blind to layout by construction; the JSX-string emitter never
renders anything either. This generates a real story per pattern.json
entry from renderPresetElement, so a 14th pattern gets a story with no
hand-authoring, and a pattern's JSON can't silently drift from its story
the way two hand-maintained copies could."
```

---

### Task 5: Red-state proof — `filter-toolbar` renders stacked today

Proves the bug at the system level before Task 6 fixes it, per this project's standing "every test proven red before its fix" rule applied to the whole D77 arc, not just a unit.

**Files:**
- Create (temporary verification script, not committed as a permanent test — see Step 3): none persisted; run via `node -e`.

**Interfaces:**
- Consumes: the built `apps/storybook/storybook-static/` from Task 4.

- [ ] **Step 1: Build everything and serve Storybook the way `vr` does**

```bash
pnpm build
npx serve -l 6208 -c apps/storybook/vr/serve.json apps/storybook/storybook-static &
sleep 2
```

- [ ] **Step 2: Compute `filter-toolbar`'s story URL and confirm it resolves**

```bash
node -e "
const idx = require('./apps/storybook/storybook-static/index.json');
const id = 'patterns-presets--filter-toolbar';
console.log(idx.entries[id] ? 'FOUND: ' + idx.entries[id].title : 'MISSING — check the story-id formula against index.json directly');
"
```

Expected: `FOUND: Patterns/Presets`. If `MISSING`, inspect `index.json`'s actual keys (`node -e "console.log(Object.keys(require('./apps/storybook/storybook-static/index.json').entries).filter(k => k.startsWith('patterns')))"`) and use the real id in Step 3 instead of guessing.

- [ ] **Step 3: Measure the Input/Select bounding boxes with Playwright — this is the red-state proof**

```bash
node -e "
const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.goto('http://localhost:6208/iframe.html?id=patterns-presets--filter-toolbar&viewMode=story');
  await page.waitForSelector('input');
  const input = await page.locator('input').first().boundingBox();
  const select = await page.locator('select').first().boundingBox();
  console.log('input y:', input.y, 'select y:', select.y, 'input width:', input.width, 'select width:', select.width);
  const stacked = Math.abs(input.y - select.y) > 5;
  console.log(stacked ? 'STACKED (bug reproduced)' : 'SAME ROW (unexpected — investigate before continuing)');
  await browser.close();
})();
"
```

Expected: `STACKED (bug reproduced)`, and `input width`/`select width` both very close to the story's container width (≈1000px minus padding) — confirming they're each claiming the full row, exactly as the spec's external 1200px measurement described. **If this prints `SAME ROW`, stop** — either the story isn't mounting `filter-toolbar` correctly, or the bug has already been fixed by something else; do not proceed to Task 6 assuming the fix will do anything until this genuinely reproduces red.

- [ ] **Step 4: Stop the local server**

```bash
kill %1
```

No commit for this task — it's a verification checkpoint, not a code change. Record its result in the SDD ledger (or, if executing inline, just note it) so Task 6's own verification can reference "confirmed STACKED before the fix."

---

### Task 6: The `Toolbar` CSS fix, and green-state re-verification

**Files:**
- Modify: `packages/react/src/Toolbar/toolbar.module.css`

**Interfaces:**
- Consumes: `--psi-toolbar-control-width` (Task 3).

- [ ] **Step 1: Apply the fix**

In `packages/react/src/Toolbar/toolbar.module.css`, append:

```css
.toolbar > input,
.toolbar > select {
  width: var(--psi-toolbar-control-width);
}
```

No inline CSS fallback (`var(--x, 200px)`) — the default lives once, in `toolbarVars` (Task 3), and every theme build emits it unconditionally at `:root`, so a second place for the same default to drift from is exactly what this avoids.

- [ ] **Step 2: Rebuild everything and re-run the exact same Playwright check from Task 5 — this must now flip to green**

```bash
pnpm build
npx serve -l 6208 -c apps/storybook/vr/serve.json apps/storybook/storybook-static &
sleep 2
node -e "
const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.goto('http://localhost:6208/iframe.html?id=patterns-presets--filter-toolbar&viewMode=story');
  await page.waitForSelector('input');
  const input = await page.locator('input').first().boundingBox();
  const select = await page.locator('select').first().boundingBox();
  console.log('input y:', input.y, 'select y:', select.y, 'input width:', input.width, 'select width:', select.width);
  const sameRow = Math.abs(input.y - select.y) <= 5;
  console.log(sameRow ? 'SAME ROW (fix confirmed)' : 'STILL STACKED — the fix did not take effect, do not proceed');
  await browser.close();
})();
"
kill %1
```

Expected: `SAME ROW (fix confirmed)`, and `input width`/`select width` both ≈200px (matching `--psi-toolbar-control-width`'s value) rather than the story's full container width. This is the task's actual acceptance criterion — the exact same measurement from Task 5, now inverted.

- [ ] **Step 3: Confirm `apps/ledger`'s Field-wrapped usage is genuinely unaffected**

```bash
grep -n "class=\"" packages/react/dist/styles.css | grep -o "\.toolbar[^{]*{width[^}]*}"
```

Expected: only `.toolbar > input, .toolbar > select { width: var(...) }` — this selector cannot match a `Field`-wrapped `<input>` (a grandchild of `.toolbar`, not a direct child), so `apps/ledger/TransactionsScreen.tsx`'s filter row needs no change and none is made in this task.

- [ ] **Step 4: Run the full Toolbar/Input/Select test suites for regressions**

```bash
pnpm exec vitest run packages/react/src/Toolbar/Toolbar.test.tsx packages/react/src/Input/Input.test.tsx packages/react/src/Select/Select.test.tsx
```

Expected: PASS. (jsdom doesn't compute real layout, so these won't themselves catch the stacking bug — Task 5/6's Playwright checks are what actually verify this; these existing suites just confirm nothing about `Input`/`Select`'s own rendering broke.)

- [ ] **Step 5: Typecheck the whole monorepo**

```bash
pnpm build
```

Expected: clean, all packages and apps.

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/Toolbar/toolbar.module.css
git commit -m "fix(react): Toolbar's direct form controls stop stacking (D77)

filter-toolbar composes bare Input/Select directly under Toolbar. Toolbar
is flex-wrap with no constraint on children; Input/Select both ship
width:100%, which becomes their flex-basis as a direct flex child — so
each control claimed the full row and the toolbar stacked vertically.
Measured at 1200px inside a 1200px container.

Toolbar now gives its own direct, unwrapped input/select children a
deliberate default width via --psi-toolbar-control-width (200px).
Field-wrapped usage (apps/ledger's filter row) is untouched — a
Field-wrapped input is a grandchild of Toolbar, not a direct child, so
this selector can't match it; Field already sizes to content and never
showed the bug.

Verified with a real Playwright measurement, not jsdom (which doesn't
compute layout): the same bounding-box check that confirmed the bug
STACKED before this commit confirms SAME ROW after it."
```

---

### Task 7: Changeset, VR baseline note, and the full gate run

**Files:**
- Create: `.changeset/preset-render-gate.md`

- [ ] **Step 1: Write the changeset**

```markdown
---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": patch
---

Toolbar's direct form controls stop stacking, and every composition
pattern now has a real, mounted Storybook story.

`filter-toolbar` composes a bare `Input`/`Select` directly under `Toolbar`
— the pattern most likely to be copy-pasted verbatim, and the one that
rendered wrong: `Toolbar`'s flex-wrap row had no constraint on its
children, and `Input`/`Select`'s own `width: 100%` became their flex-basis
as direct flex children, so each control claimed the full row and the
toolbar stacked vertically instead of reading as one. `Field`-wrapped
usage (as `apps/ledger`'s filter row already does) was never affected.

`Toolbar` gains `--psi-toolbar-control-width` (200px default) and a
scoped rule giving its own direct, unwrapped `input`/`select` children a
deliberate width, matching the effect existing hand-written `Toolbar`
stories already worked around one-off with inline styles.

Separately: every pattern in `patterns.json` (13 today) now renders as a
real, registered React element tree in its own generated Storybook story
with a VR baseline — `renderPresetElement`, a sibling to the existing
`renderPreset` JSX-string emitter, so a pattern's documented composition
and its rendered layout can no longer silently drift apart, and a future
pattern gets a story automatically rather than needing one hand-written.
```

- [ ] **Step 2: Run all five gates in order**

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm test:site
```

Expected: all green. `pnpm build` regenerates `Presets.stories.tsx` via the wired codegen step (Task 4 Step 5) before Storybook's own build runs — confirm the regenerated file still has 13 exports and nothing stale survived from an earlier manual run.

- [ ] **Step 3: Confirm `vr` genuinely has new baselines to capture — this cycle, unlike D78–D80, is expected to need them**

```bash
git diff --name-only origin/main -- '*.stories.tsx'
```

Expected: **non-empty** this time — `apps/storybook/src/patterns/Presets.stories.tsx` (new) and possibly `packages/react/src/Toolbar/Toolbar.stories.tsx` if its own rendering shifted. `pnpm vr` cannot be trusted locally (macOS writes junk baselines per `apps/storybook/vr/README.md`); new baselines come from CI's `vr-baselines` artifact after this PR's CI run fails on the expected new/changed screenshots — that failure is expected, not a problem, until the baseline artifact is committed following the existing documented workflow.

- [ ] **Step 4: Commit and push**

```bash
git add .changeset/preset-render-gate.md
git commit -m "chore: changeset for the preset-render gate (D77)"
git push -u origin d77-preset-render-gate
```

- [ ] **Step 5: Open the PR and arm auto-merge**

```bash
gh pr create --title "feat: Toolbar stops stacking, and every pattern is mounted with a VR baseline (D77)" --body "<summary of the bug, the fix, the gate, and that vr baselines need CI's artifact>"
```

Then arm auto-merge **and read it back**:

```bash
gh pr merge <n> --auto --squash
gh pr view <n> --json autoMergeRequest --jq '.autoMergeRequest.mergeMethod // "NOT ARMED"'
```

Expected: `SQUASH`. If `NOT ARMED`, use the `enablePullRequestAutoMerge` GraphQL mutation.

**Given this cycle's `vr` job is expected to fail on first CI run** (new/changed baselines, per Step 3), auto-merge will not fire until the `vr-baselines` artifact is fetched and committed per `apps/storybook/vr/README.md`'s documented workflow — this is expected, not the D78–D80 pattern of "vr should not move."

---

## Self-Review

**Spec coverage:** The Toolbar/token fix → Tasks 3, 6. The gate mechanism (`renderPresetElement`, generated stories, one-per-pattern) → Tasks 2, 4. The rejected "hand-write 13 stories" alternative → avoided by construction in Task 4's codegen approach. The `node:fs`-in-browser risk the spec didn't explicitly resolve → Task 1, added during planning after tracing the actual import graph. Red-then-green at the system level → Tasks 5, 6. Changeset split (minor/minor/patch, matching the spec's reasoning about `renderPresetElement` not being a public API) → Task 7. Five gates + the `vr`-is-expected-to-move note → Task 7. `apps/ledger` unaffected → verified in Task 6 Step 3, not just asserted.

**Type consistency:** `renderPresetElement`'s signature (`pattern, components, registry`) is identical everywhere it's referenced — Task 2's implementation and tests, Task 4's generated `preset()` helper, Task 5/6's narrative. `patternIdToExportName` is defined once (Task 4) and used identically in its own tests and the generated file. `--psi-toolbar-control-width` is spelled identically in Task 3 (token), Task 6 (CSS consumer), and the Task 7 changeset.

**Known ordering constraint:** Task 4 depends on Task 1 (browser-safe `patterns.ts`) and Task 2 (`renderPresetElement` existing) — it cannot run first. Task 5's red-state proof depends on Task 4's stories existing but must run *before* Task 6's CSS fix, not after — reversing Tasks 5 and 6 would make Task 5 assert a red state that Task 6 already fixed, silently defeating the whole point of proving the bug before curing it. Task 3 (the token) is independent of Tasks 1/2/4 and could in principle run earlier, but Task 6 (its only consumer) must still come after Task 5.
