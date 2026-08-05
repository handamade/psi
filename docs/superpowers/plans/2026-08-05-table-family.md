# Table Family + Pagination Implementation Plan (D62–D63)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `Table` (a compound family of six) and `Pagination`, unblocking the `data-table` and `table-pagination` patterns, and prove both against a real transactions screen in a new `apps/ledger`.

**Architecture:** Table renders native `<table>` semantics and holds no state — sort and selection are controlled props, per D50/D53. Tokens alias the existing surface and control-ramp families rather than inventing values. Pagination is standalone, not a family member, because `table-pagination` composes it as a Toolbar sibling.

**Tech Stack:** React 19 (ref-as-prop, no `forwardRef`), TypeScript, CSS Modules, Vitest + Testing Library + `axe-core`, Vite for the app, Changesets for release.

## Global Constraints

- **Node 24** (`.nvmrc`). Run `node -v` before the first pnpm command; `nvm use` if it reports 20.
- **Sizes are px numbers**, never S/M/L. Table uses `32 | 40 | 48`.
- **Never hardcode colors in component CSS** — bind `var(--psi-*)`. The custom stylelint plugin enforces this.
- **`table.module.css` may bind only `--psi-table-*`** (own-component) plus scale prefixes. Binding `--psi-control-*` or `--psi-surface-*` from a CSS Module is a lint error (`psi/component-tokens-only`) — aliasing happens in `packages/tokens/src/components/table.ts`.
- **New values go in `packages/tokens/src`**, never in `dist` (dist is generated).
- **Verified token names** (checked against `packages/tokens/dist/*.css`). These exist: `--psi-fill-neutral3`, `--psi-fill-tint-accent`, `--psi-border-faint`, `--psi-surface-{bg,border,radius}`, `--psi-control-{24,32,40,48}-{height,gap,font,padding-inline,padding-inline-icon}`. **These do NOT exist and must never be written**: `--psi-fill-accent2`, `--psi-control-{n}-padding-inline-text`, `--psi-fg-muted`.
- **Four gates, not three:**
  ```bash
  pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint
  ```
- **`pnpm vr` only passes in CI.** Never run it locally — its default update mode silently writes junk `-darwin` baselines.

---

### Task 1: Tabular-numeral token + `.psi-tabular` utility

**Files:**
- Modify: `packages/tokens/scripts/emit-utilities.ts`
- Test: `packages/tokens/__tests__/emit-css.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `--psi-font-variant-numeric: tabular-nums` in `base.css`, and `.psi-tabular` in `utilities.css`. Task 4 binds the custom property; nothing imports a symbol.

- [ ] **Step 1: Write the failing test**

Append to `packages/tokens/__tests__/emit-css.test.ts`:

```ts
describe("tabular numerals (D62)", () => {
  it("emits the numeric-variant scale token", () => {
    expect(emitScaleVarsCSS()).toContain("--psi-font-variant-numeric: tabular-nums;");
  });

  it("emits a .psi-tabular utility bound to the token", () => {
    expect(emitUtilitiesCSS()).toContain(
      ".psi-tabular { font-variant-numeric: var(--psi-font-variant-numeric); }",
    );
  });
});
```

Ensure the file's imports include both emitters:

```ts
import { emitScaleVarsCSS, emitUtilitiesCSS } from "../scripts/emit-utilities.js";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @handamade/psi-tokens test -- emit-css`
Expected: FAIL — both assertions report the substring is absent.

- [ ] **Step 3: Write minimal implementation**

In `packages/tokens/scripts/emit-utilities.ts`, immediately after the `--psi-font-display` line (~line 80):

```ts
  // Numeral rendering (D62). A token rather than a literal in table.module.css:
  // a literal would be invisible to the manifest, MCP, DTCG and Figma, and
  // unreachable by componentOverrides — the D54/D55 failure mode.
  lines.push(`    --psi-font-variant-numeric: tabular-nums;`);
```

In the utilities emitter, after the `.psi-text-*` loop (~line 131):

```ts
  lines.push(`  .psi-tabular { font-variant-numeric: var(--psi-font-variant-numeric); }`);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @handamade/psi-tokens test -- emit-css`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/tokens/scripts/emit-utilities.ts packages/tokens/__tests__/emit-css.test.ts
git commit -m "feat(tokens): tabular-numeral token and .psi-tabular utility (D62)"
```

---

### Task 2: `--psi-table-*` token family + the new contrast pair

**Files:**
- Create: `packages/tokens/src/components/table.ts`
- Create: `packages/tokens/__tests__/table-tokens.test.ts`
- Modify: `packages/tokens/scripts/build.ts` (import + `componentVars` registry)
- Modify: `packages/tokens/src/contrast-matrix.ts` (`wcagAAPairs`)

**Interfaces:**
- Consumes: nothing.
- Produces: `export const tableVars: Record<string, string>`, registered as `table` in the build's `componentVars`. Emits `--psi-table-*`. Task 7 binds these names in CSS.

- [ ] **Step 1: Write the failing test**

Create `packages/tokens/__tests__/table-tokens.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { tableVars } from "../src/components/table.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";

describe("table tokens", () => {
  it("declares the D62 tokens bound to gated semantics", () => {
    expect(tableVars).toEqual({
      bg: "var(--psi-surface-bg)",
      border: "var(--psi-surface-border)",
      radius: "var(--psi-surface-radius)",
      fg: "var(--psi-fg-primary)",
      "header-fg": "var(--psi-fg-secondary)",
      "cell-border": "var(--psi-border-faint)",
      "row-bg": "transparent",
      "row-bg-hover": "var(--psi-fill-neutral3)",
      "row-bg-selected": "var(--psi-fill-tint-accent)",
      "sort-indicator-fg": "var(--psi-fg-accent)",
      "32-row-height": "var(--psi-control-32-height)",
      "40-row-height": "var(--psi-control-40-height)",
      "48-row-height": "var(--psi-control-48-height)",
      "32-cell-padding-x": "var(--psi-control-32-padding-inline)",
      "40-cell-padding-x": "var(--psi-control-40-padding-inline)",
      "48-cell-padding-x": "var(--psi-control-48-padding-inline)",
    });
  });

  it("emits --psi-table-* custom properties", () => {
    const css = emitComponentVarsCSS("table", tableVars);
    expect(css).toContain("--psi-table-bg: var(--psi-surface-bg)");
    expect(css).toContain("--psi-table-row-bg-selected: var(--psi-fill-tint-accent)");
    expect(css).toContain("--psi-table-40-row-height: var(--psi-control-40-height)");
    expect(css).toContain("--psi-table-40-cell-padding-x: var(--psi-control-40-padding-inline)");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @handamade/psi-tokens test -- table-tokens`
Expected: FAIL — `Cannot find module '../src/components/table.js'`

- [ ] **Step 3: Write minimal implementation**

Create `packages/tokens/src/components/table.ts`:

```ts
/** Table component tokens (--psi-table-*) — D62. Pure indirection, same
 * posture as menu.ts (D53) and panel.ts: the container aliases the shared
 * surface family, row states reuse Menu's item recipe, and per-size geometry
 * aliases the D54/D55 control ramp so a 32px row and a 32px Button are the
 * same 32px from one source. A brand retuning --psi-surface-* or the control
 * ramp gets Table for free.
 *
 * row-bg-selected is --psi-fill-tint-accent, the same wash Button and Tag use
 * for accent-subtle. Note --psi-fill-accent2 does NOT exist; do not write it.
 * Geometry keys carry no bg/fg/border segment, so keyGroup() returns undefined
 * and they stay out of scope-map.json and both D46 gates. */
export const tableVars: Record<string, string> = {
  bg: "var(--psi-surface-bg)",
  border: "var(--psi-surface-border)",
  radius: "var(--psi-surface-radius)",
  fg: "var(--psi-fg-primary)",
  "header-fg": "var(--psi-fg-secondary)",
  "cell-border": "var(--psi-border-faint)",
  "row-bg": "transparent",
  "row-bg-hover": "var(--psi-fill-neutral3)",
  "row-bg-selected": "var(--psi-fill-tint-accent)",
  "sort-indicator-fg": "var(--psi-fg-accent)",
  "32-row-height": "var(--psi-control-32-height)",
  "40-row-height": "var(--psi-control-40-height)",
  "48-row-height": "var(--psi-control-48-height)",
  "32-cell-padding-x": "var(--psi-control-32-padding-inline)",
  "40-cell-padding-x": "var(--psi-control-40-padding-inline)",
  "48-cell-padding-x": "var(--psi-control-48-padding-inline)",
};
```

In `packages/tokens/scripts/build.ts`, add the import beside the other component imports (~line 40):

```ts
import { tableVars } from "../src/components/table.js";
```

and register it in `componentVars`, keeping alphabetical order (after `switch`, before `tag`):

```ts
  table: tableVars,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @handamade/psi-tokens test -- table-tokens`
Expected: PASS

- [ ] **Step 5: Add the new contrast pair**

`contrast-matrix.ts` already checks `fgAccent` on `fillTintAccent`, but a selected row renders the row's ordinary **primary** text over that wash and no pair covers it. In `packages/tokens/src/contrast-matrix.ts`, append to `wcagAAPairs` after the existing tint block:

```ts
  // Primary text on a selected table row's accent wash (D62). Distinct from
  // the fgAccent/fillTintAccent pair above: a selected row keeps ordinary
  // body text, it does not recolor it to the accent.
  { fg: "fgPrimary", bg: "fillTintAccent", minRatio: 4.5 },
```

- [ ] **Step 6: Run the token build — this is the WCAG gate**

Run: `pnpm --filter @handamade/psi-tokens build`
Expected: PASS, printing the theme builds without throwing.

If it **throws** on the new pair, that is the gate working. Do not weaken `minRatio` and do not delete the pair. Raise the tint's alpha in `packages/tokens/src` (the `oklch(from var(--psi-fg-accent) l c h / …)` definition) or pick a different semantic, then re-run. Record what you changed in the commit body.

- [ ] **Step 7: Run the full token suite**

Run: `pnpm --filter @handamade/psi-tokens test`
Expected: PASS — including the D46 scope-gate tests, which the new family must satisfy.

- [ ] **Step 8: Commit**

```bash
git add packages/tokens/src/components/table.ts packages/tokens/__tests__/table-tokens.test.ts packages/tokens/scripts/build.ts packages/tokens/src/contrast-matrix.ts
git commit -m "feat(tokens): --psi-table-* family and the fgPrimary-on-tint contrast pair (D62)"
```

---

### Task 3: `Checkbox` promotes `aria-label` (applying D60)

**Files:**
- Modify: `packages/react/src/Checkbox/Checkbox.tsx:4-10`
- Test: `packages/react/src/Checkbox/Checkbox.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `CheckboxProps["aria-label"]?: string`, visible in `manifest.json`. Task 6 relies on it to name row-selection checkboxes.

A selectable row's checkbox has no visible label; naming it through `children` would render stray text in the cell. `aria-label` already reaches the input through `...rest`, but docgen filters host props, so the manifest cannot advertise it — the exact `IconButton` situation D60 fixed.

- [ ] **Step 1: Write the failing test**

Append to `packages/react/src/Checkbox/Checkbox.test.tsx`:

```ts
it("accepts aria-label as its own declared prop for label-less use (D60)", () => {
  render(<Checkbox aria-label="Select transaction 2026-08-05 Acme Corp" />);
  expect(
    screen.getByRole("checkbox", { name: "Select transaction 2026-08-05 Acme Corp" }),
  ).toBeTruthy();
});

it("renders no label text when only aria-label is given", () => {
  const { container } = render(<Checkbox aria-label="Select row" />);
  expect(container.textContent).toBe("");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @handamade/psi-react test -- Checkbox`

Expected: the two runtime tests **PASS** already (host props pass through `...rest`). That is the point — the defect is in the *manifest*, not the runtime. Confirm the real failure with:

Run: `pnpm --filter @handamade/psi-react build && node -e "const m=require('./packages/react/dist/manifest.json');const c=(m.components||m).find(x=>x.name==='Checkbox');console.log(c.props.map(p=>p.name).join(', '))"`
Expected: FAIL — the printed list contains no `aria-label`.

- [ ] **Step 3: Write minimal implementation**

In `packages/react/src/Checkbox/Checkbox.tsx`, add the declaration to the props interface. Per D60 the redeclared type is assignable to the inherited one, so it declares directly with **no `Omit`** — unlike `Input.type`:

```ts
export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "placeholder"> {
  /** Label text. */
  children?: React.ReactNode;
  /**
   * Accessible name when there is no visible label — a table's row-selection
   * checkbox, say. Optional, unlike IconButton's required form (D60): a
   * labelled checkbox is still the common case.
   */
  "aria-label"?: string;
  /** Forwarded ref to the underlying `<input type="checkbox">` element. */
  ref?: Ref<HTMLInputElement>;
}
```

- [ ] **Step 4: Verify the manifest now carries it**

Run: `pnpm --filter @handamade/psi-react build && node -e "const m=require('./packages/react/dist/manifest.json');const c=(m.components||m).find(x=>x.name==='Checkbox');console.log(c.props.map(p=>p.name).join(', '))"`
Expected: PASS — the list now contains `aria-label`.

Run: `pnpm --filter @handamade/psi-react test -- Checkbox`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/Checkbox/Checkbox.tsx packages/react/src/Checkbox/Checkbox.test.tsx
git commit -m "fix(react): Checkbox promotes aria-label into its manifest surface (D60)"
```

---

### Task 4: Table family — structure, semantics, exports

**Files:**
- Create: `packages/react/src/Table/Table.tsx`, `TableHead.tsx`, `TableBody.tsx`, `TableRow.tsx`, `TableCell.tsx`, `TableHeaderCell.tsx`, `table.module.css`
- Modify: `packages/react/src/index.ts`
- Test: `packages/react/src/Table/Table.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `Table`, props `{ size?: 32|40|48; stickyHeader?: boolean; className?: string; children: ReactNode; ref?: Ref<HTMLTableElement> }` — sort/selection props arrive in Tasks 5–6.
  - `TableHead`, `TableBody`: `{ children: ReactNode; className?: string }`
  - `TableRow`: `{ rowId?: string; children: ReactNode; className?: string }`
  - `TableCell`, `TableHeaderCell`: `{ numeric?: boolean; children?: ReactNode; className?: string }`; `TableHeaderCell` also `{ sortKey?: string }` (inert until Task 5).
  - `TableSize` type alias, `TableSortState` type (defined here, used in Task 5).

- [ ] **Step 1: Write the failing test**

Create `packages/react/src/Table/Table.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Table } from "./Table.js";
import { TableHead } from "./TableHead.js";
import { TableBody } from "./TableBody.js";
import { TableRow } from "./TableRow.js";
import { TableCell } from "./TableCell.js";
import { TableHeaderCell } from "./TableHeaderCell.js";

function basic() {
  return render(
    <Table>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Date</TableHeaderCell>
          <TableHeaderCell numeric>Amount</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow rowId="t1">
          <TableCell>2026-08-05</TableCell>
          <TableCell numeric>1,240.00</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
}

describe("Table", () => {
  it("renders native table semantics", () => {
    basic();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getAllByRole("cell")).toHaveLength(2);
  });

  it("marks numeric cells with a data attribute", () => {
    const { container } = basic();
    const numeric = container.querySelectorAll("[data-numeric]");
    expect(numeric).toHaveLength(2); // one header, one body cell
  });

  it("defaults to size 40 and reflects it on the table element", () => {
    const { container } = basic();
    expect(container.querySelector("table")?.getAttribute("data-size")).toBe("40");
  });

  it("accepts an explicit size", () => {
    const { container } = render(
      <Table size={32}>
        <TableBody>
          <TableRow><TableCell>x</TableCell></TableRow>
        </TableBody>
      </Table>,
    );
    expect(container.querySelector("table")?.getAttribute("data-size")).toBe("32");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @handamade/psi-react test -- Table`
Expected: FAIL — `Cannot find module './Table.js'`

- [ ] **Step 3: Write minimal implementation**

Create `packages/react/src/Table/Table.tsx`:

```tsx
import type { ReactNode, Ref } from "react";
import styles from "./table.module.css";

export type TableSize = 32 | 40 | 48;

/** Controlled sort state. `null` means no column is sorted. */
export interface TableSortState {
  key: string;
  direction: "asc" | "desc";
}

export interface TableProps {
  /** Row height in px. @default 40 */
  size?: TableSize;
  /** Pins the header while the body scrolls. */
  stickyHeader?: boolean;
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the underlying `<table>` element. */
  ref?: Ref<HTMLTableElement>;
}

/** Data table on native table semantics. Holds no state: sorting, selection
 * and pagination are the consumer's (D62, extending D50/D53). */
export function Table({ size = 40, stickyHeader, children, className, ref }: TableProps) {
  const cls = [styles.table, stickyHeader && styles.sticky, className].filter(Boolean).join(" ");
  return (
    <table ref={ref} className={cls} data-size={size}>
      {children}
    </table>
  );
}
```

Create `packages/react/src/Table/TableHead.tsx`:

```tsx
import type { ReactNode } from "react";
import styles from "./table.module.css";

export interface TableHeadProps {
  children: ReactNode;
  className?: string;
}

/** `<thead>` wrapper. */
export function TableHead({ children, className }: TableHeadProps) {
  return <thead className={[styles.head, className].filter(Boolean).join(" ")}>{children}</thead>;
}
```

Create `packages/react/src/Table/TableBody.tsx`:

```tsx
import type { ReactNode } from "react";
import styles from "./table.module.css";

export interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

/** `<tbody>` wrapper. */
export function TableBody({ children, className }: TableBodyProps) {
  return <tbody className={[styles.body, className].filter(Boolean).join(" ")}>{children}</tbody>;
}
```

Create `packages/react/src/Table/TableRow.tsx`:

```tsx
import type { ReactNode } from "react";
import styles from "./table.module.css";

export interface TableRowProps {
  /** Stable identity for selection. Required for selectable tables (D62). */
  rowId?: string;
  children: ReactNode;
  className?: string;
}

/** `<tr>` wrapper. `rowId` is the key the `selected` set holds. */
export function TableRow({ rowId, children, className }: TableRowProps) {
  return (
    <tr className={[styles.row, className].filter(Boolean).join(" ")} data-row-id={rowId}>
      {children}
    </tr>
  );
}
```

Create `packages/react/src/Table/TableCell.tsx`:

```tsx
import type { ReactNode } from "react";
import styles from "./table.module.css";

export interface TableCellProps {
  /** Right-aligns and renders tabular figures (D62). */
  numeric?: boolean;
  children?: ReactNode;
  className?: string;
}

/** `<td>`. `numeric` means right-aligned *and* tabular — a column that aligns
 * but whose digits jitter between rows defeats the purpose. */
export function TableCell({ numeric, children, className }: TableCellProps) {
  return (
    <td className={[styles.cell, className].filter(Boolean).join(" ")} data-numeric={numeric || undefined}>
      {children}
    </td>
  );
}
```

Create `packages/react/src/Table/TableHeaderCell.tsx`:

```tsx
import type { ReactNode } from "react";
import styles from "./table.module.css";

export interface TableHeaderCellProps {
  /** Sort key this column emits. Enables the sort control when the table is `sortable`. */
  sortKey?: string;
  /** Right-aligns and renders tabular figures (D62). */
  numeric?: boolean;
  children?: ReactNode;
  className?: string;
}

/** `<th scope="col">`. The sort control arrives in Task 5. */
export function TableHeaderCell({ numeric, children, className }: TableHeaderCellProps) {
  return (
    <th
      scope="col"
      className={[styles.headerCell, className].filter(Boolean).join(" ")}
      data-numeric={numeric || undefined}
    >
      {children}
    </th>
  );
}
```

Create `packages/react/src/Table/table.module.css` with the structural minimum (visual polish lands in Task 7):

```css
/* packages/react/src/Table/table.module.css */

.table {
  width: 100%;
  border-collapse: collapse;
  background: var(--psi-table-bg);
  color: var(--psi-table-fg);
  font: var(--psi-text-14-20-regular);
}

.headerCell {
  color: var(--psi-table-header-fg);
  font: var(--psi-text-14-20-medium);
  text-align: start;
}

.cell,
.headerCell {
  border-block-end: 1px solid var(--psi-table-cell-border);
}

.cell[data-numeric],
.headerCell[data-numeric] {
  text-align: end;
  font-variant-numeric: var(--psi-font-variant-numeric);
}
```

Add to `packages/react/src/index.ts`, after the Menu block:

```ts
export { Table } from "./Table/Table.js";
export type { TableProps, TableSize, TableSortState } from "./Table/Table.js";
export { TableHead } from "./Table/TableHead.js";
export type { TableHeadProps } from "./Table/TableHead.js";
export { TableBody } from "./Table/TableBody.js";
export type { TableBodyProps } from "./Table/TableBody.js";
export { TableRow } from "./Table/TableRow.js";
export type { TableRowProps } from "./Table/TableRow.js";
export { TableHeaderCell } from "./Table/TableHeaderCell.js";
export type { TableHeaderCellProps } from "./Table/TableHeaderCell.js";
export { TableCell } from "./Table/TableCell.js";
export type { TableCellProps } from "./Table/TableCell.js";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @handamade/psi-react test -- Table`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/Table packages/react/src/index.ts
git commit -m "feat(react): Table family structure on native table semantics (D62)"
```

---

### Task 5: Sorting

**Files:**
- Modify: `packages/react/src/Table/Table.tsx`, `TableHeaderCell.tsx`, `table.module.css`
- Create: `packages/react/src/Table/TableContext.ts`
- Test: `packages/react/src/Table/TableSort.test.tsx`

**Interfaces:**
- Consumes: `Table`, `TableHeaderCell`, `TableSortState` from Task 4.
- Produces: `Table` gains `sortable?: boolean`, `sort?: TableSortState | null`, `onSortChange?: (sort: TableSortState) => void`. `TableContext` exports `TableContextValue` with `{ size, sortable, sort, onSortChange, selectable, selected, onSelectionChange }` — Task 6 fills the selection half.

`onSortChange` is **optional in the type**, not conditionally required: a discriminated union expressing the real contract does not survive docgen's flat prop extraction, which would strip both props from the manifest.

- [ ] **Step 1: Write the failing test**

Create `packages/react/src/Table/TableSort.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Table } from "./Table.js";
import { TableHead } from "./TableHead.js";
import { TableBody } from "./TableBody.js";
import { TableRow } from "./TableRow.js";
import { TableCell } from "./TableCell.js";
import { TableHeaderCell } from "./TableHeaderCell.js";
import type { TableSortState } from "./Table.js";

function sortable(sort: TableSortState | null, onSortChange = vi.fn()) {
  const utils = render(
    <Table sortable sort={sort} onSortChange={onSortChange}>
      <TableHead>
        <TableRow>
          <TableHeaderCell sortKey="date">Date</TableHeaderCell>
          <TableHeaderCell sortKey="amount" numeric>Amount</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow rowId="t1"><TableCell>a</TableCell><TableCell numeric>1</TableCell><TableCell /></TableRow>
      </TableBody>
    </Table>,
  );
  return { ...utils, onSortChange };
}

describe("Table sorting", () => {
  it("puts aria-sort on the th, not the button", () => {
    sortable({ key: "date", direction: "asc" });
    const header = screen.getByRole("columnheader", { name: /Date/ });
    expect(header.getAttribute("aria-sort")).toBe("ascending");
    expect(header.querySelector("button")?.hasAttribute("aria-sort")).toBe(false);
  });

  it("reports descending for a desc sort", () => {
    sortable({ key: "date", direction: "desc" });
    expect(screen.getByRole("columnheader", { name: /Date/ }).getAttribute("aria-sort")).toBe("descending");
  });

  it("reports none on sortable columns that are not the active sort", () => {
    sortable({ key: "date", direction: "asc" });
    expect(screen.getByRole("columnheader", { name: /Amount/ }).getAttribute("aria-sort")).toBe("none");
  });

  it("omits aria-sort entirely on a column with no sortKey", () => {
    sortable({ key: "date", direction: "asc" });
    expect(screen.getByRole("columnheader", { name: "Actions" }).hasAttribute("aria-sort")).toBe(false);
  });

  it("emits asc when an unsorted column is activated", async () => {
    const { onSortChange } = sortable({ key: "date", direction: "asc" });
    await userEvent.click(screen.getByRole("button", { name: /Amount/ }));
    expect(onSortChange).toHaveBeenCalledWith({ key: "amount", direction: "asc" });
  });

  it("toggles direction when the active column is activated again", async () => {
    const { onSortChange } = sortable({ key: "date", direction: "asc" });
    await userEvent.click(screen.getByRole("button", { name: /Date/ }));
    expect(onSortChange).toHaveBeenCalledWith({ key: "date", direction: "desc" });
  });

  it("renders no sort button when the table is not sortable", () => {
    render(
      <Table>
        <TableHead><TableRow><TableHeaderCell sortKey="date">Date</TableHeaderCell></TableRow></TableHead>
        <TableBody><TableRow><TableCell>a</TableCell></TableRow></TableBody>
      </Table>,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @handamade/psi-react test -- TableSort`
Expected: FAIL — no `aria-sort` attribute and no button is rendered.

- [ ] **Step 3: Write minimal implementation**

Create `packages/react/src/Table/TableContext.ts`:

```ts
import { createContext } from "react";
import type { TableSize, TableSortState } from "./Table.js";

export interface TableContextValue {
  size: TableSize;
  sortable: boolean;
  sort: TableSortState | null;
  onSortChange?: (sort: TableSortState) => void;
  selectable: boolean;
  selected: ReadonlySet<string>;
  onSelectionChange?: (selected: ReadonlySet<string>) => void;
}

export const TableContext = createContext<TableContextValue>({
  size: 40,
  sortable: false,
  sort: null,
  selectable: false,
  selected: new Set<string>(),
});
```

Replace `packages/react/src/Table/Table.tsx`'s props and body (keeping `TableSize`/`TableSortState` exported from this file):

```tsx
import type { ReactNode, Ref } from "react";
import styles from "./table.module.css";
import { TableContext } from "./TableContext.js";

export type TableSize = 32 | 40 | 48;

/** Controlled sort state. `null` means no column is sorted. */
export interface TableSortState {
  key: string;
  direction: "asc" | "desc";
}

const EMPTY_SELECTION: ReadonlySet<string> = new Set<string>();

export interface TableProps {
  /** Row height in px. @default 40 */
  size?: TableSize;
  /** Pins the header while the body scrolls. */
  stickyHeader?: boolean;
  /** Enables the sort affordance on header cells that declare a `sortKey`. */
  sortable?: boolean;
  /** Controlled sort state; `null` when nothing is sorted. */
  sort?: TableSortState | null;
  /**
   * Called when a header's sort control is activated. Optional in the type
   * because `sortable` may be false; a discriminated union expressing the real
   * contract does not survive docgen's flat prop extraction, which would strip
   * these props from the manifest entirely (D62).
   */
  onSortChange?: (sort: TableSortState) => void;
  /** Renders the row-selection checkbox column. */
  selectable?: boolean;
  /** Controlled selection, keyed by each `TableRow`'s `rowId`. */
  selected?: ReadonlySet<string>;
  /** Called with the next selection. See `onSortChange` on why it is optional. */
  onSelectionChange?: (selected: ReadonlySet<string>) => void;
  children: ReactNode;
  className?: string;
  /** Forwarded ref to the underlying `<table>` element. */
  ref?: Ref<HTMLTableElement>;
}

/** Data table on native table semantics. Holds no state: sorting, selection
 * and pagination are the consumer's (D62, extending D50/D53). */
export function Table({
  size = 40,
  stickyHeader,
  sortable = false,
  sort = null,
  onSortChange,
  selectable = false,
  selected = EMPTY_SELECTION,
  onSelectionChange,
  children,
  className,
  ref,
}: TableProps) {
  const cls = [styles.table, stickyHeader && styles.sticky, className].filter(Boolean).join(" ");
  if (process.env.NODE_ENV !== "production") {
    if (sortable && !onSortChange) console.warn("Psi Table: `sortable` is set without `onSortChange`; sorting will not respond.");
    if (selectable && !onSelectionChange) console.warn("Psi Table: `selectable` is set without `onSelectionChange`; selection will not respond.");
  }
  return (
    <TableContext.Provider value={{ size, sortable, sort, onSortChange, selectable, selected, onSelectionChange }}>
      <table ref={ref} className={cls} data-size={size}>
        {children}
      </table>
    </TableContext.Provider>
  );
}
```

Replace `packages/react/src/Table/TableHeaderCell.tsx`:

```tsx
import { useContext } from "react";
import type { ReactNode } from "react";
import styles from "./table.module.css";
import { TableContext } from "./TableContext.js";

export interface TableHeaderCellProps {
  /** Sort key this column emits. Enables the sort control when the table is `sortable`. */
  sortKey?: string;
  /** Right-aligns and renders tabular figures (D62). */
  numeric?: boolean;
  children?: ReactNode;
  className?: string;
}

/** `<th scope="col">`. `aria-sort` belongs on the th, never on the inner
 * button — assistive tech reads the sort state from the column header. */
export function TableHeaderCell({ sortKey, numeric, children, className }: TableHeaderCellProps) {
  const { sortable, sort, onSortChange } = useContext(TableContext);
  const isSortable = sortable && sortKey !== undefined;
  const isActive = isSortable && sort?.key === sortKey;

  const ariaSort = !isSortable
    ? undefined
    : isActive
      ? sort!.direction === "asc"
        ? "ascending"
        : "descending"
      : "none";

  const activate = () => {
    if (!sortKey) return;
    const direction = isActive && sort!.direction === "asc" ? "desc" : "asc";
    onSortChange?.({ key: sortKey, direction });
  };

  return (
    <th
      scope="col"
      className={[styles.headerCell, className].filter(Boolean).join(" ")}
      data-numeric={numeric || undefined}
      aria-sort={ariaSort}
    >
      {isSortable ? (
        <button type="button" className={styles.sortButton} onClick={activate}>
          {children}
          <span className={styles.sortIndicator} aria-hidden="true">
            {isActive ? (sort!.direction === "asc" ? "↑" : "↓") : ""}
          </span>
        </button>
      ) : (
        children
      )}
    </th>
  );
}
```

Append to `table.module.css`:

```css
.sortButton {
  display: inline-flex;
  align-items: center;
  gap: var(--psi-space-4);
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.sortIndicator {
  color: var(--psi-table-sort-indicator-fg);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @handamade/psi-react test -- TableSort`
Expected: PASS (7 tests)

Run: `pnpm --filter @handamade/psi-react test -- Table`
Expected: PASS — Task 4's tests still green.

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/Table
git commit -m "feat(react): Table sorting with aria-sort on the column header (D62)"
```

---

### Task 6: Selection

**Files:**
- Modify: `packages/react/src/Table/TableRow.tsx`, `TableHead.tsx`, `TableBody.tsx`, `table.module.css`
- Create: `packages/react/src/Table/TableSelectionCell.tsx`
- Test: `packages/react/src/Table/TableSelection.test.tsx`

**Interfaces:**
- Consumes: `TableContext` (Task 5), `Checkbox`'s `aria-label` (Task 3).
- Produces: `TableRow` gains `selectLabel?: string` (the accessible name for its checkbox). `TableHead` renders a select-all cell; `TableBody` rows render a per-row checkbox. No new exported symbol beyond `TableSelectionCell`, which stays internal (not exported from `index.ts`).

- [ ] **Step 1: Write the failing test**

Create `packages/react/src/Table/TableSelection.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Table } from "./Table.js";
import { TableHead } from "./TableHead.js";
import { TableBody } from "./TableBody.js";
import { TableRow } from "./TableRow.js";
import { TableCell } from "./TableCell.js";
import { TableHeaderCell } from "./TableHeaderCell.js";

function selectable(selected: ReadonlySet<string>, onSelectionChange = vi.fn()) {
  const utils = render(
    <Table selectable selected={selected} onSelectionChange={onSelectionChange}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Date</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow rowId="t1" selectLabel="Select 2026-08-05 Acme"><TableCell>a</TableCell></TableRow>
        <TableRow rowId="t2" selectLabel="Select 2026-08-06 Globex"><TableCell>b</TableCell></TableRow>
      </TableBody>
    </Table>,
  );
  return { ...utils, onSelectionChange };
}

describe("Table selection", () => {
  it("names each row checkbox from selectLabel", () => {
    selectable(new Set());
    expect(screen.getByRole("checkbox", { name: "Select 2026-08-05 Acme" })).toBeTruthy();
  });

  it("checks the rows in the selected set", () => {
    selectable(new Set(["t2"]));
    expect((screen.getByRole("checkbox", { name: "Select 2026-08-06 Globex" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Select 2026-08-05 Acme" }) as HTMLInputElement).checked).toBe(false);
  });

  it("adds a row to the selection", async () => {
    const { onSelectionChange } = selectable(new Set(["t1"]));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select 2026-08-06 Globex" }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(["t1", "t2"]));
  });

  it("removes a row from the selection", async () => {
    const { onSelectionChange } = selectable(new Set(["t1", "t2"]));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select 2026-08-05 Acme" }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(["t2"]));
  });

  it("marks select-all indeterminate on a partial selection", () => {
    selectable(new Set(["t1"]));
    const all = screen.getByRole("checkbox", { name: "Select all rows" }) as HTMLInputElement;
    expect(all.indeterminate).toBe(true);
    expect(all.checked).toBe(false);
  });

  it("checks select-all when every row is selected, without indeterminate", () => {
    selectable(new Set(["t1", "t2"]));
    const all = screen.getByRole("checkbox", { name: "Select all rows" }) as HTMLInputElement;
    expect(all.checked).toBe(true);
    expect(all.indeterminate).toBe(false);
  });

  it("select-all selects every row", async () => {
    const { onSelectionChange } = selectable(new Set());
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(["t1", "t2"]));
  });

  it("select-all clears when already fully selected", async () => {
    const { onSelectionChange } = selectable(new Set(["t1", "t2"]));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it("renders no checkbox column when the table is not selectable", () => {
    render(
      <Table>
        <TableBody><TableRow rowId="t1"><TableCell>a</TableCell></TableRow></TableBody>
      </Table>,
    );
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @handamade/psi-react test -- TableSelection`
Expected: FAIL — no checkboxes are rendered.

- [ ] **Step 3: Write minimal implementation**

The row ids the select-all needs are not knowable from context alone, so `TableBody` registers them. Create `packages/react/src/Table/TableSelectionCell.tsx`:

```tsx
import { useContext, useEffect, useRef } from "react";
import styles from "./table.module.css";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { TableContext } from "./TableContext.js";
import { TableRowIdsContext } from "./TableContext.js";

/** Per-row selection checkbox. Internal — not exported from index.ts. */
export function TableRowSelectionCell({ rowId, label }: { rowId: string; label: string }) {
  const { selected, onSelectionChange } = useContext(TableContext);
  const toggle = () => {
    const next = new Set(selected);
    if (next.has(rowId)) next.delete(rowId);
    else next.add(rowId);
    onSelectionChange?.(next);
  };
  return (
    <td className={styles.selectCell}>
      <Checkbox aria-label={label} checked={selected.has(rowId)} onChange={toggle} />
    </td>
  );
}

/** Select-all header checkbox, indeterminate on a partial selection. */
export function TableSelectAllCell() {
  const { selected, onSelectionChange } = useContext(TableContext);
  const rowIds = useContext(TableRowIdsContext);
  const ref = useRef<HTMLInputElement>(null);

  const all = rowIds.length > 0 && rowIds.every((id) => selected.has(id));
  const some = rowIds.some((id) => selected.has(id));

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = some && !all;
  }, [some, all]);

  const toggle = () => onSelectionChange?.(all ? new Set<string>() : new Set(rowIds));

  return (
    <th scope="col" className={styles.selectCell}>
      <Checkbox ref={ref} aria-label="Select all rows" checked={all} onChange={toggle} />
    </th>
  );
}
```

Append to `packages/react/src/Table/TableContext.ts`:

```ts
/** Row ids in document order, published by TableBody so the select-all
 * checkbox can compute all/some without the consumer restating them. */
export const TableRowIdsContext = createContext<string[]>([]);
```

Replace `packages/react/src/Table/TableBody.tsx`:

```tsx
import { Children, isValidElement, useMemo } from "react";
import type { ReactNode } from "react";
import styles from "./table.module.css";
import { TableRowIdsContext } from "./TableContext.js";

export interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

/** `<tbody>` wrapper. Publishes its rows' ids so the select-all checkbox can
 * compute all/some without the consumer restating them. */
export function TableBody({ children, className }: TableBodyProps) {
  const rowIds = useMemo(
    () =>
      Children.toArray(children)
        .filter(isValidElement)
        .map((child) => (child.props as { rowId?: string }).rowId)
        .filter((id): id is string => typeof id === "string"),
    [children],
  );
  return (
    <TableRowIdsContext.Provider value={rowIds}>
      <tbody className={[styles.body, className].filter(Boolean).join(" ")}>{children}</tbody>
    </TableRowIdsContext.Provider>
  );
}
```

Replace `packages/react/src/Table/TableRow.tsx`:

```tsx
import { useContext } from "react";
import type { ReactNode } from "react";
import styles from "./table.module.css";
import { TableContext } from "./TableContext.js";
import { TableRowSelectionCell } from "./TableSelectionCell.js";

export interface TableRowProps {
  /** Stable identity for selection. Required for selectable tables (D62). */
  rowId?: string;
  /** Accessible name for this row's selection checkbox. */
  selectLabel?: string;
  children: ReactNode;
  className?: string;
}

/** `<tr>`. `rowId` is the key the `selected` set holds. */
export function TableRow({ rowId, selectLabel, children, className }: TableRowProps) {
  const { selectable, selected } = useContext(TableContext);
  const isSelected = rowId !== undefined && selected.has(rowId);
  return (
    <tr
      className={[styles.row, className].filter(Boolean).join(" ")}
      data-row-id={rowId}
      data-selected={isSelected || undefined}
    >
      {selectable && rowId !== undefined && (
        <TableRowSelectionCell rowId={rowId} label={selectLabel ?? `Select row ${rowId}`} />
      )}
      {children}
    </tr>
  );
}
```

Replace `packages/react/src/Table/TableHead.tsx`:

```tsx
import { useContext } from "react";
import type { ReactNode } from "react";
import styles from "./table.module.css";
import { TableContext } from "./TableContext.js";
import { TableSelectAllCell } from "./TableSelectionCell.js";

export interface TableHeadProps {
  children: ReactNode;
  className?: string;
}

/** `<thead>`. Prepends the select-all cell when the table is selectable, so
 * the header's column count matches the body's. */
export function TableHead({ children, className }: TableHeadProps) {
  const { selectable } = useContext(TableContext);
  return (
    <thead className={[styles.head, className].filter(Boolean).join(" ")}>
      {selectable ? <SelectAllRow>{children}</SelectAllRow> : children}
    </thead>
  );
}

/** Injects the select-all cell into the header row without the consumer
 * declaring it — the checkbox column is Table's, not the schema's. */
function SelectAllRow({ children }: { children: ReactNode }) {
  return (
    <tr className={styles.row}>
      <TableSelectAllCell />
      {(children as { props?: { children?: ReactNode } })?.props?.children}
    </tr>
  );
}
```

Append to `table.module.css`:

```css
.selectCell {
  width: 1%;
  padding-inline-end: 0;
  border-block-end: 1px solid var(--psi-table-cell-border);
}

.row[data-selected] {
  background: var(--psi-table-row-bg-selected);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @handamade/psi-react test -- TableSelection`
Expected: PASS (9 tests)

Run: `pnpm --filter @handamade/psi-react test -- Table`
Expected: PASS — Tasks 4 and 5 still green. If Task 4's `getAllByRole("row")` count changed, that is a real regression: `SelectAllRow` must not add a row, only a cell.

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/Table
git commit -m "feat(react): Table row selection with indeterminate select-all (D62)"
```

---

### Task 7: Size ramp, hover, sticky header

**Files:**
- Modify: `packages/react/src/Table/table.module.css`
- Test: `packages/react/src/Table/table.module.css` is verified by lint + the existing size test; add one assertion to `Table.test.tsx`

**Interfaces:**
- Consumes: `--psi-table-*` (Task 2), `data-size` (Task 4).
- Produces: no new API.

- [ ] **Step 1: Write the failing test**

Append to `packages/react/src/Table/Table.test.tsx`:

```tsx
it("applies the sticky class only when stickyHeader is set", () => {
  const { container: plain } = render(
    <Table><TableBody><TableRow><TableCell>a</TableCell></TableRow></TableBody></Table>,
  );
  const { container: sticky } = render(
    <Table stickyHeader><TableBody><TableRow><TableCell>a</TableCell></TableRow></TableBody></Table>,
  );
  const plainCls = plain.querySelector("table")!.className;
  const stickyCls = sticky.querySelector("table")!.className;
  expect(stickyCls).not.toBe(plainCls);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @handamade/psi-react test -- Table`
Expected: PASS or FAIL depending on whether `styles.sticky` resolves — CSS Modules are hashed in test, and an undefined class yields the same string. If it PASSES already, the class exists; proceed to Step 3 regardless, since the CSS itself is the deliverable.

- [ ] **Step 3: Write the implementation**

Append to `packages/react/src/Table/table.module.css`:

```css
/* ── Size ramp (D62) ──────────────────────────────────────────────
   Row height and cell inset alias the D54/D55 control ramp through
   --psi-table-*, so a 32px row and a 32px Button are the same 32px. */

.table[data-size="32"] .cell,
.table[data-size="32"] .headerCell {
  height: var(--psi-table-32-row-height);
  padding-inline: var(--psi-table-32-cell-padding-x);
}

.table[data-size="40"] .cell,
.table[data-size="40"] .headerCell {
  height: var(--psi-table-40-row-height);
  padding-inline: var(--psi-table-40-cell-padding-x);
}

.table[data-size="48"] .cell,
.table[data-size="48"] .headerCell {
  height: var(--psi-table-48-row-height);
  padding-inline: var(--psi-table-48-cell-padding-x);
}

/* ── Row states ───────────────────────────────────────────────────
   data-selected wins over hover: a hovered selected row stays selected. */

.row:hover {
  background: var(--psi-table-row-bg-hover);
}

.row[data-selected]:hover {
  background: var(--psi-table-row-bg-selected);
}

/* ── Sticky header ────────────────────────────────────────────────
   Needs no ARIA. The background is required: a transparent sticky header
   would let body rows show through as they scroll under it. */

.sticky .headerCell {
  position: sticky;
  inset-block-start: 0;
  z-index: 1;
  background: var(--psi-table-bg);
}
```

- [ ] **Step 4: Verify the stylelint gate accepts it**

Run: `pnpm lint:css`
Expected: PASS. If it reports binding a non-own-component token, you have written `--psi-control-*` or `--psi-surface-*` directly — route it through `--psi-table-*` in `packages/tokens/src/components/table.ts` instead.

Run: `pnpm --filter @handamade/psi-react test -- Table`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/Table
git commit -m "feat(react): Table size ramp, row states and sticky header (D62)"
```

---

### Task 8: `Pagination`

**Files:**
- Create: `packages/react/src/Pagination/Pagination.tsx`, `pagination.module.css`
- Create: `packages/tokens/src/components/pagination.ts` — **only if** a token is genuinely needed; prefer reusing `Button`/`IconButton`, in which case skip it
- Modify: `packages/react/src/index.ts`
- Test: `packages/react/src/Pagination/Pagination.test.tsx`

**Interfaces:**
- Consumes: `Button`, `IconButton` from the existing library.
- Produces: `Pagination`, props `{ page: number; pageCount: number; onPageChange?: (page: number) => void; siblingCount?: number; className?: string; "aria-label"?: string }`, plus the internal pure helper `paginationRange(page, pageCount, siblingCount): Array<number | "ellipsis">` exported for testing.

- [ ] **Step 1: Write the failing test**

Create `packages/react/src/Pagination/Pagination.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination, paginationRange } from "./Pagination.js";

describe("paginationRange", () => {
  it("lists every page when they all fit", () => {
    expect(paginationRange(1, 5, 1)).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles a single page", () => {
    expect(paginationRange(1, 1, 1)).toEqual([1]);
  });

  it("handles two pages", () => {
    expect(paginationRange(2, 2, 1)).toEqual([1, 2]);
  });

  it("truncates on the right near the start", () => {
    expect(paginationRange(2, 13, 1)).toEqual([1, 2, 3, "ellipsis", 13]);
  });

  it("truncates on both sides in the middle", () => {
    expect(paginationRange(7, 13, 1)).toEqual([1, "ellipsis", 6, 7, 8, "ellipsis", 13]);
  });

  it("truncates on the left near the end", () => {
    expect(paginationRange(13, 13, 1)).toEqual([1, "ellipsis", 11, 12, 13]);
  });

  it("widens with siblingCount", () => {
    expect(paginationRange(50, 100, 2)).toEqual([1, "ellipsis", 48, 49, 50, 51, 52, "ellipsis", 100]);
  });
});

describe("Pagination", () => {
  it("marks the current page with aria-current", () => {
    render(<Pagination page={4} pageCount={13} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "4" }).getAttribute("aria-current")).toBe("page");
  });

  it("gives no other page aria-current", () => {
    render(<Pagination page={4} pageCount={13} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "3" }).hasAttribute("aria-current")).toBe(false);
  });

  it("labels its nav landmark", () => {
    render(<Pagination page={1} pageCount={3} onPageChange={() => {}} />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeTruthy();
  });

  it("emits the clicked page", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={4} pageCount={13} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole("button", { name: "5" }));
    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it("disables previous on the first page", () => {
    render(<Pagination page={1} pageCount={13} onPageChange={() => {}} />);
    expect((screen.getByRole("button", { name: "Previous page" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables next on the last page", () => {
    render(<Pagination page={13} pageCount={13} onPageChange={() => {}} />);
    expect((screen.getByRole("button", { name: "Next page" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders the ellipsis as non-interactive and unannounced", () => {
    const { container } = render(<Pagination page={7} pageCount={13} onPageChange={() => {}} />);
    const ellipses = container.querySelectorAll('[aria-hidden="true"]');
    expect(ellipses.length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "…" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @handamade/psi-react test -- Pagination`
Expected: FAIL — `Cannot find module './Pagination.js'`

- [ ] **Step 3: Write minimal implementation**

Create `packages/react/src/Pagination/Pagination.tsx`:

```tsx
import styles from "./pagination.module.css";
import { Button } from "../Button/Button.js";
import { IconButton } from "../IconButton/IconButton.js";

/** Pages to render, with "ellipsis" marking an elided run. Pure and exported
 * so the truncation math is testable without rendering. */
export function paginationRange(
  page: number,
  pageCount: number,
  siblingCount: number,
): Array<number | "ellipsis"> {
  // first + last + current + 2 siblings + 2 ellipses
  const maxSlots = siblingCount * 2 + 5;
  if (pageCount <= maxSlots) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const left = Math.max(page - siblingCount, 1);
  const right = Math.min(page + siblingCount, pageCount);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < pageCount - 1;

  const out: Array<number | "ellipsis"> = [];

  if (showLeftEllipsis) {
    out.push(1, "ellipsis");
  } else {
    for (let i = 1; i < left; i++) out.push(i);
  }

  for (let i = left; i <= right; i++) out.push(i);

  if (showRightEllipsis) {
    out.push("ellipsis", pageCount);
  } else {
    for (let i = right + 1; i <= pageCount; i++) out.push(i);
  }

  return out;
}

export interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  /** Called with the requested page. Optional for the same docgen reason as Table's handlers (D62). */
  onPageChange?: (page: number) => void;
  /** Pages shown either side of the current one before truncating. @default 1 */
  siblingCount?: number;
  /** Accessible name for the nav landmark. @default "Pagination" */
  "aria-label"?: string;
  className?: string;
}

/** Numbered pager with ellipsis truncation (D63). Standalone rather than a
 * Table family member: `table-pagination` composes it as a Toolbar sibling of
 * the page-size Select. */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  "aria-label": ariaLabel = "Pagination",
  className,
}: PaginationProps) {
  const items = paginationRange(page, pageCount, siblingCount);
  return (
    <nav aria-label={ariaLabel} className={[styles.nav, className].filter(Boolean).join(" ")}>
      <IconButton
        aria-label="Previous page"
        size={32}
        variant="ghost"
        disabled={page <= 1}
        onClick={() => onPageChange?.(page - 1)}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
          <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </IconButton>

      {items.map((item, i) =>
        item === "ellipsis" ? (
          <span key={`e${i}`} className={styles.ellipsis} aria-hidden="true">
            {"…"}
          </span>
        ) : (
          <Button
            key={item}
            size={32}
            variant={item === page ? "accent-subtle" : "ghost"}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onPageChange?.(item)}
          >
            {String(item)}
          </Button>
        ),
      )}

      <IconButton
        aria-label="Next page"
        size={32}
        variant="ghost"
        disabled={page >= pageCount}
        onClick={() => onPageChange?.(page + 1)}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
          <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </IconButton>
    </nav>
  );
}
```

Create `packages/react/src/Pagination/pagination.module.css`:

```css
/* packages/react/src/Pagination/pagination.module.css
   No --psi-pagination-* family: every visual comes from Button and
   IconButton, which already bind their own tokens. Adding a family here
   would be indirection with nothing behind it. */

.nav {
  display: flex;
  align-items: center;
  gap: var(--psi-space-4);
}

.ellipsis {
  padding-inline: var(--psi-space-4);
}
```

Add to `packages/react/src/index.ts`:

```ts
export { Pagination } from "./Pagination/Pagination.js";
export type { PaginationProps } from "./Pagination/Pagination.js";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @handamade/psi-react test -- Pagination`
Expected: PASS (14 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/Pagination packages/react/src/index.ts
git commit -m "feat(react): Pagination — numbered pager with ellipsis truncation (D63)"
```

---

### Task 9: Slot contracts, stories, and axe cases

**Files:**
- Create: `packages/react/src/Table/slots.json`
- Create: `packages/react/src/Table/Table.stories.tsx`, `packages/react/src/Pagination/Pagination.stories.tsx`
- Modify: `packages/react/src/a11y.axe.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 4–8.
- Produces: `slots.json` drives the manifest's `slots` array for Table; stories drive VR.

- [ ] **Step 1: Write the failing test**

Add to the `cases` array in `packages/react/src/a11y.axe.test.tsx` (and extend the import from `./index.js` with `Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, Pagination`):

```tsx
  ["Table plain", (
    <Table>
      <TableHead><TableRow><TableHeaderCell>Date</TableHeaderCell><TableHeaderCell numeric>Amount</TableHeaderCell></TableRow></TableHead>
      <TableBody><TableRow rowId="t1"><TableCell>2026-08-05</TableCell><TableCell numeric>1,240.00</TableCell></TableRow></TableBody>
    </Table>
  )],
  ["Table sortable + selectable", (
    <Table sortable selectable sort={{ key: "date", direction: "asc" }} onSortChange={() => {}} selected={new Set(["t1"])} onSelectionChange={() => {}}>
      <TableHead><TableRow><TableHeaderCell sortKey="date">Date</TableHeaderCell><TableHeaderCell sortKey="amount" numeric>Amount</TableHeaderCell></TableRow></TableHead>
      <TableBody>
        <TableRow rowId="t1" selectLabel="Select 2026-08-05 Acme"><TableCell>2026-08-05</TableCell><TableCell numeric>1,240.00</TableCell></TableRow>
        <TableRow rowId="t2" selectLabel="Select 2026-08-06 Globex"><TableCell>2026-08-06</TableCell><TableCell numeric>98.50</TableCell></TableRow>
      </TableBody>
    </Table>
  )],
  ["Pagination", <Pagination page={4} pageCount={13} onPageChange={() => {}} />],
  ["Pagination single page", <Pagination page={1} pageCount={1} onPageChange={() => {}} />],
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @handamade/psi-react test -- a11y`
Expected: FAIL — the imports do not resolve until `index.ts` exports exist (they do, from Tasks 4 and 8), so the real signal here is any axe violation. A missing accessible name on a row checkbox surfaces as `aria-input-field-name` or `label`.

- [ ] **Step 3: Fix any violation and add the slot contract**

Create `packages/react/src/Table/slots.json`, following the Menu precedent:

```json
{
  "slots": [
    {
      "name": "body",
      "accepts": { "components": ["TableHead", "TableBody"] },
      "cardinality": "1..*",
      "order": 1
    }
  ]
}
```

If axe reported a violation, fix the component rather than the test. Do **not** disable a rule.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @handamade/psi-react test -- a11y`
Expected: PASS — every case reports `[]` violations.

- [ ] **Step 5: Write the stories**

Create `packages/react/src/Table/Table.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Table } from "./Table.js";
import { TableHead } from "./TableHead.js";
import { TableBody } from "./TableBody.js";
import { TableRow } from "./TableRow.js";
import { TableCell } from "./TableCell.js";
import { TableHeaderCell } from "./TableHeaderCell.js";
import type { TableSortState } from "./Table.js";

const meta: Meta<typeof Table> = { title: "Data/Table", component: Table };
export default meta;
type Story = StoryObj<typeof Table>;

const ROWS = [
  { id: "t1", date: "2026-08-05", payee: "Acme Corp", amount: "1,240.00" },
  { id: "t2", date: "2026-08-06", payee: "Globex", amount: "98.50" },
  { id: "t3", date: "2026-08-07", payee: "Initech", amount: "12,004.25" },
];

function Demo({ size, stickyHeader }: { size?: 32 | 40 | 48; stickyHeader?: boolean }) {
  const [sort, setSort] = useState<TableSortState | null>({ key: "date", direction: "asc" });
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(["t2"]));
  return (
    <Table
      size={size}
      stickyHeader={stickyHeader}
      sortable
      selectable
      sort={sort}
      onSortChange={setSort}
      selected={selected}
      onSelectionChange={setSelected}
    >
      <TableHead>
        <TableRow>
          <TableHeaderCell sortKey="date">Date</TableHeaderCell>
          <TableHeaderCell sortKey="payee">Payee</TableHeaderCell>
          <TableHeaderCell sortKey="amount" numeric>Amount</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {ROWS.map((r) => (
          <TableRow key={r.id} rowId={r.id} selectLabel={`Select ${r.date} ${r.payee}`}>
            <TableCell>{r.date}</TableCell>
            <TableCell>{r.payee}</TableCell>
            <TableCell numeric>{r.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export const Size32: Story = { render: () => <Demo size={32} /> };
export const Size40: Story = { render: () => <Demo size={40} /> };
export const Size48: Story = { render: () => <Demo size={48} /> };
export const Sticky: Story = { render: () => <Demo stickyHeader /> };
export const Empty: Story = {
  render: () => (
    <Table>
      <TableHead><TableRow><TableHeaderCell>Date</TableHeaderCell><TableHeaderCell numeric>Amount</TableHeaderCell></TableRow></TableHead>
      <TableBody />
    </Table>
  ),
};
```

Create `packages/react/src/Pagination/Pagination.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Pagination } from "./Pagination.js";

const meta: Meta<typeof Pagination> = { title: "Data/Pagination", component: Pagination };
export default meta;
type Story = StoryObj<typeof Pagination>;

export const SinglePage: Story = { args: { page: 1, pageCount: 1, onPageChange: () => {} } };
export const SevenPages: Story = { args: { page: 4, pageCount: 7, onPageChange: () => {} } };
export const HundredPages: Story = { args: { page: 50, pageCount: 100, onPageChange: () => {} } };
```

- [ ] **Step 6: Verify the build and full suite**

Run: `pnpm build && pnpm test`
Expected: PASS. `pnpm build` regenerates `manifest.json`; confirm the new entries landed:

Run: `node -e "const m=require('./packages/react/dist/manifest.json');const c=m.components||m;console.log(c.length, c.map(x=>x.name).join(', '))"`
Expected: `25` and the list includes `Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell, Pagination`.

**Do not run `pnpm vr`.** New stories have no baselines; baselines come from CI's `vr-baselines` artifact after the branch is pushed.

- [ ] **Step 7: Commit**

```bash
git add packages/react/src/Table packages/react/src/Pagination packages/react/src/a11y.axe.test.tsx
git commit -m "feat(react): Table slot contract, stories and axe coverage (D62-D63)"
```

---

### Task 10: Unblock the two patterns

**Files:**
- Modify: `packages/react/patterns/data-table.json`
- Modify: `packages/react/patterns/table-pagination.json`
- Test: `packages/react/scripts/patterns.test.ts`

**Interfaces:**
- Consumes: `Table` family and `Pagination` in the manifest (Task 9).
- Produces: both patterns `blocked: false` with `gaps: []`, and rendered presets in `patterns.json`.

`data-table`'s `head` slot **must** go. Only `body` yields children (`patterns.ts:414`); every other slot renders as a **prop**, and `patterns.ts:276` throws `unknown slot "head"` the moment `Table` exists and stops being a gap.

- [ ] **Step 1: Write the failing test**

Append to `packages/react/scripts/patterns.test.ts`:

```ts
it("data-table and table-pagination are unblocked once Table and Pagination ship", () => {
  const byId = Object.fromEntries(builtPatterns.map((p) => [p.id, p]));
  expect(byId["data-table"].gaps).toEqual([]);
  expect(byId["data-table"].blocked).toBe(false);
  expect(byId["data-table"].preset).toContain("<Table");
  expect(byId["data-table"].preset).toContain("<TableHeaderCell");
  expect(byId["table-pagination"].gaps).toEqual([]);
  expect(byId["table-pagination"].blocked).toBe(false);
  expect(byId["table-pagination"].preset).toContain("<Pagination");
});
```

Use whatever the file already calls its built-pattern array; if it builds inline, mirror the existing call rather than inventing `builtPatterns`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @handamade/psi-react test -- patterns`
Expected: FAIL — either `gaps` still lists `Table`, or the validator throws `unknown slot "head"`.

- [ ] **Step 3: Write the implementation**

Replace `packages/react/patterns/data-table.json`:

```json
{
  "id": "data-table",
  "intent": "Sortable, selectable table of records with numeric columns and a per-row actions menu — compose the row menu from the row-actions pattern",
  "match": ["data table", "transactions table", "sortable table", "records table", "list of transactions"],
  "compose": {
    "component": "Table",
    "props": { "selectable": true, "sortable": true },
    "slots": {
      "body": [
        {
          "component": "TableHead",
          "slots": {
            "body": [
              {
                "component": "TableRow",
                "slots": {
                  "body": [
                    { "component": "TableHeaderCell", "props": { "sortKey": "date" }, "content": "date-label" },
                    { "component": "TableHeaderCell", "props": { "sortKey": "payee" }, "content": "payee-label" },
                    { "component": "TableHeaderCell", "props": { "sortKey": "amount", "numeric": true }, "content": "amount-label" }
                  ]
                }
              }
            ]
          }
        },
        {
          "component": "TableBody",
          "slots": {
            "body": [
              {
                "component": "TableRow",
                "slots": {
                  "body": [
                    { "component": "TableCell", "content": "date-cell" },
                    { "component": "TableCell", "content": "payee-cell" },
                    { "component": "TableCell", "props": { "numeric": true }, "content": "amount-cell" }
                  ]
                }
              }
            ]
          }
        }
      ]
    }
  },
  "parameters": [],
  "content": {
    "date-label": "Date",
    "payee-label": "Payee",
    "amount-label": "Amount",
    "date-cell": "[one row per record]",
    "payee-cell": "[put the row-actions menu in the last cell]",
    "amount-cell": "[numeric columns align right and use tabular figures]"
  },
  "gaps": []
}
```

In `packages/react/patterns/table-pagination.json`, change only the last line:

```json
  "gaps": []
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @handamade/psi-react test -- patterns`
Expected: PASS

Run: `pnpm build && node -e "const p=require('./packages/react/dist/patterns.json');const l=Array.isArray(p)?p:(p.patterns||Object.values(p));console.log(l.filter(x=>x.blocked).map(x=>x.id).join(', ')||'none blocked')"`
Expected: `action-feedback, detail-drawer, tabbed-workspace` — the three cycles 3–5 own. `data-table` and `table-pagination` must **not** appear.

- [ ] **Step 5: Commit**

```bash
git add packages/react/patterns
git commit -m "feat(react): unblock data-table and table-pagination (D62-D63)"
```

---

### Task 11: Documentation counts

**Files:**
- Modify: `README.md`, `packages/react/README.md`, `packages/react/llms.txt`, `packages/mcp/README.md`

**Interfaces:**
- Consumes: the manifest count from Task 9.
- Produces: prose consistent with the manifest, so `check-docs-drift` passes.

`check-docs-drift` is its own CI step, **not** part of `build`/`test`/`lint`. It matches `/(\d+) React 19 components/` in exactly the four files above. The pattern count stays 13, so the three pattern-count files need no edit.

- [ ] **Step 1: Run the drift check to see it fail**

Run: `node tools/check-docs-drift.mjs`
Expected: FAIL — reports the four files still stating 18 while the manifest has 25.

- [ ] **Step 2: Find every occurrence**

Run: `grep -rn "18 React 19 components" README.md packages/react/README.md packages/react/llms.txt packages/mcp/README.md`
Expected: one hit per file.

- [ ] **Step 3: Update each to 25**

Change `18 React 19 components` to `25 React 19 components` in all four. While in `packages/react/llms.txt`, add Table and Pagination to any component inventory it lists — the drift tool only checks the number, but a list that omits them misleads the agent the file exists for.

- [ ] **Step 4: Run the drift check to verify it passes**

Run: `node tools/check-docs-drift.mjs`
Expected: PASS — `docs drift check passed: 25 components, 13 patterns stated consistently`

- [ ] **Step 5: Commit**

```bash
git add README.md packages/react/README.md packages/react/llms.txt packages/mcp/README.md
git commit -m "docs: component count 18 -> 25 for the Table family and Pagination"
```

---

### Task 12: `apps/ledger` — the acceptance target

**Files:**
- Create: `apps/ledger/package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/fixture.ts`, `src/TransactionsScreen.tsx`

**Interfaces:**
- Consumes: everything shipped above, through the package's public entry points.
- Produces: a running screen. `apps/*` is already globbed in `pnpm-workspace.yaml`; no workspace edit is needed.

This is where controlled-only gets proved rather than asserted: the screen owns sort, selection and page state and does its own filtering.

- [ ] **Step 1: Scaffold the app**

Create `apps/ledger/package.json`:

```json
{
  "name": "ledger",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@handamade/psi-react": "workspace:*",
    "@handamade/psi-tokens": "workspace:*",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.4.1",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

Create `apps/ledger/vite.config.ts` (port differs from promo's 5199):

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: { port: 5200, strictPort: true },
});
```

Create `apps/ledger/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "rootDir": "src",
    "noEmit": true,
    "declaration": false,
    "declarationMap": false,
    "sourceMap": false,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

Create `apps/ledger/index.html`:

```html
<!doctype html>
<html lang="en" data-psi-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ledger — Psi coverage target</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `apps/ledger/src/main.tsx`. All four token CSS files are imported, `utilities.css` included — it carries `.psi-container` and the reduced-motion zeroing, and is REQUIRED:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@handamade/psi-tokens/base.css";
import "@handamade/psi-tokens/light.css";
import "@handamade/psi-tokens/components.css";
import "@handamade/psi-tokens/utilities.css";
import { TransactionsScreen } from "./TransactionsScreen.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TransactionsScreen />
  </StrictMode>,
);
```

Those four specifiers are verified: `packages/tokens/package.json` maps `"./*.css"` to `"./dist/*.css"`, and `apps/promo/src/main.tsx:4-10` imports them in exactly this form.

- [ ] **Step 2: Write the fixture**

Create `apps/ledger/src/fixture.ts`:

```ts
export interface Transaction {
  id: string;
  date: string;
  payee: string;
  category: string;
  amount: number;
}

const PAYEES = [
  ["Acme Corp", "Supplies"], ["Globex", "Software"], ["Initech", "Consulting"],
  ["Umbrella Ltd", "Insurance"], ["Soylent Foods", "Catering"], ["Hooli", "Hosting"],
  ["Stark Industries", "Equipment"], ["Wayne Enterprises", "Legal"],
] as const;

/** 40 deterministic rows — no randomness, so VR and the eval are stable. */
export const TRANSACTIONS: Transaction[] = Array.from({ length: 40 }, (_, i) => {
  const [payee, category] = PAYEES[i % PAYEES.length];
  const day = (i % 28) + 1;
  return {
    id: `t${i + 1}`,
    date: `2026-07-${String(day).padStart(2, "0")}`,
    payee,
    category,
    amount: Math.round(((i * 337) % 12000) * 100) / 100 - (i % 5 === 0 ? 480 : 0),
  };
});

export const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
```

- [ ] **Step 3: Write the screen**

Create `apps/ledger/src/TransactionsScreen.tsx`:

```tsx
import { useMemo, useState } from "react";
import {
  Button, Field, Input, Menu, MenuItem, MenuSeparator, IconButton, Pagination,
  Panel, Select, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
  Tag, Toolbar,
} from "@handamade/psi-react";
import type { TableSortState } from "@handamade/psi-react";
import { TRANSACTIONS, currency } from "./fixture.js";

export function TransactionsScreen() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TableSortState | null>({ key: "date", direction: "desc" });
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Table renders what it is given; filtering, sorting and slicing are the
  // app's. This is what controlled-only buys — the same code works unchanged
  // against a server that does all three.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = q
      ? TRANSACTIONS.filter((t) => t.payee.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
      : TRANSACTIONS;
    if (!sort) return rows;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sort.key as keyof typeof a];
      const bv = b[sort.key as keyof typeof b];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [query, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  return (
    <main className="psi-container">
      <h1>Transactions</h1>

      {/* filter-toolbar */}
      <Toolbar aria-label="Filters" gap={12}>
        <Field label="Search">
          <Input
            size={32}
            value={query}
            onChange={(e) => { setQuery(e.currentTarget.value); setPage(1); }}
          />
        </Field>
      </Toolbar>

      {/* bulk-action-bar */}
      {selected.size > 0 && (
        <Toolbar gap={12}>
          <Tag variant="accent" subtle>{selected.size} selected</Tag>
          <Button variant="neutral">Export</Button>
          <Button variant="danger-subtle">Delete</Button>
          <Button variant="ghost" onClick={() => setSelected(new Set())}>Clear selection</Button>
        </Toolbar>
      )}

      {rows.length === 0 ? (
        /* empty-state */
        <Panel padding={24}>
          <p>Nothing matches these filters.</p>
          <p>Try a broader search — the dataset has {TRANSACTIONS.length} transactions.</p>
          <Button variant="neutral" onClick={() => { setQuery(""); setPage(1); }}>Clear filters</Button>
        </Panel>
      ) : (
        <>
          {/* data-table */}
          <Table
            sortable
            selectable
            stickyHeader
            sort={sort}
            onSortChange={(next) => { setSort(next); setPage(1); }}
            selected={selected}
            onSelectionChange={setSelected}
          >
            <TableHead>
              <TableRow>
                <TableHeaderCell sortKey="date">Date</TableHeaderCell>
                <TableHeaderCell sortKey="payee">Payee</TableHeaderCell>
                <TableHeaderCell sortKey="category">Category</TableHeaderCell>
                <TableHeaderCell sortKey="amount" numeric>Amount</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id} rowId={t.id} selectLabel={`Select ${t.date} ${t.payee}`}>
                  <TableCell>{t.date}</TableCell>
                  <TableCell>{t.payee}</TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell numeric>{currency(t.amount)}</TableCell>
                  <TableCell>
                    {/* row-actions */}
                    <Menu
                      open={openMenu === t.id}
                      onClose={() => setOpenMenu(null)}
                      aria-label={`Actions for ${t.payee}`}
                      trigger={
                        <IconButton
                          aria-label={`Actions for ${t.payee}`}
                          size={32}
                          variant="ghost"
                          onClick={() => setOpenMenu(openMenu === t.id ? null : t.id)}
                        >
                          <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
                            <circle cx="8" cy="3" r="1.4" fill="currentColor" />
                            <circle cx="8" cy="8" r="1.4" fill="currentColor" />
                            <circle cx="8" cy="13" r="1.4" fill="currentColor" />
                          </svg>
                        </IconButton>
                      }
                    >
                      <MenuItem onSelect={() => setOpenMenu(null)}>View details</MenuItem>
                      <MenuSeparator />
                      <MenuItem variant="danger" onSelect={() => setOpenMenu(null)}>Void</MenuItem>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* table-pagination */}
          <Toolbar gap={12}>
            <Field label="Rows per page">
              <Select
                size={32}
                value={String(pageSize)}
                onChange={(e) => { setPageSize(Number(e.currentTarget.value)); setPage(1); }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </Select>
            </Field>
            <Pagination page={current} pageCount={pageCount} onPageChange={setPage} />
          </Toolbar>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 4: Install and type-check**

Run: `pnpm install`
Expected: the new workspace package is linked.

Run: `pnpm --filter ledger build`
Expected: PASS — `tsc` clean, then Vite builds.

Any type error here is a genuine API problem, not a fixture problem. Fix the component, not the screen — this app is the acceptance test.

- [ ] **Step 5: Run the app and verify it in a browser**

Add an entry to `.claude/launch.json` (create the file if absent) pointing `runtimeExecutable` at `apps/ledger/node_modules/.bin/vite` — **not** at pnpm, which `preview_start` runs under Node 20 and which dies with `ERR_UNKNOWN_BUILTIN_MODULE`:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "ledger", "runtimeExecutable": "apps/ledger/node_modules/.bin/vite", "runtimeArgs": ["--config", "apps/ledger/vite.config.ts"], "port": 5200 }
  ]
}
```

Start the preview, then verify in the browser: sort by Amount and confirm the arrow and `aria-sort` move; select two rows and confirm the bulk bar appears with the right count; page forward and confirm the row set changes; type a nonsense query and confirm the empty state renders. Check the console for errors.

- [ ] **Step 6: Commit**

```bash
git add apps/ledger .claude/launch.json
git commit -m "feat(ledger): transactions screen as the cycle 2 acceptance target (D62-D63)"
```

---

### Task 13: Changeset and the four gates

**Files:**
- Create: `.changeset/table-family.md`

**Interfaces:**
- Consumes: everything.
- Produces: a minor changeset across the three packages in lockstep.

- [ ] **Step 1: Write the changeset**

`packages/*` are versioned in lockstep at one number. New components are a **minor**, not a patch.

Create `.changeset/table-family.md`:

```markdown
---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

Table family and Pagination — ledger arc cycle 2 (D62–D63).

`Table` ships as a compound family of six — `Table`, `TableHead`, `TableBody`,
`TableRow`, `TableHeaderCell`, `TableCell` — rendering native table semantics.
It holds no state: `sort`/`onSortChange` and `selected`/`onSelectionChange` are
controlled, extending D50 and D53, so the same code works against a server that
sorts and paginates. `numeric` cells align right *and* render tabular figures
through the new `--psi-font-variant-numeric` token, also exposed as a
`.psi-tabular` utility.

`Pagination` is a standalone numbered pager with ellipsis truncation,
`aria-current="page"`, and a labelled `nav` landmark.

`Checkbox` now declares `aria-label` on its own props interface (applying D60),
so a table's row-selection checkbox is both nameable and discoverable in the
manifest.

The `data-table` and `table-pagination` patterns are unblocked and render
presets. `data-table`'s `head` slot was removed: only `body` yields children,
so a `head` slot rendered as a prop rather than a header row.
```

- [ ] **Step 2: Run all four gates**

Run: `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint`
Expected: all PASS.

If `check-docs-drift` fails here, Task 11 missed a file — re-run its grep across the whole repo, not just the four known paths.

- [ ] **Step 3: Commit and push**

```bash
git add .changeset/table-family.md
git commit -m "chore: changeset for the Table family and Pagination (D62-D63)"
git push -u origin d62-table-family
```

- [ ] **Step 4: Open the PR and arm auto-merge**

```bash
gh pr create --base main --title "feat: Table family + Pagination — ledger arc cycle 2 (D62–D63)" --body "Implements docs/superpowers/specs/2026-08-05-table-family-design.md"
```

Then arm auto-merge and **read it back** — `gh pr merge --auto` exits 0 while leaving it off:

```bash
gh pr merge <n> --auto --squash
gh pr view <n> --json autoMergeRequest
```

If it reports `null`, use the `enablePullRequestAutoMerge` GraphQL mutation.

- [ ] **Step 5: Collect VR baselines from CI**

The `vr` job will fail on this first run: five Table stories and three Pagination stories have no baselines. Download the `vr-baselines` artifact from that run, unpack it — it lands in `vr/stories.spec.ts-snapshots/`, not a top-level directory — copy in the new PNGs, and **delete any orphaned baselines** for stories that no longer exist (the artifact carries them because it comes from CI's checkout, and nothing fails on an orphan).

```bash
git add apps/storybook/vr
git commit -m "test(vr): baselines for Table and Pagination stories"
git push
```

---

## Self-Review

**Spec coverage.** Every section of the spec maps to a task: D62's family and controlled-only → Tasks 4–7; the numerals token → Task 1; D63's Pagination → Task 8; the D60 `Checkbox` application → Task 3; the token family and the new contrast pair → Task 2; accessibility → Tasks 5, 6, 9; pattern revisions → Task 10; `apps/ledger` → Task 12; gates and drift → Tasks 11 and 13. The spec's "Out of scope" list is not implemented anywhere, which is correct.

**Type consistency.** `TableSortState` is defined in `Table.tsx` (Task 4) and imported by `TableContext.ts` (Task 5), the tests, the stories and the app — one definition, one name throughout. `paginationRange` keeps the same signature in its test and its implementation. `selected` is `ReadonlySet<string>` everywhere, never `Set<string>` or `string[]`. `rowId` is the selection key in `TableRow`, `TableBody`'s registry and the app.

**Known ordering hazard.** Task 6's `TableHead` reads `children.props.children` to inject the select-all cell. That assumes the consumer passes exactly one `TableRow`. If a subagent finds this brittle when writing a multi-row header, the fix is `Children.map` over the head's rows and prepending to the first — not changing the public API.
