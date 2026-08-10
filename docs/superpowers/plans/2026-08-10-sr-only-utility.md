# Visually-Hidden Utility Implementation Plan (D80)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `.psi-sr-only` as a public, machine-readable utility class, and migrate the three private copies of its recipe (Toast, Checkbox, Switch) onto it.

**Architecture:** One new hand-added utility family in `packages/tokens/scripts/emit-utilities.ts`, following the exact `.psi-container`/`.psi-media-tint` precedent — no new codegen mechanism. Three component migrations, each replacing a private CSS block with a `className` reference to the new global class, matching the existing `NavBar.tsx` pattern of mixing a tokens utility with a scoped module class.

**Tech Stack:** TypeScript, React 19, vitest, Testing Library, tsx (tokens build), changesets.

**Spec:** `docs/superpowers/specs/2026-08-10-sr-only-utility-design.md`

## Global Constraints

- **Node 24** (`.nvmrc`). Run `node -v` before the first pnpm command; a stale shell fixes with `nvm use`, never a per-command PATH prefix.
- **Run single tests with `pnpm exec vitest run <path>`.** `pnpm --filter <pkg> test` exits 0 having run nothing.
- **`pnpm build` must precede `check-docs-drift`.** Drift reads `dist/manifest.json` and crashes on a stale one.
- **Never hardcode colours in component CSS**; bind `var(--psi-*)`. This cycle adds no colours, but the stylelint gate still runs.
- **Five gates, in order:** `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm test:site`. `vr` is CI's and must not move — this cycle adds no stories.
- **Every test is proven red before its fix.** A guard is verified by reproducing the failure it was built for, not by watching it pass.
- **`Checkbox`'s and `Switch`'s `.input` class is a sibling-selector anchor** (`.input:checked + .indicator`, `.input:focus-visible + .track`, etc.), not just cosmetic — its visually-hidden *declarations* are deleted in Tasks 3–4, but the class itself must remain applied to the element and must remain a valid CSS Modules export.

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `packages/tokens/scripts/emit-utilities.ts` | Modify: add `.psi-sr-only` to `emitUtilitiesCSS()` and `emitUtilitiesRoster()` | 1 |
| `packages/tokens/__tests__/emit-css.test.ts` | Modify: roster + CSS assertions for `psi-sr-only` | 1 |
| `packages/tokens/llms.txt` | Modify: new `## Visually hidden` entry | 1 |
| `packages/react/llms.txt` | Modify: extend the existing utility-families bullet | 1 |
| `packages/react/src/Toast/Toast.tsx`, `toast.module.css` | Modify: delete `.srOnly`, consume `.psi-sr-only` | 2 |
| `packages/react/src/Toast/Toast.test.tsx` | Modify: new class-presence test | 2 |
| `packages/react/src/Checkbox/Checkbox.tsx`, `checkbox.module.css` | Modify: strip `.input`'s declarations, consume `.psi-sr-only` | 3 |
| `packages/react/src/Checkbox/Checkbox.test.tsx` | Modify: new class-presence test | 3 |
| `packages/react/src/Switch/Switch.tsx`, `switch.module.css` | Modify: strip `.input`'s declarations, consume `.psi-sr-only` | 4 |
| `packages/react/src/Switch/Switch.test.tsx` | Modify: new class-presence test | 4 |
| `.changeset/sr-only-utility.md` | Create | 5 |

---

### Task 1: `.psi-sr-only` ships from tokens

**Files:**
- Modify: `packages/tokens/scripts/emit-utilities.ts:158-168` (between the `.psi-container` block and the reduced-motion block)
- Modify: `packages/tokens/__tests__/emit-css.test.ts`
- Modify: `packages/tokens/llms.txt` (after line 41, the Tabular numerals entry)
- Modify: `packages/react/llms.txt:83`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the CSS class `.psi-sr-only`, shipped in `packages/tokens/dist/utilities.css` after `pnpm --dir packages/tokens build`. Tasks 2-4 depend on this class existing in the built CSS — run this task's build before touching any component.

- [ ] **Step 1: Write the failing tests**

Append to the `describe("emitUtilitiesRoster", ...)` block in `packages/tokens/__tests__/emit-css.test.ts` (after the `"describes each family's property and scale"` test, before the block's closing `});`):

```ts
  it("carries the sr-only utility (D80)", () => {
    expect(emitUtilitiesRoster().classes).toContain("psi-sr-only");
  });
```

Then add a new top-level `describe` block, after the `emitUtilitiesRoster` block closes:

```ts
describe("visually-hidden utility (D80)", () => {
  it("emits .psi-sr-only with both clip and clip-path", () => {
    const css = emitUtilitiesCSS();
    const rule = css.match(/\.psi-sr-only\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule![0]).toContain("clip: rect(0 0 0 0)");
    expect(rule![0]).toContain("clip-path: inset(50%)");
    expect(rule![0]).toContain("position: absolute");
  });

  it("registers in the roster with no scale, matching .psi-container", () => {
    const family = emitUtilitiesRoster().families.find((f) => f.prefix === "psi-sr-only");
    expect(family).toBeDefined();
    expect(family!.scale).toBeNull();
    expect(family!.classes).toEqual(["psi-sr-only"]);
  });
});
```

- [ ] **Step 2: Run them to confirm they fail**

```bash
pnpm exec vitest run packages/tokens/__tests__/emit-css.test.ts -t "sr-only"
```

Expected: FAIL. The roster test fails because `classes` does not contain `"psi-sr-only"`; the CSS test fails because `rule` is `null` (no `.psi-sr-only` rule exists yet).

- [ ] **Step 3: Add the CSS**

In `packages/tokens/scripts/emit-utilities.ts`, inside `emitUtilitiesCSS()`, insert immediately after the `.psi-media-tint:hover, .psi-media-tint:focus-visible { filter: none; }` line and before the `lines.push("");` that precedes the reduced-motion comment:

```ts
  lines.push("");
  lines.push(`  .psi-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0; }`);
```

- [ ] **Step 4: Add the roster entry**

In `emitUtilitiesRoster()`, insert after the `psi-media-tint` `families.push({...})` block and before the `return`:

```ts
  families.push({
    prefix: "psi-sr-only",
    property: "position, width, height, padding, margin, overflow, clip, clip-path, white-space, border",
    scale: null,
    classes: ["psi-sr-only"],
  });
```

- [ ] **Step 5: Rebuild and run the tests**

```bash
pnpm --dir packages/tokens build
pnpm exec vitest run packages/tokens/__tests__/emit-css.test.ts
```

Expected: all PASS, including the pre-existing `"lists every class the CSS emits, and nothing it does not"` test — it will only pass if the CSS regex `^\s*\.(psi-[a-z0-9-]+)\s*[,{]` matches your `.psi-sr-only {` line (it does, since the class opens directly with `{`).

- [ ] **Step 6: Document it in `packages/tokens/llms.txt`**

Insert after line 41 (the Tabular numerals entry), before `## Dark-first brands`:

```
## Visually hidden (.psi-sr-only)
- .psi-sr-only hides content visually while keeping it in the accessibility tree — position/size/clip only, never display:none or visibility:hidden, so screen readers still announce it and it stays in the tab order if focusable. Use it for status-word prefixes, icon-only-control labels not carried by aria-label, or a native input replaced by a custom visual control.
```

- [ ] **Step 7: Extend the `packages/react/llms.txt` utility-families bullet**

Line 83 currently ends `plus \`.psi-tabular\`, \`.psi-container\` and \`.psi-media-tint\`.` Replace that fragment with:

```
plus `.psi-tabular`, `.psi-container`, `.psi-media-tint` and `.psi-sr-only` (hides content visually while keeping it in the accessibility tree)
```

- [ ] **Step 8: Verify docs drift and lint**

```bash
node tools/check-docs-drift.mjs && pnpm lint
```

Expected: both pass.

- [ ] **Step 9: Commit**

```bash
git add packages/tokens/scripts/emit-utilities.ts packages/tokens/__tests__/emit-css.test.ts packages/tokens/llms.txt packages/react/llms.txt
git commit -m "feat(tokens): .psi-sr-only, a public visually-hidden utility (D80)

Psi had no public way to hide content visually while keeping it in the
accessibility tree — the technique existed only as private, byte-identical
CSS duplicated across Toast, Checkbox and Switch, undocumented anywhere.

Added the same way D79 added every other hand-written utility family:
one entry in emitUtilitiesCSS() and emitUtilitiesRoster(), so it appears
in guidance.json -> utilities.classes with no separate wiring. Carries
both clip and clip-path (the codebase's three private copies had only
clip), matching better-accessibility's canonical .sr-only recipe."
```

---

### Task 2: Toast migrates onto `.psi-sr-only`

**Files:**
- Modify: `packages/react/src/Toast/Toast.tsx`
- Modify: `packages/react/src/Toast/toast.module.css`
- Test: `packages/react/src/Toast/Toast.test.tsx`

**Interfaces:**
- Consumes: the `.psi-sr-only` class from `packages/tokens/dist/utilities.css` (Task 1). Toast's own tests don't load that stylesheet (jsdom has no CSS cascade), so this task verifies presence of the class name on the element, not its visual effect.
- Produces: no new exports; `ToastProps` is unchanged.

- [ ] **Step 1: Write the failing test**

Append to `packages/react/src/Toast/Toast.test.tsx`:

```ts
it("hides the status prefix via the shared psi-sr-only utility, not a private class (D80)", () => {
  render(<Toast variant="success">Saved</Toast>);
  const prefix = screen.getByText("Success:");
  expect(prefix.className).toContain("psi-sr-only");
});
```

Query by the prefix's own text (`"Success:"`, from `statusPrefix.success` in `Toast.tsx:40`) rather than `container.querySelector("span")` — the toast's icon is *also* wrapped in a `<span>` and renders first in the DOM, so a bare `"span"` selector would silently grab the wrong element and the test would never exercise the prefix at all.

- [ ] **Step 2: Run it to confirm it fails**

```bash
pnpm exec vitest run packages/react/src/Toast/Toast.test.tsx -t "psi-sr-only"
```

Expected: FAIL — `prefix.className` is the scoped `styles.srOnly` hash only, containing no literal `"psi-sr-only"`.

- [ ] **Step 3: Delete the private CSS**

In `packages/react/src/Toast/toast.module.css`, delete the comment and ruleset:

```css
/* Same recipe as checkbox.module.css / switch.module.css. */
.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

`.srOnly` has no combinator use anywhere in this file (unlike Checkbox/Switch's `.input`), so the whole block goes — nothing needs to stay.

- [ ] **Step 4: Point `Toast.tsx` at the global class**

In `packages/react/src/Toast/Toast.tsx`, replace:

```tsx
        {prefix && <span className={styles.srOnly}>{prefix}</span>}
```

with:

```tsx
        {prefix && <span className="psi-sr-only">{prefix}</span>}
```

- [ ] **Step 5: Run the test**

```bash
pnpm exec vitest run packages/react/src/Toast/Toast.test.tsx
```

Expected: PASS, all tests — including the pre-existing suite, unaffected by this change.

- [ ] **Step 6: Typecheck**

```bash
pnpm --dir packages/react build
```

Expected: clean. (`styles.srOnly` no longer exists — if any other file referenced it, this is where it would surface as a type error. Nothing else does.)

- [ ] **Step 7: Commit**

```bash
git add packages/react/src/Toast/Toast.tsx packages/react/src/Toast/toast.module.css packages/react/src/Toast/Toast.test.tsx
git commit -m "refactor(react): Toast consumes the public psi-sr-only utility (D80)

Toast's private .srOnly was a byte-identical copy of Checkbox's and
Switch's own visually-hidden recipe, and its own comment said so. Now
consumes the class D80 published; no rendered output changes."
```

---

### Task 3: Checkbox migrates onto `.psi-sr-only`

**Files:**
- Modify: `packages/react/src/Checkbox/Checkbox.tsx`
- Modify: `packages/react/src/Checkbox/checkbox.module.css`
- Test: `packages/react/src/Checkbox/Checkbox.test.tsx`

**Interfaces:**
- Consumes: `.psi-sr-only` (Task 1).
- Produces: no new exports; `CheckboxProps` is unchanged. `styles.input` remains a valid CSS Modules export — its declarations move to the global class, but the class name itself stays in the file as the anchor for `.input:checked + .indicator`, `.input:checked + .indicator::after` and `.input:focus-visible + .indicator`.

- [ ] **Step 1: Write the failing test**

Append to `packages/react/src/Checkbox/Checkbox.test.tsx`:

```ts
it("hides the native input via the shared psi-sr-only utility, not a private class (D80)", () => {
  const { container } = render(<Checkbox />);
  const input = container.querySelector("input")!;
  const classes = input.className.split(" ");
  expect(classes).toContain("psi-sr-only");
  expect(classes).not.toContain("undefined");
});
```

The second assertion guards against `styles.input` silently resolving to `undefined` if the scoped class stopped being exported once its standalone ruleset went away — `` `psi-sr-only ${undefined}` `` would otherwise pass a naive "contains psi-sr-only" check while shipping a broken template literal.

- [ ] **Step 2: Run it to confirm it fails**

```bash
pnpm exec vitest run packages/react/src/Checkbox/Checkbox.test.tsx -t "psi-sr-only"
```

Expected: FAIL — `input.className` is the scoped `styles.input` hash only.

- [ ] **Step 3: Strip the declarations, keep the class as a selector anchor**

In `packages/react/src/Checkbox/checkbox.module.css`, replace:

```css
/* ── Visually-hidden native input ────────────────────────────── */

.input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

with:

```css
/* Hidden visually via the shared .psi-sr-only utility (D80), applied in
   Checkbox.tsx. This class carries no declarations of its own any more —
   it exists only as the sibling-selector anchor below (:checked,
   :focus-visible). Do not delete it; deleting it breaks every rule that
   follows. */
```

Leave every rule below it (`.indicator`, `.input:checked + .indicator`, `.input:checked + .indicator::after`, `.input:focus-visible + .indicator`) untouched.

- [ ] **Step 4: Point `Checkbox.tsx` at both classes**

In `packages/react/src/Checkbox/Checkbox.tsx`, replace:

```tsx
        className={styles.input}
```

with:

```tsx
        className={`psi-sr-only ${styles.input}`}
```

- [ ] **Step 5: Run the test**

```bash
pnpm exec vitest run packages/react/src/Checkbox/Checkbox.test.tsx
```

Expected: PASS, all tests.

- [ ] **Step 6: Rebuild and confirm the combinator selectors survived**

```bash
pnpm --dir packages/react build
grep -c "checked" packages/react/dist/styles.css
grep -o '\.checkbox_input_[a-zA-Z0-9_]*:checked' packages/react/dist/styles.css | head -1
```

Expected: a nonzero count, and the second command prints a scoped selector like `.checkbox_input_abc123:checked` — proof `styles.input` still compiled to a real class name even with no standalone ruleset, and the `:checked` combinator rule is still present in the shipped CSS.

- [ ] **Step 7: Typecheck**

```bash
pnpm --dir packages/react build
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add packages/react/src/Checkbox/Checkbox.tsx packages/react/src/Checkbox/checkbox.module.css packages/react/src/Checkbox/Checkbox.test.tsx
git commit -m "refactor(react): Checkbox consumes the public psi-sr-only utility (D80)

.input kept its visually-hidden declarations as a private copy of the
same recipe Toast and Switch also carried. The class itself stays -- it
is still the sibling-selector anchor for :checked and :focus-visible --
but the hiding itself now comes from the utility D80 published."
```

---

### Task 4: Switch migrates onto `.psi-sr-only`

Same shape as Task 3, applied to Switch's `.input:checked + .track`, `.input:focus-visible + .track` and `.input:checked + .track .thumb` combinators.

**Files:**
- Modify: `packages/react/src/Switch/Switch.tsx`
- Modify: `packages/react/src/Switch/switch.module.css`
- Test: `packages/react/src/Switch/Switch.test.tsx`

**Interfaces:**
- Consumes: `.psi-sr-only` (Task 1).
- Produces: no new exports; `SwitchProps` is unchanged.

- [ ] **Step 1: Write the failing test**

Append to `packages/react/src/Switch/Switch.test.tsx`:

```ts
it("hides the native input via the shared psi-sr-only utility, not a private class (D80)", () => {
  const { container } = render(<Switch />);
  const input = container.querySelector("input")!;
  const classes = input.className.split(" ");
  expect(classes).toContain("psi-sr-only");
  expect(classes).not.toContain("undefined");
});
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
pnpm exec vitest run packages/react/src/Switch/Switch.test.tsx -t "psi-sr-only"
```

Expected: FAIL — same reason as Checkbox's Task 3 Step 2.

- [ ] **Step 3: Strip the declarations, keep the class as a selector anchor**

In `packages/react/src/Switch/switch.module.css`, replace:

```css
/* ── Visually-hidden native input ────────────────────────────── */

.input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

with:

```css
/* Hidden visually via the shared .psi-sr-only utility (D80), applied in
   Switch.tsx. This class carries no declarations of its own any more --
   it exists only as the sibling-selector anchor below (:checked,
   :focus-visible). Do not delete it; deleting it breaks every rule that
   follows. */
```

Leave `.track`, `.input:checked + .track`, `.input:focus-visible + .track`, `.thumb` and `.input:checked + .track .thumb` untouched.

- [ ] **Step 4: Point `Switch.tsx` at both classes**

In `packages/react/src/Switch/Switch.tsx`, replace:

```tsx
        className={styles.input}
```

with:

```tsx
        className={`psi-sr-only ${styles.input}`}
```

- [ ] **Step 5: Run the test**

```bash
pnpm exec vitest run packages/react/src/Switch/Switch.test.tsx
```

Expected: PASS, all tests.

- [ ] **Step 6: Rebuild and confirm the combinator selectors survived**

```bash
pnpm --dir packages/react build
grep -o '\.switch_input_[a-zA-Z0-9_]*:checked' packages/react/dist/styles.css | head -1
```

Expected: prints a scoped selector like `.switch_input_abc123:checked`.

- [ ] **Step 7: Typecheck**

```bash
pnpm --dir packages/react build
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add packages/react/src/Switch/Switch.tsx packages/react/src/Switch/switch.module.css packages/react/src/Switch/Switch.test.tsx
git commit -m "refactor(react): Switch consumes the public psi-sr-only utility (D80)

Same migration as Checkbox and Toast: .input's visually-hidden
declarations were the third private copy of the recipe D80 published.
The class stays as the :checked / :focus-visible selector anchor; the
hiding itself now comes from the shared utility."
```

---

### Task 5: Changeset and the full gate run

**Files:**
- Create: `.changeset/sr-only-utility.md`

- [ ] **Step 1: Write the changeset**

Per the spec's per-package split (all three packages release together under the `fixed` group in `.changeset/config.json`, so this still resolves to one minor version bump — the split only affects which package's `CHANGELOG.md` states which kind of change):

```markdown
---
"@handamade/psi-tokens": minor
"@handamade/psi-mcp": minor
"@handamade/psi-react": patch
---

`.psi-sr-only`, a public visually-hidden utility.

Psi had no public way to hide content visually while keeping it in the
accessibility tree — the technique existed only as private, byte-identical
CSS duplicated across Toast, Checkbox and Switch, and nothing in `llms.txt`
documented the convention. `.psi-sr-only` ships from `utilities.css`,
generated the same way every other hand-written utility family is (D79), so
it appears in `guidance.json` → `utilities.classes` automatically.

Toast, Checkbox and Switch now consume it instead of their own private
copies — internal cleanup only, no prop, behavior, or ARIA change (D80).
```

- [ ] **Step 2: Run all five gates in order**

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm test:site
```

Expected: all green. `test:site` needs `apps/promo/dist`, produced by the `pnpm build` at the head of this chain — run it from the repo root.

- [ ] **Step 3: Confirm `vr` should not move**

```bash
git diff --name-only origin/main -- '*.stories.tsx' | head
```

Expected: no output — this cycle changes no stories, and no component's rendered pixels change (`.psi-sr-only`'s whole point is that nothing becomes visible). `vr` cannot be run locally to double-check (macOS writes junk baselines); CI is the only gate for it.

- [ ] **Step 4: Commit and push**

```bash
git add .changeset/sr-only-utility.md
git commit -m "chore: changeset for the visually-hidden utility (D80)"
git push -u origin d80-sr-only-utility
```

- [ ] **Step 5: Open the PR and arm auto-merge**

```bash
gh pr create --title "feat: a public visually-hidden utility, and the three private copies it replaces (D80)" --body "<summary of D80: the gap, the utility, the three migrations, and the gate results>"
```

Then arm auto-merge **and read it back** — `gh pr merge --auto --squash` exits 0 and prints nothing while leaving auto-merge off:

```bash
gh pr merge <n> --auto --squash
gh pr view <n> --json autoMergeRequest --jq '.autoMergeRequest.mergeMethod // "NOT ARMED"'
```

Expected: `SQUASH`. If `NOT ARMED`, use the `enablePullRequestAutoMerge` GraphQL mutation.

---

## Self-Review

**Spec coverage:** The utility + mechanism (spec's "Mechanism") → Task 1. `packages/tokens/llms.txt` documentation → Task 1 Step 6. `className` concatenation over `composes` (spec's "Consumption") → Tasks 2-4 Step 4. Toast migration (spec's first bullet) → Task 2. Checkbox/Switch migration, including the sibling-selector-anchor constraint (spec's second bullet) → Tasks 3-4. Naming → Task 1 (the class is spelled `psi-sr-only` everywhere, matching the spec). Changeset split (minor/minor/patch) → Task 5 Step 1. Five gates → Task 5 Step 2. `vr` untouched → Task 5 Step 3. Tests proven red first → every task's Step 1/2. "Out of scope" items (focusable variant, auditing other components) → deliberately absent from every task; not referenced.

**Type consistency:** `.psi-sr-only` is spelled identically across Task 1 (CSS emission, roster `prefix` and `classes`), Task 1's `llms.txt` entries, and every `className` reference in Tasks 2-4. `UtilityFamily`'s shape (`prefix`, `property`, `scale`, `classes`) is unchanged from D79 — Task 1 only adds a new value, not a new field.

**Known ordering constraint:** Task 1 must land (and `pnpm --dir packages/tokens build` must run) before Tasks 2-4's Step 6/7 typecheck-and-verify steps, since those steps grep `packages/react/dist/styles.css` and depend on `packages/tokens/dist/utilities.css` existing with `.psi-sr-only` in it for the full monorepo build to be meaningful. Tasks 2, 3 and 4 touch disjoint files and can run in any order relative to each other.
