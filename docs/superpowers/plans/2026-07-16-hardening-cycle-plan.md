# Hardening Cycle Implementation Plan — nets & honest anchors

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the verification nets (axe, keyboard, visual regression), retune all out-of-gamut palette anchors to their rendered equivalents and promote the gamut diagnostic to a build failure, and close the five AI-context residuals — per spec `docs/superpowers/specs/2026-07-16-hardening-cycle-design.md` (D39–D41).

**Architecture:** Three new gates join the existing CI chain (axe in vitest, Playwright snapshots over built Storybook, gamut-clean build). Token changes are confined to `packages/tokens/src/{palettes,themes}` with values copied verbatim from the current clamped output, so shipped hexes cannot change. Docs changes flow through the existing generated pipeline (`emit-docs.ts`) plus hand-edited llms.txt.

**Tech Stack:** vitest 3 + @testing-library/react + axe-core · @playwright/test · culori · tsx · GitHub Actions

## Global Constraints

- Branch: `hardening-cycle` (PR #11). Commit per task; never push a red state — CI runs build+drift+test+lint on every push.
- Shipped hex values must NOT change in WS3 (D39): every retuned value below is copied from `dist/resolved/<theme>.json` as of main `9eae8d0`. Existing hex-asserting tests must pass UNMODIFIED.
- No new external services; all new dev-deps are local tooling (`axe-core`, `@playwright/test`).
- Sequencing: Task 1 (@layer) before Task 5 (llms.txt import-order claim). Tasks 10–11 (VR) before Tasks 12–13 (retune + gate) merge.
- All file paths relative to repo root `~/Projects/dku/ds`.

---

### Task 1: Explicit @layer order statement (WS5)

**Files:**
- Modify: `packages/tokens/scripts/emit-css.ts` (base.css emitter — the file that writes `dist/base.css`)
- Test: `packages/tokens/__tests__/emit-css.test.ts`

**Interfaces:**
- Produces: `dist/base.css` whose first non-comment line is `@layer ds.base, ds.theme, ds.components, ds.utilities;`. Task 5's llms.txt claim depends on this.

- [ ] **Step 1: Write the failing test** — append to `packages/tokens/__tests__/emit-css.test.ts`:

```ts
it("base.css declares the full ds layer order before any layer block", () => {
  const css = emitBaseCSS(resolvedFixture); // reuse the fixture/helper already used in this file
  const firstLayerLine = css.split("\n").find((l) => l.trimStart().startsWith("@layer"));
  expect(firstLayerLine?.trim()).toBe("@layer ds.base, ds.theme, ds.components, ds.utilities;");
});
```

(Match the existing test file's actual import/fixture names when appending — the file already tests `emit-css` output; reuse its setup verbatim.)

- [ ] **Step 2: Run to verify it fails** — `pnpm vitest run packages/tokens/__tests__/emit-css.test.ts` → FAIL (first `@layer` line is `@layer ds.base {`).

- [ ] **Step 3: Implement** — in `packages/tokens/scripts/emit-css.ts`, in the function that assembles base.css, prepend the order statement immediately after the generated-file header comment:

```ts
lines.push("@layer ds.base, ds.theme, ds.components, ds.utilities;");
lines.push("");
```

- [ ] **Step 4: Verify** — test passes; `pnpm --filter @handamade/tokens build` then `head -5 packages/tokens/dist/base.css` shows the statement. Run full `pnpm test` — green.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(tokens): explicit @layer order statement in base.css (WS5)"`

---

### Task 2: new-theme flag-first argument parsing (WS5)

**Files:**
- Modify: `packages/tokens/scripts/new-theme.ts:4-7`
- Test: `packages/tokens/__tests__/new-theme-args.test.ts` (create)

**Interfaces:**
- Produces: `parseNewThemeArgs(argv: string[]): { name: string | undefined, base: string }` exported from `scripts/new-theme.ts` so it's testable.

- [ ] **Step 1: Write the failing test** — create `packages/tokens/__tests__/new-theme-args.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseNewThemeArgs } from "../scripts/new-theme.js";

describe("parseNewThemeArgs", () => {
  it("name after flags is not swallowed by the flag value", () => {
    expect(parseNewThemeArgs(["--base", "dark", "midnight"])).toEqual({ name: "midnight", base: "dark" });
  });
  it("name-first still works", () => {
    expect(parseNewThemeArgs(["midnight", "--base", "dark"])).toEqual({ name: "midnight", base: "dark" });
  });
  it("defaults base to light", () => {
    expect(parseNewThemeArgs(["midnight"])).toEqual({ name: "midnight", base: "light" });
  });
});
```

- [ ] **Step 2: Run to verify it fails** — first case returns `{ name: "dark", base: "dark" }` today (the `--base` VALUE is picked as the name).

- [ ] **Step 3: Implement** — replace lines 4–7 of `scripts/new-theme.ts` with an exported parser that skips flag values:

```ts
export function parseNewThemeArgs(argv: string[]): { name: string | undefined; base: string } {
  const FLAGS_WITH_VALUES = new Set(["--base"]);
  let name: string | undefined;
  let base = "light";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--base") { base = argv[++i] ?? base; continue; }
    if (a.startsWith("--")) { if (FLAGS_WITH_VALUES.has(a)) i++; continue; }
    if (name === undefined) name = a;
  }
  return { name, base };
}
const { name, base } = parseNewThemeArgs(process.argv.slice(2));
```

Guard the script's side-effect body so importing for tests is safe: wrap the existing generation logic in `if (name !== undefined || process.argv[1]?.endsWith("new-theme.ts"))` — or simpler, move the body under the existing `if (!name) { usage; exit }` check which already runs only when executed. Keep the current usage/exit behavior unchanged.

- [ ] **Step 4: Verify** — tests pass; `pnpm --filter @handamade/tokens exec tsx scripts/new-theme.ts --base dark smoketest --dry-run 2>/dev/null || true` behaves sanely (if no `--dry-run` exists, verify by reading the printed target path, then delete any generated file). Full `pnpm test` green.

- [ ] **Step 5: Commit** — `git commit -am "fix(tokens): new-theme accepts flags before the theme name (WS5)"`

---

### Task 3: DTCG motion completeness — emit easings (WS5, ledger item corrected)

**Files:**
- Modify: `packages/tokens/scripts/emit-dtcg.ts` (motion section, near line 45)
- Test: `packages/tokens/__tests__/emit-dtcg.test.ts`

**Interfaces:**
- Produces: `dist/dtcg/<theme>.json` gains `easing` alongside `duration`: `{ easing: { standard: { $type: "cubicBezier" | "string", $value: "ease" }, ... } }`. Note: the ledger said "easing duplication" — investigation showed easing is *absent* from DTCG (0 matches) while durations are present; this task adds it. DTCG has no first-class keyword-easing type, so emit `$type: "string"` with the CSS value, mirroring how the CSS layer consumes it.

- [ ] **Step 1: Failing test** — append to `packages/tokens/__tests__/emit-dtcg.test.ts` (reuse its existing fixture setup):

```ts
it("emits easing tokens alongside durations", () => {
  const dtcg = emitDTCG(resolvedFixture); // match existing helper name in this file
  expect(dtcg.easing.standard).toEqual({ $type: "string", $value: "ease" });
  expect(Object.keys(dtcg.easing)).toEqual(Object.keys(easings));
});
```

Import `easings` from `../src/scales/motion.js` in the test.

- [ ] **Step 2: Verify fail** — `dtcg.easing` is undefined.

- [ ] **Step 3: Implement** — in `emit-dtcg.ts`, import `easings` from `../src/scales/motion.js` and, next to the `duration` block (line ~45):

```ts
easing: Object.fromEntries(
  Object.entries(easings).map(([name, curve]) => [name, { $type: "string", $value: curve }]),
),
```

- [ ] **Step 4: Verify** — test passes; rebuild and `grep -c easing packages/tokens/dist/dtcg/light.json` ≥ 1. Full test suite green.

- [ ] **Step 5: Commit** — `git commit -am "feat(tokens): DTCG output includes easing tokens (WS5)"`

---

### Task 4: D40 badge guidance in guidance.ts (WS4)

**Files:**
- Modify: `packages/tokens/src/guidance.ts`
- Test: `packages/tokens/__tests__/guidance.test.ts`

**Interfaces:**
- Produces: `guidance.json` gains a top-level `tags` object: `{ accentRule: string, badges: { highlight: "accent-subtle", meta: "neutral-subtle", status: "success | warning | danger" } }`. Task 5's llms.txt text must match this wording.

- [ ] **Step 1: Failing test** — append to `packages/tokens/__tests__/guidance.test.ts`:

```ts
it("encodes D40: tags exempt from one-accent-per-group, subtle badge guidance", () => {
  expect(guidance.tags.accentRule).toMatch(/do not count|exempt/i);
  expect(guidance.tags.badges).toEqual({
    highlight: "accent-subtle",
    meta: "neutral-subtle",
    status: "success | warning | danger",
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Implement** — add to the exported guidance object in `src/guidance.ts`:

```ts
tags: {
  accentRule:
    "Tags are passive labels and do not count against 'one accent per visual group' — that rule governs interactive emphasis (buttons/CTAs). D40.",
  badges: {
    highlight: "accent-subtle",
    meta: "neutral-subtle",
    status: "success | warning | danger",
  },
},
```

- [ ] **Step 4: Verify** — test passes; rebuild; `python3 -c "import json; print(json.load(open('packages/tokens/dist/guidance.json'))['tags']['badges'])"` prints the mapping. Suite green.

- [ ] **Step 5: Commit** — `git commit -am "feat(tokens): D40 tag/badge guidance in guidance.json (WS4)"`

---

### Task 5: llms.txt recipe residuals (WS4, docs-only)

**Files:**
- Modify: `packages/react/llms.txt` (Compositions section)

**Interfaces:**
- Consumes: Task 1's @layer statement (import-order claim), Task 4's D40 wording.

- [ ] **Step 1: Apply the edits** — in the `## Compositions` section of `packages/react/llms.txt`:

Replace the existing subtree-theming bullet with:

```
- Theming, programmatic: the standard setup is `data-ds-theme` on `<html>`. From JS, set it once at app init: `document.documentElement.dataset.dsTheme = "dark"` (React: in a root-level effect). Theme CSS does NOT paint the page background — paint `background: var(--ds-bg-primary)` at your app root yourself. For a themed subtree, set `data-ds-theme` on a wrapper and paint its background the same way; brand font combos do not reach nested subtrees (see guidance.fonts.scope).
```

Replace the form-field bullet's ending with explicit numbers (append to it):

```
 Spacing: `ds-gap-6` label→control, `ds-gap-24` between fields, `ds-gap-12` for toggle groups, `ds-gap-8` for button rows and label+Tag rows.
```

Add three new bullets:

```
- Tags & the accent rule (D40): Tags are passive labels — they do NOT count against "one accent per visual group" (that rule governs buttons/CTAs). Badge mapping: highlight/plan → `accent-subtle`; meta → `neutral-subtle`; status → `success`/`warning`/`danger`.
- CSS import order: all DS stylesheets are order-independent — base.css opens with an explicit `@layer ds.base, ds.theme, ds.components, ds.utilities;` statement. Recommended listing for readability: base → theme → components → utilities → @handamade/react/styles.
- Widths: content widths are app-level; the system tokenizes the page container only (`--ds-container-max`). Component width tokens arrive with Field/Dialog (next cycle).
```

- [ ] **Step 2: Verify** — `node tools/check-docs-drift.mjs` passes (count claims untouched); read the section once end-to-end for contradiction with `CLAUDE.md` and `guidance.ts` wording.

- [ ] **Step 3: Commit** — `git commit -am "docs(react): close the 5 generation-test residuals in llms.txt (WS4, D40)"`

---

### Task 6: Generation eval kit in-repo (WS4)

**Files:**
- Create: `tools/generation-eval/PROMPT.md`, `tools/generation-eval/RUBRIC.md`, `tools/generation-eval/runs/2026-07-15.md`, `tools/generation-eval/runs/2026-07-16.md`

**Interfaces:**
- Produces: a self-contained eval any fresh agent can run; results logged under `runs/`.

- [ ] **Step 1: Create `PROMPT.md`** — the exact prompt used on 07-15/07-16 (entry point `llms.txt` only; component source forbidden; the Profile-settings-form task with name/email+error, plan select, switch, checkbox, save/cancel, Pro tag, dark theme; report files-read / guesses / components+props). Copy the task definition verbatim from the 2026-07-16 inspection report's Station 9 record.

- [ ] **Step 2: Create `RUBRIC.md`:**

```markdown
# Grading rubric
Hard fails: any invented prop (cross-check every prop against dist/manifest.json) · any hardcoded color · any off-vocabulary size (S/M/L) or variant name.
Score notes: count and list every guess the agent reports; compare against the previous run in runs/. A guess on a topic covered by llms.txt Compositions = docs bug, file it.
Pass = zero hard fails. Trend goal = guess count monotonically ↓.
```

- [ ] **Step 3: Create the two `runs/` files** — one-paragraph summaries of the 07-15 run (8 guesses, listed) and 07-16 run (5 residual guesses, listed), copied from the inspection reports.

- [ ] **Step 4: Commit** — `git add tools/generation-eval && git commit -m "feat(tools): generation eval kit — prompt, rubric, run log (WS4)"`

---

### Task 7: a11y metadata map rendered into generated docs (WS1)

**Files:**
- Create: `packages/react/src/a11y-meta.ts`
- Modify: `packages/react/scripts/emit-docs.ts` (after the props table, before Theming)
- Test: `packages/react/scripts/emit-docs.ts` output verified via rebuilt docs (this emitter has no unit-test file today; verification is the rebuilt artifact, consistent with how emit-docs is verified elsewhere)

**Interfaces:**
- Produces: `a11yMeta: Record<string, { keyboard: Array<{ keys: string; behavior: string }>; notes?: string }>` exported from `src/a11y-meta.ts`; each `docs/<Component>.md` gains a `## Keyboard & assistive tech` section when the component has an entry.

- [ ] **Step 1: Create `src/a11y-meta.ts`** with entries for every interactive component (content is the implemented, tested behavior):

```ts
export interface A11yEntry {
  keyboard: Array<{ keys: string; behavior: string }>;
  notes?: string;
}

export const a11yMeta: Record<string, A11yEntry> = {
  Button: {
    keyboard: [
      { keys: "Enter / Space", behavior: "Activates the button." },
      { keys: "Tab", behavior: "Focusable; visible focus ring via :focus-visible." },
    ],
    notes:
      "With href it renders an <a>; disabled anchors get aria-disabled, lose the href attribute, and suppress activation (D33).",
  },
  IconButton: {
    keyboard: [{ keys: "Enter / Space", behavior: "Activates." }],
    notes: "Requires an accessible name — pass aria-label; the icon itself is aria-hidden.",
  },
  Input: {
    keyboard: [{ keys: "Tab", behavior: "Focuses the native <input>; focus ring on the field." }],
    notes: "error sets a red border only — pair with aria-invalid and aria-describedby pointing at your error text.",
  },
  Select: {
    keyboard: [
      { keys: "Tab", behavior: "Focuses the native <select>." },
      { keys: "Arrow keys / typeahead", behavior: "Native option navigation." },
    ],
    notes: "error: same contract as Input.",
  },
  Checkbox: {
    keyboard: [{ keys: "Space", behavior: "Toggles. Native <input type=checkbox> underneath (visually hidden)." }],
  },
  Switch: {
    keyboard: [{ keys: "Space", behavior: "Toggles. Native checkbox semantics; announced as a checkbox." }],
  },
  Tag: {
    keyboard: [{ keys: "Enter / Space (dismiss button)", behavior: "onDismiss renders a real <button>; keyboard-dismissible." }],
    notes: "Passive label otherwise; not in the tab order without onDismiss.",
  },
  Tooltip: {
    keyboard: [
      { keys: "Tab (focus trigger)", behavior: "Shows immediately on focus (no delay)." },
      { keys: "Escape", behavior: "Dismisses while visible (WCAG 1.4.13)." },
    ],
    notes: "Hover opens after a short delay; content is linked via aria-describedby while visible. Trigger must accept ref and event props.",
  },
};
```

(Before committing, read each component's test file and confirm every claim above against an existing assertion or implementation line; adjust wording where behavior differs. NavBar/Card/AspectRatio intentionally have no entry — no interactive contract.)

- [ ] **Step 2: Wire into `emit-docs.ts`** — import and render after the props table:

```ts
import { a11yMeta } from "../src/a11y-meta.js";
// inside the per-component loop:
const a11y = a11yMeta[c.name];
if (a11y) {
  md.push("", "## Keyboard & assistive tech", "");
  md.push("| Keys | Behavior |", "|---|---|");
  for (const k of a11y.keyboard) md.push(`| ${escapeCell(k.keys)} | ${escapeCell(k.behavior)} |`);
  if (a11y.notes) md.push("", a11y.notes);
}
```

(Adapt `md.push` to this emitter's actual line-accumulator variable.)

- [ ] **Step 3: Verify** — `pnpm build`; `grep -l "Keyboard & assistive tech" packages/react/docs/*.md | wc -l` → 8; `grep -A3 "Escape" packages/react/docs/Tooltip.md` shows the 1.4.13 row. Suite + drift check green.

- [ ] **Step 4: Commit** — `git commit -am "feat(react): generated keyboard/assistive-tech docs from a11y-meta (WS1)"`

---

### Task 8: axe pass across all components (WS1)

**Files:**
- Modify: `package.json` (root devDependency `axe-core`)
- Create: `packages/react/src/a11y.axe.test.tsx`

**Interfaces:**
- Consumes: all 11 component exports from `src/index.ts`.
- Produces: one vitest file that fails on any axe violation in any rendered component.

- [ ] **Step 1: Install** — `pnpm add -D -w axe-core` (jsdom-compatible; the color-contrast rule won't run in jsdom — acceptable per spec, contrast is gated at token build).

- [ ] **Step 2: Write the test file** — `packages/react/src/a11y.axe.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import {
  Button, IconButton, Card, NavBar, AspectRatio, Input, Select, Checkbox, Switch, Tag, Tooltip,
} from "./index.js";

const cases: Array<[string, React.ReactElement]> = [
  ["Button", <Button>Save</Button>],
  ["Button as disabled anchor", <Button href="/x" disabled>Link</Button>],
  ["IconButton", <IconButton aria-label="Close"><svg aria-hidden="true" /></IconButton>],
  ["Card", <Card variant="stacked" media={<img alt="" src="x.png" />}>Body</Card>],
  ["NavBar", <NavBar brand={<a href="/">DK</a>} actions={<Button size={32}>CTA</Button>}><a href="/a">A</a></NavBar>],
  ["AspectRatio", <AspectRatio ratio={16 / 10}><img alt="demo" src="x.png" /></AspectRatio>],
  ["Input", <label>Name<Input size={32} /></label>],
  ["Input error", <label>Email<Input size={32} error aria-invalid="true" /></label>],
  ["Select", <label>Plan<Select size={32}><option>Free</option></Select></label>],
  ["Checkbox", <Checkbox>Beta features</Checkbox>],
  ["Switch", <Switch>Email notifications</Switch>],
  ["Tag", <Tag variant="accent" subtle>Pro</Tag>],
  ["Tag dismissible", <Tag variant="neutral" onDismiss={() => {}}>Filter</Tag>],
  ["Tooltip", <Tooltip content="Info"><button>Trigger</button></Tooltip>],
];

describe("axe: no violations in rendered components", () => {
  for (const [name, el] of cases) {
    it(name, async () => {
      const { container } = render(el);
      const results = await axe.run(container, {
        rules: { "color-contrast": { enabled: false } }, // jsdom cannot compute; gated at token build instead
      });
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(", ")}`)).toEqual([]);
    });
  }
});
```

(If IconButton's children type requires an Icon component, use `IconClose` from `./icons/index.js` instead of the raw svg. If a case's exact props don't type-check against a component's real API, fix the CASE to match the API — never the component, unless axe reveals a genuine violation; a genuine violation is its own finding to fix minimally and note in the commit.)

- [ ] **Step 3: Run** — `pnpm vitest run packages/react/src/a11y.axe.test.tsx` → expect PASS (fundamentals were verified by inspection). Any real violation: fix the component minimally, re-run.

- [ ] **Step 4: Full suite + commit** — `pnpm test` green → `git add -A && git commit -m "test(react): axe pass across all 11 components in vitest (WS1)"`

---

### Task 9: Keyboard assertions for Select, Checkbox, Switch, Input (WS1)

**Files:**
- Modify: `packages/react/src/Select/Select.test.tsx`, `packages/react/src/Checkbox/Checkbox.test.tsx`, `packages/react/src/Switch/Switch.test.tsx`, `packages/react/src/Input/Input.test.tsx`

**Interfaces:** none new — extends existing test files in their existing style (`@testing-library/user-event` is already a devDependency).

- [ ] **Step 1: Checkbox** — append:

```tsx
it("toggles with Space via keyboard", async () => {
  const user = userEvent.setup();
  render(<Checkbox>Beta</Checkbox>);
  await user.tab();
  expect(screen.getByRole("checkbox")).toHaveFocus();
  await user.keyboard(" ");
  expect(screen.getByRole("checkbox")).toBeChecked();
});
```

- [ ] **Step 2: Switch** — same pattern (`getByRole("checkbox")`, Space toggles; assert checked).

```tsx
it("toggles with Space via keyboard", async () => {
  const user = userEvent.setup();
  render(<Switch>Notify</Switch>);
  await user.tab();
  expect(screen.getByRole("checkbox")).toHaveFocus();
  await user.keyboard(" ");
  expect(screen.getByRole("checkbox")).toBeChecked();
});
```

- [ ] **Step 3: Input** — focusability + label association:

```tsx
it("is reachable by Tab and associates its label", async () => {
  const user = userEvent.setup();
  render(<label>Name<Input size={32} /></label>);
  await user.tab();
  expect(screen.getByLabelText("Name")).toHaveFocus();
  await user.keyboard("Dmytro");
  expect(screen.getByLabelText("Name")).toHaveValue("Dmytro");
});
```

- [ ] **Step 4: Select** — focus + keyboard value change:

```tsx
it("is keyboard-operable as a native select", async () => {
  const user = userEvent.setup();
  render(
    <label>
      Plan
      <Select size={32} defaultValue="free">
        <option value="free">Free</option>
        <option value="pro">Pro</option>
      </Select>
    </label>,
  );
  await user.tab();
  expect(screen.getByLabelText("Plan")).toHaveFocus();
  await user.selectOptions(screen.getByLabelText("Plan"), "pro");
  expect(screen.getByLabelText("Plan")).toHaveValue("pro");
});
```

(In each file, match the existing import style — `screen`/`render`/`userEvent` are already imported in some; add what's missing. If a component wraps the native control such that `user.tab()` lands elsewhere first, adjust with a preceding focusable or use `getByRole(...).focus()` + keyboard — keep the Space/typing assertions.)

- [ ] **Step 5: Run each file, then the suite** — all green → `git commit -am "test(react): keyboard operability for Select/Checkbox/Switch/Input (WS1)"`

---

### Task 10: Playwright visual regression over built Storybook (WS2, D41)

**Files:**
- Modify: root `package.json` (devDep `@playwright/test`; script `"vr": "playwright test -c apps/storybook/vr"`)
- Create: `apps/storybook/vr/playwright.config.ts`, `apps/storybook/vr/stories.spec.ts`, `apps/storybook/vr/README.md`

**Interfaces:**
- Consumes: `apps/storybook/storybook-static/` (built by `pnpm build`) and its `index.json` story index.
- Produces: committed baselines in `apps/storybook/vr/stories.spec.ts-snapshots/`; `pnpm vr` exits non-zero on visual diff.

- [ ] **Step 1: Install** — `pnpm add -D -w @playwright/test && pnpm exec playwright install chromium`

- [ ] **Step 2: Config** — `apps/storybook/vr/playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: 0,
  workers: 4,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: "disabled" } },
  use: { viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 },
  webServer: {
    command: "npx serve -l 6208 ../storybook-static",
    port: 6208,
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 3: Spec** — `apps/storybook/vr/stories.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface IndexEntry { id: string; type: string; title: string; }
const index = JSON.parse(
  readFileSync(join(__dirname, "../storybook-static/index.json"), "utf8"),
) as { entries: Record<string, IndexEntry> };

const stories = Object.values(index.entries).filter((e) => e.type === "story");
// D41 matrix: component stories in light+ember; token-docs pages in all 4 themes.
const themesFor = (e: IndexEntry) =>
  e.title.toLowerCase().includes("tokens") ? ["light", "dark", "acme", "ember"] : ["light", "ember"];

for (const s of stories) {
  for (const theme of themesFor(s)) {
    test(`${s.id} @ ${theme}`, async ({ page }) => {
      await page.goto(`/iframe.html?id=${s.id}&globals=theme:${theme}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(250); // fonts/HMR-free settle
      await expect(page).toHaveScreenshot(`${s.id}--${theme}.png`, { fullPage: true });
    });
  }
}
```

- [ ] **Step 4: Generate baselines** — `pnpm build && pnpm vr --update-snapshots`. Inspect a handful of PNGs by eye (welcome, button, tokens pages). NOTE: local baselines are macOS-rendered; the CI task (Task 11) regenerates them linux-rendered and those are the committed truth — expect to replace them there.

- [ ] **Step 5: README** — `apps/storybook/vr/README.md` documenting: what's covered (D41 matrix), how to refresh baselines (via the CI artifact — download `vr-baselines` artifact from the failed run, replace, commit), and that baselines are linux-rendered.

- [ ] **Step 6: Run + commit** — `pnpm vr` green locally against local baselines → `git add -A && git commit -m "feat(vr): Playwright visual regression over built Storybook (WS2, D41)"`

---

### Task 11: VR in CI with linux baselines (WS2)

**Files:**
- Modify: `.github/workflows/ci.yml`
- Replace: `apps/storybook/vr/stories.spec.ts-snapshots/*` with linux-rendered baselines

**Interfaces:**
- Consumes: Task 10's `pnpm vr`. Produces: a required CI step; `vr-baselines` artifact on failure.

- [ ] **Step 1: Add steps to ci.yml** after `pnpm test`:

```yaml
      - run: pnpm exec playwright install --with-deps chromium

      - run: pnpm vr
        env: { CI: "true" }

      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: vr-baselines
          path: |
            apps/storybook/vr/stories.spec.ts-snapshots/
            test-results/
```

- [ ] **Step 2: First push will fail VR** (mac vs linux rendering) — that's expected and is the baseline-refresh drill from the README: download the artifact's actual-PNGs, replace the snapshot dir, commit.

- [ ] **Step 3: Push the linux baselines; CI green.** Note in the PR that VR is now part of `ci` (the branch-protection-required check covers it automatically — same job).

- [ ] **Step 4: Commit** — `git add -A && git commit -m "ci: visual regression step with linux baselines + failure artifact (WS2)"`

---

### Task 12: Gamut retune — anchors and caps to rendered values (WS3, D39)

**Files:**
- Modify: `packages/tokens/src/palettes/default.ts` (anchors: emerald, amber, sapphire, ruby), `packages/tokens/src/themes/customers/acme.ts` (mint, gold anchors), `packages/tokens/src/themes/{light,dark}.ts` and `packages/tokens/src/themes/customers/ember.ts` (fg* chroma caps)
- Test: `packages/tokens/__tests__/gamut.test.ts` (new assertions)

**Interfaces:**
- Produces: `gamutWarnings()` returns `[]` for all four built themes; every shipped hex identical to before (existing hex tests untouched and green).

**The retune table (copied from `dist/resolved/*.json` at main `9eae8d0` — these are the values ALREADY rendering):**

| Theme | Token | New target (l, c, h) | Hex (unchanged) | Mechanism |
|---|---|---|---|---|
| light | fgSuccess | 0.48, 0.1187, 155 | #00703e | `c: cap(0.1187)` on the fg formula |
| light | fgWarning | 0.48, 0.1013, 75 | #7e5400 | `c: cap(0.1013)` |
| light | fgDanger | 0.48, 0.1946, 25 | #b1001b | `c: cap(0.1946)` |
| light | fillSuccess | 0.52, 0.1285, 155 | #007e46 | emerald anchor c → see below |
| light | fillWarning | 0.75, 0.1582, 75 | #e79d00 | amber anchor c → 0.1582 |
| dark | fgAccent | 0.75, 0.1286, 260 | #7daeff | `c: cap(0.1286)` |
| dark | fgWarning | 0.75, 0.1582, 75 | #e79d00 | `c: cap(0.1582)` |
| dark | fgDanger | 0.75, 0.1505, 25 | #ff847d | `c: cap(0.1505)` |
| dark | fillSuccess/fillWarning | as light | — | shared anchors (below) |
| acme | fgSuccess | 0.48, 0.1086, 160 | #007048 | `c: cap(0.1086)` |
| acme | fgWarning | 0.48, 0.0984, 85 | #775800 | `c: cap(0.0984)` |
| acme | fgDanger | 0.48, 0.1919, 15 | #af0039 | `c: cap(0.1919)` |
| acme | fillSuccess | 0.52, 0.1176, 160 | #007d51 | mint anchor c → see below |
| ember | fgAccent | 0.75, 0.156, 40 | #ff885d | `c: cap(0.156)` |
| ember | fgWarning/fgDanger/fills | as dark | — | shared anchors + caps |

Anchor edits (each anchor's own l/h stay; only c drops to its in-gamut max at the anchor's own lightness): `amber` c → **0.1582**; `emerald` — its warned use is fillSuccess at l 0.52 → if the emerald anchor's own l is 0.52, set c → **0.1285**; if the anchor l differs, leave the anchor and put `c: cap(0.1285)` on the fill formula instead (check `src/palettes/default.ts` for the anchor's actual l — the rule is: fix at the anchor when the anchor itself is the warned value, else cap at the formula). Same rule for acme `mint` (0.1176) and `gold`, and for `sapphire`/dark-accent (0.1286 at l 0.75) and ember's accent (0.156). `fillTint*` and `borderFocus` need NO edits — they `ref` the retuned fg tokens.

- [ ] **Step 1: Failing test** — append to `packages/tokens/__tests__/gamut.test.ts`:

```ts
it.each(["light", "dark", "acme", "ember"])("%s theme resolves fully in-gamut (D39)", (name) => {
  const { resolved, theme, palette, slots } = buildTheme(name); // reuse this file's existing harness for constructing themes
  expect(gamutWarnings(resolved, theme, palette, slots)).toEqual([]);
});
```

- [ ] **Step 2: Verify fail** — lists the 19 warnings.

- [ ] **Step 3: Apply the table** — smallest diffs that zero the warnings, following the anchor-vs-cap rule above. After each theme file, run `pnpm --filter @handamade/tokens build` and confirm: (a) that theme's warnings gone, (b) **`git diff --stat packages/tokens/dist` shows zero content changes to any css/json** (regenerate then `git diff --exit-code packages/tokens/dist` if dist were tracked — it isn't, so instead: `node -e` compare a saved-before copy of `dist/resolved/<theme>.json` against after; make the copy before starting).

- [ ] **Step 4: Full verification** — gamut test passes; ALL existing tests pass unmodified (hex assertions prove D39's no-visual-change); `pnpm vr` green with zero diffs (the machine proof); drift check green.

- [ ] **Step 5: Commit** — `git commit -am "feat(tokens): D39 — retune all anchors/caps to in-gamut rendered values (zero visual change)"`

---

### Task 13: Promote gamut warnings to build failures (WS3)

**Files:**
- Modify: `packages/tokens/scripts/build.ts:93-96` (the non-fatal warning loop)
- Test: `packages/tokens/__tests__/gamut.test.ts`

**Interfaces:**
- Produces: any future out-of-gamut anchor throws at build (CI-enforced via the existing `pnpm build` step).

- [ ] **Step 1: Failing test:**

```ts
it("build gate: gamutWarnings on a deliberately out-of-gamut theme is non-empty (guards the gate's input)", () => {
  const bad = makeThemeWith({ fgWarning: { l: 0.48, c: 0.4, h: 75 } }); // reuse/extend the file's theme-builder helper
  expect(gamutWarnings(bad.resolved, bad.theme, bad.palette, bad.slots).length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Flip build.ts** — replace the warning loop (currently `for (const w of gamutWarnings(...)) console.warn/log(...)`):

```ts
const gamut = gamutWarnings(resolved, themeDef, palette, slots);
if (gamut.length > 0) {
  for (const w of gamut) console.error(`  GAMUT ERROR [${themeName}] ${w}`);
  throw new Error(`${themeName} theme has ${gamut.length} out-of-gamut anchors (D39: anchors must resolve in-gamut)`);
}
```

- [ ] **Step 3: Verify** — `pnpm build` green (Task 12 zeroed them); temporarily bump one anchor c to 0.4, build fails with GAMUT ERROR, revert. Full suite green.

- [ ] **Step 4: Commit** — `git commit -am "feat(tokens): gamut diagnostic is now a build gate (D39)"`

---

### Task 14: Cycle close — spec status, index, changeset, eval run

**Files:**
- Modify: `docs/superpowers/specs/2026-07-16-hardening-cycle-design.md` (Status → Implemented), `llms.txt` (index the spec + plan), `.changeset/hardening-cycle.md` (create)
- Create: `tools/generation-eval/runs/2026-07-XX-post-hardening.md`

- [ ] **Step 1: Run the generation eval** per `tools/generation-eval/PROMPT.md` with a fresh agent; grade with RUBRIC.md; log the run. Exit criterion: zero guesses on the five WS4 topics. Any surviving guess → fix llms.txt in this task and re-run.

- [ ] **Step 2: Changeset** — `.changeset/hardening-cycle.md`:

```markdown
---
"@handamade/tokens": patch
"@handamade/react": patch
---

Hardening: axe + keyboard test coverage and generated keyboard docs; Playwright visual regression; all palette anchors retuned to in-gamut values (zero visual change) with the gamut diagnostic promoted to a build gate (D39); D40 tag/badge guidance; DTCG easing output; explicit @layer order statement; new-theme flag parsing.
```

(patch × 2: no API surface changes; docs/tests/build-infra + value-identical token internals.)

- [ ] **Step 3: Spec status + llms.txt index** — mirror how previous cycles did it (spec header Status line; root llms.txt spec/plan lists).

- [ ] **Step 4: Full local gate** — `pnpm build && pnpm test && pnpm lint && node tools/check-docs-drift.mjs && pnpm vr` — all green. Commit: `git commit -am "docs: hardening cycle implemented — spec status, index, changeset"`. Push; CI green on PR #11; hand to Dmytro for merge.

---

## Self-review notes (done at write time)

- Spec coverage: WS1→Tasks 7-9 · WS2→10-11 · WS3→12-13 · WS4→4-6 (+14 eval) · WS5→1-3 · exit criteria→14. Sequencing constraint honored: Task 1 before 5; Tasks 10-11 before 12-13.
- Known judgment points left to the implementer *with rules for deciding*: emerald/mint anchor-vs-cap choice (rule stated in Task 12), axe case fixes (rule: fix the case unless a genuine violation), tab-order variance in Task 9.
- The one intentional deviation from the spec's ledger wording: Task 3 implements "add missing DTCG easing" — investigation (0 easing matches in DTCG output) showed the remembered "duplication" was actually an omission.
