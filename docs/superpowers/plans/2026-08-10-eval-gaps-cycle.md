# Eval Gaps Cycle Implementation Plan (D78–D79)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the six documentation gaps the 2026-08-07 (b) eval run filed — fixing `Pagination`'s out-of-range rendering (D78) and giving the utility roster a machine-readable form (D79) along the way.

**Architecture:** Two code changes and four prose fixes. D79 makes `emit-utilities.ts` describe the spacing-driven utility families **once**, with both the CSS and the JSON roster generated from that description, so they cannot disagree. D78 gives `Pagination` an *effective page* clamped into `[1, pageCount]` that drives rendering, `aria-current`, the arrows' disabled state **and the pages the arrows emit**.

**Tech Stack:** TypeScript, React 19, vitest, Testing Library, tsx (tokens build), changesets.

**Spec:** `docs/superpowers/specs/2026-08-10-eval-gaps-cycle-design.md`

## Global Constraints

- **Node 24** (`.nvmrc`). Run `node -v` before the first pnpm command; pnpm 11.9 dies on Node 20. Fix a stale shell with `nvm use`, never a per-command PATH prefix.
- **Run single tests with `pnpm exec vitest run <path>`.** `pnpm --filter <pkg> test` **exits 0 having run nothing** — neither package defines a `test` script, only the root does.
- **`packages/react/docs/*.md` are generated and git-tracked.** Never hand-edit them; edit the TSDoc and re-run `pnpm build`.
- **`pnpm build` must precede `check-docs-drift`.** Drift reads `dist/manifest.json` and now *crashes* (`TypeError: Cannot read properties of undefined (reading 'length')`) rather than failing on a stale one, because it reads `manifest.icons`.
- **Prose names families; it never states a count.** A count in a hand-written file is a fresh drift liability — the exact class D76 spent a cycle removing.
- **Never hardcode colours in component CSS**; bind `var(--psi-*)`. Sizes are px numbers. Variants are the flat list.
- **Five gates, in order:** `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm test:site`. `vr` is CI's and must not move — this cycle adds no stories.
- **Every test is proven red before its fix.** A guard is verified by reproducing the failure it was built for, not by watching it pass.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `packages/tokens/scripts/emit-utilities.ts` | Modify: one description of the spacing families; add `emitUtilitiesRoster()` | 1, 2 |
| `packages/tokens/__tests__/emit-css.test.ts` | Modify: roster assertions | 1, 2 |
| `packages/tokens/scripts/build.ts:242` | Modify: merge roster into `guidance.json` | 2 |
| `packages/react/src/Pagination/Pagination.tsx` | Modify: effective page, warn, arrow handlers | 3 |
| `packages/react/src/Pagination/Pagination.test.tsx` | Modify: boundary tests | 3 |
| `packages/react/src/global.d.ts:6` | Modify: stale comment naming only Table.tsx | 3 |
| `packages/react/src/Table/Table.tsx:71-77` | Modify: `onSortChange` TSDoc | 4 |
| `packages/react/llms.txt` | Modify: lines 48, 76; new entries | 4, 6, 7 |
| `packages/react/patterns/data-table.json` | Modify: actions column | 5 |
| `.changeset/eval-gaps-cycle.md` | Create | 8 |

---

### Task 1: One description of the utility families, with byte-identical CSS

The refactor that makes D79 possible. `emitUtilitiesCSS()` currently hardcodes three near-identical loops. This replaces them with one descriptor both the CSS and (Task 2) the roster read. **The whole point of this task is that the emitted CSS does not change** — prove it, don't assume it.

**Files:**
- Modify: `packages/tokens/scripts/emit-utilities.ts:103-132`
- Test: `packages/tokens/__tests__/emit-css.test.ts`

**Interfaces:**
- Produces: `SPACING_UTILITY_GROUPS: ReadonlyArray<ReadonlyArray<{ prefix: string; property: string }>>` — module-private in Task 1, read by `emitUtilitiesRoster()` in Task 2.

- [ ] **Step 1: Capture the current CSS as the baseline**

```bash
pnpm --dir packages/tokens build
cp packages/tokens/dist/utilities.css /tmp/utilities-baseline.css
wc -l /tmp/utilities-baseline.css
```

Expected: a line count you will match exactly in Step 5. Do not skip this — after the refactor the original output is unrecoverable without a git checkout.

- [ ] **Step 2: Add the descriptor above `emitUtilitiesCSS`**

In `packages/tokens/scripts/emit-utilities.ts`, immediately after the `// ── Utility classes ──` banner comment (line 92) and before the `emitUtilitiesCSS` JSDoc:

```ts
/**
 * The single description of the spacing-driven utility families (D79).
 *
 * Both `emitUtilitiesCSS` and `emitUtilitiesRoster` generate from this, so the
 * shipped classes and the published roster cannot disagree. A roster written
 * *beside* the emitter rather than *from* it would be a second source of truth
 * — and the promo site's "22 icons" is what a second source of truth looks
 * like six releases later.
 *
 * Grouping is load-bearing for the emitted CSS: each inner array is one block
 * of related declarations emitted per spacing step, with a blank line after
 * the block. Flattening these into one list would reorder the output.
 */
const SPACING_UTILITY_GROUPS: ReadonlyArray<
  ReadonlyArray<{ prefix: string; property: string }>
> = [
  [{ prefix: "psi-gap", property: "gap" }],
  [
    { prefix: "psi-p", property: "padding" },
    { prefix: "psi-px", property: "padding-inline" },
    { prefix: "psi-py", property: "padding-block" },
  ],
  [
    { prefix: "psi-m", property: "margin" },
    { prefix: "psi-mx", property: "margin-inline" },
    { prefix: "psi-my", property: "margin-block" },
  ],
];
```

- [ ] **Step 3: Replace the three hardcoded loops**

In `emitUtilitiesCSS()`, replace everything from `// Gap utilities` through the blank-line push that follows the margin loop (lines 103-134) with:

```ts
  for (const group of SPACING_UTILITY_GROUPS) {
    for (const px of spacingScale) {
      for (const { prefix, property } of group) {
        lines.push(`  .${prefix}-${px} { ${property}: var(--psi-space-${px}); }`);
      }
    }
    lines.push("");
  }
```

Leave the typography, tabular, display, container, media-tint and reduced-motion sections untouched.

- [ ] **Step 4: Rebuild**

```bash
pnpm --dir packages/tokens build
```

Expected: `wrote dist/utilities.css` with no errors.

- [ ] **Step 5: Prove the CSS is byte-identical**

```bash
diff /tmp/utilities-baseline.css packages/tokens/dist/utilities.css && echo "BYTE-IDENTICAL"
```

Expected: `BYTE-IDENTICAL`. **If diff prints anything, the refactor changed shipped CSS — fix it before continuing.** The likely culprits are group ordering or a missing/extra `lines.push("")`.

- [ ] **Step 6: Run the existing tokens tests**

```bash
pnpm exec vitest run packages/tokens/__tests__/emit-css.test.ts
```

Expected: PASS. These already assert `.psi-tabular` and the `@layer` line; they must be unaffected.

- [ ] **Step 7: Commit**

```bash
git add packages/tokens/scripts/emit-utilities.ts
git commit -m "refactor(tokens): one description of the spacing utility families

Three near-identical loops become one descriptor, so D79's roster can be
generated from the same structure as the CSS rather than beside it.

Emitted utilities.css is byte-identical — verified by diff against the
pre-refactor output, not by inspection."
```

---

### Task 2: The roster reaches guidance.json

**Files:**
- Modify: `packages/tokens/scripts/emit-utilities.ts` (add `emitUtilitiesRoster`)
- Modify: `packages/tokens/scripts/build.ts:242`
- Test: `packages/tokens/__tests__/emit-css.test.ts`

**Interfaces:**
- Consumes: `SPACING_UTILITY_GROUPS` (Task 1)
- Produces: `emitUtilitiesRoster(): { note: string; families: UtilityFamily[]; classes: string[] }` where `UtilityFamily = { prefix: string; property: string; scale: number[] | null; classes: string[] }`

- [ ] **Step 1: Write the failing test**

Append to `packages/tokens/__tests__/emit-css.test.ts`:

```ts
describe("emitUtilitiesRoster", () => {
  it("lists every class the CSS emits, and nothing it does not", () => {
    const roster = emitUtilitiesRoster();
    const css = emitUtilitiesCSS();
    const inCss = [...css.matchAll(/^\s*\.(psi-[a-z0-9-]+)\s*[,{]/gm)].map((m) => m[1]);
    expect([...new Set(inCss)].sort()).toEqual(roster.classes);
  });

  it("carries the margin family the eval kept missing", () => {
    expect(emitUtilitiesRoster().classes).toContain("psi-m-0");
  });

  it("describes each family's property and scale", () => {
    const gap = emitUtilitiesRoster().families.find((f) => f.prefix === "psi-gap-*");
    expect(gap).toBeDefined();
    expect(gap!.property).toBe("gap");
    expect(gap!.scale).toContain(24);
  });
});
```

Add `emitUtilitiesRoster` to the existing import on line 6:

```ts
import { emitScaleVarsCSS, emitUtilitiesCSS, emitUtilitiesRoster } from "../scripts/emit-utilities.js";
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
pnpm exec vitest run packages/tokens/__tests__/emit-css.test.ts -t "emitUtilitiesRoster"
```

Expected: FAIL — `emitUtilitiesRoster is not a function` (or a TS resolution error). This is the red state; do not proceed until you see it.

- [ ] **Step 3: Implement the roster**

Append to `packages/tokens/scripts/emit-utilities.ts`:

```ts
export interface UtilityFamily {
  /** Class prefix with a `-*` suffix for scaled families, or the bare class. */
  prefix: string;
  /** CSS property (or comma-separated properties) the family sets. */
  property: string;
  /** Spacing steps the family is built from, or null when it is not scaled. */
  scale: number[] | null;
  classes: string[];
}

/**
 * Machine-readable roster of every utility class (D79).
 *
 * Generated from the same `SPACING_UTILITY_GROUPS` that produces the CSS, so a
 * class cannot exist in one and not the other. This is the icon-roster fix
 * generalised: before it, `psi-m-*` and `psi-p-*` appeared in no llms.txt, no
 * guidance.json and no manifest.json, so the only way to learn they existed was
 * to read utilities.css.
 */
export function emitUtilitiesRoster(): {
  note: string;
  families: UtilityFamily[];
  classes: string[];
} {
  const families: UtilityFamily[] = [];

  for (const group of SPACING_UTILITY_GROUPS) {
    for (const { prefix, property } of group) {
      families.push({
        prefix: `${prefix}-*`,
        property,
        scale: [...spacingScale],
        classes: spacingScale.map((px) => `${prefix}-${px}`),
      });
    }
  }

  families.push({
    prefix: "psi-text-*",
    property: "font",
    scale: null,
    classes: typographyCombos.map((c) => `psi-text-${comboName(c)}`),
  });

  families.push({
    prefix: "psi-display-*",
    property: "font, letter-spacing, text-transform",
    scale: null,
    classes: displayCombos.map((d) => `psi-display-${displayName(d)}`),
  });

  families.push({
    prefix: "psi-tabular",
    property: "font-variant-numeric",
    scale: null,
    classes: ["psi-tabular"],
  });

  families.push({
    prefix: "psi-container",
    property: "max-width, margin-inline, padding-inline",
    scale: null,
    classes: ["psi-container"],
  });

  families.push({
    prefix: "psi-media-tint",
    property: "filter",
    scale: null,
    classes: ["psi-media-tint"],
  });

  return {
    note:
      "Every utility class shipped in utilities.css, generated from the same source as the CSS (D79). Utilities set one property each and create no layout context: .psi-gap-* sets gap only, so pair it with display:flex or grid yourself. Import @handamade/psi-tokens/utilities.css — it is required, not optional; .psi-container and the reduced-motion duration zeroing live there.",
    families,
    classes: [...new Set(families.flatMap((f) => f.classes))].sort(),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm exec vitest run packages/tokens/__tests__/emit-css.test.ts
```

Expected: PASS, all assertions.

If the first test fails on a mismatch, read which side has the extra entry. The regex matches class selectors at line start including the `.psi-media-tint:hover` rule's first selector — `psi-media-tint` is already in the roster, and the `:hover` variant is excluded by the `[,{]` boundary.

- [ ] **Step 5: Wire the roster into guidance.json**

In `packages/tokens/scripts/build.ts`, add to the imports on line 19:

```ts
import { emitScaleVarsCSS, emitUtilitiesCSS, emitUtilitiesRoster } from "./emit-utilities.js";
```

Then replace line 242:

```ts
  writeFileSync(
    join(distDir, "guidance.json"),
    JSON.stringify({ ...guidance, utilities: emitUtilitiesRoster() }, null, 2),
  );
```

- [ ] **Step 6: Rebuild and confirm the roster shipped**

```bash
pnpm --dir packages/tokens build
node -e "
const g = require('./packages/tokens/dist/guidance.json');
console.log('utilities key:', !!g.utilities);
console.log('classes:', g.utilities.classes.length);
console.log('psi-m-0 present:', g.utilities.classes.includes('psi-m-0'));
console.log('families:', g.utilities.families.map(f => f.prefix).join(', '));
"
```

Expected: `utilities key: true`, a class count, `psi-m-0 present: true`, and every family listed.

- [ ] **Step 7: Commit**

```bash
git add packages/tokens/scripts/emit-utilities.ts packages/tokens/scripts/build.ts packages/tokens/__tests__/emit-css.test.ts
git commit -m "feat(tokens): guidance.json carries the utility roster (D79)

146 utility classes shipped with no machine-readable form — psi-m-* and
psi-p-* appeared in no llms.txt, no guidance.json and no manifest.json, so
the only way to learn they existed was to read utilities.css. That is why
.psi-m-0 was missed by two consecutive eval runs.

Generated from the same descriptor as the CSS, and a test asserts the two
agree class-for-class."
```

---

### Task 3: Pagination's effective page (D78)

**Files:**
- Modify: `packages/react/src/Pagination/Pagination.tsx:92-100` and both arrow handlers
- Modify: `packages/react/src/global.d.ts:6`
- Test: `packages/react/src/Pagination/Pagination.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: no new exports. `paginationRange`'s signature is unchanged — the clamp lives in the component, so the pure truncation maths stays pure.

- [ ] **Step 1: Write the failing tests**

Append to `packages/react/src/Pagination/Pagination.test.tsx`, inside the top-level (after the `describe("paginationRange", …)` block closes):

```ts
describe("Pagination out-of-range page (D78)", () => {
  it("marks the last page current when page exceeds pageCount", () => {
    render(<Pagination page={5} pageCount={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-current", "page");
  });

  it("emits from the effective page, so Previous can recover from out of range", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={5} pageCount={3} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("marks the first page current when page is below 1", () => {
    render(<Pagination page={0} pageCount={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");
  });

  it("renders no page buttons and disables both arrows when there are no pages", () => {
    render(<Pagination page={3} pageCount={0} onPageChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "1" })).toBeNull();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("warns when there are no pages at all", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Pagination page={3} pageCount={0} onPageChange={vi.fn()} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("out of range"));
    warn.mockRestore();
  });

  it("warns in dev when page is out of range", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Pagination page={5} pageCount={3} onPageChange={vi.fn()} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("out of range"));
    warn.mockRestore();
  });

  it("does not warn for an in-range page", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Pagination page={2} pageCount={3} onPageChange={vi.fn()} />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
```

> **Corrected during execution.** This test originally used `page={1} pageCount={0}`, which passed BEFORE the fix: the unpatched `disabled={page <= 1}` was already true because page was 1, `1 >= 0` was also true, and `paginationRange(1, 0, 1)` already returned `[]`. It exercised nothing. `page={3}` is what makes the unpatched code leave Previous enabled with zero pages.

- [ ] **Step 2: Run them to confirm they fail — and read *how* they fail**

```bash
pnpm exec vitest run packages/react/src/Pagination/Pagination.test.tsx -t "out-of-range"
```

Expected: the first test fails because **no** element carries `aria-current` (not because the wrong one does); the Previous test fails with `called with 4`; the no-pages test fails because Previous is enabled. Confirm each failure matches this description — a test that fails for the wrong reason proves nothing.

- [ ] **Step 3: Implement the effective page**

In `packages/react/src/Pagination/Pagination.tsx`, replace the body's opening (line 100) with:

```ts
  // D78: a controlled component that renders a page its `page` prop does not
  // name — a bounded exception to controlled-only, on the D65 precedent. An
  // out-of-range `page` otherwise matches no button, so `aria-current="page"`
  // lands nowhere and assistive tech reports a pager with no current page.
  const hasPages = pageCount >= 1;
  const effectivePage = hasPages ? Math.min(Math.max(page, 1), pageCount) : 0;

  if (process.env.NODE_ENV !== "production" && (!hasPages || page !== effectivePage)) {
    console.warn(
      `Psi Pagination: \`page\` ${page} is out of range for \`pageCount\` ${pageCount}; rendering page ${hasPages ? effectivePage : "none"}. Clamp \`page\` when \`pageCount\` shrinks — e.g. after filtering.`,
    );
  }

  const items = hasPages ? paginationRange(effectivePage, pageCount, siblingCount) : [];
```

- [ ] **Step 4: Point the arrows and the page buttons at the effective page**

Still in `Pagination.tsx`, in the "Previous page" `IconButton`, replace the `disabled` and `onClick` props:

```tsx
        disabled={!hasPages || effectivePage <= 1}
        onClick={() => onPageChange(effectivePage - 1)}
```

In the page-button `.map`, replace the two `item === page` tests:

```tsx
            variant={item === effectivePage ? "accent-subtle" : "ghost"}
            aria-current={item === effectivePage ? "page" : undefined}
```

In the "Next page" `IconButton`:

```tsx
        disabled={!hasPages || effectivePage >= pageCount}
        onClick={() => onPageChange(effectivePage + 1)}
```

**All five substitutions are required.** Leaving the arrow handlers on raw `page` is the failure the spec singles out: `page=5, pageCount=3` would highlight 3 while Previous emits 4, so the pager could never recover from the state this fix exists to handle.

- [ ] **Step 5: Run the new tests**

```bash
pnpm exec vitest run packages/react/src/Pagination/Pagination.test.tsx -t "out-of-range"
```

Expected: PASS, all six.

- [ ] **Step 6: Run the whole Pagination suite for regressions**

```bash
pnpm exec vitest run packages/react/src/Pagination/Pagination.test.tsx
```

Expected: PASS, including the full sibling invariant sweep. That sweep only feeds in-range pages, so clamping must not change any of its results — if it does, the clamp is firing when it should not.

- [ ] **Step 7: Update the now-inaccurate ambient stub comment**

`packages/react/src/global.d.ts:6` says the stub exists for "the `process.env.NODE_ENV` dev-mode check in Table.tsx". There are now two. Replace lines 6-7 with:

```ts
// Ambient stub for the `process.env.NODE_ENV` dev-mode checks in Table.tsx
// (D62, Task 5) and Pagination.tsx (D78). Vite replaces the expression at
```

- [ ] **Step 8: Typecheck — the gate that catches this class of bug**

```bash
pnpm --dir packages/react build
```

Expected: clean. **`pnpm build` is the only gate that catches type errors** — `test` and `lint` both stayed green once while a `process.env.NODE_ENV` reference broke `tsc`, which is exactly why the ambient stub exists.

- [ ] **Step 9: Commit**

```bash
git add packages/react/src/Pagination/Pagination.tsx packages/react/src/Pagination/Pagination.test.tsx packages/react/src/global.d.ts
git commit -m "fix(react): Pagination clamps an out-of-range page (D78)

page=5 with pageCount=3 rendered [1,2,3] with aria-current on nothing,
because the current test is \`item === page\`. Assistive tech reported a
pager with no current page.

Pagination now renders from an effective page clamped into [1, pageCount],
warns in dev, and renders no page buttons when pageCount < 1. The arrows
emit from the effective page too — without that, Previous from page 5 of 3
emits 4 and the pager can never recover."
```

---

### Task 4: `onSortChange` emits the next state

**Files:**
- Modify: `packages/react/src/Table/Table.tsx:71-77` (TSDoc)
- Modify: `packages/react/llms.txt:48`
- Regenerated: `packages/react/docs/Table.md` (do not hand-edit)

- [ ] **Step 1: Rewrite the TSDoc**

In `packages/react/src/Table/Table.tsx`, replace the `onSortChange` TSDoc block (lines 71-77) with:

```ts
  /**
   * Called with the **next** sort state, already toggled — store it as given
   * and do not toggle again. A fresh column arrives `"asc"`; an active `"asc"`
   * column emits `"desc"`; an active `"desc"` column emits `"asc"`.
   *
   * Optional in the type because `sortable` may be false; a discriminated union
   * expressing the real contract does not survive docgen's flat prop
   * extraction, which would strip these props from the manifest entirely (D62).
   */
```

- [ ] **Step 2: Regenerate the docs and confirm the table picked it up**

```bash
pnpm --dir packages/react build
git diff --stat packages/react/docs/Table.md
grep -n "already toggled" packages/react/docs/Table.md
```

Expected: `Table.md` shows as modified and the grep matches. If the grep finds nothing, the TSDoc edit did not reach docgen — check you edited the block attached to `onSortChange` and not a neighbour.

- [ ] **Step 3: Extend the llms.txt Table entry**

In `packages/react/llms.txt`, line 48, replace the fragment:

```
Sorting is `sort={{key, direction}}` + `onSortChange`;
```

with:

```
Sorting is `sort={{key, direction}}` + `onSortChange`, which is called with the **next** state, already toggled — store it as given (a fresh column arrives `asc`; an active `asc` emits `desc`);
```

- [ ] **Step 4: Verify no drift**

```bash
node tools/check-docs-drift.mjs
```

Expected: pass. (`pnpm build` already ran in Step 2.)

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/Table/Table.tsx packages/react/docs/Table.md packages/react/llms.txt
git commit -m "docs: onSortChange emits the next sort state

The eval agent read dist/index.js to find out whether the callback hands
back the current or the already-toggled direction, because neither
docs/Table.md nor llms.txt said. It emits the next state.

TSDoc is the source — docs/Table.md is generated."
```

---

### Task 5: `data-table` gets an actions column

**Files:**
- Modify: `packages/react/patterns/data-table.json`

- [ ] **Step 1: Add the actions header cell**

In the `TableRow` inside `TableHead`, append a fourth entry to its `body` array, after the `amount` header cell:

```json
                    { "component": "TableHeaderCell", "content": "actions-label" }
```

- [ ] **Step 2: Add the actions body cell**

In the `TableRow` inside `TableBody`, append a fourth entry after the `amount` cell:

```json
                    { "component": "TableCell", "content": "actions-cell" }
```

- [ ] **Step 3: Fix the misplaced instruction and add the new content keys**

Replace the whole `content` object with:

```json
  "content": {
    "date-label": "Date",
    "payee-label": "Payee",
    "amount-label": "Amount",
    "actions-label": "[a visible \"Actions\" header — the column needs an accessible name, so never an empty th]",
    "date-cell": "[one row per record]",
    "payee-cell": "[the record's payee]",
    "amount-cell": "[numeric columns align right and use tabular figures]",
    "actions-cell": "[the row-actions menu — compose it from the row-actions pattern]"
  }
```

> **Corrected during execution.** The original offered a visually-hidden header, but Psi exposes no way to build one — there is no public `.psi-sr-only` utility, nothing in `llms.txt` documents the convention, and the `clip: rect(...)` technique exists only as private CSS duplicated in Toast, Checkbox and Switch. Recorded as a follow-up worth its own decision.

Note what this fixes beyond the missing column: the row-actions instruction was attached to **`payee-cell`** while the last cell was `amount-cell`, so an agent following it literally put the menu in the middle column.

- [ ] **Step 4: Validate the pattern**

```bash
pnpm --dir packages/react build
pnpm exec vitest run packages/react/scripts/patterns.test.ts packages/react/scripts/emit-patterns.test.ts
```

Expected: PASS. `validatePatterns` resolves component names, slot contracts, props and `requires` at build time, so a typo in a component name fails the build rather than the test.

- [ ] **Step 5: Confirm the preset renders four columns on both rows**

```bash
node -e "
const p = require('./packages/react/dist/patterns.json');
const dt = p.patterns.find(x => x.id === 'data-table');
const head = dt.compose.slots.body[0].slots.body[0].slots.body;
const bodyRow = dt.compose.slots.body[1].slots.body[0].slots.body;
console.log('header cells:', head.length, '| body cells:', bodyRow.length);
console.log(head.length === bodyRow.length ? 'BALANCED' : 'MISMATCH — a 4-col header over a 3-col body is the exact defect D62 shipped once');
"
```

Expected: `header cells: 4 | body cells: 4` and `BALANCED`.

- [ ] **Step 6: Commit**

```bash
git add packages/react/patterns/data-table.json
git commit -m "docs(patterns): data-table gets an actions column

The pattern composed three header cells and three body cells, so the
actions column existed in neither — and the instruction to put the
row-actions menu in the last cell was attached to payee-cell while the
last cell was amount-cell, sending the menu to the middle column.

Two eval runs have now hit this."
```

---

### Task 6: Page-level spacing, and the utilities entry

**Files:**
- Modify: `packages/react/llms.txt` (Compositions section, after line 77)

- [ ] **Step 1: Add both entries**

In `packages/react/llms.txt`, immediately after the `- Stacks/rows:` entry (line 77), insert:

```
- Page-level spacing: the form scale above (24/12/8) governs controls inside a form, not page layout. For layout use `psi-gap-32` between sections of a page, `psi-gap-24` between cards or panels in a grid, `psi-py-32` for a section's vertical padding, and `.psi-container` for the page's max-width and gutters (it is in utilities.css, not components.css). Marketing-scale rhythm is app-level and deliberately not tokenized — the system stops at the container.
- Utility classes: families are `psi-gap-*`, `psi-p-*`/`psi-px-*`/`psi-py-*`, `psi-m-*`/`psi-mx-*`/`psi-my-*` (all on the spacing scale), `psi-text-*` and `psi-display-*` (typography), plus `.psi-tabular`, `.psi-container` and `.psi-media-tint`. Utilities set one property and create no layout context — pair `psi-gap-*` with `display: flex`. Use `psi-m-0` to kill a UA margin rather than an inline style. The exact roster is `@handamade/psi-tokens/guidance.json` → `utilities.classes`.
```

Note what is deliberately absent: **a count**. `llms.txt` is hand-written, so "146 utilities" here would be the drift liability D79 exists to remove.

- [ ] **Step 2: Verify the roster reference resolves**

```bash
node -e "
const g = require('./packages/tokens/dist/guidance.json');
for (const c of ['psi-gap-32','psi-py-32','psi-m-0','psi-container','psi-tabular','psi-media-tint']) {
  console.log((g.utilities.classes.includes(c) ? 'ok   ' : 'MISSING ') + c);
}
"
```

Expected: every line `ok`. Any `MISSING` means llms.txt now advertises a class that does not ship — fix the prose, not the test.

- [ ] **Step 3: Run drift and lint**

```bash
node tools/check-docs-drift.mjs && pnpm lint
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add packages/react/llms.txt
git commit -m "docs: page-level spacing, and the utility families

llms.txt gave 24/12/8 inside the form-field entry and nothing for page
layout, so every section gap in the eval deliverable was the agent's own
choice. The utilities entry names the families and points at
guidance.json for the exact roster — no count in hand-written prose."
```

---

### Task 7: Menu joins llms.txt

`Menu`, `MenuItem` and `MenuSeparator` are the only 3 of 34 manifest components absent from `packages/react/llms.txt`. The eval agent reached them through `patterns.json` alone.

**Files:**
- Modify: `packages/react/llms.txt` (component list, after the Tabs entry on line 68)

- [ ] **Step 1: Add the Menu entry**

Insert after line 68 (the `<Tabs …>` entry):

```
- `<Menu open onClose={(reason) => …} trigger={<IconButton …/>} placement="bottom-start|bottom-end|top-start|top-end" aria-label="…">`: action menu on the native Popover API — top layer and light dismiss come from the platform, roving keyboard and dismissal reasons from Psi (D53). **Controlled-only** like Dialog: `onClose(reason)` reports `"esc" | "outside" | "item-select"` and the consumer flips `open`. Compose `<MenuItem onSelect>` and `<MenuSeparator>`; the trigger needs an accessible name, so an icon-only trigger is `<IconButton aria-label>`.
- Many menus, one state: for a row-actions column, hold a single `openMenuId` and render each row's Menu with `open={openMenuId === row.id}`, closing with `onClose={() => setOpenMenuId(null)}`. Do not give each row its own boolean. This is the shape D58 fixed a real dismissal bug in — switching directly between two menus left both closed, because the platform light-dismisses the first before the consumer's click handler runs.
```

- [ ] **Step 2: Verify no component is left undocumented**

```bash
node -e "
const m = require('./packages/react/dist/manifest.json');
const llms = require('fs').readFileSync('packages/react/llms.txt','utf8');
const missing = m.components.map(c => c.name).filter(n => !new RegExp('\\\\b'+n+'\\\\b').test(llms));
console.log('components absent from llms.txt:', missing.length, missing.join(', '));
"
```

Expected: `components absent from llms.txt: 0`. This was 3 before the task.

- [ ] **Step 3: Run drift**

```bash
node tools/check-docs-drift.mjs
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add packages/react/llms.txt
git commit -m "docs: Menu joins llms.txt, with the N-instance idiom

Menu, MenuItem and MenuSeparator were the only 3 of 34 components with no
mention in llms.txt — the eval agent found them through patterns.json
alone, and twice invented a single openMenuId for a row-actions column.

That shape is right, and D58 exists because getting it wrong left both
menus closed, so it is now written down rather than re-derived."
```

---

### Task 8: Changeset and the full gate run

**Files:**
- Create: `.changeset/eval-gaps-cycle.md`

- [ ] **Step 1: Write the changeset**

```markdown
---
"@handamade/psi-react": minor
"@handamade/psi-tokens": minor
"@handamade/psi-mcp": minor
---

Pagination clamps an out-of-range page, and the utility roster is machine-readable.

`Pagination` given a `page` beyond `pageCount` rendered a pager with
`aria-current="page"` on nothing — assistive tech reported no current page. It
now renders from an effective page clamped into `[1, pageCount]`, warns in
development, and renders no page buttons when there are no pages (D78).

`guidance.json` gains `utilities` — every utility class, generated from the same
source as the CSS. The icon set got this in 0.15.0; the 146 utility classes had
no machine-readable form at all, so `psi-m-*` and `psi-p-*` could only be found
by reading `utilities.css` (D79).
```

- [ ] **Step 2: Run all five gates in order**

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm test:site
```

Expected: all green. `test:site` needs `apps/promo/dist`, which the `pnpm build` at the head of this chain produces — run it from the repo root, since it resolves `packages/react/dist/manifest.json` and `apps/storybook/storybook-static/index.json` by relative path.

- [ ] **Step 3: Confirm `vr` should not move**

```bash
git diff --name-only origin/main -- '*.stories.tsx' | head
```

Expected: no output. This cycle adds and changes no stories, so CI's `vr` job should be untouched. If this lists a file, something unintended changed — `vr` cannot be run locally to check (macOS writes junk baselines), so CI is the only gate.

- [ ] **Step 4: Commit and push**

```bash
git add .changeset/eval-gaps-cycle.md
git commit -m "chore: changeset for the eval-gaps cycle (D78-D79)"
git push -u origin d78-eval-gaps-cycle
```

- [ ] **Step 5: Open the PR and arm auto-merge**

```bash
gh pr create --title "feat: Pagination's range and the utility roster (D78-D79)" --body "<summary of the six gaps, what each measurement changed, and the gate results>"
```

Then arm auto-merge **and read it back** — `gh pr merge --auto --squash` exits 0 and prints nothing while leaving auto-merge off:

```bash
gh pr merge <n> --auto --squash
gh pr view <n> --json autoMergeRequest --jq '.autoMergeRequest.mergeMethod // "NOT ARMED"'
```

Expected: `SQUASH`. If `NOT ARMED`, use the `enablePullRequestAutoMerge` GraphQL mutation.

---

## Self-Review

**Spec coverage:** D78 → Task 3 (all three cases, including the arrow-emit consequence). D79 → Tasks 1-2 (shared descriptor, `guidance.json` home). Prose fix 1 → Task 4. Fix 2 → Task 5. Fix 3 → Task 6. Fix 4 → Task 7. The "prose names families, never a count" rule → enforced in Task 6 Step 1. Changeset (`minor` ×3) → Task 8. Five gates → Task 8 Step 2. Tests proven red first → Task 1 Step 1/5, Task 2 Step 2, Task 3 Step 2.

**Type consistency:** `SPACING_UTILITY_GROUPS` is introduced in Task 1 and consumed in Task 2 under the same name. `emitUtilitiesRoster` has one signature, used identically in the test (Task 2 Step 1), the implementation (Step 3) and `build.ts` (Step 5). `effectivePage` and `hasPages` are named consistently across all five substitutions in Task 3.

**Known ordering constraint:** Tasks 4, 6 and 7 all modify `packages/react/llms.txt`. They touch different lines and will not conflict in sequence, but running them out of order shifts the line numbers quoted in Tasks 4 and 6 — locate the quoted text rather than trusting the line number if a task runs late.
