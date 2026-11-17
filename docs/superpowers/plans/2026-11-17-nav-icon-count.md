# An icon and a count in the navigation tree (D124) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional decorative `icon` to `NavItem` and `NavGroup`, and a new public `Count` component (neutral or `attention`) that `NavItem` places at the end of an entry.

**Architecture:** Tokens first (`--psi-count-*`, two new `--psi-nav-tree-*` keys). Then `Count` as its own component folder. Then the slot loader learns per-part slot files (`src/<Dir>/<Name>.slots.json`), so `NavItem` and `NavGroup` can list their `icon` and `count` slots. Then `NavItem` and `NavGroup` render the icon, label and count inside the link or button, cloning a router child as D93 already does. Docs and counts last.

**Tech Stack:** TypeScript, React 19, CSS Modules, vitest + Testing Library (jsdom), axe-core, Storybook, Playwright (CI only), pnpm workspaces.

Spec: `docs/superpowers/specs/2026-11-17-nav-icon-count-design.md`. Read its `## Decisions` before any task.

## Global Constraints

- **Node 24.** Run `nvm use` (reads `.nvmrc`) in the shell before the first pnpm command. Check with `node -v`.
- Work in `/Users/dmytrokurkin/Projects/dku/ds/.claude/worktrees/d124-nav-icon-count-2421f1`, branch `d124-nav-icon-count`. Never `cd` to the main checkout. Never use bare `git stash`.
- **Never hardcode colours in component CSS.** Bind `var(--psi-*)`. A CSS Module may bind only its own component prefix (`--psi-count-*` in `count.module.css`, `--psi-nav-tree-*` in `nav-tree.module.css`) or a global scale (`--psi-space-*`, `--psi-text-*`, `--psi-radius-*`, `--psi-size-*`, `--psi-font-variant-numeric`, `--psi-duration-*`, `--psi-ease-*`, `--psi-focus-ring-*`). The stylelint plugin enforces this.
- A `--psi-space-*` token may be bound to `gap`, `padding*` and `margin*`, never to `width` or `height`.
- A component token key ending in `-bg` is a surface (`background`, `background-color`), and one ending in `-fg` is text. Use the `background` shorthand for a gradient layer over a `-bg` token, never `background-image`.
- New token values go in `packages/tokens/src`, never in `dist`.
- Sizes are px numbers. There are no S/M/L names.
- **Privacy.** No commit, comment, doc or PR may name the request register, its P-numbers, or any consumer project. Describe each problem in Psi's own terms.
- Commit messages end with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- Decision number: **D124** only.
- The five gates (Task 5 runs them all):
  ```sh
  pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && CI=1 pnpm test:site
  ```
  Never run `pnpm vr` locally. It passes only in CI.

---

### Task 1: Tokens — `--psi-count-*` and the tree's icon size and gap

**Files:**
- Create: `packages/tokens/src/components/count.ts`
- Modify: `packages/tokens/src/components/nav-tree.ts`
- Modify: `packages/tokens/src/components/registry.ts` (import plus a `count` entry, alphabetical with the others)
- Create: `packages/tokens/__tests__/count-tokens.test.ts`

**Interfaces:**
- Produces CSS custom properties in `components.css`:
  - `--psi-count-fg`
  - `--psi-count-attention-fg`
  - `--psi-count-attention-bg`
  - `--psi-count-attention-backdrop-bg`
  - `--psi-count-attention-padding-x`
  - `--psi-nav-tree-icon-size`
  - `--psi-nav-tree-icon-gap`
- Produces `countVars: Record<string, string>` exported from `count.ts`, and `componentVars.count`.

- [ ] **Step 1: Write the failing test** — `packages/tokens/__tests__/count-tokens.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { wcagContrast } from "culori";
import { componentVars } from "../src/components/registry.js";
import { checkOverrideScopes } from "../src/scope-gate.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { assembleCustomerTheme, customerThemes } from "../src/themes/customers/index.js";
import { compositeHex, wcagAAPairs } from "../src/contrast-matrix.js";

const themes = [
  ["light", resolve(lightTheme, defaultPalette, defaultSlots)],
  ["dark", resolve(darkTheme, defaultPalette, defaultSlots)],
  ...Object.entries(customerThemes).map(
    ([name, c]) => [name, resolve(assembleCustomerTheme(c), c.palette, c.slots)] as const,
  ),
] as const;

describe("count tokens (D124)", () => {
  it("declares the five count tokens with their defaults", () => {
    expect(componentVars.count).toEqual({
      fg: "var(--psi-fg-secondary)",
      "attention-fg": "var(--psi-fg-warning)",
      "attention-bg": "var(--psi-fill-tint-warning)",
      "attention-backdrop-bg": "var(--psi-bg-primary)",
      "attention-padding-x": "var(--psi-space-6)",
    });
  });

  it("the shipped defaults pass the scope gate", () => {
    const overrides = Object.fromEntries(
      Object.entries(componentVars.count).map(([k, v]) => [`count-${k}`, v]),
    );
    expect(checkOverrideScopes(overrides, componentVars, lightTheme)).toEqual([]);
  });

  it("the scope gate refuses a surface token on count-fg", () => {
    const violations = checkOverrideScopes({ "count-fg": "var(--psi-bg-primary)" }, componentVars, lightTheme);
    expect(violations).toHaveLength(1);
    expect(violations[0].token).toBe("bgPrimary");
  });

  it("the scope gate refuses a text token on count-attention-bg", () => {
    const violations = checkOverrideScopes({ "count-attention-bg": "var(--psi-fg-primary)" }, componentVars, lightTheme);
    expect(violations).toHaveLength(1);
    expect(violations[0].token).toBe("fgPrimary");
  });

  it("rides pairs the gate already holds: fgSecondary on the tree's surfaces, fgWarning on its tint", () => {
    for (const bg of ["bgPrimary", "fillNeutral3", "fillNeutral4"]) {
      expect(wcagAAPairs).toContainEqual({ fg: "fgSecondary", bg, minRatio: 4.5 });
    }
    expect(wcagAAPairs).toContainEqual({ fg: "fgWarning", bg: "fillTintWarning", minRatio: 4.5 });
  });

  // The attention pill paints fill-tint-warning over its own bg-primary
  // backdrop, so wherever it sits (the current entry's fillNeutral4 included)
  // its background is the composite the gate measures. A bare tint over
  // fillNeutral4 measured 4.43 in the light theme.
  it.each(themes)("the attention pill clears 4.5 over its backdrop in %s", (_name, r) => {
    const t = r.fillTintWarning;
    const pill = compositeHex(t.hex, t.oklch.alpha ?? 1, r.bgPrimary.hex);
    expect(wcagContrast(r.fgWarning.hex, pill)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("nav-tree icon tokens (D124)", () => {
  it("sizes the icon at half the entry's height and spaces it by space-8", () => {
    expect(componentVars["nav-tree"]["icon-size"]).toBe("calc(var(--psi-size-32) / 2)");
    expect(componentVars["nav-tree"]["icon-gap"]).toBe("var(--psi-space-8)");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @handamade/psi-tokens exec vitest run __tests__/count-tokens.test.ts`
Expected: FAIL. `componentVars.count` is `undefined`, and `icon-size` is `undefined`.

- [ ] **Step 3: Implement** — `packages/tokens/src/components/count.ts`:

```ts
/** Count component tokens (--psi-count-*) — D124. Pure indirection onto the
 * semantic layer.
 *
 * A neutral count is a bare number in fg-secondary, the quiet text colour
 * wcagAAPairs gates on bgPrimary and on fillNeutral1-6 (the tree's hover and
 * current surfaces). fg-tertiary is not used: no surface gates it.
 *
 * An attention count is a pill: fg-warning on fill-tint-warning, a pair
 * wcagAAPairs already holds. The tint is translucent and the gate composites
 * it onto bgPrimary, so the pill paints the tint over attention-backdrop-bg
 * (bgPrimary) and is that composite wherever it sits. A bare tint over the
 * current entry's fillNeutral4 measured 4.43 in the light theme.
 * count-tokens.test.ts measures the backdrop composite per theme. No new
 * pair, so the pinned pair count does not move. */
export const countVars: Record<string, string> = {
  fg: "var(--psi-fg-secondary)",
  "attention-fg": "var(--psi-fg-warning)",
  "attention-bg": "var(--psi-fill-tint-warning)",
  "attention-backdrop-bg": "var(--psi-bg-primary)",
  "attention-padding-x": "var(--psi-space-6)",
};
```

In `packages/tokens/src/components/nav-tree.ts`, add two keys at the end of `navTreeVars`, and add one sentence to the header comment: "`icon-size` and `icon-gap` (D124) are geometry, so they carry no gated pair."

```ts
  // D124: an icon before an entry's or a group's label. Half the entry's
  // height, as D97 sizes a button's icon, which is 16 like the group chevron.
  "icon-size": "calc(var(--psi-size-32) / 2)",
  "icon-gap": "var(--psi-space-8)",
```

In `registry.ts`, add `import { countVars } from "./count.js";` and the entry `count: countVars,` in the object's alphabetical order (after `control`).

- [ ] **Step 4: Run the test, then the whole tokens package**

Run: `pnpm --filter @handamade/psi-tokens exec vitest run __tests__/count-tokens.test.ts`
Expected: PASS.

Run: `pnpm --filter @handamade/psi-tokens build && pnpm --filter @handamade/psi-tokens test`
Expected: the build passes, which includes the contrast gate. If a test pins the number of component families or the full `components.css`, update the pin to include `count` and say so in the commit message. Do not change any pinned contrast-pair count: this task adds no pair.

Then check the emitted CSS: `grep -n "psi-count-\|psi-nav-tree-icon" packages/tokens/dist/components.css` lists all seven.

- [ ] **Step 5: Commit**

```bash
git add packages/tokens/src/components/count.ts packages/tokens/src/components/nav-tree.ts packages/tokens/src/components/registry.ts packages/tokens/__tests__/count-tokens.test.ts
git commit -m "feat(tokens): --psi-count-* and the nav tree's icon size and gap (D124)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
(Add any test file whose pin you updated.)

---

### Task 2: `Count` component

**Files:**
- Create: `packages/react/src/Count/Count.tsx`
- Create: `packages/react/src/Count/count.module.css`
- Create: `packages/react/src/Count/Count.test.tsx`
- Create: `packages/react/src/Count/Count.stories.tsx`
- Modify: `packages/react/src/index.ts` (export after `CopyButton`'s export lines)
- Modify: `packages/react/scripts/emit-manifest.ts` (`"Count"` appended to `COMPONENTS`, after `"CopyButton"`)
- Modify: `packages/react/src/a11y-meta.ts` (a `Count` entry after `CopyButton`)
- Modify: `packages/react/src/a11y.axe.test.tsx` (import `Count`; two cases)

**Interfaces:**
- Consumes: `--psi-count-*` (Task 1), the global `psi-sr-only` class (utilities.css).
- Produces:
  ```ts
  export interface CountProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
    value: number; max?: number; tone?: "neutral" | "attention"; label?: string;
    className?: string; ref?: Ref<HTMLSpanElement>;
  }
  export function Count(props: CountProps): JSX.Element;
  ```
  It renders one `<span>`, with `class` containing `count` and `neutral` or `attention` (CSS-module names). Exported from `@handamade/psi-react` as `Count` and `CountProps`.

- [ ] **Step 1: Write the failing test** — `packages/react/src/Count/Count.test.tsx`:

```tsx
import { createRef } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Count } from "./Count.js";

describe("Count (D124)", () => {
  it("renders the value as text", () => {
    render(<Count value={238} data-testid="c" />);
    expect(screen.getByTestId("c")).toHaveTextContent(/^238$/);
  });

  it("caps at 999 by default: 999 stays, 1000 shows 999+", () => {
    const { rerender } = render(<Count value={999} data-testid="c" />);
    expect(screen.getByTestId("c")).toHaveTextContent(/^999$/);
    rerender(<Count value={1000} data-testid="c" />);
    expect(screen.getByTestId("c")).toHaveTextContent(/^999\+$/);
  });

  it("takes a custom cap", () => {
    render(<Count value={100} max={99} data-testid="c" />);
    expect(screen.getByTestId("c")).toHaveTextContent(/^99\+$/);
  });

  it("is neutral by default, attention on request", () => {
    const { rerender } = render(<Count value={1} data-testid="c" />);
    expect(screen.getByTestId("c").className).toMatch(/neutral/);
    rerender(<Count value={1} tone="attention" data-testid="c" />);
    expect(screen.getByTestId("c").className).toMatch(/attention/);
    expect(screen.getByTestId("c").className).not.toMatch(/neutral/);
  });

  it("is never a live region: no role, no aria-live", () => {
    render(<Count value={3} tone="attention" data-testid="c" />);
    const el = screen.getByTestId("c");
    expect(el).not.toHaveAttribute("role");
    expect(el).not.toHaveAttribute("aria-live");
    expect(el.querySelector("[aria-live],[role]")).toBeNull();
  });

  it("with label: the number is aria-hidden and the label is screen-reader text", () => {
    render(<Count value={4} tone="attention" label="4 stuck" data-testid="c" />);
    const el = screen.getByTestId("c");
    const hidden = el.querySelector('[aria-hidden="true"]');
    expect(hidden).toHaveTextContent(/^4$/);
    const sr = el.querySelector(".psi-sr-only");
    expect(sr).toHaveTextContent(/^4 stuck$/);
  });

  it("without label renders no screen-reader span", () => {
    render(<Count value={4} data-testid="c" />);
    expect(screen.getByTestId("c").querySelector(".psi-sr-only")).toBeNull();
  });

  it("forwards ref and merges className onto the span", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Count value={1} className="mine" ref={ref} data-testid="c" />);
    const el = screen.getByTestId("c");
    expect(el).toBe(ref.current);
    expect(el.tagName).toBe("SPAN");
    expect(el).toHaveClass("mine");
    expect(el.className).toMatch(/count/);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/Count/Count.test.tsx`
Expected: FAIL. It cannot resolve `./Count.js`.

- [ ] **Step 3: Implement** — `packages/react/src/Count/Count.tsx`:

```tsx
import type { HTMLAttributes, Ref } from "react";
import styles from "./count.module.css";

export interface CountProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The number, a non-negative integer. */
  value: number;
  /** The largest number shown as it is. A larger `value` shows as `${max}+`,
   * such as *999+*. Digits are plain, not locale-formatted. */
  max?: number;
  /** `neutral` is a quiet bare number. `attention` is a filled pill in the
   * warning tint and medium weight, so it differs by shape and weight, never
   * by colour alone. Give an `attention` count a `label`: the tone is visual
   * only. */
  tone?: "neutral" | "attention";
  /** What a screen reader reads in place of the number, such as "4 stuck".
   * Start it with the number shown, so a speech user can still name what
   * they see. Without it, the visible text is the count's text. */
  label?: string;
  className?: string;
  /** Forwarded ref to the `<span>`. */
  ref?: Ref<HTMLSpanElement>;
}

/** A count (D124): a number shown after a label, such as *Cards 238*, in a
 * `NavItem`'s `count`, or inline in a `Tab` or a `TableCaption` after a
 * space. Tabular numerals, capped at `max` (*999+*). Its text joins the name
 * of the link or button it sits in. It is never a live region: no `role` and
 * no `aria-live`, so a changing count announces nothing on its own. */
export function Count({ value, max = 999, tone = "neutral", label, className, ref, ...rest }: CountProps) {
  const text = value > max ? `${max}+` : String(value);
  const cls = [styles.count, tone === "attention" ? styles.attention : styles.neutral, className]
    .filter(Boolean)
    .join(" ");
  return (
    <span ref={ref} className={cls} {...rest}>
      {label === undefined ? (
        text
      ) : (
        <>
          <span aria-hidden="true">{text}</span>
          <span className="psi-sr-only">{label}</span>
        </>
      )}
    </span>
  );
}
```

`packages/react/src/Count/count.module.css`. Note that `font` is a shorthand that resets `font-variant-numeric`, so the numerals rule must come after `font` in each tone:

```css
/* packages/react/src/Count/count.module.css — D124. Colours alias the
   semantic layer in packages/tokens/src/components/count.ts. */

.count {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.neutral {
  color: var(--psi-count-fg);
  font: var(--psi-text-12-16-regular);
  font-variant-numeric: var(--psi-font-variant-numeric);
}

/* A pill: shape and weight set it apart from a neutral count, so colour is
   never the only signal. The tint is translucent, so it is painted over a
   backdrop of its own (bg-primary). The pill is then always the composite
   the contrast gate measures, whatever surface the entry paints. */
.attention {
  padding-inline: var(--psi-count-attention-padding-x);
  border-radius: var(--psi-radius-full);
  background:
    linear-gradient(var(--psi-count-attention-bg), var(--psi-count-attention-bg)),
    var(--psi-count-attention-backdrop-bg);
  color: var(--psi-count-attention-fg);
  font: var(--psi-text-12-16-medium);
  font-variant-numeric: var(--psi-font-variant-numeric);
}
```

In `packages/react/src/index.ts`, after the `CopyButton` export lines:

```ts
export { Count } from "./Count/Count.js";
export type { CountProps } from "./Count/Count.js";
```

In `emit-manifest.ts`, add `"Count",` immediately after `"CopyButton",` in `COMPONENTS`.

In `a11y-meta.ts`, after the `CopyButton` entry:

```ts
  Count: {
    keyboard: [],
    notes:
      "A <span> with no role and no aria-live (D124): a count that changes announces nothing on its own; an app's own announcer speaks a change. Its visible text joins the name of the link or button it sits in (\"Cards 238\", \"Cards 999+\"). label replaces the number for a screen reader (the number becomes aria-hidden, the label psi-sr-only): start it with the number shown. The attention tone is a pill in medium weight, never colour alone, but the tone itself is visual, so an attention count should carry a label.",
  },
```

In `a11y.axe.test.tsx`, add `Count` to the import from `./index.js`, and add these cases to `cases`:

```tsx
  ["Count neutral and attention (D124)", <Text>Cards <Count value={238} /> stuck <Count value={4} tone="attention" label="4 stuck" /></Text>],
```

- [ ] **Step 4: Stories** — `packages/react/src/Count/Count.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "storybook";
import { Count } from "./Count.js";
import { Tabs, TabList, Tab, TabPanel } from "../Tabs/Tabs.js";
import { Table, TableCaption, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "../Table/Table.js";

const meta: Meta<typeof Count> = { title: "Components/Count", component: Count };
export default meta;
type Story = StoryObj<typeof Count>;

/** A quiet bare number: 12/16 regular, fg-secondary, tabular numerals. */
export const Neutral: Story = { args: { value: 238 } };

/** A pill in the warning tint and medium weight. It carries a label, because
 * the tone is visual only. */
export const Attention: Story = { args: { value: 4, tone: "attention", label: "4 stuck" } };

/** The cap: 998 and 999 show as they are, 1000 shows 999+, and max={99} caps 100 at 99+. */
export const Capped: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <Count value={998} />
      <Count value={999} />
      <Count value={1000} />
      <Count value={100} max={99} />
      <Count value={1000} tone="attention" label="1000 stuck" />
    </div>
  ),
};

/** label replaces the number for a screen reader; the screen shows the number. */
export const WithLabel: Story = { args: { value: 12, label: "12 unread" } };

/** Count is an ordinary inline child of a Tab or a TableCaption, after a space. */
export const InTabAndCaption: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24 }}>
      <Tabs value="inbox" onValueChange={() => {}}>
        <TabList aria-label="Mail">
          <Tab value="inbox">
            Inbox <Count value={12} />
          </Tab>
          <Tab value="stuck">
            Stuck <Count value={4} tone="attention" label="4 stuck" />
          </Tab>
        </TabList>
        <TabPanel value="inbox">Inbox</TabPanel>
        <TabPanel value="stuck">Stuck</TabPanel>
      </Tabs>
      <Table>
        <TableCaption>
          Cards <Count value={238} />
        </TableCaption>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>First card</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
};
```

Before writing `InTabAndCaption`, open `packages/react/src/Tabs/Tabs.tsx` and `packages/react/src/Table/Table.tsx` (or the files their exports live in) and use their real export paths and props: `Tabs` may name its value props differently, and `TableCaption` may live in its own file. Adjust the story to the real API without changing what it shows.

- [ ] **Step 5: Run the tests**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/Count src/a11y.axe.test.tsx`
Expected: PASS.

Run: `pnpm --filter @handamade/psi-react build`
Expected: the manifest reports one more component than before (56).

- [ ] **Step 6: Commit**

```bash
git add packages/react/src/Count packages/react/src/index.ts packages/react/scripts/emit-manifest.ts packages/react/src/a11y-meta.ts packages/react/src/a11y.axe.test.tsx
git commit -m "feat(react): Count, a neutral or attention count that is never a live region (D124)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Slot files for parts that share a folder

**Files:**
- Modify: `packages/react/scripts/slots.ts`
- Modify: `packages/react/scripts/emit-manifest.ts` (pass `COMPONENT_DIR` to `loadSlotContracts`)
- Create: `packages/react/src/NavTree/NavItem.slots.json`
- Create: `packages/react/src/NavTree/NavGroup.slots.json`
- Test: `packages/react/scripts/slots.test.ts`

**Interfaces:**
- Consumes: `Count` in `COMPONENTS` (Task 2).
- Produces:
  ```ts
  loadSlotContracts(srcDir: string, componentNames: string[], componentDir?: Record<string, string>): Record<string, SlotContract[]>
  ```
  For a name whose `componentDir[name]` is set and differs from the name, it reads `src/<dir>/<name>.slots.json`. Otherwise it reads `src/<name>/slots.json`. The manifest's `NavItem.slots` names are `["icon", "body", "count"]`, and `NavGroup.slots` names are `["label", "icon", "body"]`.

- [ ] **Step 1: Write the failing tests** — add to `slots.test.ts`, inside `describe("loadSlotContracts", …)`:

```ts
  it("reads <Dir>/<Name>.slots.json for a part that shares its owner's folder (D124)", () => {
    const dir = fixture({
      "A/slots.json": { slots: [{ name: "body", accepts: { components: ["B"] }, cardinality: "1..*" }] },
      "A/B.slots.json": { slots: [{ name: "icon", accepts: {}, cardinality: "0..1" }] },
    });
    const out = loadSlotContracts(dir, ["A", "B"], { B: "A" });
    expect(out.A.map((s) => s.name)).toEqual(["body"]);
    expect(out.B.map((s) => s.name)).toEqual(["icon"]);
  });

  it("a part without its own file gets [] (D124)", () => {
    const dir = fixture({ "A/slots.json": { slots: [] } });
    expect(loadSlotContracts(dir, ["A", "B"], { B: "A" }).B).toEqual([]);
  });

  it("validates a part file like any other, naming the file (D124)", () => {
    const dir = fixture({
      "A/B.slots.json": { slots: [{ name: "x", accepts: { components: ["Ghost"] }, cardinality: "0..1" }] },
    });
    expect(() => loadSlotContracts(dir, ["A", "B"], { B: "A" })).toThrow(/A\/B\.slots\.json: slot "x" accepts unknown component "Ghost"/);
  });

  it("real src: NavItem and NavGroup carry their D124 slots; NavTree keeps its body", () => {
    const src = join(fileURLToPath(new NodeURL("..", import.meta.url)), "src");
    const out = loadSlotContracts(src, ["NavTree", "NavGroup", "NavItem", "Count"], { NavGroup: "NavTree", NavItem: "NavTree" });
    expect(out.NavTree.map((s) => s.name)).toEqual(["body"]);
    expect(out.NavItem.map((s) => s.name)).toEqual(["icon", "body", "count"]);
    expect(out.NavItem.find((s) => s.name === "count")).toMatchObject({ accepts: { components: ["Count"] }, cardinality: "0..1" });
    // body is 0..* because a preset fills an entry through `content`, and the
    // pattern check counts an unfilled slot as 0.
    expect(out.NavItem.find((s) => s.name === "body")?.cardinality).toBe("0..*");
    expect(out.NavGroup.map((s) => s.name)).toEqual(["label", "icon", "body"]);
    expect(out.Count).toEqual([]);
  });
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm --filter @handamade/psi-react exec vitest run scripts/slots.test.ts`
Expected: FAIL. `out.B` is `[]` where `["icon"]` is expected, and the NavItem names don't match.

- [ ] **Step 3: Implement** — in `slots.ts`, change the signature and the per-component loop:

```ts
/** Loads contracts.json + every component's slot file under srcDir and
 * validates the whole graph: any reference to an unknown component or
 * contract throws — the build is the conformance gate (D45/D48 posture).
 * A component owns `src/<Name>/slots.json`. A part that lives in another
 * component's folder (componentDir, e.g. NavItem → NavTree) owns
 * `src/<Dir>/<Name>.slots.json` (D124). */
export function loadSlotContracts(
  srcDir: string,
  componentNames: string[],
  componentDir: Record<string, string> = {},
): Record<string, SlotContract[]> {
```

and inside the loop, replace the path and message construction:

```ts
  for (const name of componentNames) {
    const dir = componentDir[name] ?? name;
    const rel = dir === name ? `${name}/slots.json` : `${dir}/${name}.slots.json`;
    const slotsPath = join(srcDir, rel);
    if (!existsSync(slotsPath)) {
      out[name] = []; // absence is explicit, not unknown (D45)
      continue;
    }
    const { slots } = JSON.parse(readFileSync(slotsPath, "utf8")) as { slots: SlotContract[] };
    for (const slot of slots) {
      for (const comp of slot.accepts.components ?? []) {
        if (!componentNames.includes(comp)) {
          throw new Error(`${rel}: slot "${slot.name}" accepts unknown component "${comp}"`);
        }
      }
      for (const contract of slot.accepts.contracts ?? []) {
        if (!(contract in contracts)) {
          throw new Error(`${rel}: slot "${slot.name}" accepts unknown contract "${contract}"`);
        }
      }
    }
    out[name] = slots;
  }
```

(The existing messages already read `${name}/slots.json: …` for an owner, and `rel` keeps that text, so the existing tests still match.)

In `emit-manifest.ts`, change the call to:

```ts
const slotsByComponent = loadSlotContracts(join(root, "src"), COMPONENTS, COMPONENT_DIR);
```

Create `packages/react/src/NavTree/NavItem.slots.json`:

```json
{
  "slots": [
    { "name": "icon", "accepts": {}, "cardinality": "0..1", "order": 1 },
    { "name": "body", "accepts": {}, "cardinality": "0..*", "order": 2 },
    { "name": "count", "accepts": { "components": ["Count"] }, "cardinality": "0..1", "order": 3 }
  ]
}
```

Create `packages/react/src/NavTree/NavGroup.slots.json`:

```json
{
  "slots": [
    { "name": "label", "accepts": {}, "cardinality": "0..1", "order": 1 },
    { "name": "icon", "accepts": {}, "cardinality": "0..1", "order": 2 },
    { "name": "body", "accepts": { "components": ["NavItem"] }, "cardinality": "1..*", "order": 3 }
  ]
}
```

- [ ] **Step 4: Run the tests, then the build** (the build validates the `app-shell` pattern against the new slots)

Run: `pnpm --filter @handamade/psi-react exec vitest run scripts`
Expected: PASS.

Run: `pnpm --filter @handamade/psi-react build`
Expected: PASS. `node -e 'const m=require("./packages/react/dist/manifest.json");for(const n of ["NavItem","NavGroup"])console.log(n,m.components.find(c=>c.name===n).slots.map(s=>s.name))'` prints `NavItem [ 'icon', 'body', 'count' ]` and `NavGroup [ 'label', 'icon', 'body' ]`.

If the pattern validator rejects `app-shell.json` because `NavGroup`'s `label` is passed as a prop while a `label` slot now exists, read `scripts/patterns.ts` around the prop and slot checks and report what it says before changing anything. The spec expects an unfilled `0..1` slot to pass.

- [ ] **Step 5: Commit**

```bash
git add packages/react/scripts/slots.ts packages/react/scripts/slots.test.ts packages/react/scripts/emit-manifest.ts packages/react/src/NavTree/NavItem.slots.json packages/react/src/NavTree/NavGroup.slots.json
git commit -m "feat(react): slot files for parts that share a folder; NavItem and NavGroup list theirs (D124)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `icon` on `NavItem` and `NavGroup`, `count` on `NavItem`

**Files:**
- Modify: `packages/react/src/NavTree/NavItem.tsx`
- Modify: `packages/react/src/NavTree/NavGroup.tsx`
- Modify: `packages/react/src/NavTree/nav-tree.module.css`
- Modify: `packages/react/src/NavTree/NavTree.test.tsx`
- Modify: `packages/react/src/NavTree/NavTree.stories.tsx`
- Modify: `packages/react/src/a11y-meta.ts` (the `NavGroup` and `NavItem` notes)
- Modify: `packages/react/src/a11y.axe.test.tsx` (one case)
- Modify: `apps/storybook/vr/nav-tree.interaction.spec.ts` (one test; it runs in CI only)

**Interfaces:**
- Consumes: `Count` (Task 2), and `--psi-nav-tree-icon-size` and `--psi-nav-tree-icon-gap` (Task 1).
- Produces: `NavItemProps.icon?: ReactNode`, `NavItemProps.count?: ReactNode`, `NavGroupProps.icon?: ReactNode`. It adds the CSS-module classes `icon`, `label` and `countSlot` in `nav-tree.module.css`. The stories `WithIcons` and `WithCounts` have the story ids `components-navtree--with-icons` and `components-navtree--with-counts`.

- [ ] **Step 1: Write the failing tests** — append to `NavTree.test.tsx`. Add `import { Count } from "../Count/Count.js";` and `import { IconSimCard } from "../icons/IconSimCard.js";` at the top, and `afterEach` to the vitest import.

```tsx
const css = readFileSync(join(__dirname, "nav-tree.module.css"), "utf8");

describe("NavItem icon and count (D124)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("with href: icon, label and count sit inside the link, in that order", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem href="#cards" icon={<IconSimCard />} count={<Count value={238} />}>
          Cards
        </NavItem>
      </NavTree>,
    );
    const link = screen.getByRole("link", { name: "Cards 238" });
    const parts = Array.from(link.children).map((el) => el.className);
    expect(parts[0]).toMatch(/icon/);
    expect(parts[1]).toMatch(/label/);
    expect(parts[2]).toMatch(/countSlot/);
    expect(link.children[0]).toHaveAttribute("aria-hidden", "true");
    expect(link.children[0].querySelector("svg")).not.toBeNull();
  });

  it("a count's label joins the link's name in place of the number", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem href="#cards" count={<Count value={4} tone="attention" label="4 stuck" />}>
          Cards
        </NavItem>
      </NavTree>,
    );
    expect(screen.getByRole("link", { name: "Cards 4 stuck" })).toBeInTheDocument();
  });

  it("an icon alone leaves the name as the label", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem href="#cards" icon={<IconSimCard />}>
          Cards
        </NavItem>
      </NavTree>,
    );
    expect(screen.getByRole("link", { name: "Cards" })).toBeInTheDocument();
  });

  it("with a router child: clones it, keeps its props and handlers, and fills it", async () => {
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    render(
      <NavTree aria-label="Main">
        <NavItem current icon={<IconSimCard />} count={<Count value={238} />}>
          <a href="#cards" className="router" onClick={onClick}>
            Cards
          </a>
        </NavItem>
      </NavTree>,
    );
    const link = screen.getByRole("link", { name: "Cards 238" });
    expect(link).toHaveClass("router");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link.children[0]).toHaveAttribute("aria-hidden", "true");
    await userEvent.click(link);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("without current, a decorated router child keeps its own aria-current", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem icon={<IconSimCard />}>
          <a href="#cards" aria-current="true">
            Cards
          </a>
        </NavItem>
      </NavTree>,
    );
    expect(screen.getByRole("link", { name: "Cards" })).toHaveAttribute("aria-current", "true");
  });

  it("with neither prop, the markup is what it was: no wrappers", () => {
    const { container } = render(
      <NavTree aria-label="Main">
        <NavItem href="#a">A</NavItem>
        <NavItem>
          <a href="#b">B</a>
        </NavItem>
      </NavTree>,
    );
    for (const link of container.querySelectorAll("a")) {
      expect(link.children).toHaveLength(0);
    }
  });

  it("a string child with an icon renders the string, no icon, and warns once in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <NavTree aria-label="Main">
        <NavItem icon={<IconSimCard />}>Cards</NavItem>
      </NavTree>,
    );
    expect(container.querySelector("li")).toHaveTextContent("Cards");
    expect(container.querySelector("svg")).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("does not warn when the props have somewhere to go", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <NavTree aria-label="Main">
        <NavItem href="#a" icon={<IconSimCard />}>
          A
        </NavItem>
      </NavTree>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("CSS: the icon is sized by the token and the count is pushed to the inline end", () => {
    expect(css).toMatch(/\.icon > svg\s*\{[^}]*inline-size:\s*var\(--psi-nav-tree-icon-size\)/);
    expect(css).toMatch(/\.icon > svg\s*\{[^}]*block-size:\s*var\(--psi-nav-tree-icon-size\)/);
    expect(css).toMatch(/\.countSlot\s*\{[^}]*margin-inline-start:\s*auto/);
    expect(css).toMatch(/\.label\s*\{[^}]*min-width:\s*0/);
  });
});

describe("NavGroup icon (D124)", () => {
  it("puts the icon in the button before the label, hidden; the name is the label", () => {
    render(
      <NavTree aria-label="Main">
        <NavGroup label="Reports" icon={<IconSimCard />} open={false} onOpenChange={() => {}}>
          <NavItem href="#s">Sales</NavItem>
        </NavGroup>
      </NavTree>,
    );
    const button = screen.getByRole("button", { name: "Reports" });
    const first = button.children[0];
    expect(first.className).toMatch(/icon/);
    expect(first).toHaveAttribute("aria-hidden", "true");
    expect(first.querySelector("svg")).not.toBeNull();
  });

  it("keeps the icon when the group is closed", () => {
    const { rerender } = render(
      <NavTree aria-label="Main">
        <NavGroup label="Reports" icon={<IconSimCard />} open onOpenChange={() => {}}>
          <NavItem href="#s">Sales</NavItem>
        </NavGroup>
      </NavTree>,
    );
    rerender(
      <NavTree aria-label="Main">
        <NavGroup label="Reports" icon={<IconSimCard />} open={false} onOpenChange={() => {}}>
          <NavItem href="#s">Sales</NavItem>
        </NavGroup>
      </NavTree>,
    );
    expect(screen.getByRole("button", { name: "Reports" }).children[0].className).toMatch(/icon/);
  });

  it("CSS: the chevron keeps the inline end when an icon joins the row", () => {
    expect(css).toMatch(/\.chevron\s*\{[^}]*margin-inline-start:\s*auto/);
  });
});
```

If `NavTree.test.tsx` already declares a `css` constant or reads the CSS file another way (the D96 tests do), reuse that and don't declare a second one. Check how it resolves the path (`__dirname` or `import.meta.url`) and follow the same form.

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/NavTree`
Expected: FAIL. No link is named "Cards 238", and the classes don't exist.

- [ ] **Step 3: Implement `NavItem`** — replace the body of `NavItem.tsx` from the imports through the function. Keep the existing JSDoc on `href` and `current`, and extend the component's JSDoc with the D124 sentence shown.

```tsx
import { cloneElement, Fragment, isValidElement, useEffect } from "react";
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import styles from "./nav-tree.module.css";

export interface NavItemProps extends Omit<HTMLAttributes<HTMLLIElement>, "children"> {
  /** (existing doc, unchanged) */
  children: ReactNode;
  /** (existing doc, unchanged) */
  href?: string;
  /** (existing doc, unchanged) */
  current?: boolean;
  /** An icon before the text (D124), such as `<IconSettings />`, passed
   * without a size: the entry sizes it (`--psi-nav-tree-icon-size`) and
   * colours it with the text. Always decorative: it is wrapped in
   * `aria-hidden`, and the text is the name. Needs `href`, or one link
   * element as the child. */
  icon?: ReactNode;
  /** A `<Count>` after the text (D124), at the row's inline end. Its text
   * joins the link's name ("Cards 238"). Needs `href`, or one link element as
   * the child. */
  count?: ReactNode;
  className?: string;
  /** Forwarded ref to the `<li>`. */
  ref?: Ref<HTMLLIElement>;
}

const present = (node: ReactNode) => node !== undefined && node !== null && node !== false;

/** Icon, label and count, in that order, as the content of the entry's link
 * (D124). The count's slot opens with a space, so the name reads "Cards 238"
 * in any accessibility tree, jsdom's included. */
function entryContent(label: ReactNode, icon: ReactNode, count: ReactNode) {
  return (
    <>
      {present(icon) ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{label}</span>
      {present(count) ? (
        <span className={styles.countSlot}>
          {" "}
          {count}
        </span>
      ) : null}
    </>
  );
}

/** (existing JSDoc, unchanged, plus:) `icon` and `count` (D124) go inside the
 * link: with `href` in the anchor `NavItem` renders, with a router link by
 * cloning it with icon, label and count as its content. Without either, the
 * markup is unchanged. */
export function NavItem({ children, href, current, icon, count, className, ref, ...rest }: NavItemProps) {
  const cls = [styles.item, className].filter(Boolean).join(" ");
  const decorated = present(icon) || present(count);
  // D93: only a single element (not a Fragment) can be cloned. It is cloned
  // for `current` (to add aria-current="page") and, D124, for an icon or a
  // count (to fill it). Otherwise nothing is cloned, so the child's own
  // aria-current survives.
  const child =
    href === undefined && isValidElement(children) && children.type !== Fragment
      ? (children as ReactElement<{ "aria-current"?: string; children?: ReactNode }>)
      : null;
  const dropped = decorated && href === undefined && child === null;

  useEffect(() => {
    if (!dropped || process.env.NODE_ENV === "production") return;
    console.warn("NavItem: icon and count need href, or one link element as the child; they were not rendered.");
  }, [dropped]);

  let content: ReactNode = children;
  if (href !== undefined) {
    content = (
      <a href={href} aria-current={current ? "page" : undefined}>
        {decorated ? entryContent(children, icon, count) : children}
      </a>
    );
  } else if (child && (current || decorated)) {
    const extra = current ? { "aria-current": "page" } : {};
    content = decorated
      ? cloneElement(child, extra, entryContent(child.props.children, icon, count))
      : cloneElement(child, extra);
  }

  return (
    <li ref={ref} className={cls} {...rest}>
      {content}
    </li>
  );
}
```

- [ ] **Step 4: Implement `NavGroup`** — add the prop and render the icon before the label:

```tsx
  /** An icon before the label (D124), passed without a size. Decorative
   * (`aria-hidden`), sized by `--psi-nav-tree-icon-size`, coloured with the
   * label. It stays when the group is closed: only the chevron turns. */
  icon?: ReactNode;
```

Add `icon` to the destructuring, and in the button:

```tsx
        {icon !== undefined && icon !== null && icon !== false ? (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className={styles.groupLabel}>{label}</span>
```

- [ ] **Step 5: CSS** — in `nav-tree.module.css`, add `margin-inline-start: auto;` to the existing `.chevron` rule, with this comment: `/* D124: with an icon in the row, keep the label beside it and the chevron at the end. With two items, space-between already put it there. */`. Then append:

```css
/* ── Icon and count (D124) ────────────────────────────────────── */

/* Decorative, coloured by currentColor so it follows the link's or the
   button's state: item-fg at rest and on hover, item-fg-current for the page
   and its parent (D96), group-fg in a group's button. The CSS size beats the
   width and height attributes an icon writes, as in a Button (D97). */
.icon {
  display: flex;
  flex: none;
}

.icon > svg {
  inline-size: var(--psi-nav-tree-icon-size);
  block-size: var(--psi-nav-tree-icon-size);
}

/* In an entry, the icon is followed by the label. The group's button has its
   own gap. */
.item .icon {
  margin-inline-end: var(--psi-nav-tree-icon-gap);
}

/* A long label wraps, and the count keeps the row's inline end. */
.label {
  flex: 1 1 auto;
  min-width: 0;
}

.countSlot {
  flex: none;
  margin-inline-start: auto;
  padding-inline-start: var(--psi-nav-tree-icon-gap);
}
```

- [ ] **Step 6: Run the tests**

Run: `pnpm --filter @handamade/psi-react exec vitest run src/NavTree`
Expected: PASS, the existing D88/D93/D96 tests included.

- [ ] **Step 7: Stories, a11y notes, axe, interaction spec**

In `NavTree.stories.tsx`, import `Count` from `"../Count/Count.js"` and `IconSimCard`, `IconUser`, `IconSettings` and `IconSearch` from `"../icons/Icon<Name>.js"`, then add:

```tsx
/** D124: an icon before each entry and group label. One group is closed, and
 * its icon stays. The page is current, and a parent is marked
 * aria-current="true". Icons take the text's colour. */
export const WithIcons: Story = {
  render: () => (
    <Frame>
      <NavTree aria-label="Main">
        <NavItem href="#search" icon={<IconSearch />}>
          Search
        </NavItem>
        <NavGroup label="Cards" icon={<IconSimCard />} open onOpenChange={() => {}}>
          <NavItem href="#active" current>
            Active
          </NavItem>
          <NavItem>
            <a href="#archived" aria-current="true">
              Archived
            </a>
          </NavItem>
        </NavGroup>
        <NavGroup label="Settings" icon={<IconSettings />} open={false} onOpenChange={() => {}}>
          <NavItem href="#profile" icon={<IconUser />}>
            Profile
          </NavItem>
        </NavGroup>
      </NavTree>
    </Frame>
  ),
};

/** D124: counts at the end of an entry. Neutral and attention, a capped one,
 * a long label that wraps, and the current entry with a count. */
export const WithCounts: Story = {
  render: () => (
    <Frame>
      <NavTree aria-label="Main">
        <NavItem href="#cards" icon={<IconSimCard />} count={<Count value={238} />} current>
          Cards
        </NavItem>
        <NavItem href="#stuck" icon={<IconSearch />} count={<Count value={4} tone="attention" label="4 stuck" />}>
          Stuck
        </NavItem>
        <NavItem href="#all" count={<Count value={1204} />}>
          All records
        </NavItem>
        <NavItem href="#long" icon={<IconUser />} count={<Count value={12} />}>
          Customers waiting for a reply from the support team
        </NavItem>
      </NavTree>
    </Frame>
  ),
};
```

In `a11y-meta.ts`, append to the `NavGroup` notes: `" An icon (D124) sits before the label in an aria-hidden span; the label stays the button's name, and the icon stays when the group is closed."` Append to the `NavItem` notes: `" icon and count (D124) go inside the link: icon (aria-hidden), label, count. The count's text joins the link's name (\"Cards 238\"), or its label does; it is not a live region. A router link is cloned to hold them; a child that is not one link element gets neither, with a development warning."`

In `a11y.axe.test.tsx`, add:

```tsx
  ["NavTree with icons and counts (D124)", <NavTree aria-label="Main"><NavItem href="#c" current icon={<IconSimCard />} count={<Count value={238} />}>Cards</NavItem><NavItem href="#s" count={<Count value={4} tone="attention" label="4 stuck" />}>Stuck</NavItem><NavGroup label="Settings" icon={<IconSimCard />} open={false} onOpenChange={() => {}}><NavItem href="#p">Profile</NavItem></NavGroup></NavTree>],
```

Import `IconSimCard` from `./icons/IconSimCard.js` if it isn't exported from `./index.js`. Check `index.ts` first and use whichever path exists.

In `apps/storybook/vr/nav-tree.interaction.spec.ts`, append (it runs in CI's `vr` job, not locally):

```ts
/** D124 — the browser joins the count to the link's name with a space, sizes
 * the icon by the token (16) and pushes the count to the inline end. */
test("an entry's icon is 16px and its count joins the name at the row's end @interaction", async ({ page }) => {
  await page.goto(story("components-navtree--with-counts"), { waitUntil: "networkidle" });
  const link = page.getByRole("link", { name: "Cards 238" });
  await expect(link).toBeVisible();
  const box = await link.evaluate((el) => {
    const svg = el.querySelector("svg")!.getBoundingClientRect();
    const count = el.lastElementChild!.getBoundingClientRect();
    const a = el.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(el).paddingInlineEnd);
    return { w: svg.width, h: svg.height, countEnd: count.right, linkEnd: a.right - pad };
  });
  expect(box.w).toBe(16);
  expect(box.h).toBe(16);
  expect(Math.abs(box.countEnd - box.linkEnd)).toBeLessThan(1);
  await expect(page.getByRole("link", { name: "Stuck 4 stuck" })).toBeVisible();
});
```

- [ ] **Step 8: Run the package tests and lint**

Run: `pnpm --filter @handamade/psi-react exec vitest run && pnpm lint`
Expected: PASS. If stylelint objects to a binding, fix the CSS so it follows the rule in Global Constraints. Don't disable the rule.

- [ ] **Step 9: Commit**

```bash
git add packages/react/src/NavTree packages/react/src/a11y-meta.ts packages/react/src/a11y.axe.test.tsx apps/storybook/vr/nav-tree.interaction.spec.ts
git commit -m "feat(react): an icon before a nav entry or group label, and a count after an entry (D124)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Docs, counts, site page, changeset, five gates

**Files:**
- Modify: `packages/react/llms.txt` (a `## Count` section after `## CopyButton` or wherever `CopyButton` sits, the `NavTree family` lines, and the component count line)
- Modify: `packages/tokens/src/guidance.ts` (one `rules` line)
- Modify: `README.md` (count, and `Count` added to the list after `CopyButton`), `packages/react/README.md`, `packages/mcp/README.md`
- Create: `apps/site/src/examples/count/basic.tsx`
- Modify: `apps/site/src/content/component-pages.ts` (a `count` entry, alphabetical, after `copy-button`)
- Modify: `CLAUDE.md` (the decision range: `D1–D120, D122` → `D1–D120, D122, D124`, unless `origin/main` holds more by then; state what `main` holds plus D124)
- Create: `.changeset/nav-icon-count.md`
- Generated (commit them if the build writes them into tracked files): `packages/react/docs/*.md`

- [ ] **Step 1: llms.txt** — in `packages/react/llms.txt`:
  - Change `55 React 19 components` to `56 React 19 components`.
  - Add a section:

```
## Count
- `<Count value={238} />` is a number after a label (D124): tabular numerals, 12/16 regular in fg-secondary, capped at `max` (default 999, so 1000 shows `999+`). It is a `<span>` with no role and no aria-live: a changing count announces nothing on its own.
- `tone="attention"` is a pill in the warning tint and medium weight (never colour alone). The tone is visual, so give it a `label`: `<Count value={4} tone="attention" label="4 stuck" />`. `label` replaces the number for a screen reader. Start it with the number shown.
- Its text joins the name of the link or button it sits in ("Cards 238"). Put it in `NavItem`'s `count`, or inline in a `Tab` or `TableCaption` after a space.
```

  - In `## NavTree family (3)`, append to the `<NavItem>` line: `` `icon={<IconSettings />}` puts a decorative icon before the text (aria-hidden, 16px from --psi-nav-tree-icon-size, the text's colour in every state), and `count={<Count value={238} />}` puts a count at the row's end, inside the link: the link's name becomes "Cards 238". Both need `href`, or your router link as the only child, which `NavItem` clones to hold them (D124). `` Append to the `<NavGroup>` mention (or add a line if there is none): `` `<NavGroup icon={…}>` puts the icon before the label; it stays when the group is closed. ``

- [ ] **Step 2: guidance.ts** — append to `rules`:

```ts
    "A count after a label is Count (D124): neutral by default; tone=\"attention\" is a pill and should carry a label (\"4 stuck\"), since the tone is visual. A Count is never a live region. In a NavTree, pass it as NavItem's count, and an icon as icon on NavItem or NavGroup; both are decorative and sized by the tree.",
```

If `guidance.test.ts` pins the number of rules, update the pin.

- [ ] **Step 3: READMEs** — change `55 React 19 components` to `56` in `README.md`, `packages/react/README.md` and `packages/mcp/README.md`. In `README.md`, add `Count` to the parenthesised list after `CopyButton`.

- [ ] **Step 4: Site page** — `apps/site/src/examples/count/basic.tsx`:

```tsx
import { Count, NavItem, NavTree } from "@handamade/psi-react";

/** A neutral count, and an attention count with a label, at the end of navigation entries. */
export default function CountBasic() {
  return (
    <div style={{ inlineSize: "16rem" }}>
      <NavTree aria-label="Example">
        <NavItem href="#cards" count={<Count value={238} />}>
          Cards
        </NavItem>
        <NavItem href="#stuck" count={<Count value={4} tone="attention" label="4 stuck" />}>
          Stuck
        </NavItem>
        <NavItem href="#all" count={<Count value={1204} />}>
          All records
        </NavItem>
      </NavTree>
    </div>
  );
}
```

In `component-pages.ts`, add `{ slug: "count", title: "Count", members: ["Count"] },` after the `copy-button` line.

- [ ] **Step 5: Changeset** — `.changeset/nav-icon-count.md`:

```md
---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

An icon and a count in the navigation tree, and a new `Count` component (D124).

- **`Count`**: a number after a label, such as *Cards 238*. Tabular numerals, quiet by default, capped at `max` (*999+*). `tone="attention"` is a pill in the warning tint and medium weight, so colour is never the only signal. `label` gives a screen reader words in place of the number (*4 stuck*). It is never a live region.
- **`NavItem` `icon` and `count`**, and **`NavGroup` `icon`**: a decorative icon before the text, sized by `--psi-nav-tree-icon-size` and coloured with the text in every state, and a count at the end of the row. Both go inside the link: with a router link, `NavItem` clones it to hold them. Without them, nothing changes.
- **Tokens**: `--psi-count-*`, `--psi-nav-tree-icon-size`, `--psi-nav-tree-icon-gap`.
- **Manifest**: `NavItem` and `NavGroup` list their slots (`icon`, `count`, `label`, `body`).
```

Check `.changeset/config.json`. If the release in lockstep requires `@handamade/psi-mcp` to be listed (look at a recent changeset on `origin/main`), list it the same way.

- [ ] **Step 6: Merge `origin/main`, then run the five gates**

```bash
git fetch origin && git merge origin/main
```

Resolve any conflict in shared counts by taking the higher count plus this branch's one component. D123 and D125 add none.

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && CI=1 pnpm test:site
```

Expected: every gate passes. If `check-docs-drift` names a file, fix the number in that file and run the gates again from the start. If `test:site` names a page or a count, fix it in `apps/site`.

- [ ] **Step 7: Commit**

```bash
git add -A packages/react/llms.txt packages/tokens/src/guidance.ts README.md packages/react/README.md packages/mcp/README.md apps/site CLAUDE.md .changeset/nav-icon-count.md packages/react/docs
git commit -m "docs: Count and the nav tree's icon and count in llms.txt, guidance and the site; 56 components; changeset (D124)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Add any test file whose pin you updated. Run `git status` first and add only files this task changed.)
