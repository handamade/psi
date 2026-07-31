# Control Ramp Tokens Implementation Plan (D54–D55)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move per-size geometry off the four sized controls' CSS Modules into a shared `control` token family, fixing the Input/Select padding divergence and giving icon-leading controls an optical inset.

**Architecture:** A new token-only pseudo-component `control` (the `surface.ts` posture from D51) declares the ramp; Button, IconButton, Input and Select alias it. Height and gap are shared across roles; padding and font fork into a label ramp and a value ramp. The optical icon inset is a `:has(> svg:first-child)` rule, not a DOM wrapper, so no component API changes.

**Tech Stack:** TypeScript token DSL, CSS Modules, vitest, stylelint (custom `psi/*` plugins), Playwright VR, changesets. Zero new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-07-31-control-ramp-tokens-design.md`.

## Global Constraints

Every task's requirements implicitly include this section.

- **Node 24 is required and is the default.** `pnpm` 11.9 needs `node:sqlite` and dies on Node 20. Verify with `node -v` before starting; if it reports v20, open a new shell rather than prefixing commands.
- **Branch:** `dkurkin/d54-control-ramp-tokens`, cut from `origin/main`. **Implementation lands after D53 merges.** Rebase onto `main` first; the only shared file is `packages/tokens/scripts/build.ts` (two lines in the component registry).
- **Zero new runtime dependencies.** `packages/react/package.json` `dependencies` stays `{}`.
- **Sizes are px numbers** (`24 | 32 | 40 | 48`), never S/M/L. Scale names are pixel-true (`--psi-space-8` = 8px).
- **Never hardcode colors in component CSS.** A module may bind only `--psi-{own-component}-*` and scale tokens (`space|size|radius|text|font|duration|ease|z`) — `tools/stylelint-plugin-psi-tokens.mjs` enforces it and fails `pnpm lint`. **`--psi-control-*` is neither**, so no CSS Module may bind the family directly. Always go through the component alias.
- **`icon-button` maps to `button`** in the stylelint plugin's `ALIASES` table. `icon-button.module.css` may only bind `--psi-button-*`. IconButton therefore declares no tokens of its own.
- **New token values go in `packages/tokens/src`, never in `dist`.** `dist` is generated.
- **Browser floor is unchanged:** Chrome/Edge 119+, Safari 18+, Firefox 128+. `:has()` is comfortably below this floor.
- **Gate chain for every commit:** `pnpm build` (WCAG AA contrast + D46 scopes — throws on failure), `pnpm test`, `pnpm lint`.
- **VR baselines are Linux-only.** New-story baselines come from CI's `vr-baselines` artifact: push, let the designed VR failure run, download the artifact, commit the PNGs.
- **Do not add a `scopes` entry to any geometry token.** `keyGroup()` returns `undefined` for keys with no `bg`/`fg`/`border` segment, which is what keeps them out of `scope-map.json` and out of both scope gates. Introducing a scope would make `height` (not in any property group) fail.

---

### Task 1: Add the `text-18-28-regular` typography combo

Input and Select run `regular` at 24/32/40 then jump to `medium` at 48 — not a slip, but a forced choice: no sans `18-28-regular` exists. Task 2's `control-value-48-font` needs it, so it lands first.

**Files:**
- Modify: `packages/tokens/src/scales/typography.ts` (combo list, ~line 34)
- Test: `packages/tokens/__tests__/scales.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: the CSS custom property `--psi-text-18-28-regular`, consumed by Task 2's `controlVars["value-48-font"]`.

- [ ] **Step 1: Write the failing test**

Append inside the top-level `describe("scales", …)` block in `packages/tokens/__tests__/scales.test.ts`, just before its closing `});`:

```ts
  describe("typography combos", () => {
    it("ships sans 18-28-regular so the value ramp runs regular end to end (D55)", () => {
      const names = typographyCombos.map(comboName);
      expect(names).toContain("18-28-regular");
      expect(names).toContain("18-28-medium");
    });

    it("has no duplicate combo names", () => {
      const names = typographyCombos.map(comboName);
      expect(new Set(names).size).toBe(names.length);
    });
  });
```

Extend the existing import on line 6 of the same file to pull in the list:

```ts
import { comboName, WEIGHT_VALUES, typographyCombos } from "../src/scales/typography.js";
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run packages/tokens/__tests__/scales.test.ts -t "value ramp runs regular"
```

Expected: FAIL — `expected [ … ] to include '18-28-regular'`.

- [ ] **Step 3: Add the combo**

In `packages/tokens/src/scales/typography.ts`, inside `typographyCombos`, insert the regular entry immediately **before** the existing `18/28/medium` line (regular precedes medium everywhere else in the list):

```ts
  { fontSize: 18, lineHeight: 28, weight: "regular" },
  { fontSize: 18, lineHeight: 28, weight: "medium" },
```

- [ ] **Step 4: Run the test and the token build**

```bash
pnpm vitest run packages/tokens/__tests__/scales.test.ts && pnpm --filter @handamade/psi-tokens build
```

Expected: test PASS; build exits 0 with no gamut warnings.

- [ ] **Step 5: Verify the token is emitted**

```bash
grep -c "psi-text-18-28-regular" packages/tokens/dist/base.css
```

Expected: `1`.

- [ ] **Step 6: Commit**

```bash
git add packages/tokens/src/scales/typography.ts packages/tokens/__tests__/scales.test.ts
git commit -m "feat(tokens): add sans text-18-28-regular combo (D55)

Input and Select ran regular at 24/32/40 and jumped to medium at 48 only
because no sans 18-28-regular existed. Adding it lets the value ramp run
regular end to end."
```

---

### Task 2: The `control` token family

28 tokens in one new file, registered in the build exactly as `surface.ts` is.

**Files:**
- Create: `packages/tokens/src/components/control.ts`
- Modify: `packages/tokens/scripts/build.ts` (import block ~line 30, `componentVars` registry ~line 70)
- Test: `packages/tokens/__tests__/control-tokens.test.ts`

**Interfaces:**
- Consumes: `--psi-size-{24,32,40,48}`, `--psi-space-{4,6,8,12,16,20}`, `--psi-text-*` combos (incl. Task 1's); `emitComponentVarsCSS(component, vars)` from `packages/tokens/scripts/emit-components.js`.
- Produces: `controlVars: Record<string, string>`, emitted as `--psi-control-*`. Tasks 3 and 4 alias these; **no CSS Module may bind them directly** (stylelint forbids it).

- [ ] **Step 1: Write the failing test**

Create `packages/tokens/__tests__/control-tokens.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { controlVars } from "../src/components/control.js";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";
import { keyGroup } from "../src/scopes.js";

const SIZES = [24, 32, 40, 48] as const;

describe("controlVars", () => {
  it("declares height and gap for every size (shared across roles)", () => {
    expect(SIZES.map((n) => controlVars[`${n}-height`])).toEqual([
      "var(--psi-size-24)", "var(--psi-size-32)",
      "var(--psi-size-40)", "var(--psi-size-48)",
    ]);
    expect(SIZES.map((n) => controlVars[`${n}-gap`])).toEqual([
      "var(--psi-space-4)", "var(--psi-space-8)",
      "var(--psi-space-8)", "var(--psi-space-8)",
    ]);
  });

  it("declares the label ramp — padding 8/12/16/20, icon inset 6/8/12/16", () => {
    expect(SIZES.map((n) => controlVars[`${n}-padding-inline`])).toEqual([
      "var(--psi-space-8)", "var(--psi-space-12)",
      "var(--psi-space-16)", "var(--psi-space-20)",
    ]);
    expect(SIZES.map((n) => controlVars[`${n}-padding-inline-icon`])).toEqual([
      "var(--psi-space-6)", "var(--psi-space-8)",
      "var(--psi-space-12)", "var(--psi-space-16)",
    ]);
  });

  it("declares the value ramp one step tighter than the label ramp (D55)", () => {
    expect(SIZES.map((n) => controlVars[`value-${n}-padding-inline`])).toEqual([
      "var(--psi-space-8)", "var(--psi-space-8)",
      "var(--psi-space-12)", "var(--psi-space-16)",
    ]);
  });

  it("label fonts are medium, value fonts are regular at every size", () => {
    for (const n of SIZES) {
      expect(controlVars[`${n}-font`]).toMatch(/-medium\)$/);
      expect(controlVars[`value-${n}-font`]).toMatch(/-regular\)$/);
    }
    expect(controlVars["value-48-font"]).toBe("var(--psi-text-18-28-regular)");
  });

  it("binds only scale tokens — the family aliases nothing component-level", () => {
    for (const value of Object.values(controlVars)) {
      expect(value).toMatch(/^var\(--psi-(size|space|text)-[a-z0-9-]+\)$/);
    }
  });

  it("carries no scope-bearing keys, so both D46 gates skip it", () => {
    for (const key of Object.keys(controlVars)) {
      expect(keyGroup(key)).toBeUndefined();
    }
  });

  it("emits --psi-control-* custom properties", () => {
    const css = emitComponentVarsCSS("control", controlVars);
    expect(css).toContain("--psi-control-40-padding-inline: var(--psi-space-16)");
    expect(css).toContain("--psi-control-40-padding-inline-icon: var(--psi-space-12)");
    expect(css).toContain("--psi-control-value-40-padding-inline: var(--psi-space-12)");
    expect(css).toContain("--psi-control-value-48-font: var(--psi-text-18-28-regular)");
  });

  it("has exactly 28 tokens", () => {
    expect(Object.keys(controlVars)).toHaveLength(28);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run packages/tokens/__tests__/control-tokens.test.ts
```

Expected: FAIL — `Cannot find module '../src/components/control.js'`.

- [ ] **Step 3: Write the token source**

Create `packages/tokens/src/components/control.ts`:

```ts
/** Shared sized-control ramp (--psi-control-*) — D54/D55. A token-only family
 * with no component behind it, same posture as surface.ts (D51): Button,
 * IconButton, Input and Select alias it and nothing binds it directly (the
 * psi/component-tokens-only stylelint rule makes that a lint error).
 *
 * Height and gap are shared across roles. Padding and font fork: a centred
 * label wants more air than a left-aligned value, and labels are medium
 * while values are regular. Input and Select both bind the value ramp, so
 * they cannot diverge from each other — that is the point of the family.
 *
 * The icon inset is the label ramp minus the text inset, derived so a
 * text-only control renders pixel-identical to pre-D54 output:
 *
 *   size | p (icon side) | text inset | raw gap | icon side | icon-text | text side
 *     24 |       6       |     2      |    2    |     6     |     4     |     8
 *     32 |       8       |     4      |    4    |     8     |     8     |    12
 *     40 |      12       |     4      |    4    |    12     |     8     |    16
 *     48 |      16       |     4      |    4    |    16     |     8     |    20
 *
 * The emitted padding-inline-icon and gap tokens are the effective columns. */
export const controlVars: Record<string, string> = {
  // ── Shared across roles ────────────────────────────────────────
  "24-height": "var(--psi-size-24)",
  "32-height": "var(--psi-size-32)",
  "40-height": "var(--psi-size-40)",
  "48-height": "var(--psi-size-48)",

  "24-gap": "var(--psi-space-4)",
  "32-gap": "var(--psi-space-8)",
  "40-gap": "var(--psi-space-8)",
  "48-gap": "var(--psi-space-8)",

  // ── Label ramp (Button, IconButton) ────────────────────────────
  "24-padding-inline": "var(--psi-space-8)",
  "32-padding-inline": "var(--psi-space-12)",
  "40-padding-inline": "var(--psi-space-16)",
  "48-padding-inline": "var(--psi-space-20)",

  "24-padding-inline-icon": "var(--psi-space-6)",
  "32-padding-inline-icon": "var(--psi-space-8)",
  "40-padding-inline-icon": "var(--psi-space-12)",
  "48-padding-inline-icon": "var(--psi-space-16)",

  "24-font": "var(--psi-text-12-16-medium)",
  "32-font": "var(--psi-text-14-20-medium)",
  "40-font": "var(--psi-text-16-24-medium)",
  "48-font": "var(--psi-text-18-28-medium)",

  // ── Value ramp (Input, Select) ─────────────────────────────────
  "value-24-padding-inline": "var(--psi-space-8)",
  "value-32-padding-inline": "var(--psi-space-8)",
  "value-40-padding-inline": "var(--psi-space-12)",
  "value-48-padding-inline": "var(--psi-space-16)",

  "value-24-font": "var(--psi-text-12-16-regular)",
  "value-32-font": "var(--psi-text-14-20-regular)",
  "value-40-font": "var(--psi-text-16-24-regular)",
  "value-48-font": "var(--psi-text-18-28-regular)",
};
```

- [ ] **Step 4: Register it in the token build**

In `packages/tokens/scripts/build.ts`, add the import with the other component imports (alphabetical — after `cardVars`/`checkboxVars`, before `dialogVars`):

```ts
import { controlVars } from "../src/components/control.js";
```

And the registry entry in `componentVars`, keeping alphabetical order:

```ts
  control: controlVars,
```

- [ ] **Step 5: Run the test and the token build**

```bash
pnpm vitest run packages/tokens/__tests__/control-tokens.test.ts && pnpm --filter @handamade/psi-tokens build
```

Expected: test PASS; build exits 0. The build is the contrast gate **and** the D46 scope gate — a bad key or binding throws here.

- [ ] **Step 6: Verify emission and that the family stayed out of the scope map**

```bash
grep -c "psi-control-" packages/tokens/dist/components.css
node -e "const m=require('./packages/tokens/dist/scope-map.json');console.log(Object.keys(m.component).filter(k=>k.startsWith('control-')).length)"
```

Expected: `28`, then `0`. A non-zero second number means a key accidentally carries a `bg`/`fg`/`border` segment and would be scope-gated — fix the key name.

- [ ] **Step 7: Commit**

```bash
git add packages/tokens/src/components/control.ts packages/tokens/scripts/build.ts packages/tokens/__tests__/control-tokens.test.ts
git commit -m "feat(tokens): --psi-control-* sized-control ramp family (D54)

Per-size geometry for Button/IconButton/Input/Select becomes data instead
of literals in CSS Modules. Token-only family, surface.ts posture (D51).
Label and value ramps fork on padding and font; height and gap are shared."
```

---

### Task 3: Button and IconButton bind the label ramp

Adds 20 aliases to `buttonVars`, rewrites both size blocks, and introduces the optical icon inset. **Text-only Button output must be pixel-identical to pre-D54** — that is the acceptance check.

**Files:**
- Modify: `packages/tokens/src/components/button.ts` (append to `buttonVars`)
- Modify: `packages/react/src/Button/button.module.css` (base rule line 7; sizes lines 37–61)
- Modify: `packages/react/src/IconButton/icon-button.module.css` (sizes lines 37–55)
- Test: `packages/tokens/__tests__/button-tokens.test.ts` (append)

**Interfaces:**
- Consumes: `controlVars` keys from Task 2, via `--psi-control-*`.
- Produces: `--psi-button-{24|32|40|48}-{height,padding-inline,padding-inline-icon,gap,font}`. IconButton binds `--psi-button-{n}-height`; Task 4 mirrors this shape for Input/Select.

- [ ] **Step 1: Write the failing test**

Append inside the `describe("buttonVars", …)` block in `packages/tokens/__tests__/button-tokens.test.ts`, before its closing `});`:

```ts
  describe("size ramp (D54)", () => {
    const SIZES = [24, 32, 40, 48] as const;

    it("aliases the control family for every ramp property", () => {
      for (const n of SIZES) {
        expect(buttonVars[`${n}-height`]).toBe(`var(--psi-control-${n}-height)`);
        expect(buttonVars[`${n}-padding-inline`]).toBe(`var(--psi-control-${n}-padding-inline)`);
        expect(buttonVars[`${n}-padding-inline-icon`]).toBe(`var(--psi-control-${n}-padding-inline-icon)`);
        expect(buttonVars[`${n}-gap`]).toBe(`var(--psi-control-${n}-gap)`);
        expect(buttonVars[`${n}-font`]).toBe(`var(--psi-control-${n}-font)`);
      }
    });

    it("binds the label ramp, never the value ramp", () => {
      const ramp = Object.entries(buttonVars).filter(([k]) => /^\d\d-/.test(k));
      expect(ramp).toHaveLength(20);
      for (const [, value] of ramp) {
        expect(value).not.toContain("--psi-control-value-");
      }
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run packages/tokens/__tests__/button-tokens.test.ts -t "size ramp"
```

Expected: FAIL — `expected undefined to be 'var(--psi-control-24-height)'`.

- [ ] **Step 3: Append the aliases to `buttonVars`**

In `packages/tokens/src/components/button.ts`, add before the closing `};` of `buttonVars` (after the `"focus-ring"` entry):

```ts
  // ── Size ramp (D54) — label ramp; IconButton binds -height for both axes ──
  "24-height": "var(--psi-control-24-height)",
  "32-height": "var(--psi-control-32-height)",
  "40-height": "var(--psi-control-40-height)",
  "48-height": "var(--psi-control-48-height)",

  "24-padding-inline": "var(--psi-control-24-padding-inline)",
  "32-padding-inline": "var(--psi-control-32-padding-inline)",
  "40-padding-inline": "var(--psi-control-40-padding-inline)",
  "48-padding-inline": "var(--psi-control-48-padding-inline)",

  "24-padding-inline-icon": "var(--psi-control-24-padding-inline-icon)",
  "32-padding-inline-icon": "var(--psi-control-32-padding-inline-icon)",
  "40-padding-inline-icon": "var(--psi-control-40-padding-inline-icon)",
  "48-padding-inline-icon": "var(--psi-control-48-padding-inline-icon)",

  "24-gap": "var(--psi-control-24-gap)",
  "32-gap": "var(--psi-control-32-gap)",
  "40-gap": "var(--psi-control-40-gap)",
  "48-gap": "var(--psi-control-48-gap)",

  "24-font": "var(--psi-control-24-font)",
  "32-font": "var(--psi-control-32-font)",
  "40-font": "var(--psi-control-40-font)",
  "48-font": "var(--psi-control-48-font)",
```

- [ ] **Step 4: Rewrite Button's base gap and size blocks**

In `packages/react/src/Button/button.module.css`, **delete line 7** from the `.button` rule:

```css
  gap: var(--psi-space-6);
```

Then replace the whole `/* ── Sizes ── */` section (lines 37–61) with:

```css
/* ── Sizes ────────────────────────────────────────────────────── */

/* Optical inset (D55): an icon is a solid shape with no side bearing, so a
   leading icon sits closer to the edge than text does. :has() replaces the
   Figma construction (container + text wrapper inset) with no DOM wrapper —
   identical pixels, no API change. A consumer who wraps their icon in a
   <span> gets no inset and can set --psi-button-{n}-padding-inline-icon. */

.size24 {
  height: var(--psi-button-24-height);
  padding-inline: var(--psi-button-24-padding-inline);
  gap: var(--psi-button-24-gap);
  font: var(--psi-button-font, var(--psi-button-24-font));
}
.size24:has(> svg:first-child) {
  padding-inline-start: var(--psi-button-24-padding-inline-icon);
}

.size32 {
  height: var(--psi-button-32-height);
  padding-inline: var(--psi-button-32-padding-inline);
  gap: var(--psi-button-32-gap);
  font: var(--psi-button-font, var(--psi-button-32-font));
}
.size32:has(> svg:first-child) {
  padding-inline-start: var(--psi-button-32-padding-inline-icon);
}

.size40 {
  height: var(--psi-button-40-height);
  padding-inline: var(--psi-button-40-padding-inline);
  gap: var(--psi-button-40-gap);
  font: var(--psi-button-font, var(--psi-button-40-font));
}
.size40:has(> svg:first-child) {
  padding-inline-start: var(--psi-button-40-padding-inline-icon);
}

.size48 {
  height: var(--psi-button-48-height);
  padding-inline: var(--psi-button-48-padding-inline);
  gap: var(--psi-button-48-gap);
  font: var(--psi-button-font, var(--psi-button-48-font));
}
.size48:has(> svg:first-child) {
  padding-inline-start: var(--psi-button-48-padding-inline-icon);
}
```

Note the `var(--psi-button-font, …)` fallback is preserved verbatim — it is ember's D34 override hook and flattens font across the whole ramp.

- [ ] **Step 5: Rewrite IconButton's size blocks**

In `packages/react/src/IconButton/icon-button.module.css`, replace lines 37–55 with:

```css
.size24 {
  width: var(--psi-button-24-height);
  height: var(--psi-button-24-height);
}

.size32 {
  width: var(--psi-button-32-height);
  height: var(--psi-button-32-height);
}

.size40 {
  width: var(--psi-button-40-height);
  height: var(--psi-button-40-height);
}

.size48 {
  width: var(--psi-button-48-height);
  height: var(--psi-button-48-height);
}
```

IconButton declares no tokens of its own: the stylelint plugin maps `icon-button → button`, so this module may only bind `--psi-button-*`.

- [ ] **Step 6: Run tests, build and lint**

```bash
pnpm vitest run packages/tokens/__tests__/button-tokens.test.ts && \
  pnpm --filter @handamade/psi-tokens build && \
  pnpm test && pnpm lint
```

Expected: all PASS. Existing Button/IconButton unit and axe tests must pass unchanged — this task makes no behavioural or API change.

- [ ] **Step 7: Commit**

```bash
git add packages/tokens/src/components/button.ts packages/tokens/__tests__/button-tokens.test.ts \
  packages/react/src/Button/button.module.css packages/react/src/IconButton/icon-button.module.css
git commit -m "feat(react): Button and IconButton bind the control ramp (D54/D55)

Size geometry moves from CSS literals onto --psi-button-{n}-* aliases of
the control family. Adds the D55 optical icon inset via :has() — a leading
icon sits one step closer to the edge than text. Text-only Buttons are
pixel-identical; ember's --psi-button-font override is preserved."
```

---

### Task 4: Input and Select bind the value ramp

The user-visible fix. Includes the anti-drift test that makes the divergence unrepeatable — the acceptance test for the whole cycle.

**Files:**
- Modify: `packages/tokens/src/components/input.ts` (append to `inputVars`)
- Modify: `packages/tokens/src/components/select.ts` (append to `selectVars`)
- Modify: `packages/react/src/Input/input.module.css` (base line 11; sizes lines 38–56)
- Modify: `packages/react/src/Select/select.module.css` (base lines 12, 15–16; sizes lines 40–58)
- Test: `packages/tokens/__tests__/control-tokens.test.ts` (append the anti-drift block)

**Interfaces:**
- Consumes: `controlVars` from Task 2 via `--psi-control-value-*`.
- Produces: `--psi-input-{n}-{height,padding-inline,font}` and `--psi-select-{n}-{height,padding-inline,padding-inline-end,chevron-offset,font}`.

- [ ] **Step 1: Write the failing anti-drift test**

Append to `packages/tokens/__tests__/control-tokens.test.ts`, after the `describe("controlVars", …)` block:

```ts
import { inputVars } from "../src/components/input.js";
import { selectVars } from "../src/components/select.js";

describe("value-ramp consumers cannot drift (D54 acceptance)", () => {
  const SIZES = [24, 32, 40, 48] as const;

  it("Input and Select resolve to the SAME value-ramp token at every size", () => {
    for (const n of SIZES) {
      expect(inputVars[`${n}-padding-inline`]).toBe(`var(--psi-control-value-${n}-padding-inline)`);
      expect(selectVars[`${n}-padding-inline`]).toBe(inputVars[`${n}-padding-inline`]);
      expect(inputVars[`${n}-font`]).toBe(`var(--psi-control-value-${n}-font)`);
      expect(selectVars[`${n}-font`]).toBe(inputVars[`${n}-font`]);
      expect(inputVars[`${n}-height`]).toBe(`var(--psi-control-${n}-height)`);
      expect(selectVars[`${n}-height`]).toBe(inputVars[`${n}-height`]);
    }
  });

  it("neither text control binds the label ramp", () => {
    for (const vars of [inputVars, selectVars]) {
      for (const [key, value] of Object.entries(vars)) {
        if (!/-padding-inline$|-font$/.test(key) || !/^\d\d-/.test(key)) continue;
        expect(value).toContain("--psi-control-value-");
      }
    }
  });

  it("Select's chevron well derives from the value ramp, not a literal", () => {
    for (const n of SIZES) {
      expect(selectVars[`${n}-chevron-offset`]).toBe(`var(--psi-control-value-${n}-padding-inline)`);
      // 12px glyph + 4px breathing; 28 is not on the spacing scale, hence calc.
      expect(selectVars[`${n}-padding-inline-end`]).toBe(
        `calc(var(--psi-control-value-${n}-padding-inline) + var(--psi-space-16))`,
      );
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run packages/tokens/__tests__/control-tokens.test.ts -t "cannot drift"
```

Expected: FAIL — `expected undefined to be 'var(--psi-control-value-24-padding-inline)'`.

- [ ] **Step 3: Append the aliases to `inputVars`**

In `packages/tokens/src/components/input.ts`, add before the closing `};`:

```ts
  // ── Size ramp (D54) — value ramp, shared with Select ──
  "24-height": "var(--psi-control-24-height)",
  "32-height": "var(--psi-control-32-height)",
  "40-height": "var(--psi-control-40-height)",
  "48-height": "var(--psi-control-48-height)",

  "24-padding-inline": "var(--psi-control-value-24-padding-inline)",
  "32-padding-inline": "var(--psi-control-value-32-padding-inline)",
  "40-padding-inline": "var(--psi-control-value-40-padding-inline)",
  "48-padding-inline": "var(--psi-control-value-48-padding-inline)",

  "24-font": "var(--psi-control-value-24-font)",
  "32-font": "var(--psi-control-value-32-font)",
  "40-font": "var(--psi-control-value-40-font)",
  "48-font": "var(--psi-control-value-48-font)",
```

- [ ] **Step 4: Append the aliases to `selectVars`**

In `packages/tokens/src/components/select.ts`, add before the closing `};`:

```ts
  // ── Size ramp (D54) — same value ramp as Input, by construction ──
  "24-height": "var(--psi-control-24-height)",
  "32-height": "var(--psi-control-32-height)",
  "40-height": "var(--psi-control-40-height)",
  "48-height": "var(--psi-control-48-height)",

  "24-padding-inline": "var(--psi-control-value-24-padding-inline)",
  "32-padding-inline": "var(--psi-control-value-32-padding-inline)",
  "40-padding-inline": "var(--psi-control-value-40-padding-inline)",
  "48-padding-inline": "var(--psi-control-value-48-padding-inline)",

  "24-font": "var(--psi-control-value-24-font)",
  "32-font": "var(--psi-control-value-32-font)",
  "40-font": "var(--psi-control-value-40-font)",
  "48-font": "var(--psi-control-value-48-font)",

  // Chevron well: the glyph is a fixed 12x12 data URI, so the end padding is
  // offset + 12 + 4 breathing = offset + 16. 28px is not on the spacing
  // scale, so the +16 is expressed as calc rather than a scale step.
  "24-chevron-offset": "var(--psi-control-value-24-padding-inline)",
  "32-chevron-offset": "var(--psi-control-value-32-padding-inline)",
  "40-chevron-offset": "var(--psi-control-value-40-padding-inline)",
  "48-chevron-offset": "var(--psi-control-value-48-padding-inline)",

  "24-padding-inline-end": "calc(var(--psi-control-value-24-padding-inline) + var(--psi-space-16))",
  "32-padding-inline-end": "calc(var(--psi-control-value-32-padding-inline) + var(--psi-space-16))",
  "40-padding-inline-end": "calc(var(--psi-control-value-40-padding-inline) + var(--psi-space-16))",
  "48-padding-inline-end": "calc(var(--psi-control-value-48-padding-inline) + var(--psi-space-16))",
```

- [ ] **Step 5: Rewrite Input's CSS**

In `packages/react/src/Input/input.module.css`, **delete line 11** from the `.input` rule:

```css
  padding-inline: var(--psi-space-8);
```

Replace the `/* ── Sizes ── */` section (lines 38–56) with:

```css
.size24 {
  height: var(--psi-input-24-height);
  padding-inline: var(--psi-input-24-padding-inline);
  font: var(--psi-input-24-font);
}

.size32 {
  height: var(--psi-input-32-height);
  padding-inline: var(--psi-input-32-padding-inline);
  font: var(--psi-input-32-font);
}

.size40 {
  height: var(--psi-input-40-height);
  padding-inline: var(--psi-input-40-padding-inline);
  font: var(--psi-input-40-font);
}

.size48 {
  height: var(--psi-input-48-height);
  padding-inline: var(--psi-input-48-padding-inline);
  font: var(--psi-input-48-font);
}
```

- [ ] **Step 6: Rewrite Select's CSS**

In `packages/react/src/Select/select.module.css`, **delete lines 12, 15 and 16** from the `.select` rule (they move into the size blocks):

```css
  background-position: right var(--psi-space-8) center;
  padding-inline-start: var(--psi-space-8);
  padding-inline-end: var(--psi-space-24);
```

Replace the `/* ── Sizes ── */` section (lines 40–58) with:

```css
.size24 {
  height: var(--psi-select-24-height);
  padding-inline-start: var(--psi-select-24-padding-inline);
  padding-inline-end: var(--psi-select-24-padding-inline-end);
  background-position: right var(--psi-select-24-chevron-offset) center;
  font: var(--psi-select-24-font);
}

.size32 {
  height: var(--psi-select-32-height);
  padding-inline-start: var(--psi-select-32-padding-inline);
  padding-inline-end: var(--psi-select-32-padding-inline-end);
  background-position: right var(--psi-select-32-chevron-offset) center;
  font: var(--psi-select-32-font);
}

.size40 {
  height: var(--psi-select-40-height);
  padding-inline-start: var(--psi-select-40-padding-inline);
  padding-inline-end: var(--psi-select-40-padding-inline-end);
  background-position: right var(--psi-select-40-chevron-offset) center;
  font: var(--psi-select-40-font);
}

.size48 {
  height: var(--psi-select-48-height);
  padding-inline-start: var(--psi-select-48-padding-inline);
  padding-inline-end: var(--psi-select-48-padding-inline-end);
  background-position: right var(--psi-select-48-chevron-offset) center;
  font: var(--psi-select-48-font);
}
```

- [ ] **Step 7: Run tests, build and lint**

```bash
pnpm vitest run packages/tokens/__tests__/control-tokens.test.ts && \
  pnpm --filter @handamade/psi-tokens build && \
  pnpm test && pnpm lint
```

Expected: all PASS.

- [ ] **Step 8: Verify the emitted values resolve as intended**

```bash
grep -E "psi-(input|select)-(24|48)-(padding-inline|font)" packages/tokens/dist/components.css
```

Expected: `--psi-input-24-padding-inline: var(--psi-control-value-24-padding-inline);` and the 48 counterparts — confirming Input and Select both route through the value ramp rather than a literal.

- [ ] **Step 9: Commit**

```bash
git add packages/tokens/src/components/input.ts packages/tokens/src/components/select.ts \
  packages/tokens/__tests__/control-tokens.test.ts \
  packages/react/src/Input/input.module.css packages/react/src/Select/select.module.css
git commit -m "fix(react): Input and Select scale their padding with size (D54/D55)

Both were flat at space-8 at every size while Button scaled 8/12/16/20 — at
size 48 a Button inset its label 20px and an adjacent Input inset its text
8px. Both now bind the shared value ramp (8/8/12/16), and the anti-drift
test asserts they resolve to the same token at every size."
```

---

### Task 5: Expose the ramp in `guidance.json`

Component tokens do not reach the MCP: it bakes `guidance.json` and `resolved/*.json`, and `resolved` holds only semantic theme tokens. Without this, an agent still cannot ask what padding a 40px Button uses — the headline justification for D54.

**Files:**
- Modify: `packages/tokens/src/guidance.ts` (new `geometry` key)
- Test: `packages/tokens/__tests__/guidance.test.ts` (append)

**Interfaces:**
- Consumes: nothing at runtime — the block is hand-authored prose-as-data, mirroring the values in Task 2.
- Produces: `guidance.geometry`, emitted into `dist/guidance.json` by `build.ts` step 6 and baked into the MCP index.

- [ ] **Step 1: Write the failing test**

Append inside the `describe("guidance", …)` block in `packages/tokens/__tests__/guidance.test.ts`, before its closing `});`:

```ts
  it("exposes the D54 control ramp so agents can query per-size geometry", () => {
    expect(guidance.geometry.sizes).toEqual([24, 32, 40, 48]);
    expect(guidance.geometry.label.paddingInline).toEqual([8, 12, 16, 20]);
    expect(guidance.geometry.label.paddingInlineIcon).toEqual([6, 8, 12, 16]);
    expect(guidance.geometry.label.gap).toEqual([4, 8, 8, 8]);
    expect(guidance.geometry.value.paddingInline).toEqual([8, 8, 12, 16]);
    expect(guidance.geometry.components.Button).toBe("label");
    expect(guidance.geometry.components.Input).toBe("value");
    expect(guidance.geometry.components.Select).toBe("value");
    expect(guidance.geometry.note).toMatch(/--psi-control-/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run packages/tokens/__tests__/guidance.test.ts -t "control ramp"
```

Expected: FAIL — `Cannot read properties of undefined (reading 'sizes')`.

- [ ] **Step 3: Add the geometry block**

In `packages/tokens/src/guidance.ts`, add a `geometry` key before the closing `} as const;` (after the `tags` block):

```ts
  geometry: {
    sizes: [24, 32, 40, 48],
    label: {
      paddingInline: [8, 12, 16, 20],
      paddingInlineIcon: [6, 8, 12, 16],
      gap: [4, 8, 8, 8],
      font: ["12-16-medium", "14-20-medium", "16-24-medium", "18-28-medium"],
    },
    value: {
      paddingInline: [8, 8, 12, 16],
      font: ["12-16-regular", "14-20-regular", "16-24-regular", "18-28-regular"],
    },
    components: {
      Button: "label",
      IconButton: "label",
      Input: "value",
      Select: "value",
    },
    note:
      "Per-size geometry is data, not CSS literals (D54). Arrays are indexed by sizes[]. Read a value as --psi-control-{size}-{prop} for the label ramp and --psi-control-value-{size}-{prop} for the value ramp; components alias these as --psi-{component}-{size}-{prop}, which is the layer to override. The value ramp is one step tighter than the label ramp because a left-aligned value wants less air than a centred label (D55).",
    iconInset:
      "A leading icon sits one step closer to the edge than text — an icon is a solid shape with no side bearing (D55). Applied by .size{n}:has(> svg:first-child) on Button; an icon wrapped in a <span> does not match, and the consumer sets --psi-button-{size}-padding-inline-icon instead.",
  },
```

- [ ] **Step 4: Run the test and the token build**

```bash
pnpm vitest run packages/tokens/__tests__/guidance.test.ts && pnpm --filter @handamade/psi-tokens build
```

Expected: test PASS; build exits 0.

- [ ] **Step 5: Verify it reached the emitted artifact**

```bash
node -e "const g=require('./packages/tokens/dist/guidance.json');console.log(g.geometry.value.paddingInline.join(','))"
```

Expected: `8,8,12,16`.

- [ ] **Step 6: Commit**

```bash
git add packages/tokens/src/guidance.ts packages/tokens/__tests__/guidance.test.ts
git commit -m "feat(tokens): expose the control ramp in guidance.json (D54)

Component tokens do not reach the MCP — it bakes guidance.json and
resolved/*.json, and resolved carries only semantic theme tokens. Without
this an agent still could not ask what padding a 40px Button uses."
```

---

### Task 6: Story, VR baselines, changeset

The optical inset has no story today, so nothing would catch a regression in it.

**Files:**
- Modify: `packages/react/src/Button/Button.stories.tsx` (new story)
- Create: `.changeset/control-ramp-tokens.md`
- Create: VR baseline PNGs under `apps/storybook/vr/stories.spec.ts-snapshots/` (from CI artifact)

**Interfaces:**
- Consumes: `IconPlus` from `packages/react/src/icons/IconPlus.js` (default `size` 20; pass an explicit `size` per control size).
- Produces: story id `components-button--icon-leading`, picked up automatically by `apps/storybook/vr/stories.spec.ts` in light and ember.

- [ ] **Step 1: Add the story**

In `packages/react/src/Button/Button.stories.tsx`, extend the imports at the top:

```tsx
import { IconPlus } from "../icons/IconPlus.js";
```

And append after the existing `AllSizes` story:

```tsx
/** D55 optical inset: a leading icon sits one step closer to the edge than
 * text does (12 [icon] 8 [label] 16 at size 40). Compare against AllSizes,
 * whose text-only buttons must stay pixel-identical to pre-D54 output. */
export const IconLeading: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <Button variant="accent" size={24}><IconPlus size={12} />Add item</Button>
      <Button variant="accent" size={32}><IconPlus size={14} />Add item</Button>
      <Button variant="accent" size={40}><IconPlus size={18} />Add item</Button>
      <Button variant="accent" size={48}><IconPlus size={21} />Add item</Button>
    </div>
  ),
};
```

- [ ] **Step 2: Confirm the story renders and existing tests still pass**

```bash
pnpm test && pnpm lint
```

Expected: PASS.

- [ ] **Step 3: Write the changeset**

Create `.changeset/control-ramp-tokens.md`:

```markdown
---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

Control ramp: per-size geometry is now tokens (D54–D55)

Height, padding, gap and font for Button, IconButton, Input and Select move
out of CSS Modules into a shared `--psi-control-*` family, aliased per
component as `--psi-{component}-{size}-{prop}` — the layer to override.

**Visible changes.** Input and Select were flat at 8px inline padding at
every size while Button scaled 8/12/16/20. They now bind a shared value ramp:

| size | Input/Select padding | was |
|---|---|---|
| 24 | 8 | 8 |
| 32 | 8 | 8 |
| 40 | 12 | 8 |
| 48 | 16 | 8 |

Input and Select at 48 also switch from `medium` to `regular`, now that
`--psi-text-18-28-regular` exists.

Buttons with a leading icon gain an optical inset — the icon sits one step
closer to the edge than text (12 [icon] 8 [label] 16 at size 40) — and the
icon/label gap now scales (4/8/8/8) instead of a flat 6px.

Text-only Buttons are pixel-identical. `--psi-button-font` still overrides
typography across all sizes.
```

- [ ] **Step 4: Commit and push to trigger the VR run**

```bash
git add packages/react/src/Button/Button.stories.tsx .changeset/control-ramp-tokens.md
git commit -m "test(react): IconLeading story, changeset for the control ramp (D54/D55)"
git push -u origin dkurkin/d54-control-ramp-tokens
```

- [ ] **Step 5: Collect the VR baselines from CI**

The VR job fails by design: `IconLeading` has no baseline, and Input/Select/icon-Button baselines have legitimately changed. Download CI's `vr-baselines` artifact and commit the PNGs.

```bash
gh run watch
gh run download --name vr-baselines --dir apps/storybook/vr/stories.spec.ts-snapshots
git add apps/storybook/vr/stories.spec.ts-snapshots
git status --short
```

- [ ] **Step 6: Review each changed baseline before committing**

This is the acceptance gate for the whole cycle, not a rubber stamp:

- `components-button--all-sizes` (light **and** ember) must be **byte-identical** to its previous baseline. If it changed, the icon-inset derivation is wrong — `p + i` no longer reproduces the old padding. Stop and fix Task 2's values.
- `components-input--*` and `components-select--*` should show wider insets at 32/40/48 only.
- `components-button--icon-leading` is new.
- ember baselines must still show the mono button font at every size, proving the `--psi-button-font` override survived.

```bash
git commit -m "test(vr): baselines for the control ramp (D54/D55)

Input/Select insets widen at 32/40/48; new IconLeading story. Text-only
Button baselines are unchanged, which is the proof the icon-inset
derivation reproduces the pre-D54 padding."
git push
```

- [ ] **Step 7: Open the PR and arm auto-merge**

```bash
gh pr create --fill --base main
gh pr merge --auto --squash --delete-branch
```

---

## Self-Review

**Spec coverage.** D54's family → Task 2; component aliases → Tasks 3–4; the enforced alias tier → Global Constraints and Task 3 Step 5. D55's value ramp → Task 4; `text-18-28-regular` → Task 1; optical inset → Task 3 Step 4. IconButton's shared namespace → Task 3 Step 5. Select's chevron → Task 4 Steps 4 and 6. Machine readability → Task 5. Testing (anti-drift, zero-diff Button) → Task 4 Step 1 and Task 6 Step 6. Release → Task 6 Step 3. Nothing in the spec is unimplemented; nothing here exceeds the spec.

**Placeholders.** None — every code step carries literal content and every command carries expected output.

**Type consistency.** `controlVars` / `buttonVars` / `inputVars` / `selectVars` are the exact exported names in `packages/tokens/src/components/*.ts`. `emitComponentVarsCSS(component, vars)` and `keyGroup(key)` match their signatures in `scripts/emit-components.ts` and `src/scopes.ts`. Token key strings are identical between the tests that assert them (Tasks 2–4) and the sources that declare them.

**Two things the implementer must not "fix".**
1. `28` is deliberately absent from the spacing scale — Select's end padding uses `calc(… + var(--psi-space-16))` rather than a new scale step. Do not add `space-28`.
2. Geometry keys deliberately carry no `bg`/`fg`/`border` segment. That is what keeps `keyGroup()` returning `undefined` and holds them out of both D46 gates. Renaming a key to include one would make `height` fail the scope check.
