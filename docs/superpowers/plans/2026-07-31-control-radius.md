# Control Radius (D56) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a size-invariant `radius` member to the `--psi-control-*` family so a theme can retune control shape with one property.

**Architecture:** `control.ts` gains one key, `radius: "var(--psi-radius-8)"`. Five per-component tokens alias it — Button, Input and Select directly; Checkbox and Tooltip through `min()` so they track a sharper theme downward without a softer theme over-rounding them. Six `border-radius` declarations in CSS Modules rebind from rungs to their component token. Every default resolves to its current value, so the change is a rendered no-op.

**Tech Stack:** TypeScript token sources (`packages/tokens/src/components/`), a build script emitting CSS custom properties, CSS Modules in `packages/react/src/`, Vitest, Stylelint with a custom plugin, Playwright for visual regression.

**Spec:** [docs/superpowers/specs/2026-07-31-control-radius-design.md](../specs/2026-07-31-control-radius-design.md)

## Global Constraints

- **Node 24** — `.nvmrc` pins `24`; pnpm crashes with `ERR_UNKNOWN_BUILTIN_MODULE` on Node 20. Run `nvm use` before anything else.
- **Branch:** `d56-control-radius`, already created and rebased onto `main`.
- **Never hardcode colors in component CSS** — bind `var(--psi-*)`. Enforced by the custom stylelint plugin.
- **Component CSS may only reference `--psi-<component>-*` or a global rung** matching `/^--psi-(space|size|radius|text|font|duration|ease|z)-/`. `--psi-control-radius` matches neither, so component CSS must **never** name it. All indirection lives in the token layer. Enforced by `psi/component-tokens-only`.
- **Sizes are px numbers, scale names are pixel-true.** `--psi-radius-8` is 8px. This plan adds a layer above the scale; it never redefines a rung.
- **`dist/` is generated.** Never edit `packages/tokens/dist/*` by hand. Values go in `packages/tokens/src`.
- **Acceptance gate: `pnpm vr` must report zero diff pixels.** Config is `maxDiffPixels: 48` at `threshold: 0.02`; same-environment re-renders measure exactly 0 (HAN-20). Any non-zero diff means a default changed by mistake.

---

### Task 1: Add the `radius` key to the control family

Adding a key breaks two existing assertions in `control-tokens.test.ts` — one regex that allows only `size|space|text` rungs, and one exact token count. Both are corrected here, in the same task, because they are part of this deliverable rather than incidental breakage.

**Files:**
- Modify: `packages/tokens/src/components/control.ts` (append after the value ramp, before the closing `};`)
- Test: `packages/tokens/__tests__/control-tokens.test.ts:47-49` (regex), `:68-70` (count), plus a new case

**Interfaces:**
- Consumes: nothing — `controlVars` and its `build.ts` registration already exist from D54–D55.
- Produces: `controlVars.radius === "var(--psi-radius-8)"`, emitted as `--psi-control-radius`. Task 2 aliases it.

- [ ] **Step 1: Write the failing test**

Add this case to `packages/tokens/__tests__/control-tokens.test.ts`, inside the existing `describe("controlVars", …)` block, immediately before the `it("binds only scale tokens…")` case:

```ts
  it("declares a size-invariant radius (D56)", () => {
    expect(controlVars.radius).toBe("var(--psi-radius-8)");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run control-tokens`
Expected: FAIL — `declares a size-invariant radius (D56)`, `expected undefined to be 'var(--psi-radius-8)'`. The other 11 tests still pass.

- [ ] **Step 3: Add the key**

In `packages/tokens/src/components/control.ts`, after the `value-48-font` line and before the closing `};`:

```ts

  // ── Size-invariant ─────────────────────────────────────────────
  // Radius does not ride the size ramp: border-radius sits on each
  // component's base rule, not in its .size{n} blocks, and all four sizes
  // resolve to radius-8 today. One dial keeps it that way and gives a theme
  // a single control-shape override (D56).
  radius: "var(--psi-radius-8)",
```

- [ ] **Step 4: Run tests — expect the new one to pass and two old ones to fail**

Run: `pnpm vitest run control-tokens`
Expected: FAIL, 2 failures — exactly these two, and no others:
1. `binds only scale tokens — the family aliases nothing component-level` — `'var(--psi-radius-8)'` does not match `/^var\(--psi-(size|space|text)-[a-z0-9-]+\)$/`.
2. `has exactly 28 tokens` — `expected 29 to be 28`.

If anything else fails, stop: the key was added in the wrong place or misspelled.

- [ ] **Step 5: Widen the rung allowlist**

In `packages/tokens/__tests__/control-tokens.test.ts`, in the `binds only scale tokens` case, change the regex to admit the radius rung:

```ts
  it("binds only scale tokens — the family aliases nothing component-level", () => {
    for (const value of Object.values(controlVars)) {
      expect(value).toMatch(/^var\(--psi-(size|space|text|radius)-[a-z0-9-]+\)$/);
    }
  });
```

- [ ] **Step 6: Correct the token count**

In the same file, in the `has exactly 28 tokens` case, update both the title and the expectation:

```ts
  it("has exactly 29 tokens", () => {
    expect(Object.keys(controlVars)).toHaveLength(29);
  });
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm vitest run control-tokens`
Expected: PASS, 12 tests.

- [ ] **Step 8: Verify the token emits**

Run: `pnpm --filter @handamade/psi-tokens build`
Then: `grep -n "psi-control-radius" packages/tokens/dist/components.css`
Expected: one line, `    --psi-control-radius: var(--psi-radius-8);`

- [ ] **Step 9: Commit**

```bash
git add packages/tokens/src/components/control.ts packages/tokens/__tests__/control-tokens.test.ts
git commit -m "feat(tokens): add size-invariant --psi-control-radius (D56)"
```

---

### Task 2: Alias the dial from the five component token sources

IconButton has no token source of its own — it binds `--psi-button-*` under the `ALIASES` entry in the stylelint plugin, exactly as it already does for `--psi-button-{n}-height`. So five sources cover six components.

**Files:**
- Modify: `packages/tokens/src/components/button.ts` (after `"focus-ring"`)
- Modify: `packages/tokens/src/components/input.ts` (after `"focus-ring"`)
- Modify: `packages/tokens/src/components/select.ts` (after `"chevron-fg"`)
- Modify: `packages/tokens/src/components/checkbox.ts` (after `"box-border-checked"`)
- Modify: `packages/tokens/src/components/tooltip.ts` (after `fg`)
- Test: `packages/tokens/__tests__/control-tokens.test.ts` (new `describe` block at end of file)

**Interfaces:**
- Consumes: `controlVars.radius` from Task 1, read as `var(--psi-control-radius)`.
- Produces: `buttonVars.radius`, `inputVars.radius`, `selectVars.radius`, `checkboxVars["box-radius"]`, `tooltipVars.radius` — emitted as `--psi-button-radius`, `--psi-input-radius`, `--psi-select-radius`, `--psi-checkbox-box-radius`, `--psi-tooltip-radius`. Task 3 binds these from CSS.

- [ ] **Step 1: Write the failing test**

Append this block to the end of `packages/tokens/__tests__/control-tokens.test.ts`:

```ts
describe("control radius consumers (D56)", () => {
  it("Button, Input and Select bind the dial directly", () => {
    expect(buttonVars.radius).toBe("var(--psi-control-radius)");
    expect(inputVars.radius).toBe("var(--psi-control-radius)");
    expect(selectVars.radius).toBe("var(--psi-control-radius)");
  });

  it("Checkbox and Tooltip cap themselves at their own ceiling", () => {
    expect(checkboxVars["box-radius"]).toBe(
      "min(var(--psi-control-radius), var(--psi-radius-4))",
    );
    expect(tooltipVars.radius).toBe(
      "min(var(--psi-control-radius), var(--psi-radius-6))",
    );
  });

  it("Tag and Switch declare no radius token — pill-ness is identity", () => {
    for (const vars of [tagVars, switchVars]) {
      expect(Object.keys(vars).filter((k) => k.includes("radius"))).toEqual([]);
    }
  });

  it("radius keys carry no D46 scope, so both gates skip them", () => {
    expect(keyGroup("radius")).toBeUndefined();
    expect(keyGroup("box-radius")).toBeUndefined();
  });

  it("emits the five per-component custom properties", () => {
    expect(emitComponentVarsCSS("button", buttonVars)).toContain(
      "--psi-button-radius: var(--psi-control-radius)",
    );
    expect(emitComponentVarsCSS("checkbox", checkboxVars)).toContain(
      "--psi-checkbox-box-radius: min(var(--psi-control-radius), var(--psi-radius-4))",
    );
    expect(emitComponentVarsCSS("tooltip", tooltipVars)).toContain(
      "--psi-tooltip-radius: min(var(--psi-control-radius), var(--psi-radius-6))",
    );
  });
});
```

Then extend the import block at the top of the same file. It currently reads:

```ts
import { controlVars } from "../src/components/control.js";
import { inputVars } from "../src/components/input.js";
import { selectVars } from "../src/components/select.js";
```

Add four more imports directly beneath those three:

```ts
import { buttonVars } from "../src/components/button.js";
import { checkboxVars } from "../src/components/checkbox.js";
import { tooltipVars } from "../src/components/tooltip.js";
import { tagVars } from "../src/components/tag.js";
import { switchVars } from "../src/components/switch.js";
```

`keyGroup` and `emitComponentVarsCSS` are already imported by the file — do not add them twice.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run control-tokens`
Expected: FAIL — `Button, Input and Select bind the dial directly`, `expected undefined to be 'var(--psi-control-radius)'`. The `Tag and Switch` and `radius keys carry no D46 scope` cases pass already (they assert absence).

- [ ] **Step 3: Add the alias to Button**

In `packages/tokens/src/components/button.ts`, immediately after the `"focus-ring": "var(--psi-border-focus)",` line:

```ts

  // ── Shape (D56) — size-invariant; IconButton binds this too ──
  radius: "var(--psi-control-radius)",
```

- [ ] **Step 4: Add the alias to Input**

In `packages/tokens/src/components/input.ts`, immediately after the `"focus-ring": "var(--psi-border-focus)",` line:

```ts

  // ── Shape (D56) ──
  radius: "var(--psi-control-radius)",
```

- [ ] **Step 5: Add the alias to Select**

In `packages/tokens/src/components/select.ts`, immediately after the `"chevron-fg": "var(--psi-fg-secondary)",` line:

```ts

  // ── Shape (D56) ──
  radius: "var(--psi-control-radius)",
```

- [ ] **Step 6: Add the capped alias to Checkbox**

In `packages/tokens/src/components/checkbox.ts`, immediately after the `"box-border-checked": "var(--psi-fill-accent)",` line:

```ts

  // D56: tracks a sharper theme down, never rounder than radius-4 — the box
  // is ~16px, so the 8px control default would read as a circle.
  "box-radius": "min(var(--psi-control-radius), var(--psi-radius-4))",
```

- [ ] **Step 7: Add the capped alias to Tooltip**

In `packages/tokens/src/components/tooltip.ts`, immediately after the `fg: "var(--psi-fg-on-inverted)",` line:

```ts

  // D56: tracks a sharper theme down, never rounder than radius-6.
  radius: "min(var(--psi-control-radius), var(--psi-radius-6))",
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm vitest run control-tokens`
Expected: PASS, 17 tests.

- [ ] **Step 9: Run the full token suite**

Run: `pnpm vitest run --project @handamade/psi-tokens`
Expected: PASS, no other test needs changing. Two nearby assertions were checked and are unaffected by design:
- `button-tokens.test.ts:129` counts the size ramp with `Object.entries(buttonVars).filter(([k]) => /^\d\d-/.test(k))`. The key `radius` does not match that pattern, so the count stays 20.
- `emit-components.test.ts` iterates `Object.keys(...)` for every component, so new keys are covered automatically rather than breaking a fixture.

If either fails anyway, a key was added with a numeric prefix by mistake.

- [ ] **Step 10: Commit**

```bash
git add packages/tokens/src/components packages/tokens/__tests__/control-tokens.test.ts
git commit -m "feat(tokens): alias --psi-control-radius from the five control sources (D56)"
```

---

### Task 3: Rebind the six CSS declarations

This is the only task that can move a pixel. It ends on the VR gate.

**Files:**
- Modify: `packages/react/src/Button/button.module.css:8`
- Modify: `packages/react/src/IconButton/icon-button.module.css:8`
- Modify: `packages/react/src/Input/input.module.css:7`
- Modify: `packages/react/src/Select/select.module.css:8`
- Modify: `packages/react/src/Checkbox/checkbox.module.css:42`
- Modify: `packages/react/src/Tooltip/tooltip.module.css:14`

**Interfaces:**
- Consumes: the five component tokens from Task 2.
- Produces: no new interface. `tag.module.css:9`, `tag.module.css:29`, `switch.module.css:41` and `switch.module.css:62` keep `var(--psi-radius-full)` and must not be touched.

- [ ] **Step 1: Rebind all six declarations**

Each is a single-line replacement. The left side is exactly what is there now.

`packages/react/src/Button/button.module.css:8`
```css
  border-radius: var(--psi-button-radius);
```

`packages/react/src/IconButton/icon-button.module.css:8` — binds the Button token by design; the stylelint plugin's `ALIASES` maps `icon-button` → `button`.
```css
  border-radius: var(--psi-button-radius);
```

`packages/react/src/Input/input.module.css:7`
```css
  border-radius: var(--psi-input-radius);
```

`packages/react/src/Select/select.module.css:8`
```css
  border-radius: var(--psi-select-radius);
```

`packages/react/src/Checkbox/checkbox.module.css:42`
```css
  border-radius: var(--psi-checkbox-box-radius);
```

`packages/react/src/Tooltip/tooltip.module.css:14`
```css
  border-radius: var(--psi-tooltip-radius);
```

- [ ] **Step 2: Verify no control CSS still binds a radius rung**

Run: `grep -rn "border-radius" packages/react/src/*/*.css`
Expected: exactly four `var(--psi-radius-*)` hits remain — `tag.module.css:9`, `tag.module.css:29`, `switch.module.css:41`, `switch.module.css:62`, all `--psi-radius-full`. Plus `menu.module.css:37` (`--psi-radius-6`), which is a menu-item rule outside this decision's scope and stays as-is. Everything else reads `var(--psi-<component>-*)`.

- [ ] **Step 3: Verify the stylelint boundary holds**

Run: `pnpm lint:css`
Expected: PASS, no output. If it reports `--psi-control-radius is not a --psi-<component>-* or scale token`, a CSS file names the family directly — fix it to use the component token.

- [ ] **Step 4: Build and confirm the chain resolves**

Run: `pnpm build`
Then: `grep -n "psi-button-radius\|psi-checkbox-box-radius" packages/tokens/dist/components.css`
Expected: `--psi-button-radius: var(--psi-control-radius);` and `--psi-checkbox-box-radius: min(var(--psi-control-radius), var(--psi-radius-4));`

- [ ] **Step 5: Run the full test suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Run the visual regression gate — on Linux, not macOS**

The committed baselines in `stories.spec.ts-snapshots/` are Linux renders. Playwright suffixes snapshot names by platform, so a bare `pnpm vr` on macOS finds no `-darwin` baselines, fails every test as "snapshot doesn't exist", and — worse — its default update mode silently writes 152 `-darwin.png` files into the snapshot directory. See `apps/storybook/vr/README.md`.

Build first, then run the suite inside the Playwright Linux image:

```bash
pnpm build
docker run --rm -v "$PWD":/w -w /w mcr.microsoft.com/playwright:v1.61.1-jammy \
  bash -c 'corepack enable && corepack prepare pnpm@11.9.0 --activate && pnpm vr --update-snapshots=none'
```

Expected: PASS, **zero diff pixels, zero updated snapshots**. `pnpm build` must run before the container so `storybook-static/` contains this task's CSS.

This is the acceptance criterion for the whole plan. A non-zero diff means a default changed — most likely a `min()` typo, or a component token pointing at the wrong rung. Never pass `--update-snapshots` in a mode that writes, and never commit `-darwin.png` files. Diagnose and fix, then re-run.

If Docker is unavailable, skip this step, say so explicitly in the report, and let CI's `vr` job be the gate on the PR — do not substitute a macOS run and call it a pass.

- [ ] **Step 7: Commit**

```bash
git add packages/react/src
git commit -m "refactor(react): bind control border-radius to component tokens (D56)"
```

---

### Task 4: Guidance entry and changeset

Psi is agent-first: `guidance.json` is a published artifact and D54–D55 added a `geometry` block for exactly this reason. Radius belongs there or agents will keep reaching for rungs. The spec does not call this out — it is a codebase convention the spec missed, and it is in scope because the token is useless to an agent that cannot discover it.

**Files:**
- Modify: `packages/tokens/src/guidance.ts` (inside the `geometry` object, after `iconInsetLimits`)
- Create: `.changeset/control-radius-d56.md`
- Test: `packages/tokens/__tests__/guidance.test.ts` (new case)

**Interfaces:**
- Consumes: the token names produced by Tasks 1 and 2.
- Produces: `guidance.geometry.radius`, a string, surfaced through `dist/guidance.json` and the MCP server.

- [ ] **Step 1: Write the failing test**

Append this case inside the existing `describe("guidance", …)` block in `packages/tokens/__tests__/guidance.test.ts`:

```ts
  it("exposes the D56 radius dial and its two capped consumers", () => {
    expect(guidance.geometry.radius).toMatch(/--psi-control-radius/);
    expect(guidance.geometry.radius).toMatch(/min\(/);
    expect(guidance.geometry.radius).toMatch(/Tag and Switch/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run guidance`
Expected: FAIL — `Cannot read properties of undefined (reading 'match')`, because `guidance.geometry.radius` is undefined.

- [ ] **Step 3: Add the guidance entry**

In `packages/tokens/src/guidance.ts`, inside the `geometry` object, immediately after the `iconInsetLimits` string and before the closing `},`:

```ts
    radius:
      "Control radius is size-invariant (D56) — it does NOT ride the size ramp, because border-radius sits on each component's base rule and all four sizes resolve to radius-8. One dial, --psi-control-radius, is aliased as --psi-{component}-radius by Button, IconButton (via --psi-button-radius), Input and Select. Checkbox and Tooltip bind min(var(--psi-control-radius), var(--psi-radius-4)) and min(…, var(--psi-radius-6)) respectively, so they track a sharper theme downward but never over-round a small object. Tag and Switch stay --psi-radius-full: pill-ness is component identity, not theme expression. A theme retunes every control's shape by setting --psi-control-radius once.",
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run guidance`
Expected: PASS.

- [ ] **Step 5: Write the changeset**

Create `.changeset/control-radius-d56.md`:

```markdown
---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

Control radius is now a token (D56)

`border-radius` on Button, IconButton, Input, Select, Checkbox and Tooltip
moves off the raw rungs and onto the `--psi-control-*` family introduced by
D54–D55, completing it. One size-invariant dial, `--psi-control-radius`
(default `var(--psi-radius-8)`), is aliased per component as
`--psi-{component}-radius` — the layer to override.

**No visible change.** Every default resolves to its current value; the VR
suite reports zero diff pixels.

**What this unlocks.** A theme can retune control shape in one line, which
the `Palette` + `SlotMap` contract could not express before:

```css
[data-psi-theme="acme"] { --psi-control-radius: var(--psi-radius-4); }
```

Checkbox and Tooltip cap themselves — `min(var(--psi-control-radius),
var(--psi-radius-4))` and `min(…, var(--psi-radius-6))` — so a sharp theme
squares them while a soft theme never over-rounds a 16px checkbox. Tag and
Switch keep `--psi-radius-full`: pill-ness is component identity, not theme
expression.
```

- [ ] **Step 6: Verify the whole gate one more time**

Run: `pnpm build && pnpm test && pnpm lint`
Expected: all three PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/tokens/src/guidance.ts packages/tokens/__tests__/guidance.test.ts .changeset/control-radius-d56.md
git commit -m "docs(tokens): guidance entry and changeset for control radius (D56)"
```

---

## Definition of Done

- [ ] `--psi-control-radius` emitted in `dist/components.css`; five component tokens alias it.
- [ ] Six `border-radius` declarations bind component tokens; the four `--psi-radius-full` pill declarations are untouched.
- [ ] `pnpm build`, `pnpm test`, `pnpm lint` all pass.
- [ ] `pnpm vr` reports **zero diff pixels and zero updated snapshots**.
- [ ] `guidance.geometry.radius` present; changeset written.
- [ ] PR opened against `main` with auto-merge armed.
