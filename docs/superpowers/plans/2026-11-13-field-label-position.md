# Labels beside their controls (D115) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `Field` can put its label beside its control (`labelPosition="start"`), alone or in a new `FieldStack` whose fields share one label column as wide as their longest label; the two pagination presets use it.

**Architecture:** `Field` resolves its position from its own prop, then from a `FieldStackContext`, then `"top"`, and renders `data-label-position="start"` and `data-in-stack` for its CSS. A standalone `start` field is a two-column grid; inside a `start` `FieldStack` (a two-column grid and a named size container) each `Field` spans both columns and shares them with `subgrid`. Rows align on the first baseline; a container query in `field.module.css` stacks the fields below 480px.

**Tech Stack:** React 19, CSS Modules, `@handamade/psi-tokens` component tokens, Vitest + Testing Library (jsdom), Playwright (`@interaction` specs in Chromium; the spike in Chromium, WebKit and Firefox), Storybook.

**Spec:** `docs/superpowers/specs/2026-11-13-field-label-position-design.md`. Read it before Task 1.

## Global Constraints

- Work only in the worktree `/Users/dmytrokurkin/Projects/dku/ds/.claude/worktrees/d115-field-label-position`, branch `d115-field-label-position`. Never `cd` to the main checkout: another session works there.
- Node 24: run `nvm use` in the worktree before the first `pnpm` command and confirm `node -v` prints `v24.*`.
- Sizes are px numbers; never S/M/L. Never hardcode a colour in component CSS: bind `var(--psi-*)`.
- `labelPosition="top"` (the default) must render exactly today's markup and CSS. No existing story may change.
- Token values, verbatim: `label-align: "start"`, `label-max-width: "240px"`, `column-gap: "var(--psi-space-12)"`.
- The container threshold is 480, the constant `containerQueries.fieldStackColumns` in `packages/tokens/src/scales/layout.ts`, and the literal `480px` in `field.module.css`.
- `FieldStack` props: `labelPosition?: "top" | "start"` (default `"top"`), `gap?: 8 | 12 | 16 | 24` (default 16), `children`, rest props and `ref` on its `<div>`.
- Nothing in this repository names a consumer, the private request register, or an id from it (CLAUDE.md). Write "a consumer's pager", never a product name.
- Decision number: D115. Before opening the PR, confirm no other `## Decisions` entry claims D115 (`git fetch origin && git grep -n "D115" origin/main -- docs`).
- Verify with all five gates: `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site`. `pnpm vr` only passes in CI; never run it locally with update mode.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Responsibility |
| --- | --- |
| `packages/tokens/src/components/field.ts` | three new field tokens |
| `packages/tokens/src/scales/layout.ts` | `containerQueries.fieldStackColumns` |
| `packages/react/src/FieldStack/FieldStackContext.ts` | `FieldLabelPosition` type and the context |
| `packages/react/src/Field/Field.tsx` | `labelPosition` prop, resolution, data attributes |
| `packages/react/src/Field/field.module.css` | the `start` layout, standalone and in a stack; the container query |
| `packages/react/src/FieldStack/FieldStack.tsx`, `fieldStack.module.css`, `slots.json` | the stack: grid, gap, container |
| `packages/react/src/index.ts` | exports |
| `packages/react/scripts/emit-manifest.ts`, `scripts/slots.test.ts`, `src/a11y-meta.ts`, `src/a11y.axe.test.tsx` | catalogue wiring |
| `packages/react/patterns/table-pagination.json`, `cursor-pagination.json`, `scripts/emit-patterns.test.ts` | the presets |
| `packages/react/src/Field/Field.stories.tsx`, `src/FieldStack/FieldStack.stories.tsx` | stories (VR enrols them automatically) |
| `apps/storybook/vr/field-label-position.interaction.spec.ts`, `filter-form.interaction.spec.ts` | layout measured in Chromium |
| `packages/tokens/src/guidance.ts`, `packages/react/llms.txt`, `packages/react/src/Toolbar/Toolbar.tsx`, the four count files | docs |
| `.changeset/field-label-position.md` | release note |

---

### Task 1: Set up the worktree and prove the layout in three engines

The CSS in Tasks 3 and 4 rests on four behaviours that jsdom cannot see and that differ between engines: subgrid on a `<div>` and on a `<fieldset>`, a floated `<legend>` becoming a grid item, baseline alignment of a label with each control, and the container query. This task measures them before any component code is written, and records which variant Tasks 3 and 4 take.

**Files:**
- Already written: `docs/superpowers/plans/assets/d115-spike/fixture.html`, `docs/superpowers/plans/assets/d115-spike/spike.mjs`
- Modify: `docs/superpowers/specs/2026-11-13-field-label-position-design.md` (append an "Engine results" section)

**Interfaces:**
- Produces: two recorded verdicts that Tasks 3 and 4 read: **GROUP** = `fieldset` or `div-group`, and **ALIGN** = `baseline` or `center`.

- [ ] **Step 1: Install and build the worktree**

```bash
cd /Users/dmytrokurkin/Projects/dku/ds/.claude/worktrees/d115-field-label-position
nvm use && node -v
pnpm install --frozen-lockfile
pnpm build
```

Expected: `v24.*`, then a build that ends without an error.

- [ ] **Step 2: Install WebKit and Firefox for Playwright**

This downloads two browsers (a few hundred MB) from Playwright's CDN. Ask the user before running it.

```bash
pnpm exec playwright install webkit firefox
```

Expected: both browsers report as downloaded.

- [ ] **Step 3: Run the spike**

```bash
node docs/superpowers/plans/assets/d115-spike/spike.mjs
```

Expected: for each engine, eight `PASS`/`FAIL` lines and one JSON line.

- [ ] **Step 4: Decide the two verdicts**

- **GROUP = `fieldset`** if, in all three engines, "labels share one column (incl. the legend)", "controls share one column (incl. the fieldset)" and "narrow: legend above its options" pass. Otherwise **GROUP = `div-group`**.
- **ALIGN = `baseline`** if, in all three engines, "one-line controls: label centre within 4px of control centre" and "legend on the first option's line" pass. Otherwise **ALIGN = `center`**.
- If "labels share one column" fails for the `<div>` fields too (not only the legend), subgrid itself is not usable: stop and report to the user, because the design needs a different mechanism.

- [ ] **Step 5: Record the results in the spec**

Append to the spec, filling in what the run printed:

```markdown
## Engine results (Task 1 of the plan, YYYY-MM-DD)

| Check | Chromium <version> | WebKit <version> | Firefox <version> |
| --- | --- | --- | --- |
| labels share one column (incl. the legend) | PASS/FAIL | … | … |
| … one row per check printed by spike.mjs … | | | |

Verdicts: **GROUP = fieldset | div-group**, **ALIGN = baseline | center**, because <one sentence per verdict>.
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/plans/assets/d115-spike docs/superpowers/specs/2026-11-13-field-label-position-design.md
git commit -m "docs: D115 engine spike — subgrid, the floated legend and baselines in three engines

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Tokens and the container constant

**Files:**
- Modify: `packages/tokens/src/components/field.ts`
- Modify: `packages/tokens/src/scales/layout.ts`
- Test: `packages/tokens/__tests__/field-tokens.test.ts`, `packages/tokens/__tests__/scales.test.ts`

**Interfaces:**
- Produces: CSS custom properties `--psi-field-label-align`, `--psi-field-label-max-width`, `--psi-field-column-gap`; the constant `containerQueries` exported from `packages/tokens/src/scales/layout.ts` as `{ fieldStackColumns: 480 } as const`.

- [ ] **Step 1: Write the failing tests**

In `packages/tokens/__tests__/field-tokens.test.ts`, replace the first test and add one:

```ts
  it("declares the D49 tokens, the D84 required-text colour, the D92 label height and the D115 layout tokens", () => {
    expect(fieldVars).toEqual({
      "label-fg": "var(--psi-fg-secondary)",
      "message-fg": "var(--psi-fg-tertiary)",
      "error-fg": "var(--psi-fg-danger)",
      "marker-fg": "var(--psi-fg-danger)",
      "required-text-fg": "var(--psi-fg-secondary)",
      gap: "var(--psi-space-6)",
      "label-height": "20px",
      "label-align": "start",
      "label-max-width": "240px",
      "column-gap": "var(--psi-space-12)",
    });
  });

  it("the D115 layout tokens carry no -fg/-bg/-border segment, so they stay out of the colour gates", async () => {
    const { keyGroup } = await import("../src/scopes.js");
    for (const key of ["label-align", "label-max-width", "column-gap"]) expect(keyGroup(key)).toBeUndefined();
  });
```

In `packages/tokens/__tests__/scales.test.ts`, change the import on line 5 to
`import { breakpoints, container, containerQueries, zIndex } from "../src/scales/layout.js";` and add, beside the
`expect(breakpoints)` assertion:

```ts
      expect(containerQueries).toEqual({ fieldStackColumns: 480 });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run packages/tokens/__tests__/field-tokens.test.ts packages/tokens/__tests__/scales.test.ts`
Expected: FAIL — `fieldVars` lacks the three keys, and `containerQueries` is not exported.

- [ ] **Step 3: Implement**

In `packages/tokens/src/components/field.ts`, add to the doc comment, before ` */`:

```ts
 *
 * D115: label-align, label-max-width and column-gap lay out a label beside
 * its control (Field labelPosition="start", and FieldStack). label-align is
 * the label's text-align (a theme sets `end` to put each label against its
 * control); label-max-width caps a FieldStack's label column, a standalone
 * literal like label-height; column-gap separates the label from its
 * control. None is a colour, so none enters the contrast gates.
```

and add to `fieldVars`, after `"label-height": "20px",`:

```ts
  "label-align": "start",
  "label-max-width": "240px",
  "column-gap": "var(--psi-space-12)",
```

In `packages/tokens/src/scales/layout.ts`, add after `breakpoints`:

```ts
/** Container-query thresholds in px — build-time constants like breakpoints
 * (D31), written as literals in the CSS that queries them. fieldStackColumns
 * (D115): below this width of its own, a FieldStack's fields put their labels
 * back above their controls. It measures the form, not the viewport, so it
 * sits below breakpoints.sm: a form in a 520px dialog keeps its label column. */
export const containerQueries = { fieldStackColumns: 480 } as const;
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm vitest run packages/tokens/__tests__/field-tokens.test.ts packages/tokens/__tests__/scales.test.ts`
Expected: PASS.

- [ ] **Step 5: Build tokens and check the emitted CSS**

Run: `pnpm --filter @handamade/psi-tokens build && grep -o -- "--psi-field-\(label-align\|label-max-width\|column-gap\)[^;]*" packages/tokens/dist/components.css`
Expected: the three declarations, with the values above.

- [ ] **Step 6: Commit**

```bash
git add packages/tokens
git commit -m "feat(tokens): field layout tokens and the FieldStack container threshold (D115)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `Field labelPosition`, standalone

**Files:**
- Create: `packages/react/src/FieldStack/FieldStackContext.ts`
- Modify: `packages/react/src/Field/Field.tsx`
- Modify: `packages/react/src/Field/field.module.css`
- Test: `packages/react/src/Field/Field.test.tsx`

**Interfaces:**
- Consumes: the tokens from Task 2; the verdicts **GROUP** and **ALIGN** from Task 1.
- Produces:
  - `export type FieldLabelPosition = "top" | "start";` and `export interface FieldStackContextValue { labelPosition: FieldLabelPosition; }` and `export const FieldStackContext: React.Context<FieldStackContextValue | null>`, all from `packages/react/src/FieldStack/FieldStackContext.ts`.
  - `FieldProps.labelPosition?: FieldLabelPosition`.
  - On the Field's root: `data-label-position="start"` when the resolved position is `start` (absent otherwise), and `data-in-stack=""` whenever a `FieldStackContext` is present.

- [ ] **Step 1: Write the failing tests**

Append to `packages/react/src/Field/Field.test.tsx` (it already imports `readFileSync`, `join`, `render`, `screen`, `Field`, `Input`, `Select`, `Checkbox`):

```tsx
describe("labelPosition (D115)", () => {
  const css = () => readFileSync(join(import.meta.dirname, "field.module.css"), "utf8");

  it("defaults to top: no position attribute, today's markup", () => {
    const { container } = render(<Field label="Email"><Input /></Field>);
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toHaveAttribute("data-label-position");
    expect(root).not.toHaveAttribute("data-in-stack");
    expect(root.firstElementChild?.tagName).toBe("LABEL");
  });

  it("start keeps the label naming the control, and the order label, control, message", () => {
    const { container } = render(
      <Field label="Rows per page" labelPosition="start" description="Applies to every list.">
        <Select size={32}><option>50</option></Select>
      </Field>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-label-position", "start");
    expect(screen.getByLabelText("Rows per page").tagName).toBe("SELECT");
    expect([...root.children].map((el) => el.tagName)).toEqual(["LABEL", "SELECT", "P"]);
    expect(screen.getByLabelText("Rows per page")).toHaveAttribute(
      "aria-describedby",
      screen.getByText("Applies to every list.").id,
    );
  });

  it("start in group mode keeps the group named and described", () => {
    render(
      <Field group label="Notify me" labelPosition="start" error="Pick one.">
        <Checkbox>Email</Checkbox>
      </Field>,
    );
    const group = screen.getByRole("group", { name: "Notify me" });
    expect(group).toHaveAttribute("aria-describedby", screen.getByText("Pick one.").id);
    expect(group).toHaveAttribute("data-label-position", "start");
  });

  it("the start layout puts the label in column 1 and everything else in column 2", () => {
    const start = /\.field\[data-label-position="start"\]\s*\{([^}]*)\}/.exec(css())![1];
    expect(start).toMatch(/grid-template-columns:\s*auto auto;/);
    expect(start).toMatch(/column-gap:\s*var\(--psi-field-column-gap\);/);
    expect(css()).toMatch(/\.field\[data-label-position="start"\]\s*>\s*\*\s*\{\s*grid-column:\s*2;/);
    const label = /\.field\[data-label-position="start"\]\s*>\s*\.label\s*\{([^}]*)\}/.exec(css())![1];
    expect(label).toMatch(/grid-column:\s*1;/);
    expect(label).toMatch(/text-align:\s*var\(--psi-field-label-align\);/);
  });

  it("the top layout's rules are unchanged", () => {
    expect(/\.field\s*\{([^}]*)\}/.exec(css())![1]).not.toMatch(/grid-template-columns/);
  });
});
```

If **GROUP = `div-group`**, replace the group test's last two lines with:

```tsx
    expect(group.tagName).toBe("DIV");
    expect(group).toHaveAttribute("aria-describedby", screen.getByText("Pick one.").id);
    expect(group).toHaveAttribute("aria-labelledby", screen.getByText("Notify me").id);
    expect(group).toHaveAttribute("data-label-position", "start");
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run packages/react/src/Field/Field.test.tsx`
Expected: FAIL — `labelPosition` is ignored, so `data-label-position` is absent and the CSS rules are missing. The default-position test passes already.

- [ ] **Step 3: Create the context**

`packages/react/src/FieldStack/FieldStackContext.ts`:

```ts
import { createContext } from "react";

/** Where a Field's label sits (D115): above its control, or beside it on the
 * inline-start side. */
export type FieldLabelPosition = "top" | "start";

/** What a FieldStack tells the Fields inside it. Its presence also tells a
 * Field that it is a row of the stack's grid. */
export interface FieldStackContextValue {
  labelPosition: FieldLabelPosition;
}

export const FieldStackContext = createContext<FieldStackContextValue | null>(null);
```

- [ ] **Step 4: Add the prop to `Field`**

In `packages/react/src/Field/Field.tsx`:

1. Change the first import to `import { createContext, useContext, useId } from "react";` and add
   `import { FieldStackContext } from "../FieldStack/FieldStackContext.js";` and
   `import type { FieldLabelPosition } from "../FieldStack/FieldStackContext.js";`.
2. Add to `FieldProps`, after `announce`:

```ts
  /** Where the label sits (D115): `"top"`, above the control, or `"start"`,
   * beside it on the inline-start side with the message line under the
   * control. Without it, a Field takes its FieldStack's position, or `"top"`.
   * In a toolbar row, use the default `align="center"`: `align="start"`
   * offsets buttons for labels above. */
  labelPosition?: FieldLabelPosition;
```

3. Add `labelPosition,` to the destructured props, after `announce = true,`.
4. After `const autoId = useId();` add:

```ts
  const stack = useContext(FieldStackContext);
  const position: FieldLabelPosition = labelPosition ?? stack?.labelPosition ?? "top";
  const layout = {
    "data-label-position": position === "start" ? "start" : undefined,
    "data-in-stack": stack ? "" : undefined,
  };
```

5. Spread `{...layout}` after `{...rest}` on both the `<fieldset>` and the `<div>` root, so the layout attributes
   cannot be overridden by a stray prop.

If **GROUP = `div-group`**, also make group mode in the `start` position render a `div`:

```tsx
  const groupAsDiv = group && position === "start";
  const groupLabelId = groupAsDiv && label != null ? `${id}-label` : undefined;
```

In `body`, render the group label as `<div id={groupLabelId} className={styles.label}>{labelContent}</div>` when
`groupAsDiv`, and the `<legend>` otherwise. In the return, before the `group ? <fieldset …>` branch, add:

```tsx
  if (groupAsDiv) {
    return (
      <div
        ref={ref as Ref<HTMLDivElement>}
        role="group"
        aria-labelledby={groupLabelId}
        aria-describedby={messageId}
        className={cls}
        {...rest}
        {...layout}
      >
        {body}
      </div>
    );
  }
```

and update the `group` doc comment: "In the `start` position it renders `<div role="group" aria-labelledby>`, because
a fieldset cannot take part in a FieldStack's columns (D115)."

- [ ] **Step 5: Add the standalone CSS**

Append to `packages/react/src/Field/field.module.css`:

```css
/* ── Label beside the control (D115) ─────────────────────────────
   Column 1 holds the label (or legend); the control and the message line
   sit in column 2, so a message hangs under its control. Rows align on the
   first baseline, so the label's text sits on the line of the control's text
   at every size. A floated legend is not the fieldset's rendered legend, so
   it becomes an ordinary grid item; float itself has no effect on a grid
   item. Standalone, the field is as wide as its label and its control. */

.field[data-label-position="start"] {
  grid-template-columns: auto auto;
  column-gap: var(--psi-field-column-gap);
  align-items: baseline;
  justify-content: start;
}

.field[data-label-position="start"] > * {
  grid-column: 2;
}

.field[data-label-position="start"] > .label {
  grid-column: 1;
  text-align: var(--psi-field-label-align);
  float: inline-start;
}
```

If **ALIGN = `center`**, replace `align-items: baseline;` with `align-items: start;` and add `align-self: center;`
to the `> .label` rule, and change the comment's third sentence to "The label is centred on the first row, which
is the control's height."

- [ ] **Step 6: Run the tests to see them pass**

Run: `pnpm vitest run packages/react/src/Field/Field.test.tsx`
Expected: PASS, including every test that passed before.

- [ ] **Step 7: Lint the CSS**

Run: `pnpm lint:css`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/react/src/Field packages/react/src/FieldStack/FieldStackContext.ts
git commit -m "feat: a Field can put its label beside its control (D115)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `FieldStack`

**Files:**
- Create: `packages/react/src/FieldStack/FieldStack.tsx`, `packages/react/src/FieldStack/fieldStack.module.css`, `packages/react/src/FieldStack/slots.json`
- Modify: `packages/react/src/Field/field.module.css`
- Modify: `packages/react/src/index.ts`
- Test: `packages/react/src/FieldStack/FieldStack.test.tsx`

**Interfaces:**
- Consumes: `FieldStackContext`, `FieldLabelPosition` (Task 3); `data-in-stack` and `data-label-position` on `Field` (Task 3); `containerQueries.fieldStackColumns` (Task 2).
- Produces: `export function FieldStack(props: FieldStackProps)` and `export interface FieldStackProps`, exported from `packages/react/src/index.ts` with `export type { FieldLabelPosition }`.

- [ ] **Step 1: Write the failing tests**

`packages/react/src/FieldStack/FieldStack.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { createRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { FieldStack } from "./FieldStack.js";
import { Field } from "../Field/Field.js";
import { Input } from "../Input/Input.js";
import { Textarea } from "../Textarea/Textarea.js";
import { containerQueries } from "../../../tokens/src/scales/layout.js";

const stackCss = () => readFileSync(join(import.meta.dirname, "fieldStack.module.css"), "utf8");
const fieldCss = () => readFileSync(join(import.meta.dirname, "../Field/field.module.css"), "utf8");

describe("FieldStack (D115)", () => {
  it("is a div with no role that forwards rest props and ref", () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(<FieldStack ref={ref} id="form-1" aria-label="x"><Field label="A"><Input /></Field></FieldStack>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.tagName).toBe("DIV");
    expect(root).not.toHaveAttribute("role");
    expect(root).toHaveAttribute("id", "form-1");
    expect(ref.current).toBe(root);
  });

  it("defaults to top and gap 16, and takes start and the other gaps", () => {
    const { container, rerender } = render(<FieldStack><Field label="A"><Input /></Field></FieldStack>);
    const root = () => container.firstElementChild as HTMLElement;
    expect(root()).toHaveAttribute("data-label-position", "top");
    expect(root().className).toMatch(/gap16/);
    expect(root().className).not.toMatch(/start/);
    rerender(<FieldStack labelPosition="start" gap={24}><Field label="A"><Input /></Field></FieldStack>);
    expect(root()).toHaveAttribute("data-label-position", "start");
    expect(root().className).toMatch(/gap24/);
    expect(root().className).toMatch(/start/);
  });

  it("its Fields take its position, and a Field's own prop wins", () => {
    render(
      <FieldStack labelPosition="start">
        <Field label="Name"><Input /></Field>
        <Field label="Notes" labelPosition="top"><Textarea /></Field>
      </FieldStack>,
    );
    const name = screen.getByLabelText("Name").parentElement!;
    const notes = screen.getByLabelText("Notes").parentElement!;
    expect(name).toHaveAttribute("data-label-position", "start");
    expect(name).toHaveAttribute("data-in-stack", "");
    expect(notes).not.toHaveAttribute("data-label-position");
    expect(notes).toHaveAttribute("data-in-stack", "");
  });

  it("a Field rendered by the consumer's own component still reads the stack", () => {
    function NameField() {
      return <Field label="Name"><Input /></Field>;
    }
    render(<FieldStack labelPosition="start"><NameField /></FieldStack>);
    expect(screen.getByLabelText("Name").parentElement).toHaveAttribute("data-label-position", "start");
  });

  it("a Field without a label renders no label element", () => {
    render(<FieldStack labelPosition="start"><Field><Input aria-label="Search" /></Field></FieldStack>);
    expect(screen.getByLabelText("Search").parentElement!.querySelector("label")).toBeNull();
  });

  it("the start stack is two columns, the label column capped, and a named size container", () => {
    const start = /\.start\s*\{([^}]*)\}/.exec(stackCss())![1];
    expect(start).toMatch(
      /grid-template-columns:\s*fit-content\(var\(--psi-field-label-max-width\)\)\s+minmax\(0,\s*1fr\);/,
    );
    expect(start).toMatch(/column-gap:\s*var\(--psi-field-column-gap\);/);
    expect(start).toMatch(/container:\s*psi-field-stack\s*\/\s*inline-size;/);
    expect(stackCss()).toMatch(/\.stack\s*>\s*\*\s*\{\s*grid-column:\s*1\s*\/\s*-1;/);
  });

  it("a Field in a start stack shares the stack's columns", () => {
    expect(fieldCss()).toMatch(/\.field\[data-in-stack\]\[data-label-position="start"\]\s*\{\s*grid-template-columns:\s*subgrid;/);
  });

  it("the container query's literal equals containerQueries.fieldStackColumns", () => {
    const m = /@container psi-field-stack \(width < (\d+)px\)/.exec(fieldCss());
    expect(Number(m?.[1])).toBe(containerQueries.fieldStackColumns);
  });
});
```

The relative import reaches `packages/tokens/src/scales/layout.ts` from the test's folder; `containerQueries` is
deliberately not part of the published `types` entry, so the test reads the source.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run packages/react/src/FieldStack/FieldStack.test.tsx`
Expected: FAIL — `./FieldStack.js` does not exist.

- [ ] **Step 3: Write `FieldStack`**

`packages/react/src/FieldStack/FieldStack.tsx`:

```tsx
import { useMemo } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./fieldStack.module.css";
import { FieldStackContext } from "./FieldStackContext.js";
import type { FieldLabelPosition } from "./FieldStackContext.js";

type Gap = 8 | 12 | 16 | 24;

export interface FieldStackProps extends HTMLAttributes<HTMLDivElement> {
  /** The form's Fields, top to bottom. Other content between them spans the
   * full width. */
  children?: ReactNode;
  /** Where every Field's label sits, unless the Field says otherwise (D115).
   * `"start"` puts the labels in one column as wide as the longest label, up
   * to `--psi-field-label-max-width`, and returns them above their controls
   * when the stack is narrower than 480px. @default "top" */
  labelPosition?: FieldLabelPosition;
  /** Space between Fields in px, from the space scale. @default 16 */
  gap?: Gap;
  /** Forwarded ref to the root element. */
  ref?: Ref<HTMLDivElement>;
}

const gapClass: Record<Gap, string> = {
  8: styles.gap8, 12: styles.gap12, 16: styles.gap16, 24: styles.gap24,
};

/** A form's column of Fields (D115). With `labelPosition="start"` its Fields
 * share one label column. A plain <div> with no role. It measures its own
 * width, so it must fill its container: it is for a form, not a toolbar,
 * where a single `Field labelPosition="start"` goes. A Field shares the
 * columns only as a direct child; one inside a wrapper element keeps its
 * label beside its control in columns of its own. */
export function FieldStack({ labelPosition = "top", gap = 16, className, children, ref, ...rest }: FieldStackProps) {
  const value = useMemo(() => ({ labelPosition }), [labelPosition]);
  const cls = [styles.stack, gapClass[gap], labelPosition === "start" && styles.start, className]
    .filter(Boolean)
    .join(" ");
  return (
    <div ref={ref} className={cls} {...rest} data-label-position={labelPosition}>
      <FieldStackContext.Provider value={value}>{children}</FieldStackContext.Provider>
    </div>
  );
}
```

`packages/react/src/FieldStack/fieldStack.module.css`:

```css
/* D115: a form's column of Fields. One column by default; with
   labelPosition="start", two — the label column, as wide as the longest
   label up to --psi-field-label-max-width, and the control column. Every
   child spans both; a start Field lays its parts on them with subgrid
   (field.module.css). The stack is a named size container: the rule that
   stacks its Fields below 480px is in field.module.css, because a container
   query styles only the container's descendants. */

.stack {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

.stack > * { grid-column: 1 / -1; }

.gap8 { row-gap: var(--psi-space-8); }
.gap12 { row-gap: var(--psi-space-12); }
.gap16 { row-gap: var(--psi-space-16); }
.gap24 { row-gap: var(--psi-space-24); }

.start {
  grid-template-columns: fit-content(var(--psi-field-label-max-width)) minmax(0, 1fr);
  column-gap: var(--psi-field-column-gap);
  container: psi-field-stack / inline-size;
}
```

`packages/react/src/FieldStack/slots.json`:

```json
{
  "slots": [
    { "name": "body", "accepts": {}, "cardinality": "0..*", "order": 1 }
  ]
}
```

- [ ] **Step 4: Add the in-stack rules to `field.module.css`**

Append:

```css
/* In a FieldStack (D115): every Field spans the stack's two columns; a start
   Field shares them, so all labels in the stack line up in one column. */

.field[data-in-stack] {
  grid-column: 1 / -1;
}

.field[data-in-stack][data-label-position="start"] {
  grid-template-columns: subgrid;
}

/* Below 480px of the stack's width (containerQueries.fieldStackColumns), the
   label returns above its control. The label aligns to start here whatever
   --psi-field-label-align says: an end-aligned label above a control reads
   as a mistake. */
@container psi-field-stack (width < 480px) {
  .field[data-in-stack][data-label-position="start"] {
    grid-template-columns: minmax(0, 1fr);
  }

  .field[data-in-stack][data-label-position="start"] > *,
  .field[data-in-stack][data-label-position="start"] > .label {
    grid-column: 1;
  }

  .field[data-in-stack][data-label-position="start"] > .label {
    text-align: start;
  }
}
```

- [ ] **Step 5: Export it**

In `packages/react/src/index.ts`, after the `Field` exports, add:

```ts
export { FieldStack } from "./FieldStack/FieldStack.js";
export type { FieldStackProps } from "./FieldStack/FieldStack.js";
export type { FieldLabelPosition } from "./FieldStack/FieldStackContext.js";
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `pnpm vitest run packages/react/src/FieldStack packages/react/src/Field`
Expected: PASS.

- [ ] **Step 7: Lint**

Run: `pnpm lint:css && pnpm exec eslint packages/react/src/FieldStack packages/react/src/Field`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/react/src/FieldStack packages/react/src/Field/field.module.css packages/react/src/index.ts
git commit -m "feat: FieldStack — a form whose labels share one column (D115)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Join the catalogue — manifest, slots, accessibility, counts

**Files:**
- Modify: `packages/react/scripts/emit-manifest.ts` (the `COMPONENTS` array)
- Modify: `packages/react/scripts/slots.test.ts`
- Modify: `packages/react/src/a11y-meta.ts`, `packages/react/src/a11y.axe.test.tsx`
- Modify: `README.md`, `packages/react/README.md`, `packages/react/llms.txt`, `packages/mcp/README.md` (52 → 53)
- Generated by `pnpm build`, then committed: `packages/react/docs/FieldStack.md`, `packages/react/docs/Field.md`

**Interfaces:**
- Consumes: `FieldStack`, `Field labelPosition` (Tasks 3–4).

- [ ] **Step 1: Write the failing tests**

In `packages/react/scripts/slots.test.ts`, add `"FieldStack"` to the `names` array after `"Text"`, and after the
`expect(out.Text…)` line add:

```ts
    expect(out.FieldStack.map((x) => x.name)).toEqual(["body"]);
```

In `packages/react/src/a11y.axe.test.tsx`, add `FieldStack` to the import list after `Field`, and add these cases
after the `"Checkbox group in error"` case:

```tsx
  ["Field with its label beside its control", <Field label="Rows per page" labelPosition="start"><Select size={32}><option>50</option></Select></Field>],
  ["FieldStack with side labels", <FieldStack labelPosition="start"><Field label="Name" required><Input /></Field><Field group label="Status" error="Pick one."><RadioGroup value="a" onValueChange={() => {}}><Radio value="a">Active</Radio><Radio value="b">Blocked</Radio></RadioGroup></Field><Field><Checkbox>Notify the owner</Checkbox></Field></FieldStack>],
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run packages/react/scripts/slots.test.ts packages/react/src/a11y.axe.test.tsx`
Expected: the slots test FAILS until the manifest knows `FieldStack`. The axe cases may already pass, which is fine:
they guard against a regression.

- [ ] **Step 3: Wire the catalogue**

1. `packages/react/scripts/emit-manifest.ts`: add `"FieldStack",` to `COMPONENTS` after `"Field",`.
2. `packages/react/src/a11y-meta.ts`: add after the `Field` entry:

```ts
  FieldStack: {
    keyboard: [
      { keys: "Tab", behavior: "Skipped — FieldStack itself is not focusable; focus moves through its Fields in source order." },
    ],
    notes:
      "Plain <div> with no role (D115): a form's column of Fields. labelPosition=\"start\" moves the labels beside their controls visually; the document order stays label, control, message, so reading and focus order are unchanged.",
  },
```

and append to the `Field` entry's `notes` string: ` labelPosition="start" puts the label beside the control, with
the message under the control (D115); only the visual position changes.`

3. Change `52 React 19 components` to `53 React 19 components` in `README.md`, `packages/react/README.md`,
   `packages/react/llms.txt` and `packages/mcp/README.md`. In `README.md`'s component list, add `FieldStack` after
   `Field`.

- [ ] **Step 4: Build, then run the tests and the drift check**

```bash
pnpm build
pnpm vitest run packages/react/scripts/slots.test.ts packages/react/src/a11y.axe.test.tsx
node tools/check-docs-drift.mjs
```

Expected: tests PASS; the drift check prints `docs drift check passed: 53 components, …`.

- [ ] **Step 5: Commit, including the regenerated docs**

```bash
git add packages/react/scripts packages/react/src/a11y-meta.ts packages/react/src/a11y.axe.test.tsx README.md packages/react/README.md packages/react/llms.txt packages/mcp/README.md packages/react/docs
git commit -m "feat: FieldStack joins the manifest, slots, a11y meta and counts (D115)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The pagination presets, Toolbar's docs and guidance

**Files:**
- Modify: `packages/react/patterns/table-pagination.json`, `packages/react/patterns/cursor-pagination.json`
- Modify: `packages/react/scripts/emit-patterns.test.ts`
- Modify: `apps/storybook/vr/filter-form.interaction.spec.ts`
- Modify: `packages/react/src/Toolbar/Toolbar.tsx` (the `align` doc comment)
- Modify: `packages/tokens/src/guidance.ts`, `packages/react/llms.txt`

**Interfaces:**
- Consumes: `Field labelPosition` (Task 3).

- [ ] **Step 1: Write the failing tests**

In `packages/react/scripts/emit-patterns.test.ts`, after `expect(tablePagination.preset).toContain("<Pagination");`:

```ts
    // D115: the page-size label sits beside its select, so the row is one line high.
    expect(tablePagination.preset).toMatch(/<Field\s+label="Rows per page"\s+labelPosition="start"\s*>/);
    const cursorPagination = output.patterns.find((p: { id: string }) => p.id === "cursor-pagination");
    expect(cursorPagination.preset).toMatch(/<Field\s+label="Rows per page"\s+labelPosition="start"\s*>/);
    expect(cursorPagination.preset).not.toMatch(/align="end"/);
```

The emitter writes props sorted alphabetically, one per line (`<Field\n    label="Rows per page"\n  >` today), so
`label` precedes `labelPosition` and `\s+` spans the line breaks.

In `apps/storybook/vr/filter-form.interaction.spec.ts`, replace the body of the cursor-pagination test with:

```ts
  await page.goto(story("patterns-presets--cursor-pagination"), { waitUntil: "networkidle" });
  const select = await box(page, "#storybook-root select");
  const pager = await box(page, "#storybook-root nav button");
  const label = await box(page, "#storybook-root label");
  // D115: one line — the label beside the select, both centred on the pager.
  expect(pager.top).toBeCloseTo(select.top, 0);
  expect(pager.bottom).toBeCloseTo(select.bottom, 0);
  expect(label.top).toBeGreaterThanOrEqual(select.top);
  expect(label.bottom).toBeLessThanOrEqual(select.bottom);
```

and rename the test to `"the cursor-pagination preset's page size, its label and the pager share one line @interaction"`.

- [ ] **Step 2: Run the unit test to see it fail**

Run: `pnpm build && pnpm vitest run packages/react/scripts/emit-patterns.test.ts`
Expected: FAIL — the presets have no `labelPosition`.

- [ ] **Step 3: Change the presets**

In both pattern files, give the `Field` node `"props": { "labelPosition": "start" }`, beside its `"slots"`. In
`cursor-pagination.json`, change the Toolbar's props to `{ "gap": 12 }`. In both files' `intent`, keep the wording but
append: ` The page-size label sits beside its select (D115).`

- [ ] **Step 4: Update the docs**

1. `packages/react/src/Toolbar/Toolbar.tsx`, the `align` comment: after "`end` and `start` are for a row of Fields
   with visible labels beside an unlabelled button." insert: "A Field with `labelPosition=\"start\"` is as tall as
   its control, so it takes the default `center`; never put one in a `start` row, whose button offset assumes
   labels above (D115)."
2. `packages/tokens/src/guidance.ts`, after the "Field is for a control with a *visible* label." line, add:

```ts
    "Label beside its control: <Field labelPosition=\"start\"> for one field in a toolbar or pager (keep Toolbar align=\"center\"); <FieldStack labelPosition=\"start\"> for a form whose labels share one column, as wide as the longest label up to --psi-field-label-max-width, stacking below 480px of the form's width. A theme sets --psi-field-label-align: end to put labels against their controls (D115).",
```

3. `packages/react/llms.txt`: after the `- Form field:` paragraph, add:

```
- Label beside the control (D115): `<Field labelPosition="start">` puts the label in a column before the control and the message line under the control; the label still names the control and the order is still label, control, message. For one field in a toolbar or pager use it alone, in a Toolbar with the default `align="center"` (never `align="start"`, whose button offset assumes labels above). For a form use `<FieldStack labelPosition="start" gap={8|12|16|24}>`: its Fields share one label column as wide as the longest label, capped by `--psi-field-label-max-width` (240px, longer labels wrap), and return their labels above their controls when the stack is under 480px wide. A Field's own `labelPosition` wins, so a long Textarea can take `"top"` and span the form. A Field shares the columns only as a direct child (or rendered by a component that adds no element around it). FieldStack measures its own width, so it must fill its container — never put one in a Toolbar. `--psi-field-label-align: end` (a theme override) puts each label against its control. Group mode (RadioGroup, a set of checkboxes) takes the side label too.
```

- [ ] **Step 5: Build and run the tests**

```bash
pnpm build
pnpm vitest run packages/react/scripts/emit-patterns.test.ts packages/tokens/__tests__/guidance.test.ts
pnpm test:e2e --grep "cursor-pagination"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/react/patterns packages/react/scripts/emit-patterns.test.ts apps/storybook/vr/filter-form.interaction.spec.ts packages/react/src/Toolbar/Toolbar.tsx packages/tokens/src/guidance.ts packages/react/llms.txt packages/react/docs
git commit -m "feat: the pagination presets put the page-size label beside its select (D115)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Stories and the layout measured in Chromium

**Files:**
- Modify: `packages/react/src/Field/Field.stories.tsx`
- Create: `packages/react/src/FieldStack/FieldStack.stories.tsx`
- Create: `apps/storybook/vr/field-label-position.interaction.spec.ts`

**Interfaces:**
- Consumes: everything above. Story ids: `components-field--label-start`, `components-fieldstack--side-labels`, `components-fieldstack--long-label`, `components-fieldstack--narrow`, `components-fieldstack--labels-at-the-end`, `components-fieldstack--right-to-left`, `components-fieldstack--labels-above`. Confirm the ids in `apps/storybook/storybook-static/index.json` after the build and fix the spec's ids if Storybook slugs them differently.

- [ ] **Step 1: Add the Field story**

Append to `packages/react/src/Field/Field.stories.tsx`:

```tsx
/** D115 — the label beside its control, at every control size. */
export const LabelStart: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      {([24, 32, 40, 48] as const).map((size) => (
        <div key={size} style={{ display: "flex", gap: 24 }}>
          <Field label={`Name ${size}`} labelPosition="start">
            <Input size={size} defaultValue="Ada" />
          </Field>
          <Field label={`Rows per page ${size}`} labelPosition="start">
            <Select size={size} defaultValue="50">
              <option value="10">10</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </Select>
          </Field>
        </div>
      ))}
    </div>
  ),
};
```

- [ ] **Step 2: Write the FieldStack stories**

`packages/react/src/FieldStack/FieldStack.stories.tsx`:

```tsx
import React from "react";
import type { Meta, StoryObj } from "storybook";
import { FieldStack } from "./FieldStack.js";
import { Field } from "../Field/Field.js";
import { Input } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import { Textarea } from "../Textarea/Textarea.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { RadioGroup } from "../RadioGroup/RadioGroup.js";
import { Radio } from "../RadioGroup/Radio.js";

const meta: Meta<typeof FieldStack> = {
  title: "Components/FieldStack",
  component: FieldStack,
};
export default meta;
type Story = StoryObj<typeof FieldStack>;

function Form({ labelPosition = "start" as const, longLabel = false }) {
  const [status, setStatus] = React.useState("active");
  return (
    <FieldStack labelPosition={labelPosition}>
      <Field label="Name" required>
        <Input size={32} defaultValue="Ada Lovelace" />
      </Field>
      <Field label={longLabel ? "Card group that decides the profile every new card is issued with" : "Card group"} description="The group decides the profile.">
        <Select size={32} defaultValue="retail">
          <option value="retail">Retail</option>
          <option value="corporate">Corporate</option>
        </Select>
      </Field>
      <Field group label="Status" error="Blocked cards cannot be reissued.">
        <RadioGroup value={status} onValueChange={setStatus}>
          <Radio value="active">Active</Radio>
          <Radio value="blocked">Blocked</Radio>
        </RadioGroup>
      </Field>
      <Field>
        <Checkbox defaultChecked>Notify the owner</Checkbox>
      </Field>
      <Field label="Notes" labelPosition="top">
        <Textarea defaultValue="Spans both columns, with its label above." />
      </Field>
    </FieldStack>
  );
}

/** D115 — a form whose labels share one column, as wide as the longest label. */
export const SideLabels: Story = { render: () => <div style={{ maxWidth: 640 }}><Form /></div> };

/** A label longer than --psi-field-label-max-width (240px) wraps. */
export const LongLabel: Story = { render: () => <div style={{ maxWidth: 640 }}><Form longLabel /></div> };

/** Under 480px of the stack's own width, every label returns above its control. */
export const Narrow: Story = { render: () => <div style={{ width: 400 }}><Form /></div> };

/** A theme's --psi-field-label-align: end puts each label against its control. */
export const LabelsAtTheEnd: Story = {
  render: () => (
    <div style={{ maxWidth: 640, ["--psi-field-label-align" as string]: "end" }}>
      <Form />
    </div>
  ),
};

/** The columns and the label's alignment are logical, so right-to-left mirrors them. */
export const RightToLeft: Story = { render: () => <div dir="rtl" style={{ maxWidth: 640 }}><Form /></div> };

/** labelPosition="top": a column of Fields with the gap, as Stack would lay them out. */
export const LabelsAbove: Story = { render: () => <div style={{ maxWidth: 420 }}><Form labelPosition="top" /></div> };
```


- [ ] **Step 3: Write the interaction spec**

`apps/storybook/vr/field-label-position.interaction.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** D115 — labels beside their controls. jsdom does no layout, so the shared
 * column, the cap, the stacking and the alignment are measured here, in
 * Chromium. WebKit and Firefox were measured once by the plan's spike. */

const story = (id: string) => `/iframe.html?id=${id}&globals=theme:light`;

interface Box { left: number; right: number; top: number; bottom: number; width: number; cy: number; }
const boxes = (page: Page, selector: string): Promise<Box[]> =>
  page.locator(selector).evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, cy: (r.top + r.bottom) / 2 };
    }),
  );

// Labels of every start Field in a stack: a <label>, a <legend>, or the group label <div> of the div-group variant.
const LABELS = "#storybook-root [data-in-stack][data-label-position=start] > :is(label, legend, div[id$='-label'])";

test("a single start field puts its label on its control's line at every size @interaction", async ({ page }) => {
  await page.goto(story("components-field--label-start"), { waitUntil: "networkidle" });
  const labels = await boxes(page, "#storybook-root [data-label-position=start] > label");
  const controls = await boxes(page, "#storybook-root [data-label-position=start] > :is(input, select)");
  expect(labels).toHaveLength(8);
  labels.forEach((label, i) => {
    expect(Math.abs(label.cy - controls[i].cy), `field ${i}`).toBeLessThanOrEqual(4);
    expect(label.right).toBeLessThan(controls[i].left);
  });
});

test("a start FieldStack lines its labels up in one column, and its controls in another @interaction", async ({ page }) => {
  await page.goto(story("components-fieldstack--side-labels"), { waitUntil: "networkidle" });
  const labels = await boxes(page, LABELS);
  const controls = await boxes(page, "#storybook-root [data-in-stack][data-label-position=start] > :is(input, select)");
  expect(labels.length).toBeGreaterThanOrEqual(3);
  for (const l of labels) expect(l.left).toBeCloseTo(labels[0].left, 0);
  for (const c of controls) expect(c.left).toBeCloseTo(controls[0].left, 0);
  expect(controls[0].left).toBeGreaterThan(Math.max(...labels.map((l) => l.right)));
  // The Notes field takes "top": its label sits above its textarea, at the stack's start edge.
  const notesLabel = (await boxes(page, "#storybook-root [data-in-stack]:not([data-label-position]) > label"))[0];
  const textarea = (await boxes(page, "#storybook-root textarea"))[0];
  expect(notesLabel.bottom).toBeLessThanOrEqual(textarea.top);
  expect(textarea.left).toBeCloseTo(labels[0].left, 0);
});

test("the label column stops at 240px and a longer label wraps @interaction", async ({ page }) => {
  await page.goto(story("components-fieldstack--long-label"), { waitUntil: "networkidle" });
  const labels = await boxes(page, LABELS);
  const widest = Math.max(...labels.map((l) => l.width));
  expect(widest).toBeLessThanOrEqual(240);
  expect(labels.some((l) => l.bottom - l.top > 20)).toBe(true);
});

test("under 480px every label returns above its control @interaction", async ({ page }) => {
  await page.goto(story("components-fieldstack--narrow"), { waitUntil: "networkidle" });
  const fields = page.locator("#storybook-root [data-in-stack][data-label-position=start]");
  const count = await fields.count();
  for (let i = 0; i < count; i++) {
    const parts = await fields.nth(i).evaluate((f) =>
      [...f.children].map((c) => { const r = c.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }),
    );
    for (let p = 1; p < parts.length; p++) expect(parts[p].top).toBeGreaterThanOrEqual(parts[p - 1].bottom);
  }
});

test("right-to-left puts the label column on the right @interaction", async ({ page }) => {
  await page.goto(story("components-fieldstack--right-to-left"), { waitUntil: "networkidle" });
  const labels = await boxes(page, LABELS);
  const controls = await boxes(page, "#storybook-root [data-in-stack][data-label-position=start] > :is(input, select)");
  for (const l of labels) expect(l.right).toBeCloseTo(labels[0].right, 0);
  expect(controls[0].right).toBeLessThan(Math.min(...labels.map((l) => l.left)));
});
```

- [ ] **Step 4: Build and run the interaction specs**

```bash
pnpm build
pnpm test:e2e --grep "start field|FieldStack|240px|480px|right-to-left|cursor-pagination"
```

Expected: PASS. A failure here is a real layout bug: fix the CSS, not the test, unless the selector misses an
element (then fix the selector and say why in the commit).

- [ ] **Step 5: Look at the stories**

Start Storybook from this worktree (`pnpm --dir apps/storybook dev -- --port 6106`, so it cannot collide with
another session's 6006) and open each new story in light and ember. Check by eye: labels on their controls' lines,
the legend beside the first radio, the error line under the radio group in column 2, the checkbox in column 2, the
end-aligned labels flush against the controls, and RTL mirrored. Stop the server afterwards.

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/Field/Field.stories.tsx packages/react/src/FieldStack/FieldStack.stories.tsx apps/storybook/vr/field-label-position.interaction.spec.ts
git commit -m "test: stories and layout checks for labels beside their controls (D115)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Changeset, gates and the PR

**Files:**
- Create: `.changeset/field-label-position.md`
- Modify: `docs/superpowers/specs/2026-11-13-field-label-position-design.md` (status line)

- [ ] **Step 1: Write the changeset**

`.changeset/field-label-position.md`:

```markdown
---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

Labels beside their controls: `Field labelPosition` and `FieldStack` (D115).

- **`<Field labelPosition="start">`** puts the label before the control, with the message line under the control. The label still names the control, and the order is still label, control, message. The default, `"top"`, is unchanged.
- **`<FieldStack labelPosition="start" gap={8|12|16|24}>`** is a form whose Fields share one label column, as wide as the longest label up to `--psi-field-label-max-width` (240px). Under 480px of its own width, its labels return above their controls. A Field's own `labelPosition` wins.
- **New tokens:** `--psi-field-label-align` (`start`; a theme sets `end`), `--psi-field-label-max-width` and `--psi-field-column-gap`.
- **The `table-pagination` and `cursor-pagination` presets** put *Rows per page* beside its select, so the pager is one line high.
```

- [ ] **Step 2: Mark the spec implemented**

Change the spec's status line to `Status: **Implemented** on branch `d115-field-label-position`.`

- [ ] **Step 3: Run all five gates**

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site
pnpm test:e2e
```

Expected: every command passes. Record the counts each prints (drift: 53 components; test and e2e totals) for the
commit message.

- [ ] **Step 4: Re-check the decision number**

```bash
git fetch origin && git grep -n "D115" origin/main -- docs
```

Expected: no output. If another spec claims D115, take the next free number and rename it everywhere on this branch.

- [ ] **Step 5: Commit, push and open the PR with auto-merge**

```bash
git add .changeset/field-label-position.md docs/superpowers/specs/2026-11-13-field-label-position-design.md
git commit -m "chore: changeset for labels beside their controls (D115)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u origin d115-field-label-position
gh pr create --title "feat: labels beside their controls — labelPosition and FieldStack (D115)" --body-file - <<'EOF'
Spec: docs/superpowers/specs/2026-11-13-field-label-position-design.md (engine results at the end).
Plan: docs/superpowers/plans/2026-11-13-field-label-position.md.

- `Field labelPosition="start"`: the label before the control, the message under the control.
- `FieldStack`: a form whose labels share one column, capped at 240px, stacking under 480px.
- Three field tokens; the two pagination presets use the side label.

VR: new stories have no baselines yet, and the two presets move. The `vr` job will fail until CI's renders are committed.

Gates: <paste the five gates' results>.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
gh pr merge --auto --squash
gh pr view --json number,autoMergeRequest
```

Expected: `autoMergeRequest` is not null. If it is null, enable it with the `enablePullRequestAutoMerge` GraphQL
mutation (CLAUDE.md, *Branches and releases*) and read it back again.

- [ ] **Step 6: Commit CI's renders as the new baselines**

When the `vr` job fails on the new and moved stories, download the `vr-baselines` artifact, check every
`*-actual.png` by eye (the new FieldStack and Field stories, `patterns-presets--table-pagination` and
`--cursor-pagination`, light and ember), copy them over `apps/storybook/vr/stories.spec.ts-snapshots/` with the
`-actual` suffix dropped, and commit them as `test(vr): CI renders for D115's stories and the two presets`. Any
other story that moved is a regression: stop and investigate instead.
