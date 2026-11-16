# A field you can find (D120) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Input, Select and Textarea draw their border at 3:1 or better (WCAG 1.4.11) in every theme, at rest and on hover, and the token build's contrast gate refuses any theme that breaks it.

**Architecture:** Fields rebind their rest border to the existing, already-gated `borderControl` (D106). A new semantic token, `borderControlHover` (`fgPrimary` at 0.75 light / 0.60 dark), takes their hover border. Two new `nonTextPairs` entries gate the hover token at 3:1 on `bgPrimary` and `bgSecondary`. `gateTheme` (Psi's build and `buildThemeCss`) and `deriveTheme` already spread `nonTextPairs`, so the gate reaches every theme with no change to the gate code.

**Tech Stack:** TypeScript token DSL (`packages/tokens/src`), culori, vitest, changesets.

Spec: `docs/superpowers/specs/2026-11-16-field-border-design.md` (D120).

## Global Constraints

- Node 24: run `node -v` before the first pnpm command; if it is not v24, run `nvm use` in the worktree root.
- Run every command from the worktree root: `/Users/dmytrokurkin/Projects/dku/ds/.claude/worktrees/d120-field-border-e74625`. Never `cd` into another worktree under `.claude/worktrees/`.
- New token values go in `packages/tokens/src`, never in `dist` (dist is generated).
- Never hardcode colours; component vars bind `var(--psi-*)` only.
- `borderControlHover` is exactly `token({ from: ref.fgPrimary, alpha: 0.75, scopes: ["border"] })` in `light.ts` and `token({ from: ref.fgPrimary, alpha: 0.6, scopes: ["border"] })` in `dark.ts`.
- `nonTextPairs` is exactly these four, in this order: borderControl/bgPrimary, borderControl/bgSecondary, borderControlHover/bgPrimary, borderControlHover/bgSecondary, all `minRatio: 3`.
- Do not touch `borderNeutral`, `borderStrong`, InlineAlert, Button or Switch.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run a single test file with `pnpm vitest run <path>` from the root.

---

### Task 1: The `borderControlHover` token and its gate pairs

**Files:**
- Create: `packages/tokens/__tests__/field-border.test.ts`
- Modify: `packages/tokens/src/themes/light.ts` (after `borderControl`, ~line 60)
- Modify: `packages/tokens/src/themes/dark.ts` (after `borderControl`, ~line 57)
- Modify: `packages/tokens/src/contrast-matrix.ts:182-190` (`nonTextPairs` and its doc comment)
- Modify: `packages/tokens/__tests__/control-border.test.ts:30-35` (exact-equality assertion on `nonTextPairs`)
- Modify: `packages/tokens/__tests__/generate-derive.test.ts` (38 → 40, four places)
- Modify: `packages/tokens/src/generate/derive.ts:48-52` (comment)

**Interfaces:**
- Produces: semantic token `borderControlHover` (CSS `--psi-border-control-hover`), and `nonTextPairs` with four entries. Task 2 binds `var(--psi-border-control-hover)`.

- [ ] **Step 1: Write the failing test**

Create `packages/tokens/__tests__/field-border.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolve } from "../src/dsl/resolver.js";
import { ref, token } from "../src/dsl/builders.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { acmePalette, acmeSlots } from "../src/themes/customers/acme.js";
import * as matrix from "../src/contrast-matrix.js";
import { gateTheme, ThemeGateError } from "../src/theme/gate.js";
import type { ContrastPair } from "../src/contrast-matrix.js";

/** D120 — a text field is identified by its border alone (its fill is the
 * canvas), so WCAG 1.4.11 asks 3:1 at rest and on hover. Rest binds
 * borderControl (D106); hover binds the new borderControlHover. */

const nonTextPairs = (): ContrastPair[] =>
  ((matrix as Record<string, unknown>).nonTextPairs as ContrastPair[] | undefined) ?? [];

describe("borderControlHover (D120)", () => {
  it("is fgPrimary at alpha 0.75 in the light base and 0.60 in the dark base", () => {
    expect(lightTheme.borderControlHover).toEqual({ from: ref.fgPrimary, alpha: 0.75, scopes: ["border"] });
    expect(darkTheme.borderControlHover).toEqual({ from: ref.fgPrimary, alpha: 0.6, scopes: ["border"] });
  });

  it("nonTextPairs gates borderControl and borderControlHover on bgPrimary and bgSecondary at 3:1", () => {
    expect(nonTextPairs()).toEqual([
      { fg: "borderControl", bg: "bgPrimary", minRatio: 3 },
      { fg: "borderControl", bg: "bgSecondary", minRatio: 3 },
      { fg: "borderControlHover", bg: "bgPrimary", minRatio: 3 },
      { fg: "borderControlHover", bg: "bgSecondary", minRatio: 3 },
    ]);
  });

  for (const [name, theme, palette, slots] of [
    ["light", lightTheme, defaultPalette, defaultSlots],
    ["dark", darkTheme, defaultPalette, defaultSlots],
    ["acme", lightTheme, acmePalette, acmeSlots],
  ] as const) {
    it(`${name}: hover clears 3:1 and is a step darker than rest on both surfaces`, () => {
      const resolved = resolve(theme, palette, slots);
      expect(resolved.borderControlHover, "borderControlHover resolves").toBeDefined();
      for (const bg of ["bgPrimary", "bgSecondary"]) {
        const [rest, hover] = matrix.checkContrast(resolved, [
          { fg: "borderControl", bg, minRatio: 3 },
          { fg: "borderControlHover", bg, minRatio: 3 },
        ]);
        expect(hover!.ratio, `borderControlHover on ${bg}`).toBeGreaterThanOrEqual(3);
        expect(hover!.ratio - rest!.ratio, `hover over rest on ${bg}`).toBeGreaterThan(1.5);
      }
    });
  }

  it("the theme gate (Psi's build and buildThemeCss) refuses a borderControlHover under 3:1, naming the pairs", () => {
    const weak = { ...lightTheme, borderControlHover: token({ from: ref.fgPrimary, alpha: 0.15, scopes: ["border"] }) };
    let caught: unknown;
    try {
      gateTheme("weak", weak, defaultPalette, defaultSlots);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ThemeGateError);
    const failing = (caught as ThemeGateError).contrastFailures.map((f) => `${f.fg}/${f.bg}`);
    expect(failing).toEqual(["borderControlHover/bgPrimary", "borderControlHover/bgSecondary"]);
  });
});
```

- [ ] **Step 2: Run the test and check it fails on assertions**

Run: `pnpm vitest run packages/tokens/__tests__/field-border.test.ts`
Expected: FAIL. The token definition test fails (`undefined` vs the object). `nonTextPairs` has 2 entries, not 4. "borderControlHover resolves" is undefined. The gate test fails because no error is thrown (`caught` is undefined, not a `ThemeGateError`). No import errors.

- [ ] **Step 3: Add the token to both bases**

In `packages/tokens/src/themes/light.ts`, directly after the `borderControl: token({ from: ref.fgPrimary, alpha: 0.55, scopes: ["border"] }),` line, insert:

```ts
  /** D120: the field border on hover. Fields rest on borderControl, so hover
   * must be a step darker and still clear 3:1 (`nonTextPairs`); borderStrong
   * (0.3) would make hover lighter than rest. */
  borderControlHover: token({ from: ref.fgPrimary, alpha: 0.75, scopes: ["border"] }),
```

In `packages/tokens/src/themes/dark.ts`, directly after the `borderControl: token({ from: ref.fgPrimary, alpha: 0.4, scopes: ["border"] }),` line, insert:

```ts
  /** D120: the field border on hover. Fields rest on borderControl, so hover
   * must be a step darker and still clear 3:1 (`nonTextPairs`); borderStrong
   * (0.3) would make hover lighter than rest. */
  borderControlHover: token({ from: ref.fgPrimary, alpha: 0.6, scopes: ["border"] }),
```

- [ ] **Step 4: Add the pairs**

In `packages/tokens/src/contrast-matrix.ts`, replace the `nonTextPairs` block (doc comment and array, at the end of the file) with:

```ts
/** WCAG 1.4.11 non-text contrast (D106): 3:1 for the visual information that
 * identifies a control. An unchecked checkbox or radio is identified by its
 * outline alone, and a text field by its border alone (D120: Input, Select and
 * Textarea rest on borderControl and hover on borderControlHover). Each is
 * checked against the control's own fill (bgPrimary) and the surface it sits
 * on (bgPrimary on the canvas, bgSecondary on Panel, Dialog and Menu). */
export const nonTextPairs: ContrastPair[] = [
  { fg: "borderControl", bg: "bgPrimary", minRatio: 3 },
  { fg: "borderControl", bg: "bgSecondary", minRatio: 3 },
  { fg: "borderControlHover", bg: "bgPrimary", minRatio: 3 },
  { fg: "borderControlHover", bg: "bgSecondary", minRatio: 3 },
];
```

- [ ] **Step 5: Update the D106 test that pinned two pairs exactly**

In `packages/tokens/__tests__/control-border.test.ts`, replace:

```ts
  it("is gated at 3:1 on bgPrimary and bgSecondary", () => {
    expect(nonTextPairs()).toEqual([
      { fg: "borderControl", bg: "bgPrimary", minRatio: 3 },
      { fg: "borderControl", bg: "bgSecondary", minRatio: 3 },
    ]);
  });
```

with:

```ts
  it("is gated at 3:1 on bgPrimary and bgSecondary", () => {
    expect(nonTextPairs()).toEqual(
      expect.arrayContaining([
        { fg: "borderControl", bg: "bgPrimary", minRatio: 3 },
        { fg: "borderControl", bg: "bgSecondary", minRatio: 3 },
      ]),
    );
  });
```

In the same file, the `"${name}: clears 3:1 with headroom on both surfaces"` test calls `matrix.checkContrast(resolved, nonTextPairs())` and then `expect(results).toHaveLength(2)`. Replace those two lines with:

```ts
      const results = matrix.checkContrast(resolved, nonTextPairs().filter((p) => p.fg === "borderControl"));
      expect(results).toHaveLength(2);
```

- [ ] **Step 6: 38 → 40 in the derive test and comment**

In `packages/tokens/__tests__/generate-derive.test.ts`, change:
- line 9: `The SAME 38 pairs` → `The SAME 40 pairs`
- `it("gates 38 pairs: the text matrix and D106's non-text pairs", () => {` → `it("gates 40 pairs: the text matrix and the non-text pairs (D106, D120)", () => {`
- `expect(AA_MATRIX).toHaveLength(38);` → `expect(AA_MATRIX).toHaveLength(40);`
- `it("clears all 38 pairs for the prompt that used to miss by 0.0021", () => {` → `it("clears all 40 pairs for the prompt that used to miss by 0.0021", () => {`
- `asserts zero failures across all 38 pairs and zero throws.` → `asserts zero failures across all 40 pairs and zero throws.`
- `"clears all 38 pairs across 360 hues x 5 chroma words x both modes",` → `"clears all 40 pairs across 360 hues x 5 chroma words x both modes",`

Then run `grep -n "38" packages/tokens/__tests__/generate-derive.test.ts` and confirm no pair-count mention of 38 is left.

In `packages/tokens/src/generate/derive.ts`, replace:

```ts
 * 38 pairs (this said 33 until D106; D62 and D86 had grown it). The two
 * non-text pairs (D106) are not solved here: `borderControl` is a fixed alpha
 * of `fgPrimary`, and the sweep test proves it holds.
```

with:

```ts
 * 40 pairs (33 until D106, 38 until D120; D62 and D86 had grown it). The four
 * non-text pairs (D106, D120) are not solved here: `borderControl` and
 * `borderControlHover` are fixed alphas of `fgPrimary`, and the sweep test
 * proves they hold.
```

- [ ] **Step 7: Run the token tests**

Run: `pnpm vitest run packages/tokens/__tests__/field-border.test.ts packages/tokens/__tests__/control-border.test.ts packages/tokens/__tests__/generate-derive.test.ts`
Expected: PASS for all three, including the 360 × 5 × 2 sweep.

- [ ] **Step 8: Prove the build gate passes with the new pairs**

Run: `pnpm --dir packages/tokens build 2>&1 | tail -3`
Expected: ends with `[tokens] Build complete.` and no `contrast failures`.
Then run `grep -c "border-control-hover" packages/tokens/dist/light.css packages/tokens/dist/dark.css packages/tokens/dist/acme.css packages/tokens/dist/ember.css` and expect 1 or more for each.

- [ ] **Step 9: Commit**

```bash
git add packages/tokens/src/themes/light.ts packages/tokens/src/themes/dark.ts packages/tokens/src/contrast-matrix.ts packages/tokens/src/generate/derive.ts packages/tokens/__tests__/field-border.test.ts packages/tokens/__tests__/control-border.test.ts packages/tokens/__tests__/generate-derive.test.ts
git commit -m "feat(tokens): borderControlHover, gated at 3:1 (D120)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Fields bind the control border

**Files:**
- Modify: `packages/tokens/src/components/input.ts:6-7`
- Modify: `packages/tokens/src/components/select.ts:6-7`
- Modify: `packages/tokens/src/components/textarea.ts:10-11` and its doc comment (lines 1-5)
- Modify: `packages/tokens/__tests__/field-border.test.ts` (append a describe block)
- Modify: `packages/tokens/__tests__/control-border.test.ts` (the last `it`, "and by no field")

**Interfaces:**
- Consumes: `--psi-border-control` (D106) and `--psi-border-control-hover` (Task 1).
- Produces: `--psi-{input,select,textarea}-border` = `var(--psi-border-control)` and `--psi-{input,select,textarea}-border-hover` = `var(--psi-border-control-hover)`.

- [ ] **Step 1: Write the failing test**

Append to `packages/tokens/__tests__/field-border.test.ts`. Add these three imports with the other imports at the top of the file:

```ts
import { inputVars } from "../src/components/input.js";
import { selectVars } from "../src/components/select.js";
import { textareaVars } from "../src/components/textarea.js";
```

and this block at the end of the file:

```ts
describe("fields bind the control border (D120)", () => {
  for (const [name, vars] of [
    ["input", inputVars],
    ["select", selectVars],
    ["textarea", textareaVars],
  ] as const) {
    it(`${name}: rests on border-control and hovers on border-control-hover`, () => {
      expect(vars.border).toBe("var(--psi-border-control)");
      expect(vars["border-hover"]).toBe("var(--psi-border-control-hover)");
      // Unchanged by D120: error and focus.
      expect(vars["border-error"]).toBe("var(--psi-fg-danger)");
      expect(vars["focus-ring"]).toBe("var(--psi-border-focus)");
    });
  }
});
```

In `packages/tokens/__tests__/control-border.test.ts`, replace the last test:

```ts
  it("is bound by the checkbox box and the radio circle, and by no field", () => {
    expect(checkboxVars["box-border"]).toBe("var(--psi-border-control)");
    expect(radioGroupVars["circle-border"]).toBe("var(--psi-border-control)");
    expect(inputVars.border).toBe("var(--psi-border-neutral)");
    expect(selectVars.border).toBe("var(--psi-border-neutral)");
    expect(textareaVars.border).toBe("var(--psi-border-neutral)");
  });
```

with:

```ts
  it("is bound by the checkbox box, the radio circle and, since D120, every field", () => {
    expect(checkboxVars["box-border"]).toBe("var(--psi-border-control)");
    expect(radioGroupVars["circle-border"]).toBe("var(--psi-border-control)");
    expect(inputVars.border).toBe("var(--psi-border-control)");
    expect(selectVars.border).toBe("var(--psi-border-control)");
    expect(textareaVars.border).toBe("var(--psi-border-control)");
  });
```

- [ ] **Step 2: Run the tests and check they fail on assertions**

Run: `pnpm vitest run packages/tokens/__tests__/field-border.test.ts packages/tokens/__tests__/control-border.test.ts`
Expected: FAIL. The three "rests on border-control" tests and the "every field" test fail with `expected 'var(--psi-border-neutral)' to be 'var(--psi-border-control)'`. The Task 1 tests still pass.

- [ ] **Step 3: Rebind the three fields**

In each of `packages/tokens/src/components/input.ts`, `select.ts` and `textarea.ts`, replace:

```ts
  border: "var(--psi-border-neutral)",
  "border-hover": "var(--psi-border-strong)",
```

with:

```ts
  // D120: the field's border is its only edge (its fill is the canvas), so
  // WCAG 1.4.11 asks 3:1 at rest and on hover. Both are gated (nonTextPairs).
  border: "var(--psi-border-control)",
  "border-hover": "var(--psi-border-control-hover)",
```

In `textarea.ts`, the doc comment says `Every value is an existing gated semantic`. That stays true, so leave the comment as it is.

- [ ] **Step 4: Run the tests and the token build**

Run: `pnpm vitest run packages/tokens/__tests__/field-border.test.ts packages/tokens/__tests__/control-border.test.ts && pnpm --dir packages/tokens build 2>&1 | tail -2`
Expected: tests PASS. The build ends with `[tokens] Build complete.`, which means the scope gate accepts `border-control-hover` (border-scoped) on a `-border-hover` key.
Then: `grep -h "input-border" packages/tokens/dist/components/input.vars.css`
Expected: the lines `--psi-input-border: var(--psi-border-control);` and `--psi-input-border-hover: var(--psi-border-control-hover);`.

- [ ] **Step 5: Commit**

```bash
git add packages/tokens/src/components/input.ts packages/tokens/src/components/select.ts packages/tokens/src/components/textarea.ts packages/tokens/__tests__/field-border.test.ts packages/tokens/__tests__/control-border.test.ts
git commit -m "feat(tokens): Input, Select and Textarea border at 3:1 (D120)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Docs and changeset

**Files:**
- Modify: `packages/tokens/llms.txt` (the `--psi-border-control` bullet under "## Scrims and borders", ~line 43)
- Create: `.changeset/field-border.md`

**Interfaces:**
- Consumes: the token and bindings from Tasks 1–2.

- [ ] **Step 1: Update `packages/tokens/llms.txt`**

Replace the single line that starts with `- --psi-border-control: the outline that alone identifies an unchecked Checkbox or Radio` with these two lines:

```
- --psi-border-control: the edge that alone identifies a control: an unchecked Checkbox or Radio (D106) and, since D120, the resting border of Input, Select and Textarea. fgPrimary at 0.55 alpha in light-based themes, 0.40 in dark-based, gated at 3:1 on bgPrimary and bgSecondary by `nonTextPairs` (WCAG 1.4.11). Bind it, not --psi-border-neutral (1.32-1.48:1), for any control identified by its outline alone; --psi-border-neutral is a decorative border. A consumer theme built with buildThemeCss is held to the same 3:1.
- --psi-border-control-hover: the field border on hover (Input, Select, Textarea; D120), a step darker than --psi-border-control: fgPrimary at 0.75 alpha in light-based themes, 0.60 in dark-based, also gated at 3:1 on bgPrimary and bgSecondary. Do not use --psi-border-strong (0.30) as a hover over --psi-border-control: it is lighter than the rest state.
```

- [ ] **Step 2: Create the changeset**

Create `.changeset/field-border.md`:

```md
---
"@handamade/psi-tokens": minor
"@handamade/psi-react": patch
---

Input, Select and Textarea draw their border at 3:1 or better in every theme (D120).

- **A field's border is now its control edge.** `--psi-input-border`, `--psi-select-border` and `--psi-textarea-border` bind `--psi-border-control`, the border an unchecked checkbox or radio already uses. They were on `--psi-border-neutral`, which measured 1.32–1.48:1 against the canvas. WCAG 1.4.11 asks 3:1 for the edge that identifies a control, and a field's fill is the canvas itself. **What changes for you:** every field in every theme draws a visibly darker edge. If you set one of these variables yourself, your value still wins.
- **A new token for hover, `--psi-border-control-hover`.** `fgPrimary` at 0.75 alpha in light-based themes and 0.60 in dark-based. The three fields' `-border-hover` bind it. It's a step darker than rest. The old hover, `--psi-border-strong`, would have been lighter than the new rest border.
- **The contrast gate checks it.** `nonTextPairs` gains `borderControlHover` on `bgPrimary` and `bgSecondary` at 3:1, so the build, `buildThemeCss` and `psi-theme` refuse a theme that breaks it. A theme that clears `--psi-border-control` clears this too.
- `--psi-border-neutral` and `--psi-border-strong` are unchanged. They keep their decorative uses, InlineAlert's neutral border and the outline Button.
```

- [ ] **Step 3: Commit**

```bash
git add packages/tokens/llms.txt .changeset/field-border.md
git commit -m "docs: border-control-hover in llms.txt, changeset (D120)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Five gates (controller runs this, not a subagent)

- [ ] **Step 1:** `node -v` (v24), then from the worktree root:

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site
```

Expected: all green. Run it in the background. If `check-docs-drift` names a file stating an old count, fix that file and commit.

- [ ] **Step 2:** Re-measure every theme from `packages/tokens/dist/resolved/<theme>.json` (rest and hover on bgPrimary and bgSecondary). Confirm they match the spec's table: rest 3.24/3.29/3.29/3.41, hover 5.63/5.81/5.90/6.36 (light/acme/dark/ember, worst of the two surfaces).

### Task 5: Integrate and open the PR (controller)

- [ ] `git fetch origin && git merge origin/main`. Re-check that D120 is not claimed by another `## Decisions` entry on `origin/main`. Then run `node tools/check-docs-drift.mjs` (and the full gate line if the merge touched `packages/`).
- [ ] Push `d120-field-border`, open the PR, `gh pr merge <n> --auto --squash`, and read it back with `gh pr view <n> --json autoMergeRequest`. If it is null, use the `enablePullRequestAutoMerge` GraphQL mutation.
- [ ] When CI's `vr` fails, download the `vr-baselines` artifact into `.superpowers/`. Send the user a sample of before/after renders (Input, Select and Textarea in light, dark, acme and ember, plus the colour-token docs story if it moved). After the user's OK, commit the `*-actual.png` renders over their baselines, only for stories the PR explains. Never run `pnpm vr` in update mode on macOS.
