# Ledger arc, cycle 1 — the machine-readable surface

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship D60 (IconButton promotes `aria-label` as required; Input promotes `type`) and author the ledger patterns, so `dist/patterns.json` carries the real component backlog for the rest of the D59 arc.

**Architecture:** No new components and no build-script changes. A component promotes a native prop by declaring it on its own props interface — `react-docgen-typescript`'s `propFilter` in `emit-manifest.ts` keeps any prop whose parent file is not `node_modules`, so a redeclaration lifts the prop into the manifest. `Menu.tsx:53` already does this with `"aria-label"?: string`. Patterns are authored as JSON in `packages/react/patterns/`; components they need but which do not exist are listed in each pattern's `gaps` array, which `validatePatterns` skips and `emitPatterns` reports as the backlog.

**Tech Stack:** TypeScript 5.7+, React 19, vitest, tsx, react-docgen-typescript, changesets.

## Global Constraints

- **Node 24.** Run `nvm use` (reads `.nvmrc`) before the first pnpm command. Do not prefix individual commands with a PATH override.
- **No new runtime dependencies.** `psi-react` keeps `deps: {}`.
- **Never hardcode colors in component CSS** — bind `var(--psi-*)`. (No CSS changes are expected in this cycle.)
- **Sizes are px numbers** (`24 | 32 | 40 | 48`), never S/M/L. Variants are flat.
- **Pattern content values must be JSX-safe** — no `<` or `{` (validator error class 9). Mark copy the consumer must replace with `[square brackets]`.
- **This cycle ships no new components.** If a task appears to need one, it declares a `gap`; it does not build one.
- **Every user-visible change carries a changeset**; `packages/*` version in lockstep.
- Verify with `pnpm build`, `pnpm test`, `pnpm lint`. `pnpm vr` only passes in CI — do not run it locally.

## File Structure

| File | Responsibility |
|---|---|
| `packages/react/src/IconButton/IconButton.tsx` | Modify: redeclare `aria-label` as a required prop |
| `packages/react/src/IconButton/IconButton.test.tsx` | Modify: guard the accessible-name contract |
| `packages/react/src/Input/Input.tsx` | Modify: declare `type` as a curated literal union |
| `packages/react/src/Input/Input.test.tsx` | Modify: guard `type` passthrough |
| `packages/react/patterns/row-actions.json` | Modify: kebab `IconButton` trigger; drop the limitation prose from `intent` |
| `packages/react/patterns/date-range-filter.json` | Create: from/to native date pair |
| `packages/react/patterns/data-table.json` | Create: declares gap `Table` |
| `packages/react/patterns/table-pagination.json` | Create: declares gap `Pagination` |
| `packages/react/patterns/detail-drawer.json` | Create: declares gap `Drawer` |
| `packages/react/patterns/action-feedback.json` | Create: declares gap `Toast` |
| `packages/react/patterns/tabbed-workspace.json` | Create: declares gap `Tabs` |
| `packages/react/patterns/bulk-action-bar.json` | Create: predicted zero-gap |
| `packages/react/patterns/empty-state.json` | Create: predicted zero-gap |
| `packages/react/patterns/summary-tiles.json` | Create: predicted zero-gap |
| `.changeset/ledger-backlog-cycle.md` | Create: minor bump, D60 |

**Reference — current slot contracts** (from `dist/manifest.json`, needed to write valid `compose` trees):

```
Panel:   body[1..*]
Field:   label[0..1]  body[1..*]  description[0..1]
Dialog:  title[0..1 inline-content]  body[0..*]  footer[0..* Button|inline-content]
Toolbar: body[0..*]
Menu:    trigger[1..1 interactive]  body[1..* MenuItem|MenuSeparator]
contracts.json: interactive = [Button, IconButton, Menu]; inline-content = [Tag, IconButton]
```

`Card`, `Button`, `Panel` and `Toolbar` do **not** declare `children` in the manifest — give those nodes text via the node's bare `content` key, never a `children` prop.

---

### Task 1: IconButton promotes `aria-label` (required)

**Files:**
- Modify: `packages/react/patterns/row-actions.json`
- Modify: `packages/react/src/IconButton/IconButton.tsx:12-27`
- Test: `packages/react/src/IconButton/IconButton.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `IconButtonProps` with `"aria-label": string` (required, no `?`). Later tasks may use `IconButton` inside a `Menu` `trigger` slot, which the `interactive` contract already permits.

The failing test here is the repo's own build gate: `emitPatterns` throws `unknown prop "aria-label" on component "IconButton"` when a pattern sets a prop the manifest does not list. Editing the pattern first is the red step.

- [ ] **Step 1: Write the failing test — switch `row-actions` to a kebab trigger**

Replace the whole of `packages/react/patterns/row-actions.json` with:

```json
{
  "id": "row-actions",
  "intent": "List or table row with an icon-only actions menu, including a destructive item — hand the destructive item's confirmation off to the destructive-confirm pattern",
  "match": ["row actions", "per-row actions", "table row menu", "actions menu", "row action list"],
  "compose": {
    "component": "Menu",
    "props": { "placement": "{param:placement}", "aria-label": "{content:trigger-label}" },
    "slots": {
      "trigger": [
        {
          "component": "IconButton",
          "props": { "variant": "ghost", "aria-label": "{content:trigger-label}" }
        }
      ],
      "body": [
        { "component": "MenuItem", "content": "edit-label" },
        { "component": "MenuItem", "content": "duplicate-label" },
        { "component": "MenuSeparator" },
        { "component": "MenuItem", "props": { "variant": "danger" }, "content": "delete-label" }
      ]
    }
  },
  "parameters": [
    {
      "key": "placement",
      "ask": "Which side should the menu open on?",
      "options": ["bottom-start", "bottom-end"],
      "default": "bottom-end"
    }
  ],
  "content": {
    "trigger-label": "Actions",
    "edit-label": "Edit",
    "duplicate-label": "Duplicate",
    "delete-label": "Delete"
  },
  "gaps": []
}
```

- [ ] **Step 2: Run the build to verify it fails**

Run: `pnpm --filter @handamade/psi-react build`
Expected: FAIL during `emit-patterns` with
`pattern "row-actions": compose.slots.trigger[0]: unknown prop "aria-label" on component "IconButton"`

If it fails with a *different* message, stop and report — the assumption that only the prop is missing is wrong.

- [ ] **Step 3: Declare the prop on IconButtonProps**

In `packages/react/src/IconButton/IconButton.tsx`, add the prop as the first member of the interface (replace lines 12-14 opening):

```ts
export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name for the icon-only control. Required: an IconButton has
   * no text to name it, so omitting this ships an unnameable button (D60).
   * If you also pass `aria-labelledby`, that wins per the accname algorithm. */
  "aria-label": string;
  /** Visual variant. @default "neutral" */
  variant?: Variant;
```

Leave the rest of the interface unchanged. Redeclaring an optional inherited prop as required is legal — `string` is assignable to `string | undefined`.

- [ ] **Step 4: Run the build to verify it passes**

Run: `pnpm --filter @handamade/psi-react build`
Expected: PASS, ending with `[react] wrote dist/patterns.json (4 patterns)` — this task modifies `row-actions`, it does not add a pattern.

Then confirm the prop landed and is required:

Run: `node -p "require('./packages/react/dist/manifest.json').components.find(c=>c.name==='IconButton').props.find(p=>p.name==='aria-label')"`
Expected: an object with `required: true`.

- [ ] **Step 5: Guard the contract with a unit test**

Append to `packages/react/src/IconButton/IconButton.test.tsx`:

```tsx
it("exposes its accessible name from aria-label", () => {
  render(
    <IconButton aria-label="Row actions">
      <svg aria-hidden="true" />
    </IconButton>,
  );
  expect(screen.getByRole("button", { name: "Row actions" })).toBeInTheDocument();
});
```

- [ ] **Step 6: Run the tests**

Run: `pnpm test -- IconButton`
Expected: PASS, all IconButton tests green.

- [ ] **Step 7: Typecheck every call site**

Run: `pnpm build`
Expected: PASS. Every existing `<IconButton>` in the repo already passes `aria-label` (verified across `Dialog.tsx:102`, `apps/promo/src/sections/Playground.tsx` ×4, and the IconButton tests), so no call site needs updating. If `tsc` reports a missing `aria-label` anywhere, add a descriptive one at that call site — never `aria-label=""`.

- [ ] **Step 8: Commit**

```bash
git add packages/react/src/IconButton packages/react/patterns/row-actions.json
git commit -m "feat(react): IconButton promotes aria-label as a required prop (D60)

An icon-only control has no text to name it, but aria-label was inherited
from ButtonHTMLAttributes and therefore dropped by the manifest propFilter.
Agents reading manifest.json had no discoverable way to name an IconButton,
and row-actions documented the limitation in prose while shipping a text
Button trigger instead of a kebab.

Declaring the prop on IconButtonProps lifts it past the propFilter, the same
mechanism Menu already uses for aria-label."
```

---

### Task 2: Input promotes `type`, and the date-range filter pattern

**Files:**
- Create: `packages/react/patterns/date-range-filter.json`
- Modify: `packages/react/src/Input/Input.tsx:6-15`
- Test: `packages/react/src/Input/Input.test.tsx`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `InputType` — the exported union `"text" | "search" | "email" | "tel" | "url" | "password" | "number" | "date"` — and `InputProps["type"]?: InputType`. Task 5 does not use it; no later task depends on it.

- [ ] **Step 1: Write the failing test — author the pattern that needs `type`**

Create `packages/react/patterns/date-range-filter.json`:

```json
{
  "id": "date-range-filter",
  "intent": "From/to date pair for narrowing a dated list — native date inputs, no calendar widget",
  "match": ["date range filter", "from to date", "date filter", "period filter", "filter by date"],
  "compose": {
    "component": "Toolbar",
    "props": { "gap": 12 },
    "slots": {
      "body": [
        {
          "component": "Field",
          "slots": {
            "label": ["{content:from-label}"],
            "body": [{ "component": "Input", "props": { "type": "date", "size": 32 } }]
          }
        },
        {
          "component": "Field",
          "slots": {
            "label": ["{content:to-label}"],
            "body": [{ "component": "Input", "props": { "type": "date", "size": 32 } }]
          }
        }
      ]
    }
  },
  "parameters": [],
  "content": { "from-label": "From", "to-label": "To" },
  "gaps": []
}
```

- [ ] **Step 2: Run the build to verify it fails**

Run: `pnpm --filter @handamade/psi-react build`
Expected: FAIL with
`pattern "date-range-filter": compose.slots.body[0].slots.body[0]: unknown prop "type" on component "Input"`

- [ ] **Step 3: Declare the union on InputProps**

In `packages/react/src/Input/Input.tsx`, add the type alias below the existing `Size` alias (line 6) and the prop inside `InputProps`:

```ts
type Size = 24 | 32 | 40 | 48;

/** Input types Psi's Input supports. Deliberately narrower than the native
 * `HTMLInputTypeAttribute`: checkbox/radio/file/submit are separate controls
 * (Checkbox, Switch, Button), not variants of a text field (D60). */
export type InputType =
  | "text"
  | "search"
  | "email"
  | "tel"
  | "url"
  | "password"
  | "number"
  | "date";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Input type. @default "text" */
  type?: InputType;
  /** Height in px (24 | 32 | 40 | 48). @default 32 */
  size?: Size;
```

Leave `error`, `ref` and the component body unchanged — `type` flows through the existing `...rest` spread.

The `Omit<..., "type">` is required: without it the inherited wide `type` and the narrow redeclaration conflict and `tsc` errors.

- [ ] **Step 4: Run the build to verify it passes**

Run: `pnpm --filter @handamade/psi-react build`
Expected: PASS, ending with `[react] wrote dist/patterns.json (5 patterns)`

Confirm the union reached the manifest as literal values, not the alias name:

Run: `node -p "require('./packages/react/dist/manifest.json').components.find(c=>c.name==='Input').props.find(p=>p.name==='type').type"`
Expected: `"text" | "search" | "email" | "tel" | "url" | "password" | "number" | "date"`

If it prints `InputType` instead, `shouldExtractLiteralValuesFromEnum` did not expand it — stop and report rather than working around it.

- [ ] **Step 5: Guard it with a unit test**

Append to `packages/react/src/Input/Input.test.tsx`:

```tsx
it("passes type through to the native input", () => {
  render(<Input type="date" aria-label="From" />);
  expect(screen.getByLabelText("From")).toHaveAttribute("type", "date");
});
```

- [ ] **Step 6: Run the tests**

Run: `pnpm test -- Input`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/react/src/Input packages/react/patterns/date-range-filter.json
git commit -m "feat(react): Input promotes type as a curated union; date-range-filter pattern (D60)

type was inherited from InputHTMLAttributes and dropped by the manifest
propFilter, so <Input type=\"date\"> was invisible to agents and date
filtering read as a missing component. The union is deliberately narrower
than HTMLInputTypeAttribute: checkbox/radio/file/submit are separate Psi
controls, not variants of a text field.

date-range-filter is the first ledger pattern and needs no new component —
the D15 precedent (styled native select) applies to dates too."
```

---

### Task 3: The Table-tier gap patterns

**Files:**
- Create: `packages/react/patterns/data-table.json`
- Create: `packages/react/patterns/table-pagination.json`

**Interfaces:**
- Consumes: `IconButton` with `aria-label` from Task 1 (the `row-actions` reference in `data-table`'s intent assumes the kebab trigger).
- Produces: gap entries `Table` and `Pagination` in `dist/patterns.json`, which cycle 2 consumes as its brief.

Gap nodes are unconstrained — the validator skips prop and slot checking for any component named in `gaps`. That is what lets these patterns describe a component that does not exist yet. Non-gap children nested inside them are still validated normally, so keep those valid.

- [ ] **Step 1: Author `data-table.json`**

```json
{
  "id": "data-table",
  "intent": "Sortable, selectable table of records with numeric columns and a per-row actions menu — compose the row menu from the row-actions pattern",
  "match": ["data table", "transactions table", "sortable table", "records table", "list of transactions"],
  "compose": {
    "component": "Table",
    "props": { "selectable": true, "sortable": true },
    "slots": {
      "head": ["{content:columns-note}"],
      "body": ["{content:rows-note}"]
    }
  },
  "parameters": [],
  "content": {
    "columns-note": "[one header cell per column; numeric columns align right]",
    "rows-note": "[one row per record; put the row-actions menu in the last cell]"
  },
  "gaps": ["Table"]
}
```

- [ ] **Step 2: Author `table-pagination.json`**

```json
{
  "id": "table-pagination",
  "intent": "Page-size selector and page range control beneath a data table",
  "match": ["pagination", "table pagination", "page controls", "rows per page", "paging"],
  "compose": {
    "component": "Toolbar",
    "props": { "gap": 12 },
    "slots": {
      "body": [
        {
          "component": "Field",
          "slots": {
            "label": ["{content:page-size-label}"],
            "body": [{ "component": "Select", "props": { "size": 32 } }]
          }
        },
        { "component": "Pagination" }
      ]
    }
  },
  "parameters": [],
  "content": { "page-size-label": "Rows per page" },
  "gaps": ["Pagination"]
}
```

- [ ] **Step 3: Run the build to verify both validate and report as gaps**

Run: `pnpm --filter @handamade/psi-react build`
Expected: PASS, and the log includes both backlog lines:

```
  pattern gaps (backlog): data-table → Table
  pattern gaps (backlog): table-pagination → Pagination
```

- [ ] **Step 4: Verify they emit as blocked with no preset**

Run: `node -p "require('./packages/react/dist/patterns.json').patterns.filter(p=>p.blocked).map(p=>p.id+' -> '+p.gaps.join(',')).join('\n')"`
Expected:
```
data-table -> Table
table-pagination -> Pagination
```

- [ ] **Step 5: Commit**

```bash
git add packages/react/patterns/data-table.json packages/react/patterns/table-pagination.json
git commit -m "feat(patterns): data-table and table-pagination declare the Table tier (D59)

First use of D47's gaps field since it was built. patterns.json now carries
Table and Pagination as machine-readable backlog entries rather than
intentions in a spec."
```

---

### Task 4: The overlay and feedback gap patterns

**Files:**
- Create: `packages/react/patterns/detail-drawer.json`
- Create: `packages/react/patterns/action-feedback.json`
- Create: `packages/react/patterns/tabbed-workspace.json`

**Interfaces:**
- Consumes: nothing from Tasks 1–3.
- Produces: gap entries `Drawer`, `Toast`, `Tabs`.

- [ ] **Step 1: Author `detail-drawer.json`**

```json
{
  "id": "detail-drawer",
  "intent": "Side sheet showing one record's detail, opened from a table row, with its primary actions in a footer",
  "match": ["detail drawer", "side sheet", "row detail", "slide-over", "record detail panel"],
  "compose": {
    "component": "Drawer",
    "props": { "side": "{param:side}" },
    "slots": {
      "title": ["{content:title}"],
      "body": ["{content:body-note}"],
      "footer": [
        { "component": "Button", "props": { "variant": "accent" }, "content": "primary-label" },
        { "component": "Button", "props": { "variant": "neutral" }, "content": "dismiss-label" }
      ]
    }
  },
  "parameters": [
    {
      "key": "side",
      "ask": "Which edge should the drawer open from?",
      "options": ["end", "start"],
      "default": "end"
    }
  ],
  "content": {
    "title": "[record title]",
    "body-note": "[key-value summary of the selected record]",
    "primary-label": "Save",
    "dismiss-label": "Close"
  },
  "gaps": ["Drawer"]
}
```

- [ ] **Step 2: Author `action-feedback.json`**

```json
{
  "id": "action-feedback",
  "intent": "Transient confirmation after a completed action, with an optional undo affordance",
  "match": ["toast", "snackbar", "action feedback", "confirmation message", "undo toast"],
  "compose": {
    "component": "Toast",
    "props": { "variant": "{param:variant}" },
    "slots": {
      "body": ["{content:message}"],
      "action": [{ "component": "Button", "props": { "variant": "ghost" }, "content": "undo-label" }]
    }
  },
  "parameters": [
    {
      "key": "variant",
      "ask": "What kind of outcome is being confirmed?",
      "options": ["success", "danger", "neutral"],
      "default": "success"
    }
  ],
  "content": {
    "message": "[what just happened]",
    "undo-label": "Undo"
  },
  "gaps": ["Toast"]
}
```

- [ ] **Step 3: Author `tabbed-workspace.json`**

```json
{
  "id": "tabbed-workspace",
  "intent": "Tab set switching between sibling views of the same workspace, such as accounts or saved filters",
  "match": ["tabs", "tabbed view", "switch between accounts", "tab bar", "segmented views"],
  "compose": {
    "component": "Tabs",
    "props": { "orientation": "{param:orientation}" },
    "slots": {
      "list": ["{content:tabs-note}"],
      "panels": ["{content:panels-note}"]
    }
  },
  "parameters": [
    {
      "key": "orientation",
      "ask": "How should the tab list be laid out?",
      "options": ["horizontal", "vertical"],
      "default": "horizontal"
    }
  ],
  "content": {
    "tabs-note": "[one tab per view; keep labels to one or two words]",
    "panels-note": "[one panel per tab, in the same order]"
  },
  "gaps": ["Tabs"]
}
```

- [ ] **Step 4: Run the build**

Run: `pnpm --filter @handamade/psi-react build`
Expected: PASS, log includes:

```
  pattern gaps (backlog): action-feedback → Toast
  pattern gaps (backlog): detail-drawer → Drawer
  pattern gaps (backlog): tabbed-workspace → Tabs
```

- [ ] **Step 5: Commit**

```bash
git add packages/react/patterns/detail-drawer.json packages/react/patterns/action-feedback.json packages/react/patterns/tabbed-workspace.json
git commit -m "feat(patterns): detail-drawer, action-feedback and tabbed-workspace declare the overlay tier (D59)

Completes the predicted backlog: Drawer, Toast, Tabs. Whether Drawer is a
component or a Dialog placement is left to its own cycle — the pattern
declares the need, not the implementation."
```

---

### Task 5: The predicted zero-gap patterns (hypothesis test)

**Files:**
- Create: `packages/react/patterns/bulk-action-bar.json`
- Create: `packages/react/patterns/empty-state.json`
- Create: `packages/react/patterns/summary-tiles.json`

**Interfaces:**
- Consumes: nothing.
- Produces: either three zero-gap patterns (spec prediction holds) or new gap entries (prediction refuted — an equally valid outcome that must be recorded, not worked around).

D59 predicts these three need **no** new component. This task tests that prediction. If a pattern cannot be expressed with existing components, add the missing component to its `gaps` array and note it in the commit message — that is the mechanism working, not a failure.

- [ ] **Step 1: Author `bulk-action-bar.json`**

```json
{
  "id": "bulk-action-bar",
  "intent": "Bar that appears when table rows are selected: selection count, bulk actions, and a clear-selection control",
  "match": ["bulk actions", "selection bar", "batch actions", "selected rows toolbar"],
  "compose": {
    "component": "Toolbar",
    "props": { "gap": 12 },
    "slots": {
      "body": [
        { "component": "Tag", "props": { "variant": "accent", "subtle": true }, "content": "count-label" },
        { "component": "Button", "props": { "variant": "neutral" }, "content": "export-label" },
        { "component": "Button", "props": { "variant": "danger-subtle" }, "content": "delete-label" },
        { "component": "Button", "props": { "variant": "ghost" }, "content": "clear-label" }
      ]
    }
  },
  "parameters": [],
  "content": {
    "count-label": "[n] selected",
    "export-label": "Export",
    "delete-label": "Delete",
    "clear-label": "Clear selection"
  },
  "gaps": []
}
```

- [ ] **Step 2: Author `empty-state.json`**

```json
{
  "id": "empty-state",
  "intent": "Placeholder shown when a list has no results, distinguishing an empty filter from an empty dataset",
  "match": ["empty state", "no results", "nothing here", "zero state", "no data"],
  "compose": {
    "component": "Panel",
    "props": { "padding": 24 },
    "slots": {
      "body": [
        "{content:headline}",
        "{content:explanation}",
        { "component": "Button", "props": { "variant": "neutral" }, "content": "reset-label" }
      ]
    }
  },
  "parameters": [],
  "content": {
    "headline": "[nothing matches these filters]",
    "explanation": "[say whether the dataset is empty or the filters are too narrow]",
    "reset-label": "Clear filters"
  },
  "gaps": []
}
```

- [ ] **Step 3: Author `summary-tiles.json`**

```json
{
  "id": "summary-tiles",
  "intent": "Row of headline figures above a ledger — balances or totals, one Card per figure",
  "match": ["summary tiles", "stat cards", "kpi row", "balance cards", "totals row"],
  "compose": {
    "component": "Toolbar",
    "props": { "gap": 16 },
    "slots": {
      "body": [
        { "component": "Card", "props": { "variant": "stacked" }, "content": "tile-note" },
        { "component": "Card", "props": { "variant": "stacked" }, "content": "tile-note" }
      ]
    }
  },
  "parameters": [],
  "content": { "tile-note": "[label above, figure below]" },
  "gaps": []
}
```

- [ ] **Step 4: Run the build and read the outcome carefully**

Run: `pnpm --filter @handamade/psi-react build`

Two acceptable outcomes:

**A — prediction holds.** Build PASSES and the gap backlog lists only `Table`, `Pagination`, `Drawer`, `Toast`, `Tabs`. Continue to Step 5.

**B — prediction refuted.** Build FAILS with a validator error on one of these three (for example `unknown component`, an `unknown prop`, or a slot-contract violation). Do **not** reshape the pattern into something the existing components happen to allow — that hides a real gap. Instead:
1. Name the missing component in that pattern's `gaps` array.
2. Replace the offending node with the gap component.
3. Re-run the build; it should PASS with the new gap reported.
4. Record it in the Step 6 commit message and in the Task 6 changeset.

- [ ] **Step 5: Verify the full pattern inventory**

Run: `node -p "const p=require('./packages/react/dist/patterns.json').patterns; p.map(x=>x.id+(x.blocked?' [BLOCKED: '+x.gaps.join(',')+']':' [renderable]')).join('\n')"`

Expected with prediction A — 13 patterns (the 4 originals plus 9 new), sorted by `id`:

```
action-feedback [BLOCKED: Toast]
bulk-action-bar [renderable]
data-table [BLOCKED: Table]
date-range-filter [renderable]
destructive-confirm [renderable]
detail-drawer [BLOCKED: Drawer]
empty-state [renderable]
filter-toolbar [renderable]
row-actions [renderable]
settings-form-row [renderable]
summary-tiles [renderable]
tabbed-workspace [BLOCKED: Tabs]
table-pagination [BLOCKED: Pagination]
```

Note `tabbed-workspace` sorts before `table-pagination` (`tabb` < `tabl`).

- [ ] **Step 6: Commit**

```bash
git add packages/react/patterns/bulk-action-bar.json packages/react/patterns/empty-state.json packages/react/patterns/summary-tiles.json
git commit -m "feat(patterns): bulk-action-bar, empty-state and summary-tiles compose from shipped components (D59)

Tests D59's prediction that these three need no new component. Composing
them from Toolbar, Panel, Card, Button and Tag confirms it — the backlog
stays at five entries rather than eight."
```

If outcome B occurred, replace the final paragraph of that message with a statement of which component was missing and why the composition could not be expressed without it.

---

### Task 6: Changeset, docs, and the full gate

**Files:**
- Create: `.changeset/ledger-backlog-cycle.md`
- Modify (generated): `packages/react/docs/IconButton.md`, `packages/react/docs/Input.md`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: a merge-ready branch.

- [ ] **Step 1: Write the changeset**

Create `.changeset/ledger-backlog-cycle.md`:

```markdown
---
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
"@handamade/psi-mcp": minor
---

D60 — components promote essential native props into the manifest.

`IconButton` now declares `aria-label` as a **required** prop. It was
inherited from `ButtonHTMLAttributes` and therefore dropped by the manifest's
prop filter, so agents reading `manifest.json` had no discoverable way to name
an icon-only control. This is a type-level breaking change: TypeScript
consumers omitting `aria-label` will now see an error, which is the point —
the previous state shipped unnameable buttons silently.

`Input` now declares `type` as a curated union (`text | search | email | tel |
url | password | number | date`), deliberately narrower than the native
attribute: checkbox, radio, file and submit are separate Psi controls.

D59 — eight ledger patterns are authored, and `patterns.json` now carries a
machine-readable component backlog for the first time: `Table`, `Pagination`,
`Drawer`, `Toast`, `Tabs`. `row-actions` switches to the icon-only kebab
trigger it always wanted.
```

If Task 5 hit outcome B, add the extra gap(s) to the final sentence.

- [ ] **Step 2: Regenerate docs**

Run: `pnpm build`
Expected: PASS. `emit-docs` rewrites `packages/react/docs/IconButton.md` and `docs/Input.md` with the new props. These files are tracked, so the diff must be committed.

Run: `git status --short packages/react/docs`
Expected: `M packages/react/docs/IconButton.md` and `M packages/react/docs/Input.md`.

- [ ] **Step 3: Run the full gate**

```bash
pnpm build && pnpm test && pnpm lint
```

Expected: all three exit 0. Baseline before this cycle was 530 tests across 60 files; expect 532 (the two added in Tasks 1 and 2).

Do **not** run `pnpm vr` locally — macOS renders fail on the `-darwin` snapshot suffix and its update mode silently writes junk baselines. CI's `vr` job is the gate.

- [ ] **Step 4: Commit**

```bash
git add .changeset/ledger-backlog-cycle.md packages/react/docs
git commit -m "chore: changeset and regenerated docs for the ledger backlog cycle (D59-D60)"
```

- [ ] **Step 5: Open the PR and arm auto-merge**

```bash
git push -u origin d60-ledger-backlog-cycle
gh pr create --title "feat: ledger arc cycle 1 — the machine-readable surface (D59–D60)" --body "See docs/superpowers/plans/2026-08-05-ledger-backlog-cycle.md"
```

Then arm auto-merge **and read it back** — `gh pr merge --auto` exits 0 while leaving auto-merge off:

```bash
gh pr merge <n> --auto --squash
gh pr view <n> --json autoMergeRequest
```

If `autoMergeRequest` is `null`, use the `enablePullRequestAutoMerge` GraphQL mutation.

- [ ] **Step 6: Confirm the backlog is visible to agents**

After CI is green, verify the artifact an agent would actually read:

Run: `node -p "Object.entries(require('./packages/react/dist/patterns.json').patterns.filter(p=>p.blocked).reduce((a,p)=>{p.gaps.forEach(g=>a[g]=(a[g]||0)+1);return a},{})).sort((a,b)=>b[1]-a[1])"`

Expected: gap components ranked by how many patterns need them. **This ranking is cycle 2's build order** — the arc's next spec is written against it, not against the predictions in D59.

---

## Notes for the executor

- **The build is the test here.** Tasks 1 and 2 use `emitPatterns`' validator as the failing test, which is the repo's established enforcement point (D48). That is deliberate: a unit test asserting the manifest shape would duplicate a gate that already exists and runs on every build.
- **Do not add components.** If a pattern cannot be expressed, it declares a gap. Cycle 1's entire value is an honest backlog; a component built here to make a pattern renderable would defeat it.
- **Do not reshape a pattern to dodge a validator error** unless the error is a genuine authoring mistake (a typo'd prop name, a slot used out of contract). A pattern bending itself around missing components produces a false "renderable" and hides the gap.
