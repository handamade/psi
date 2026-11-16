# Switch track at 3:1 (DNNN) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The unchecked `Switch` track clears 3:1 against its surface (WCAG 1.4.11) in every theme, at rest and on hover, with its white thumb at 3:1 on it, and the token build refuses any theme that breaks it.

**Architecture:** Two new surface-scoped semantics in the light and dark bases. `fillControl` is a `ref` to `borderControl`. `fillControlHover` is `fgPrimary` at 0.75 (light) / 0.55 (dark). Six new `nonTextPairs` reach every gate (`gateTheme` → Psi's build and `buildThemeCss`, and `deriveTheme`'s sweep) automatically, because they all spread `nonTextPairs`. `--psi-switch-track-bg` rebinds to `--psi-fill-control`. A new `--psi-switch-track-bg-hover` is used by one CSS rule.

**Tech Stack:** TypeScript token DSL (`packages/tokens/src`), vitest, CSS modules (`packages/react/src/Switch`), changesets.

Spec: `docs/superpowers/specs/2026-11-16-switch-track-design.md`.

## Global Constraints

- Node 24: run `node -v` first; if it is not 24.x, run `nvm use` in the worktree root.
- New values go in `packages/tokens/src`, never in `dist` (dist is generated).
- Never hardcode colours in component CSS: bind `var(--psi-*)` only.
- A component `-bg` var may only bind a surface-scoped semantic (D46 scope gate). Both new tokens are `scopes: ["surface"]`.
- `fillControl`: `token({ from: ref.borderControl, scopes: ["surface"] })` in BOTH bases (it inherits 0.55 light / 0.40 dark from `borderControl`).
- `fillControlHover`: `token({ from: ref.fgPrimary, alpha: 0.75, scopes: ["surface"] })` light, `alpha: 0.55` dark.
- The six pairs, in this order, all `minRatio: 3`: `fillControl/bgPrimary`, `fillControl/bgSecondary`, `fillControlHover/bgPrimary`, `fillControlHover/bgSecondary`, `fillStaticWhite/fillControl`, `fillStaticWhite/fillControlHover`.
- Full matrix count goes 40 → 46 (`nonTextPairs` 4 → 10).
- Checked track (`fillAccent`), thumb (`fillStaticWhite`), focus and disabled are unchanged.
- Never run `pnpm vr` (its baselines are Linux-only; macOS writes junk).
- Never name the private request register, its ids or consumers in repo files.
- `DNNN` is replaced with the decision number from the coordinating session before the first commit that carries it (Task 0).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 0: Base the branch on D120 and fill in the decision number (controller, not a subagent)

**Files:**
- Modify: `docs/superpowers/specs/2026-11-16-switch-track-design.md`, this plan (replace `DNNN`/`dNNN`)

- [ ] **Step 1:** Wait for PR #163 (D120) to be merged. Then `git fetch origin && git merge origin/main`, and confirm `grep -n borderControlHover packages/tokens/src/contrast-matrix.ts` shows two pairs.
- [ ] **Step 2:** Replace `DNNN` and `dNNN` in the spec and in this plan with the number the coordinating session gave. Rename the branch: `git branch -m dNNN-switch-track` (use the real number).
- [ ] **Step 3:** Commit the spec and plan:

```bash
git add docs/superpowers/specs/2026-11-16-switch-track-design.md docs/superpowers/plans/2026-11-16-switch-track.md
git commit -m "docs: spec and plan for the switch track at 3:1 (DNNN)"
```

---

### Task 1: The tokens and their gate

**Files:**
- Create: `packages/tokens/__tests__/switch-track.test.ts`
- Modify: `packages/tokens/src/themes/light.ts` (directly after `fillStaticWhite`)
- Modify: `packages/tokens/src/themes/dark.ts` (same place)
- Modify: `packages/tokens/src/contrast-matrix.ts` (`nonTextPairs` and its doc comment)
- Modify: `packages/tokens/src/generate/derive.ts` (the `AA_MATRIX` doc comment: 40 → 46)
- Modify: `packages/tokens/__tests__/generate-derive.test.ts` (40 → 46 everywhere it states the count)
- Modify: `packages/tokens/__tests__/field-border.test.ts` (exact `nonTextPairs` list → containment)
- Modify: `packages/tokens/__tests__/control-border.test.ts` (weak-`borderControl` gate expectation)

**Interfaces:**
- Produces: semantic tokens `fillControl`, `fillControlHover` (emitted as `--psi-fill-control`, `--psi-fill-control-hover` by the existing camel→kebab emitter); six entries appended to `nonTextPairs: ContrastPair[]`.

- [ ] **Step 1: Write the failing test** `packages/tokens/__tests__/switch-track.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolve } from "../src/dsl/resolver.js";
import { ref, token } from "../src/dsl/builders.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { acmePalette, acmeSlots } from "../src/themes/customers/acme.js";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
import * as matrix from "../src/contrast-matrix.js";
import { gateTheme, ThemeGateError } from "../src/theme/gate.js";
import type { ContrastPair } from "../src/contrast-matrix.js";

/** DNNN — an unchecked Switch is identified by its track alone and its state
 * by where the white thumb sits on it, so WCAG 1.4.11 asks 3:1 for the track
 * against its surface and for the thumb against the track, at rest and on
 * hover. fillNeutral4 measured 1.10-1.27. */

const nonTextPairs = (): ContrastPair[] =>
  ((matrix as Record<string, unknown>).nonTextPairs as ContrastPair[] | undefined) ?? [];

const SWITCH_PAIRS: ContrastPair[] = [
  { fg: "fillControl", bg: "bgPrimary", minRatio: 3 },
  { fg: "fillControl", bg: "bgSecondary", minRatio: 3 },
  { fg: "fillControlHover", bg: "bgPrimary", minRatio: 3 },
  { fg: "fillControlHover", bg: "bgSecondary", minRatio: 3 },
  { fg: "fillStaticWhite", bg: "fillControl", minRatio: 3 },
  { fg: "fillStaticWhite", bg: "fillControlHover", minRatio: 3 },
];

const ember = customerThemes.ember!;

describe("fillControl and fillControlHover (DNNN)", () => {
  it("fillControl is a ref to borderControl and fillControlHover is fgPrimary at 0.75 / 0.55, both surfaces", () => {
    expect(lightTheme.fillControl).toEqual({ from: ref.borderControl, scopes: ["surface"] });
    expect(darkTheme.fillControl).toEqual({ from: ref.borderControl, scopes: ["surface"] });
    expect(lightTheme.fillControlHover).toEqual({ from: ref.fgPrimary, alpha: 0.75, scopes: ["surface"] });
    expect(darkTheme.fillControlHover).toEqual({ from: ref.fgPrimary, alpha: 0.55, scopes: ["surface"] });
  });

  it("nonTextPairs gates the track on both surfaces and the thumb on the track", () => {
    expect(nonTextPairs()).toEqual(expect.arrayContaining(SWITCH_PAIRS));
  });

  for (const [name, theme, palette, slots] of [
    ["light", lightTheme, defaultPalette, defaultSlots],
    ["dark", darkTheme, defaultPalette, defaultSlots],
    ["acme", lightTheme, acmePalette, acmeSlots],
    ["ember", assembleCustomerTheme(ember), ember.palette, ember.slots],
  ] as const) {
    it(`${name}: clears all six pairs, and hover is further from the surface than rest`, () => {
      const resolved = resolve(theme, palette, slots);
      expect(resolved.fillControl, "fillControl resolves").toBeDefined();
      for (const r of matrix.checkContrast(resolved, SWITCH_PAIRS)) {
        expect(r.ratio, `${r.fg} on ${r.bg}`).toBeGreaterThanOrEqual(3);
      }
      for (const bg of ["bgPrimary", "bgSecondary"]) {
        const [rest, hover] = matrix.checkContrast(resolved, [
          { fg: "fillControl", bg, minRatio: 3 },
          { fg: "fillControlHover", bg, minRatio: 3 },
        ]);
        expect(hover!.ratio, `hover over rest on ${bg}`).toBeGreaterThan(rest!.ratio + 1.5);
      }
    });
  }

  it("the theme gate (Psi's build and buildThemeCss) refuses a fillControl under 3:1, naming the pairs", () => {
    const weak = { ...lightTheme, fillControl: token({ from: ref.fgPrimary, alpha: 0.15, scopes: ["surface"] }) };
    let caught: unknown;
    try {
      gateTheme("weak", weak, defaultPalette, defaultSlots);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ThemeGateError);
    const failing = (caught as ThemeGateError).contrastFailures.map((f) => `${f.fg}/${f.bg}`);
    // Measured: 1.32 / 1.32 track, 1.52 thumb.
    expect(failing).toEqual(["fillControl/bgPrimary", "fillControl/bgSecondary", "fillStaticWhite/fillControl"]);
  });
});
```

Notes for the implementer: check the actual property names on `customerThemes.ember` (`palette`, `slots`) in `packages/tokens/src/themes/customers/index.ts` and adjust if the `CustomerTheme` interface names them differently. The `fillControl` key on `lightTheme` will be a type error until Step 3: that is the red.

- [ ] **Step 2: Run it and watch it fail on the assertion**

Run: `pnpm --dir packages/tokens exec vitest run __tests__/switch-track.test.ts`
Expected: FAIL. The first test fails on `toEqual` (received `undefined`), the gate test fails because `caught` is undefined.

- [ ] **Step 3: Add the tokens.** In `packages/tokens/src/themes/light.ts`, directly after `fillStaticWhite`:

```ts
  /** DNNN: the fill that alone identifies an unchecked control (the Switch
   * track), the surface twin of borderControl. A ref, so the unchecked track
   * and the unchecked checkbox outline are always the same ink, and WCAG
   * 1.4.11 asks 3:1 for it against its surface and for the white thumb on it
   * (`nonTextPairs`). fillNeutral4 measured 1.10-1.27. */
  fillControl: token({ from: ref.borderControl, scopes: ["surface"] }),
  /** DNNN: the unchecked Switch track on hover, a step beyond fillControl,
   * gated the same way. */
  fillControlHover: token({ from: ref.fgPrimary, alpha: 0.75, scopes: ["surface"] }),
```

In `packages/tokens/src/themes/dark.ts`, the same place, the same comments, with the hover line:

```ts
  fillControl: token({ from: ref.borderControl, scopes: ["surface"] }),
  /** DNNN: ... gated the same way. 0.55, not borderControlHover's 0.60: at
   * 0.60 the white thumb on it measures 3.04-3.22, too thin for a derived
   * theme. */
  fillControlHover: token({ from: ref.fgPrimary, alpha: 0.55, scopes: ["surface"] }),
```

The resolver resolves refs recursively (`resolveToken(def.from.name)`), so a forward ref to `borderControl`, declared further down, is fine.

- [ ] **Step 4: Add the pairs.** In `packages/tokens/src/contrast-matrix.ts`, append to `nonTextPairs` (after the D120 lines) and extend its doc comment with one sentence: "An unchecked Switch is identified by its track (DNNN: fillControl, and fillControlHover on hover) against the surface, and its state by the white thumb against the track; the thumb pairs composite the track onto bgPrimary."

```ts
  { fg: "fillControl", bg: "bgPrimary", minRatio: 3 },
  { fg: "fillControl", bg: "bgSecondary", minRatio: 3 },
  { fg: "fillControlHover", bg: "bgPrimary", minRatio: 3 },
  { fg: "fillControlHover", bg: "bgSecondary", minRatio: 3 },
  { fg: "fillStaticWhite", bg: "fillControl", minRatio: 3 },
  { fg: "fillStaticWhite", bg: "fillControlHover", minRatio: 3 },
```

- [ ] **Step 5: Run the new test.** Same command as Step 2. Expected: PASS.

- [ ] **Step 6: Update the counts and the two D106/D120 tests.**
  - `packages/tokens/src/generate/derive.ts`: the `AA_MATRIX` comment says "40 pairs (33 until D106, 38 until D120 …)". Make it "46 pairs (33 until D106, 38 until D120, 40 until DNNN …)", and "The four non-text pairs (D106, D120)" → "The ten non-text pairs (D106, D120, DNNN)", and name `fillControl`/`fillControlHover` alongside `borderControl`/`borderControlHover` as fixed alphas of `fgPrimary` the sweep proves.
  - `packages/tokens/__tests__/generate-derive.test.ts`: every "40" that counts the matrix becomes 46 (the doc comment, `toHaveLength(40)`, and the two test titles). Add DNNN next to "(D106, D120)" in the title that names them.
  - `packages/tokens/__tests__/field-border.test.ts`: the test "nonTextPairs gates borderControl and borderControlHover…" uses `toEqual([...])` on the whole list. Change it to `toEqual(expect.arrayContaining([...the same four]))`.
  - `packages/tokens/__tests__/control-border.test.ts`: "the theme gate refuses a borderControl under 3:1" now also fails `fillControl`, because it is a ref to `borderControl`. That coupling is intended. Change the expectation to:

```ts
    // DNNN: fillControl is a ref to borderControl, so a weak borderControl
    // takes the Switch track down with it, and the gate names both.
    expect(failing).toEqual([
      "borderControl/bgPrimary",
      "borderControl/bgSecondary",
      "fillControl/bgPrimary",
      "fillControl/bgSecondary",
      "fillStaticWhite/fillControl",
    ]);
```

- [ ] **Step 7: Run the whole tokens suite and the build.**

Run: `pnpm --dir packages/tokens test && pnpm --dir packages/tokens build`
Expected: all PASS, including the 360×5×2 sweep in `generate-derive.test.ts`, and the build prints no contrast failure. If the sweep fails on a `fillStaticWhite/fillControlHover` pair in dark mode, stop and report the worst ratio: do not change an alpha without the controller.

- [ ] **Step 8: Commit**

```bash
git add packages/tokens/src packages/tokens/__tests__
git commit -m "feat(tokens): fillControl and fillControlHover, gated at 3:1 (DNNN)"
```

---

### Task 2: The Switch binds the control fill and gains a hover

**Files:**
- Modify: `packages/tokens/src/components/switch.ts`
- Modify: `packages/react/src/Switch/switch.module.css`
- Test: `packages/tokens/__tests__/switch-track.test.ts` (add a describe block)

**Interfaces:**
- Consumes: `--psi-fill-control`, `--psi-fill-control-hover` (Task 1).
- Produces: component vars `--psi-switch-track-bg` (rebound) and `--psi-switch-track-bg-hover` (new).

- [ ] **Step 1: Write the failing test.** Append to `packages/tokens/__tests__/switch-track.test.ts` (add the import at the top: `import { switchVars } from "../src/components/switch.js";`):

```ts
describe("the Switch binds the control fill (DNNN)", () => {
  it("rests on fill-control and hovers on fill-control-hover", () => {
    expect(switchVars["track-bg"]).toBe("var(--psi-fill-control)");
    expect(switchVars["track-bg-hover"]).toBe("var(--psi-fill-control-hover)");
    // Unchanged by DNNN: the checked track, the thumb, the focus ring.
    expect(switchVars["track-bg-checked"]).toBe("var(--psi-fill-accent)");
    expect(switchVars["thumb-bg"]).toBe("var(--psi-fill-static-white)");
    expect(switchVars["focus-ring"]).toBe("var(--psi-border-focus)");
  });
});
```

- [ ] **Step 2: Run it and watch it fail.** `pnpm --dir packages/tokens exec vitest run __tests__/switch-track.test.ts` → FAIL: received `var(--psi-fill-neutral4)`.

- [ ] **Step 3: Rebind.** `packages/tokens/src/components/switch.ts` becomes:

```ts
/** Switch component tokens (--psi-switch-*). */
export const switchVars: Record<string, string> = {
  fg: "var(--psi-fg-primary)",
  /** DNNN: the unchecked track is the gated control fill (3:1 on its surface,
   * and the white thumb 3:1 on it), not fillNeutral4 (1.10-1.27). */
  "track-bg": "var(--psi-fill-control)",
  "track-bg-hover": "var(--psi-fill-control-hover)",
  "track-bg-checked": "var(--psi-fill-accent)",
  "thumb-bg": "var(--psi-fill-static-white)",
  "focus-ring": "var(--psi-border-focus)",
};
```

- [ ] **Step 4: The hover rule.** In `packages/react/src/Switch/switch.module.css`, directly after the `.input:checked + .track` rule:

```css
/* Hover (DNNN): only an enabled, unchecked track; the checked track and the
   thumb do not change under the pointer. */
.label:hover .input:not(:checked):not(:disabled) + .track {
  background: var(--psi-switch-track-bg-hover);
}
```

Check the specificity: the `:checked` rule above has lower specificity, but this selector excludes `:checked`, so there is no conflict. The existing `transition: background-color` animates it.

- [ ] **Step 5: Run the tests and the CSS lint.**

Run: `pnpm --dir packages/tokens exec vitest run __tests__/switch-track.test.ts __tests__/emit-components.test.ts __tests__/inverted-tokens.test.ts __tests__/control-tokens.test.ts && pnpm --dir packages/react test -- Switch && pnpm lint`
Expected: PASS. `psi/token-scopes` accepts `background` bound to `--psi-switch-track-bg-hover` (a component var, scope-checked at the token build). `pnpm --dir packages/tokens build` must still pass the D46 scope gate (`track-bg-hover` is a `-bg` key binding a surface-scoped token).

- [ ] **Step 6: Commit**

```bash
git add packages/tokens/src/components/switch.ts packages/tokens/__tests__/switch-track.test.ts packages/react/src/Switch/switch.module.css
git commit -m "feat(switch): unchecked track on fillControl, with a hover (DNNN)"
```

---

### Task 3: Docs, changeset, gates

**Files:**
- Modify: `packages/tokens/llms.txt`
- Create: `.changeset/switch-track.md`
- Modify: any file `node tools/check-docs-drift.mjs` reports

- [ ] **Step 1: llms.txt.** After the `--psi-border-control-hover` line in `packages/tokens/llms.txt`, add:

```
- --psi-fill-control: the fill that alone identifies an unchecked control: the Switch track (DNNN), bound by --psi-switch-track-bg. A ref to --psi-border-control (fgPrimary at 0.55 alpha in light-based themes, 0.40 in dark-based), so the unchecked track and the unchecked checkbox outline are one ink. Gated at 3:1 on bgPrimary and bgSecondary, and the white thumb (--psi-fill-static-white) at 3:1 on it, by `nonTextPairs` (WCAG 1.4.11). Bind it, not --psi-fill-neutral4 (1.10-1.27:1), for a control identified by its fill alone; --psi-fill-neutral4 is an active or loading surface.
- --psi-fill-control-hover: the unchecked Switch track on hover, a step beyond --psi-fill-control: fgPrimary at 0.75 alpha in light-based themes, 0.55 in dark-based, gated the same way. A theme that overrides it should keep it a step beyond --psi-fill-control: the gate checks each at 3:1, not their order.
```

- [ ] **Step 2: Changeset** `.changeset/switch-track.md` (the packages version in lockstep; match the package list used by `.changeset` files on `main`, e.g. D120's `field-border.md`):

```md
---
"@handamade/psi-tokens": minor
"@handamade/psi-react": patch
---

An unchecked Switch's track reaches 3:1 or better against its surface in every theme (DNNN).

- **The track is now a control fill.** `--psi-switch-track-bg` binds the new `--psi-fill-control`, the surface twin of `--psi-border-control` (a ref to it, so the two are one ink). It was on `--psi-fill-neutral4`, which measured 1.10–1.27:1. WCAG 1.4.11 asks 3:1 for what identifies a control. **What changes for you:** every unchecked Switch draws a mid-grey track (3.24:1 or better), and the white thumb shows clearly on it (3.47:1 or better). If you set `--psi-switch-track-bg` yourself, your value still wins.
- **A hover, `--psi-fill-control-hover`.** `fgPrimary` at 0.75 alpha in light-based themes and 0.55 in dark-based, bound by the new `--psi-switch-track-bg-hover` on an enabled, unchecked Switch. The checked track and the thumb don't change on hover.
- **The contrast gate checks it.** `nonTextPairs` gains six pairs: both tracks on `bgPrimary` and `bgSecondary`, and the white thumb on each track. The build, `buildThemeCss` and `psi-theme` refuse a theme that breaks them. If you override `--psi-border-control`, the Switch track moves with it.
- `--psi-fill-neutral4` is unchanged and keeps its other uses.
```

- [ ] **Step 3: The five gates**, from the worktree root, on Node 24:

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site
```

Expected: all green. If `check-docs-drift` names a stale count (pairs, tokens), fix that prose and rerun.

- [ ] **Step 4: Commit**

```bash
git add packages/tokens/llms.txt .changeset/switch-track.md
git commit -m "docs: fill-control in llms.txt, and a changeset (DNNN)"
```

---

### Task 4: PR, auto-merge, baselines (controller)

- [ ] **Step 1:** `git fetch origin && git merge origin/main`. Re-check that the decision number is still free on `origin/main` (`grep -rn "DNNN" docs/superpowers/specs` should show only this spec). Rerun the five gates if `main` moved.
- [ ] **Step 2:** Push and open the PR. Arm auto-merge with `gh pr merge <n> --auto --squash`, then `gh pr view <n> --json autoMergeRequest`. If it reads null, use the `enablePullRequestAutoMerge` GraphQL mutation.
- [ ] **Step 3:** `vr` fails on every Switch story, Color Tokens (four themes), and stories that compose a Switch (Field, Menu). Download the `vr-baselines` artifact into `.superpowers/` (`gh run download <run> -n vr-baselines -D .superpowers/vr-<run>`). Send the user before/after pairs (`*-expected.png` / `*-actual.png` under `test-results/`).
- [ ] **Step 4:** Only after the user's OK, copy each `*-actual.png` over its `apps/storybook/vr/stories.spec.ts-snapshots/*-linux.png`, commit (`test(vr): switch track baselines (DNNN)`), push, and confirm `ci` goes green.
