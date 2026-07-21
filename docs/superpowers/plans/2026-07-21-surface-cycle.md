# Surface Cycle (0.7.0) Implementation Plan — D51/D52

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `--psi-surface-*` token family + `Panel` (D51, HAN-19) and `Toolbar` (D52, HAN-23), flip the `filter-toolbar` pattern live, land the HAN-22/HAN-24 fixes, release 0.7.0, migrate the promo site onto `<Panel>`, and enable branch protection.

**Architecture:** Tokens-first: the surface family lands with Dialog rebinding to it (zero visual change, proven by VR), then Panel and Toolbar are added as minimal JS-free primitives following the Card file layout. Patterns/manifest/docs are all generated — each PR keeps the drift-guarded counts true. Four PRs, one release.

**Tech Stack:** pnpm monorepo, TypeScript, React 19, CSS Modules, Vitest + Testing Library + axe-core, Playwright VR, changesets. Spec: `docs/superpowers/specs/2026-07-21-surface-cycle-design.md`.

## Global Constraints

- Work from repo root `/Users/dmytrokurkin/Projects/dku/ds` on `main`, up to date, clean tree. Node 22, pnpm.
- Verify with root scripts: `pnpm build` (token contrast + D46 scope + D48 pattern gates), `pnpm test`, `pnpm lint`, `pnpm vr` (needs `pnpm build` first — VR reads `apps/storybook/storybook-static`).
- Sizes are px numbers (`24 | 32 | 40 | 48`), never S/M/L. Variants are flat. No hardcoded colors in component CSS.
- `psi/component-tokens-only` stylelint rule: `<name>.module.css` may only use `--psi-<name>-*` tokens and scale tokens matching `--psi-(space|size|radius|text|font|duration|ease|z)-*`. This is why Panel binds `--psi-panel-*` (which reference `--psi-surface-*`), never `--psi-surface-*` directly.
- D46 suffix convention is normative: component-token keys ending `-bg` → surface group, `-fg` → text, `-border` → border. `radius`/`padding`/`gap` keys are unscoped.
- New token values go in `packages/tokens/src/**` only — `dist/` is generated.
- VR matrix (D41): component stories snapshot in `light` + `ember`; token-docs pages in all 4 themes. New stories need baselines generated once with `--update-snapshots`.
- Drift guard (`tools/check-docs-drift.mjs`, runs in CI): the phrase `N React 19 components` in `README.md`, `packages/react/README.md`, `packages/react/llms.txt`, `packages/mcp/README.md` must equal `manifest.components.length` (13 today → 14 after Panel → 15 after Toolbar). `N composition patterns` in `packages/react/llms.txt`, `packages/mcp/README.md`, `packages/mcp/llms.txt` must equal the pattern count (3 — unchanged this cycle).
- Commits: conventional style (`feat:`, `fix:`, `docs:`, `test:`); every commit ends with the `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` trailer. Branches use the Linear-generated names given per task (they auto-link the issues).
- Each PR body links its Linear issue (e.g. `Closes HAN-19` plus the linear.app URL) and ends with the 🤖 Generated with [Claude Code](https://claude.com/claude-code) line.

---

## PR A — HAN-19: surface family + Panel (branch `dkurkin/han-19-06-candidate-elevated-surface-panel-the-card-variant-the`)

### Task 1: Teach the D46 scope gate cross-family refs

The gate (`packages/tokens/src/scope-gate.ts`) resolves own-family chains (`--psi-button-accent-bg` inside buttonVars) but treats any other `--psi-<component>-*` ref as unresolvable (`!`-prefixed → violation). Dialog/Panel referencing `--psi-surface-*` requires following refs through the whole componentVars registry.

**Files:**
- Modify: `packages/tokens/src/scope-gate.ts`
- Test: `packages/tokens/__tests__/scope-gate.test.ts`

**Interfaces:**
- Consumes: `checkScopes(componentVars, theme)`, `checkOverrideScopes(overrides, componentVars, theme)` — public signatures unchanged.
- Produces: `semanticRefs` (private) now resolves `var(--psi-<anyRegisteredComponent>-<key>)` recursively through the registry; cross-family refs are transitively scope-checked.

- [ ] **Step 1: Create the branch**

```bash
git checkout main && git pull --ff-only
git checkout -b dkurkin/han-19-06-candidate-elevated-surface-panel-the-card-variant-the
```

- [ ] **Step 2: Write the failing tests**

In `packages/tokens/__tests__/scope-gate.test.ts`, inside `describe("scope gate (D46)")`, add (miniTheme already defines `fillBase` scoped `["surface"]` and `borderLine` scoped `["border"]`):

```ts
  // ── cross-family refs (D51: dialog/panel bind --psi-surface-*) ──
  it("follows cross-family refs to their semantic scopes", () => {
    const vars = {
      surface: { bg: "var(--psi-fill-base)" },
      widget: { "accent-bg": "var(--psi-surface-bg)" },
    };
    expect(checkScopes(vars, miniTheme)).toEqual([]);
  });
  it("flags a cross-family ref that lands on a wrong-scope token", () => {
    const vars = {
      surface: { border: "var(--psi-border-line)" },
      widget: { "accent-bg": "var(--psi-surface-border)" },
    };
    expect(checkScopes(vars, miniTheme)).toEqual([
      { component: "widget", key: "accent-bg", group: "surface", token: "borderLine", scopes: ["border"] },
    ]);
  });
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm vitest run packages/tokens/__tests__/scope-gate.test.ts`
Expected: the two new tests FAIL — the first reports a violation with `token: "surface-bg"`, `scopes: []` (unresolvable `!` path).

- [ ] **Step 4: Implement registry-wide resolution**

In `packages/tokens/src/scope-gate.ts`, replace `semanticRefs` and thread the registry through `checkOne`:

```ts
/** Collect the semantic token names (camelCase) a component-token value
 * ultimately binds, following component-token chains across the whole
 * registry (own family and cross-family, e.g. dialog-bg → surface-bg).
 * Unresolvable --psi- refs are returned as raw var names (prefixed "!")
 * for the caller to flag. */
function semanticRefs(
  component: string,
  value: string,
  all: Record<string, Record<string, string>>,
  kebabToName: Map<string, string>,
  seen: Set<string> = new Set(),
): string[] {
  const out: string[] = [];
  for (const m of value.matchAll(VAR_RE)) {
    const varName = m[1];
    const bare = varName.slice("--psi-".length);
    if (SCALE_RE.test(varName)) continue;
    // Component refs resolve through the registry; longest prefix wins.
    const owner = Object.keys(all)
      .filter((c) => bare.startsWith(`${c}-`))
      .sort((a, b) => b.length - a.length)[0];
    if (owner !== undefined) {
      const key = bare.slice(owner.length + 1);
      const guard = `${owner}:${key}`;
      if (seen.has(guard)) continue;
      seen.add(guard);
      const ownerValue = all[owner][key];
      if (ownerValue === undefined) { out.push(`!${varName}`); continue; }
      out.push(...semanticRefs(owner, ownerValue, all, kebabToName, seen));
      continue;
    }
    const name = kebabToName.get(bare);
    out.push(name ?? `!${varName}`);
  }
  return out;
}
```

In `checkOne`, change the parameter `vars: Record<string, string>` to `all: Record<string, Record<string, string>>` and the call to `semanticRefs(component, value, all, kebabToName)`. In `checkScopes`, pass `componentVars` (the whole registry) instead of `vars`. In `checkOverrideScopes`, pass `componentVars` instead of `componentVars[component]`.

Note: `component` (the first arg of `semanticRefs`) is now unused inside it — remove the parameter if TS `noUnusedParameters` complains, adjusting call sites, or keep it for the recursion signature; either is fine as long as `pnpm build` and lint pass.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run packages/tokens/__tests__/scope-gate.test.ts`
Expected: PASS (all pre-existing cases too — the real-inventory positive gate must stay clean).

- [ ] **Step 6: Full verification and commit**

Run: `pnpm build && pnpm test`
Expected: build green (no scope violations), all tests pass.

```bash
git add packages/tokens/src/scope-gate.ts packages/tokens/__tests__/scope-gate.test.ts
git commit -m "feat(tokens): D46 scope gate follows cross-family component-token refs

Prereq for D51 — dialog/panel binding --psi-surface-* must resolve
transitively to semantic scopes instead of flagging as unresolvable."
```

### Task 2: `--psi-surface-*` family + Dialog rebind (zero visual change)

**Files:**
- Create: `packages/tokens/src/components/surface.ts`
- Modify: `packages/tokens/src/components/dialog.ts`
- Modify: `packages/tokens/scripts/build.ts` (import + `componentVars` registry)
- Modify: `packages/tokens/__tests__/scope-gate.test.ts` (real-inventory `allVars`)
- Modify: `packages/react/src/Dialog/dialog.module.css:5`

**Interfaces:**
- Produces: CSS custom properties `--psi-surface-bg`, `--psi-surface-border`, `--psi-surface-radius`, `--psi-surface-padding` (emitted into `components.css` for every theme); `surfaceVars` export. `dialogVars` gains a `radius` key. Task 3's `panelVars` references the surface family.

- [ ] **Step 1: Create the surface family**

`packages/tokens/src/components/surface.ts`:

```ts
/** Shared elevated-surface tokens (--psi-surface-*) — D51. The recipe two
 * consumers converged on independently (Dialog's panel, promo's hand-rolled
 * .card): secondary background, faint hairline, radius-12, space-24
 * padding. Dialog and Panel bind these; there is no Surface component. */
export const surfaceVars: Record<string, string> = {
  bg: "var(--psi-bg-secondary)",
  border: "var(--psi-border-faint)",
  radius: "var(--psi-radius-12)",
  padding: "var(--psi-space-24)",
};
```

- [ ] **Step 2: Rebind Dialog**

`packages/tokens/src/components/dialog.ts` — replace the `bg` and `border` values and add `radius`:

```ts
/** Dialog component tokens (--psi-dialog-*). Elevated surface — binds the
 * shared --psi-surface-* family (D51); backdrop reuses the heavy scrim the
 * NavBar glass treatment uses (D50). `fg` binds the panel's body foreground
 * so the native <dialog> UA stylesheet's `color: CanvasText` never leaks
 * through on dark themes (VR catch). */
export const dialogVars: Record<string, string> = {
  bg: "var(--psi-surface-bg)",
  border: "var(--psi-surface-border)",
  radius: "var(--psi-surface-radius)",
  backdrop: "var(--psi-scrim-heavy)",
  fg: "var(--psi-fg-primary)",
  "title-fg": "var(--psi-fg-primary)",
};
```

In `packages/react/src/Dialog/dialog.module.css` line 5, change:

```css
  border-radius: var(--psi-radius-12);
```

to:

```css
  border-radius: var(--psi-dialog-radius);
```

- [ ] **Step 3: Register the family in the build and the gate test**

`packages/tokens/scripts/build.ts` — add with the other component imports:

```ts
import { surfaceVars } from "../src/components/surface.js";
```

and in the `componentVars` registry object (alphabetical spot, after `select`):

```ts
  surface: surfaceVars,
```

`packages/tokens/__tests__/scope-gate.test.ts` — add to the imports and the real-inventory `allVars`:

```ts
import { surfaceVars } from "../src/components/surface.js";
```

```ts
  select: selectVars, surface: surfaceVars, switch: switchVars, tag: tagVars, tooltip: tooltipVars,
```

(replacing the existing `select: selectVars, switch: switchVars, tag: tagVars, tooltip: tooltipVars,` line).

- [ ] **Step 4: Verify build + tests + lint**

Run: `pnpm build && pnpm test && pnpm lint`
Expected: all green. Build output includes `--psi-surface-*` in `packages/tokens/dist/components.css` — verify: `grep -c "psi-surface-" packages/tokens/dist/components.css` ≥ 4.

- [ ] **Step 5: VR — prove zero visual change**

Run: `pnpm vr`
Expected: **PASS with zero snapshot updates** — every Dialog baseline byte-compares clean. `git status apps/storybook/vr` must show no modified snapshots. This is the D51 zero-visual-change proof; if any dialog snapshot diffs, stop and diagnose (systematic-debugging) — do not update baselines.

- [ ] **Step 6: Commit**

```bash
git add packages/tokens/src/components/surface.ts packages/tokens/src/components/dialog.ts \
  packages/tokens/scripts/build.ts packages/tokens/__tests__/scope-gate.test.ts \
  packages/react/src/Dialog/dialog.module.css
git commit -m "feat(tokens): D51 --psi-surface-* elevated-surface family; Dialog rebinds (zero visual change)"
```

### Task 3: Panel component

**Files:**
- Create: `packages/tokens/src/components/panel.ts`
- Modify: `packages/tokens/scripts/build.ts`, `packages/tokens/__tests__/scope-gate.test.ts` (register `panel`)
- Create: `packages/react/src/Panel/Panel.tsx`, `packages/react/src/Panel/panel.module.css`, `packages/react/src/Panel/slots.json`, `packages/react/src/Panel/Panel.test.tsx`, `packages/react/src/Panel/Panel.stories.tsx`
- Modify: `packages/react/src/index.ts`, `packages/react/src/a11y-meta.ts`, `packages/react/src/a11y.axe.test.tsx`

**Interfaces:**
- Consumes: `--psi-surface-*` (Task 2), via `--psi-panel-*` indirection (stylelint constraint).
- Produces: `export function Panel(props: PanelProps)`; `PanelProps extends HTMLAttributes<HTMLDivElement>` with `padding?: 16 | 24` (default 24) and `ref?: Ref<HTMLDivElement>`. PR D renders `<Panel className="card">`.

- [ ] **Step 1: Write the failing component tests**

`packages/react/src/Panel/Panel.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Panel } from "./Panel.js";

describe("Panel", () => {
  it("renders children", () => {
    render(<Panel><p>Body copy</p></Panel>);
    expect(screen.getByText("Body copy")).toBeInTheDocument();
  });
  it("applies the padding-16 class only when padding={16}", () => {
    const { container, rerender } = render(<Panel>x</Panel>);
    expect(container.firstElementChild!.className).not.toMatch(/padding16/);
    rerender(<Panel padding={16}>x</Panel>);
    expect(container.firstElementChild!.className).toMatch(/padding16/);
  });
  it("merges className and spreads host props", () => {
    const { container } = render(<Panel className="promo" data-x="1">x</Panel>);
    expect(container.firstElementChild!.className).toMatch(/promo/);
    expect(container.firstElementChild!.getAttribute("data-x")).toBe("1");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run packages/react/src/Panel/Panel.test.tsx`
Expected: FAIL — cannot resolve `./Panel.js`.

- [ ] **Step 3: Panel tokens**

`packages/tokens/src/components/panel.ts`:

```ts
/** Panel component tokens (--psi-panel-*) — D51. Pure indirection onto the
 * shared surface family; exists because component CSS may only bind its own
 * family (psi/component-tokens-only). Brands retune panels and dialogs
 * together by overriding --psi-surface-*. */
export const panelVars: Record<string, string> = {
  bg: "var(--psi-surface-bg)",
  border: "var(--psi-surface-border)",
  radius: "var(--psi-surface-radius)",
  padding: "var(--psi-surface-padding)",
};
```

Register in `packages/tokens/scripts/build.ts` (import + registry, after `navbar`):

```ts
import { panelVars } from "../src/components/panel.js";
```

```ts
  panel: panelVars,
```

And in `packages/tokens/__tests__/scope-gate.test.ts` `allVars` + imports:

```ts
import { panelVars } from "../src/components/panel.js";
```

```ts
  navbar: navbarVars, panel: panelVars,
```

(replacing the existing `navbar: navbarVars,` entry on that line).

- [ ] **Step 4: Panel component + CSS + slots**

`packages/react/src/Panel/Panel.tsx`:

```tsx
import type { HTMLAttributes, Ref } from "react";
import styles from "./panel.module.css";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Inner padding in px. @default 24 */
  padding?: 16 | 24;
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement>;
}

/** Elevated surface panel (D51): secondary background, faint hairline,
 * radius-12 — the shared --psi-surface-* recipe Dialog's panel also binds.
 * Not a Card: no media slot, no hover lift, opaque by design. */
export function Panel({ padding = 24, className, children, ref, ...rest }: PanelProps) {
  const cls = [styles.panel, padding === 16 ? styles.padding16 : undefined, className]
    .filter(Boolean)
    .join(" ");
  return (
    <div ref={ref} className={cls} {...rest}>
      {children}
    </div>
  );
}
```

`packages/react/src/Panel/panel.module.css`:

```css
.panel {
  background: var(--psi-panel-bg);
  border: 1px solid var(--psi-panel-border);
  border-radius: var(--psi-panel-radius);
  padding: var(--psi-panel-padding);
}

.padding16 { padding: var(--psi-space-16); }
```

`packages/react/src/Panel/slots.json`:

```json
{
  "slots": [
    { "name": "body", "accepts": {}, "cardinality": "1..*", "order": 1 }
  ]
}
```

Export from `packages/react/src/index.ts` — after the `CardProps` export line add:

```ts
export { Panel } from "./Panel/Panel.js";
export type { PanelProps } from "./Panel/Panel.js";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run packages/react/src/Panel/Panel.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: a11y-meta + axe case**

In `packages/react/src/a11y-meta.ts`, after the `Card` entry (alphabetically it sits with the others — match file ordering by placing it after `NavBar` if entries are insertion-ordered; either way, one new key):

```ts
  Panel: {
    keyboard: [
      { keys: "Tab", behavior: "Skipped — Panel itself is not focusable; focus moves through its children." },
    ],
    notes:
      "Plain <div> container with no implicit role. Pass aria-* host props if the panel should announce as a region.",
  },
```

In `packages/react/src/a11y.axe.test.tsx`: add `Panel` to the `import { ... } from "./index.js"` list and a case after the `Card` case:

```tsx
  ["Panel", <Panel><h3>Usage</h3><p>Elevated surface body.</p></Panel>],
```

Run: `pnpm vitest run packages/react/src/a11y.axe.test.tsx`
Expected: PASS including the new `Panel` case.

- [ ] **Step 7: Stories**

`packages/react/src/Panel/Panel.stories.tsx`:

```tsx
import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Panel } from "./Panel.js";

const meta: Meta<typeof Panel> = {
  title: "Components/Panel",
  component: Panel,
  argTypes: {
    padding: { control: "select", options: [16, 24] },
  },
};

export default meta;
type Story = StoryObj<typeof Panel>;

export const Default: Story = {
  args: {
    children: (
      <>
        <h3 style={{ margin: 0 }}>Elevated panel</h3>
        <p style={{ margin: 0 }}>
          The shared surface recipe: secondary background, faint hairline,
          radius 12. Dialog&apos;s panel binds the same tokens.
        </p>
      </>
    ),
  },
};

export const Padding16: Story = {
  args: { padding: 16, children: <p style={{ margin: 0 }}>Compact padding.</p> },
};
```

- [ ] **Step 8: Full build + lint + commit**

Run: `pnpm build && pnpm test && pnpm lint`
Expected: green; build regenerates `packages/react/dist/manifest.json` (now 14 components, Panel with its `body` slot) and `packages/react/docs/Panel.md`.

```bash
git add packages/tokens/src/components/panel.ts packages/tokens/scripts/build.ts \
  packages/tokens/__tests__/scope-gate.test.ts packages/react/src/Panel \
  packages/react/src/index.ts packages/react/src/a11y-meta.ts packages/react/src/a11y.axe.test.tsx \
  packages/react/docs
git commit -m "feat(react): D51 Panel — elevated surface panel bound to --psi-surface-*"
```

### Task 4: Counts, llms.txt, VR baselines, changeset, PR A

**Files:**
- Modify: `README.md`, `packages/react/README.md`, `packages/react/llms.txt`, `packages/mcp/README.md` (component count 13 → 14)
- Modify: `packages/react/llms.txt` (Panel section)
- Create: `.changeset/surface-panel.md`
- Create: VR baselines for the two Panel stories (generated)

**Interfaces:**
- Consumes: Panel stories (Task 3).
- Produces: merged PR A; `main` has 14 components. Tasks 5+ branch from this.

- [ ] **Step 1: Bump the drift-guarded counts**

In each of `README.md`, `packages/react/README.md`, `packages/react/llms.txt`, `packages/mcp/README.md`, find the phrase matching `13 React 19 components` and change `13` to `14`.

- [ ] **Step 2: Panel section in react llms.txt**

In `packages/react/llms.txt`, after the `## Card` section, add:

```
## Panel
- <Panel padding={16|24}>: the elevated surface panel (D51) — bg-secondary, faint hairline border, radius-12, space-24 padding (16 for compact). Binds the shared --psi-surface-* recipe Dialog's panel also uses; brands retune both by overriding --psi-surface-*. Not a Card: no media slot, no hover lift.
```

- [ ] **Step 3: Verify drift guard**

Run: `pnpm build && node tools/check-docs-drift.mjs`
Expected: exits 0, no `DRIFT:` lines.

- [ ] **Step 4: Generate Panel VR baselines**

Run: `pnpm vr --update-snapshots`
Then: `git status --short apps/storybook/vr/stories.spec.ts-snapshots/`
Expected: exactly 4 **new** files (`components-panel-*--light.png` / `--ember.png` for Default and Padding16), zero modified existing baselines. If any existing baseline changed, stop and diagnose.
Then run: `pnpm vr` — expected PASS.

- [ ] **Step 5: Changeset**

`.changeset/surface-panel.md`:

```md
---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

D51: shared `--psi-surface-*` elevated-surface token family + `Panel` component. Dialog's panel rebinds to the family (zero visual change). Scope gate now follows cross-family component-token refs.
```

- [ ] **Step 6: Commit, push, PR, merge**

```bash
git add README.md packages/react/README.md packages/react/llms.txt packages/mcp/README.md \
  .changeset/surface-panel.md apps/storybook/vr/stories.spec.ts-snapshots
git commit -m "docs: 14 components — Panel llms.txt section, drift counts, VR baselines, changeset"
git push -u origin dkurkin/han-19-06-candidate-elevated-surface-panel-the-card-variant-the
gh pr create --base main --title "feat: D51 surface family + Panel component" \
  --body "Closes HAN-19 (https://linear.app/handamade/issue/HAN-19). D51 per docs/superpowers/specs/2026-07-21-surface-cycle-design.md: --psi-surface-* family, Dialog rebind (zero visual change — VR baselines untouched), Panel primitive, scope-gate cross-family resolution."
```

Wait for CI green, then merge (squash per repo habit): `gh pr merge --squash --delete-branch`. Then `git checkout main && git pull --ff-only`.

---

## PR B — HAN-23: Toolbar + pattern flip (branch `dkurkin/han-23-toolbar-component-the-filter-toolbar-patterns-declared-gap`)

### Task 5: Toolbar component

**Files:**
- Create: `packages/react/src/Toolbar/Toolbar.tsx`, `packages/react/src/Toolbar/toolbar.module.css`, `packages/react/src/Toolbar/slots.json`, `packages/react/src/Toolbar/Toolbar.test.tsx`, `packages/react/src/Toolbar/Toolbar.stories.tsx`
- Modify: `packages/react/src/index.ts`, `packages/react/src/a11y-meta.ts`, `packages/react/src/a11y.axe.test.tsx`

**Interfaces:**
- Consumes: existing Input/Select/Tag/Button (stories only). No component tokens — gap binds scale tokens directly (allowed by stylelint).
- Produces: `export function Toolbar(props: ToolbarProps)`; `ToolbarProps extends HTMLAttributes<HTMLDivElement>` with `gap?: 8 | 12 | 16` (default 8) and `ref?: Ref<HTMLDivElement>`. Renders `role="group"` iff `aria-label` is passed. Task 6's pattern flip depends on Toolbar being in the manifest with a `body` slot.

- [ ] **Step 1: Branch + failing tests**

```bash
git checkout -b dkurkin/han-23-toolbar-component-the-filter-toolbar-patterns-declared-gap
```

`packages/react/src/Toolbar/Toolbar.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toolbar } from "./Toolbar.js";

describe("Toolbar", () => {
  it("renders children", () => {
    const { container } = render(<Toolbar><button>A</button><button>B</button></Toolbar>);
    expect(container.firstElementChild!.querySelectorAll("button")).toHaveLength(2);
  });
  it("has no role without aria-label", () => {
    const { container } = render(<Toolbar>x</Toolbar>);
    expect(container.firstElementChild!.getAttribute("role")).toBeNull();
  });
  it("announces as a named group when labeled", () => {
    const { getByRole } = render(<Toolbar aria-label="Filters">x</Toolbar>);
    expect(getByRole("group", { name: "Filters" })).toBeTruthy();
  });
  it("applies the gap class (default 8, explicit 16)", () => {
    const { container, rerender } = render(<Toolbar>x</Toolbar>);
    expect(container.firstElementChild!.className).toMatch(/gap8/);
    rerender(<Toolbar gap={16}>x</Toolbar>);
    expect(container.firstElementChild!.className).toMatch(/gap16/);
  });
});
```

Run: `pnpm vitest run packages/react/src/Toolbar/Toolbar.test.tsx`
Expected: FAIL — cannot resolve `./Toolbar.js`.

- [ ] **Step 2: Implement**

`packages/react/src/Toolbar/Toolbar.tsx`:

```tsx
import type { HTMLAttributes, Ref } from "react";
import styles from "./toolbar.module.css";

type Gap = 8 | 12 | 16;

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  /** Gap between controls in px. @default 8 */
  gap?: Gap;
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement>;
}

const gapClass: Record<Gap, string> = { 8: styles.gap8, 12: styles.gap12, 16: styles.gap16 };

/** Horizontal grouping row for filter/search controls (D52). Wraps on
 * overflow; zero JS. Deliberately NOT ARIA role="toolbar" — that role
 * contracts roving-tabindex arrow-key navigation, wrong for form controls.
 * With aria-label it announces as role="group". */
export function Toolbar({ gap = 8, className, children, ref, ...rest }: ToolbarProps) {
  const cls = [styles.toolbar, gapClass[gap], className].filter(Boolean).join(" ");
  return (
    <div ref={ref} role={rest["aria-label"] != null ? "group" : undefined} className={cls} {...rest}>
      {children}
    </div>
  );
}
```

`packages/react/src/Toolbar/toolbar.module.css`:

```css
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.gap8 { gap: var(--psi-space-8); }
.gap12 { gap: var(--psi-space-12); }
.gap16 { gap: var(--psi-space-16); }
```

`packages/react/src/Toolbar/slots.json`:

```json
{
  "slots": [
    { "name": "body", "accepts": {}, "cardinality": "0..*", "order": 1 }
  ]
}
```

`packages/react/src/index.ts` — after the `TooltipProps` export line add:

```ts
export { Toolbar } from "./Toolbar/Toolbar.js";
export type { ToolbarProps } from "./Toolbar/Toolbar.js";
```

Run: `pnpm vitest run packages/react/src/Toolbar/Toolbar.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 3: a11y-meta + axe cases**

`packages/react/src/a11y-meta.ts` — add:

```ts
  Toolbar: {
    keyboard: [
      { keys: "Tab", behavior: "Moves through the controls in DOM order — no roving tabindex (deliberately not role=toolbar, D52)." },
    ],
    notes:
      "With aria-label it renders role=group so the control cluster announces with a name; unlabeled it is a plain layout div.",
  },
```

`packages/react/src/a11y.axe.test.tsx` — add `Toolbar` to the index import and two cases:

```tsx
  ["Toolbar labeled", <Toolbar aria-label="Filters"><label>Search<Input size={32} /></label><Tag variant="neutral">Active</Tag></Toolbar>],
  ["Toolbar unlabeled", <Toolbar><Button size={32} variant="ghost">Clear</Button></Toolbar>],
```

Run: `pnpm vitest run packages/react/src/a11y.axe.test.tsx` — expected PASS.

- [ ] **Step 4: Stories**

`packages/react/src/Toolbar/Toolbar.stories.tsx`:

```tsx
import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Toolbar } from "./Toolbar.js";
import { Input } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import { Tag } from "../Tag/Tag.js";
import { Button } from "../Button/Button.js";

const meta: Meta<typeof Toolbar> = {
  title: "Components/Toolbar",
  component: Toolbar,
  argTypes: {
    gap: { control: "select", options: [8, 12, 16] },
  },
};

export default meta;
type Story = StoryObj<typeof Toolbar>;

export const FilterToolbar: Story = {
  args: {
    "aria-label": "Filters",
    children: (
      <>
        <Input size={32} placeholder="Search" aria-label="Search" />
        <Select size={32} aria-label="Category">
          <option>All</option>
          <option>Components</option>
        </Select>
        <Tag variant="neutral" onDismiss={() => {}}>psi-tokens</Tag>
        <Button size={32} variant="ghost">Clear all</Button>
      </>
    ),
  },
};

export const Wrapping: Story = {
  render: () => (
    <div style={{ maxWidth: 320 }}>
      <Toolbar aria-label="Filters">
        <Input size={32} placeholder="Search" aria-label="Search" />
        <Select size={32} aria-label="Category"><option>All</option></Select>
        <Tag variant="neutral">filter-one</Tag>
        <Tag variant="neutral">filter-two</Tag>
      </Toolbar>
    </div>
  ),
};
```

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/Toolbar packages/react/src/index.ts \
  packages/react/src/a11y-meta.ts packages/react/src/a11y.axe.test.tsx
git commit -m "feat(react): D52 Toolbar — wrapping filter/search row, role=group when labeled"
```

### Task 6: Flip filter-toolbar live; counts; baselines; changeset; PR B

**Files:**
- Modify: `packages/react/patterns/filter-toolbar.json` (drop the gap)
- Modify: `packages/react/scripts/seed-patterns.test.ts:12-16`
- Modify: `README.md`, `packages/react/README.md`, `packages/react/llms.txt`, `packages/mcp/README.md` (14 → 15)
- Modify: `packages/react/llms.txt` (Toolbar section)
- Create: `.changeset/toolbar.md`, VR baselines for Toolbar stories

**Interfaces:**
- Consumes: Toolbar in the manifest (Task 5 + build).
- Produces: `dist/patterns.json` filter-toolbar entry with `gaps: []`, `blocked: false`, generated `preset` JSX — the D47 acceptance test.

- [ ] **Step 1: Write the failing seed-pattern expectation first**

In `packages/react/scripts/seed-patterns.test.ts`, replace the first test:

```ts
  it("all three load, validate, and none are gapped (Toolbar landed — D52)", () => {
    const { gaps } = validatePatterns(patterns, manifest.components, contracts);
    expect(patterns.map((p) => p.id).sort()).toEqual(["destructive-confirm", "filter-toolbar", "settings-form-row"]);
    expect(gaps).toEqual({});
  });
```

Run: `pnpm build && pnpm vitest run packages/react/scripts/seed-patterns.test.ts`
Expected: FAIL — gaps still `{ "filter-toolbar": ["Toolbar"] }` (the pattern file still declares it).

- [ ] **Step 2: Flip the pattern**

In `packages/react/patterns/filter-toolbar.json`, change:

```json
  "gaps": ["Toolbar"]
```

to:

```json
  "gaps": []
```

- [ ] **Step 3: Verify the flip end-to-end**

Run: `pnpm build && pnpm vitest run packages/react/scripts/seed-patterns.test.ts`
Expected: PASS. Then inspect the generated artifact:

```bash
python3 -c "
import json
p = [x for x in json.load(open('packages/react/dist/patterns.json'))['patterns'] if x['id']=='filter-toolbar'][0]
assert p['blocked'] is False and p['gaps'] == [] and p['preset'], p
print(p['preset'])"
```

Expected: prints generated `<Toolbar>` preset JSX containing Input, Select, and Tag.

- [ ] **Step 4: Counts + llms.txt Toolbar section**

Bump `14 React 19 components` → `15` in the same four files as Task 4 Step 1. In `packages/react/llms.txt`, after the `## Panel` section, add:

```
## Toolbar
- <Toolbar gap={8|12|16} aria-label="Filters">: horizontal wrapping row for filter/search controls (Input, Select, Tag, Button). Wraps on overflow (D52); with aria-label it announces as role=group. Deliberately not ARIA role=toolbar (no roving tabindex). Unblocks the filter-toolbar pattern — consult dist/patterns.json for the preset.
```

Run: `pnpm build && node tools/check-docs-drift.mjs` — expected exit 0.

- [ ] **Step 5: VR baselines for Toolbar stories**

Run: `pnpm vr --update-snapshots`, then `git status --short apps/storybook/vr/stories.spec.ts-snapshots/`
Expected: exactly 4 new files (FilterToolbar/Wrapping × light/ember), zero modified. Then `pnpm vr` — PASS.

- [ ] **Step 6: Changeset, commit, PR, merge**

`.changeset/toolbar.md`:

```md
---
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

D52: `Toolbar` — JS-free wrapping row for filter/search controls (`gap` 8|12|16, `role="group"` when labeled). Flips the `filter-toolbar` pattern from blocked to live; its preset now renders.
```

```bash
git add packages/react/patterns/filter-toolbar.json packages/react/scripts/seed-patterns.test.ts \
  README.md packages/react/README.md packages/react/llms.txt packages/mcp/README.md \
  .changeset/toolbar.md apps/storybook/vr/stories.spec.ts-snapshots packages/react/docs
git commit -m "feat(react): flip filter-toolbar live — 15 components, preset renders (D47/D52)"
git push -u origin dkurkin/han-23-toolbar-component-the-filter-toolbar-patterns-declared-gap
gh pr create --base main --title "feat: D52 Toolbar — filter-toolbar pattern unblocked" \
  --body "Closes HAN-23 (https://linear.app/handamade/issue/HAN-23). D52 per the surface-cycle spec: wrapping flex row, no ARIA toolbar role (role=group when labeled), gaps flag flipped, preset now generated."
```

CI green → `gh pr merge --squash --delete-branch` → `git checkout main && git pull --ff-only`.

---

## PR C — HAN-22 + HAN-24: manifest passthrough + exports parity (branch `dkurkin/han-22-manifest-passthrough-gap-input-placeholder-audit`)

### Task 7: `placeholder` passthrough + audit

**Files:**
- Modify: `packages/react/scripts/emit-manifest.ts:30` and the `PASSTHROUGH_DESCRIPTIONS` map (~line 50)

**Interfaces:**
- Produces: `dist/manifest.json` Input entry gains a `placeholder` prop (string, optional) → visible to MCP `get component:Input` and the D48 validator.

- [ ] **Step 1: Branch**

```bash
git checkout -b dkurkin/han-22-manifest-passthrough-gap-input-placeholder-audit
```

- [ ] **Step 2: Add the passthrough + description**

In `packages/react/scripts/emit-manifest.ts` change line 30 to:

```ts
const WELL_KNOWN_PASSTHROUGHS = ["ref", "className", "placeholder"];
```

and add to `PASSTHROUGH_DESCRIPTIONS`:

```ts
  placeholder: "Native placeholder text shown while the field is empty (only on components whose host element supports it).",
```

- [ ] **Step 3: Rebuild and verify exactly which components gained it**

Run: `pnpm --filter @handamade/psi-react build` then:

```bash
python3 -c "
import json
m = json.load(open('packages/react/dist/manifest.json'))
hits = [c['name'] for c in m['components'] if any(p['name']=='placeholder' for p in c['props'])]
print('placeholder now on:', hits)"
```

Expected: `['Input']` (SelectHTMLAttributes has no placeholder). If anything unexpected appears, investigate before continuing.

- [ ] **Step 4: The audit**

Sweep for other real, documented passthrough APIs invisible to the manifest: read the "Native pass-through" bullet in `packages/react/llms.txt` (line ~39) — `value`, `onChange`, `type`, `id`, `autoComplete`, `checked` are *deliberately* excluded (generic DOM surface, documented as pass-through by design). Record the audit conclusion in the PR body: `placeholder` is the only prop that is (a) component-meaningful API, (b) referenced by pattern/eval work (D48), and (c) invisible. If the sweep finds another candidate meeting all three, add it to the list in Step 2 and rerun Step 3; otherwise the list stays `["ref", "className", "placeholder"]`.

- [ ] **Step 5: Commit (docs regen included)**

```bash
pnpm build && pnpm test && node tools/check-docs-drift.mjs
git add packages/react/scripts/emit-manifest.ts packages/react/docs
git commit -m "fix(react): manifest exposes placeholder passthrough (HAN-22) — audit: sole qualifying prop"
```

### Task 8: `./patterns.json` exports parity + changeset + PR C

**Files:**
- Modify: `packages/react/package.json` (`exports`)
- Test: `packages/react/scripts/emit-patterns.test.ts`
- Create: `.changeset/manifest-passthrough-exports.md`

**Interfaces:**
- Produces: `import "@handamade/psi-react/patterns.json"` resolves for published consumers (parity with `./manifest.json`).

- [ ] **Step 1: Write the failing parity test**

In `packages/react/scripts/emit-patterns.test.ts`, add (mirroring the file's existing imports of `readFileSync`/`join`; add them if absent):

```ts
it("package.json exports patterns.json alongside manifest.json (HAN-24)", () => {
  const pkg = JSON.parse(readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"));
  expect(pkg.exports["./manifest.json"]).toBe("./dist/manifest.json");
  expect(pkg.exports["./patterns.json"]).toBe("./dist/patterns.json");
});
```

Run: `pnpm vitest run packages/react/scripts/emit-patterns.test.ts`
Expected: FAIL — `pkg.exports["./patterns.json"]` is `undefined`.

- [ ] **Step 2: Add the export**

In `packages/react/package.json` `exports`, after the `"./manifest.json"` entry add:

```json
    "./patterns.json": "./dist/patterns.json"
```

Run: `pnpm vitest run packages/react/scripts/emit-patterns.test.ts` — expected PASS.

- [ ] **Step 3: Changeset, full check, PR, merge**

`.changeset/manifest-passthrough-exports.md`:

```md
---
"@handamade/psi-react": patch
"@handamade/psi-mcp": patch
---

Manifest now lists the `placeholder` passthrough (HAN-22); `./patterns.json` added to the exports map for parity with `./manifest.json` (HAN-24).
```

```bash
pnpm build && pnpm test && pnpm lint
git add packages/react/package.json packages/react/scripts/emit-patterns.test.ts .changeset/manifest-passthrough-exports.md
git commit -m "fix(react): export ./patterns.json (HAN-24)"
git push -u origin dkurkin/han-22-manifest-passthrough-gap-input-placeholder-audit
gh pr create --base main --title "fix: manifest placeholder passthrough + patterns.json export parity" \
  --body "Closes HAN-22 and HAN-24 (https://linear.app/handamade/issue/HAN-22, https://linear.app/handamade/issue/HAN-24). Audit note: placeholder is the only passthrough that is component-meaningful, D48-relevant, and manifest-invisible; the generic DOM surface (value/onChange/type/id/...) stays deliberately excluded and documented as pass-through."
```

CI green → `gh pr merge --squash --delete-branch` → `git checkout main && git pull --ff-only`.

---

## Release + consumers + process

### Task 9: Release 0.7.0

**Files:**
- Generated: version bumps + CHANGELOGs via `pnpm changeset version`

- [ ] **Step 1: Release branch + version**

```bash
git checkout main && git pull --ff-only
git checkout -b release/psi-0.7.0
pnpm changeset version
pnpm install --lockfile-only
```

Expected: `@handamade/psi-tokens`, `@handamade/psi-react`, `@handamade/psi-mcp` all at 0.7.0 (minor wins over patch); CHANGELOG.md files updated; `.changeset/*.md` consumed.

- [ ] **Step 2: Verify, commit, PR, merge**

```bash
pnpm build && pnpm test && pnpm lint && pnpm vr
git add -A
git commit -m "release: psi 0.7.0 — surface cycle (D51 Panel + surface family, D52 Toolbar, filter-toolbar live)"
git push -u origin release/psi-0.7.0
gh pr create --base main --title "release: psi 0.7.0 — surface cycle" \
  --body "D51/D52 per docs/superpowers/specs/2026-07-21-surface-cycle-design.md. 15 components; all 3 patterns live; placeholder in manifest; patterns.json exported."
```

CI green → merge → `git checkout main && git pull --ff-only`.

- [ ] **Step 3: Publish**

Run: `pnpm release` (this is `git checkout main && git pull --ff-only && node tools/release-guard.mjs && pnpm build && pnpm -r publish --access public && changeset tag` — requires npm auth; if auth is missing, stop and hand the command to Dmytro).
Then verify: `npm view @handamade/psi-react version` → `0.7.0`, and `git push --tags`.

- [ ] **Step 4: Verify Linear**

HAN-19/22/23/24 should have moved to Done via the PR links; if any didn't, update them via Linear MCP (`save_issue` state Done with a closing comment naming the PR).

### Task 10: Promo migrates to `<Panel>` (branch `dkurkin/psi-0.7-promo-panel`)

**Files:**
- Modify: `apps/promo/src/sections/Pipeline.tsx:41,68`, `apps/promo/src/sections/Roadmap.tsx:30,45`, `apps/promo/src/sections/AgentReady.tsx:34`, `apps/promo/src/sections/Updates.tsx` (the `<li className="card update">`), plus any further hits from the enumeration step
- Modify: `apps/promo/src/promo.css:363-368` (delete the `.card` surface rule)

**Interfaces:**
- Consumes: `Panel` from `@handamade/psi-react` (workspace dep — available immediately after PR A merges; this task only needs PR A, not the npm release).

- [ ] **Step 1: Branch + enumerate every consumer**

```bash
git checkout -b dkurkin/psi-0.7-promo-panel
grep -rn 'card' apps/promo/src/sections apps/promo/src/promo.css | grep -v '\-card\|card-'
```

Known sites: `<div className="card">` in Pipeline (×2), Roadmap (×2), AgentReady (×1); `<li className="card update">` in Updates; descendant selectors `.playground .card h3` / `.pipeline-grid .card > p` in promo.css. Treat any additional hits by the same rules below.

- [ ] **Step 2: Apply the migration rule**

Rule A — plain `<div className="card">` → `<Panel className="card">` (matching closing tag → `</Panel>`), adding `Panel` to that file's `@handamade/psi-react` import (or creating `import { Panel } from "@handamade/psi-react";`). The `card` class is **kept** as the styling hook for descendant selectors.

Rule B — semantic elements (the Updates `<li className="card update">`): the element stays an `<li>`; nest a Panel and move the surface classes onto it:

```tsx
            <li className="update" key={`${entry.date}-${entry.title}`}>
              <Panel className="card">
                {/* existing li children move here unchanged */}
              </Panel>
            </li>
```

If `.update` CSS in promo.css styles the li's inner layout (check `grep -n '\.update' apps/promo/src/promo.css`), move those inner-layout declarations to target `.update .card` as needed so the rendered layout is unchanged.

Rule C — delete the `.card` surface rule at `apps/promo/src/promo.css:363-368` (`border`, `border-radius`, `background`, `padding` — Panel now supplies all four). Note the old border used `var(--promo-hairline-faint)` vs Panel's `--psi-surface-border` (= `--psi-border-faint`); if `--promo-hairline-faint` is not the same value, the hairline changes slightly — that is the point of systemizing (HAN-19: "the promo site should migrate onto the systemized version"). Check whether `--promo-hairline-faint` is now unused (`grep -c 'promo-hairline-faint' apps/promo/src/promo.css`) and remove its definition if so.

- [ ] **Step 3: Verify in the browser**

```bash
pnpm build
```

Then start the promo dev server via the Browser pane (`preview_start` with a launch.json entry running `pnpm --filter promo dev`), and compare each migrated section (Pipeline, Roadmap, AgentReady, Updates, Playground) against production psi.kurkin.de: same panel look (allowing the intended hairline unification), no layout breakage, both light and dark themes. Screenshot proof.

- [ ] **Step 4: Commit**

```bash
git add apps/promo/src
git commit -m "refactor(promo): migrate hand-rolled .card panels to <Panel> (D51 first consumer)"
```

### Task 11: Promo content refresh (same branch → PR D)

**Files:**
- Modify: `apps/promo/src/content/updates.ts` (typed feed — new entries)
- Modify: `apps/promo/src/sections/Roadmap.tsx` (if it lists Toolbar/Panel as future work — reflect shipped state)
- Check: `apps/promo/src/sections/Hero.tsx` and any hardcoded version/component-count copy (`grep -rn '0\.5\|0\.6\|13 comp\|14 comp' apps/promo/src`)

**Interfaces:**
- Consumes: the `UpdateEntry` type in `apps/promo/src/content/updates.ts` (fields: `date`, `tag` ∈ release|components|tokens|docs|site, `title`, plus its body field — match the existing entries' exact shape when adding).

- [ ] **Step 1: Add the missing feed entries**

Prepend to `UPDATES` in `apps/promo/src/content/updates.ts` (newest first if that's the file's order — match it), following the file's exact field names:

Entry 1 — date `2026-07-20`, tag `release`, title `0.6.0 — composition contracts complete`, body: `Token scopes (D46) now gate every binding at build time; three composition patterns with clarifying parameters (D47) ship in patterns.json; the D48 validator runs in every build.`

Entry 2 — date = the 0.7.0 publish date from Task 9, tag `release`, title `0.7.0 — Panel, Toolbar, and the surface family`, body: `The shared --psi-surface-* recipe lands as tokens plus a Panel primitive (Dialog rebinds, zero visual change). Toolbar unblocks the filter-toolbar pattern — all three patterns are now live. This site's panels are the first Panel consumer.`

- [ ] **Step 2: Sweep stale copy**

Run the grep from the Files block; update any "coming in 0.6/0.7", stale component counts, or roadmap rows for Panel/Toolbar to shipped state. Keep edits minimal — copy corrections, not a redesign.

- [ ] **Step 3: Verify, commit, PR, merge, deploy check**

Browser-verify the Updates and Roadmap sections render the new entries. Then:

```bash
git add apps/promo/src
git commit -m "docs(promo): content refresh — 0.6 contracts + 0.7 surface cycle in the feed"
git push -u origin dkurkin/psi-0.7-promo-panel
gh pr create --base main --title "promo: Panel migration + 0.6/0.7 content refresh" \
  --body "First Panel consumer (HAN-19 follow-through) + clears the stale-content symptom from the 2026-07-21 inspection. Screenshots in comments."
```

CI green → merge. Vercel deploys from main — after deploy, spot-check psi.kurkin.de shows the new updates.

### Task 12: Branch protection on `handamade/psi` main — ALREADY SATISFIED (verify only)

**Files:** none.

Resolved 2026-07-21 during planning: `main` is protected by the active repository **ruleset** `protect-main` (id 19059594) — pull requests required (0 approvals, solo-appropriate), required status check `ci` (strict), force-pushes and deletion blocked. A direct docs push to main was rejected by these rules, confirming enforcement live. The inspection's "GitHub API 404" finding checked the legacy `branches/main/protection` endpoint, which does not surface rulesets — future inspections should query `repos/handamade/psi/rules/branches/main` instead.

- [ ] **Step 1: Verify (nothing to change)**

```bash
gh api repos/handamade/psi/rules/branches/main --jq '[.[].type] | sort'
```

Expected: `["deletion","non_fast_forward","pull_request","required_status_checks"]`. If present, this task is complete — record in the session summary that the branch-protection GARAGE symptom is cleared (via ruleset, not legacy protection).
