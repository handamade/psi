# One Focus Ring (D82) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every focusable part Psi owns draws one focus ring, whose width and two offsets are scale tokens, and two gates keep it so.

**Architecture:** Three scale tokens are emitted with the other scales into `base.css`, `resolved/*.json` and DTCG. Every component CSS Module binds them on `:focus-visible`; Menu and Dialog gain a colour token and a rule. A stylelint rule forbids literal outline geometry, and a Playwright `@interaction` spec tabs through every built story and reads the computed outline.

**Tech Stack:** TypeScript token build (`packages/tokens`), CSS Modules (`packages/react`), stylelint plugin (`tools/`), Vitest, Playwright over built Storybook.

Spec: `docs/superpowers/specs/2026-09-30-focus-ring-design.md`.

## Global Constraints

- Node 24 (`.nvmrc`); check `node -v` before the first pnpm command.
- Token names, exactly: `--psi-focus-ring-width: 2px`, `--psi-focus-ring-offset: 2px`, `--psi-focus-ring-offset-inset: -2px`. Values are `px` literals.
- The focus rule shape, exactly: `outline: var(--psi-focus-ring-width) solid var(--psi-<name>-focus-ring);` plus `outline-offset: var(--psi-focus-ring-offset);` or `var(--psi-focus-ring-offset-inset)`.
- Inset: `Input`, `Select`, `Tab`, `TabPanel`, Menu item, `<dialog>` and its panel. Everything else outside.
- Toast gets no rule and no token. No descendant focus rules over slots.
- No new prop, no runtime dependency, no `url()`, no `style` prop.
- Never edit `dist/`; new values go in `packages/tokens/src`.
- The five gates, from the repo root:
  `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site`,
  then `pnpm test:e2e` for the sweep. `pnpm vr` only passes in CI.
- Re-check that D82 is still free immediately before opening the PR (spec `## Decisions` entries, commit subjects on `origin/main`, release titles).

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/tokens/src/scales/focus-ring.ts` (new) | the three values |
| `packages/tokens/scripts/emit-utilities.ts` | emits them as custom properties |
| `packages/tokens/scripts/emit-json.ts`, `emit-dtcg.ts` | machine-readable copies |
| `packages/tokens/src/dsl/validator.ts` | `focus-ring` joins the scale-family prefixes |
| `packages/tokens/src/components/menu.ts`, `dialog.ts` | `focus-ring` colour tokens |
| `packages/tokens/src/guidance.ts`, `packages/tokens/llms.txt` | the rule, for agents |
| `tools/stylelint-plugin-psi-tokens.mjs`, `.stylelintrc.json` | `psi/focus-ring`; `focus-ring` admitted as a scale family |
| `apps/storybook/vr/focus-ring.interaction.spec.ts` (new) | the browser sweep |
| 11 CSS Modules under `packages/react/src/` + `menu`, `dialog` | bind the tokens |
| `apps/promo/src/promo.css` | binds the tokens |
| `.changeset/focus-ring.md` (new) | `minor`, tokens and react |

---

### Task 1: The scale tokens

**Files:**
- Create: `packages/tokens/src/scales/focus-ring.ts`
- Modify: `packages/tokens/scripts/emit-utilities.ts`, `emit-json.ts`, `emit-dtcg.ts`, `packages/tokens/src/dsl/validator.ts`
- Test: `packages/tokens/__tests__/scales.test.ts`, `emit-json.test.ts`, `emit-dtcg.test.ts`, `validator.test.ts`

**Interfaces:**
- Produces: `export const focusRing = { width: 2, offset: 2, offsetInset: -2 } as const` from `src/scales/focus-ring.ts`; CSS custom properties `--psi-focus-ring-width`, `--psi-focus-ring-offset`, `--psi-focus-ring-offset-inset` in `base.css`.

- [ ] **Step 1: Write the failing tests**

In `scales.test.ts`, import `focusRing` from `../src/scales/focus-ring.js` and add inside `describe("scales")`:

```ts
describe("focus ring (D82)", () => {
  it("is 2px wide, 2px outside or 2px inside", () => {
    expect(focusRing).toEqual({ width: 2, offset: 2, offsetInset: -2 });
  });

  it("emits px custom properties, not rem", () => {
    const css = emitScaleVarsCSS();
    expect(css).toContain("--psi-focus-ring-width: 2px;");
    expect(css).toContain("--psi-focus-ring-offset: 2px;");
    expect(css).toContain("--psi-focus-ring-offset-inset: -2px;");
  });
});
```

In `emit-json.test.ts`:

```ts
it("scales carry the focus ring (D82)", () => {
  expect(json.scales.focusRing).toEqual({ width: 2, offset: 2, offsetInset: -2 });
});
```

In `emit-dtcg.test.ts` (use the file's existing parsed-output variable):

```ts
it("exports the focus ring as px dimensions (D82)", () => {
  expect(dtcg.dimension.focusRing).toEqual({
    width: { $type: "dimension", $value: "2px" },
    offset: { $type: "dimension", $value: "2px" },
    offsetInset: { $type: "dimension", $value: "-2px" },
  });
});
```

In `validator.test.ts`, inside the scale-prefix test:

```ts
expect(() => validateNoScalePrefixShadow(["focus-ring-accent"])).toThrow(ValidationError);
```

- [ ] **Step 2: Run them red**

Run: `pnpm vitest run packages/tokens/__tests__/scales.test.ts packages/tokens/__tests__/emit-json.test.ts packages/tokens/__tests__/emit-dtcg.test.ts packages/tokens/__tests__/validator.test.ts`
Expected: FAIL — `scales.test.ts` cannot resolve `../src/scales/focus-ring.js`; the other three fail on assertion.

- [ ] **Step 3: Implement**

`packages/tokens/src/scales/focus-ring.ts`:

```ts
/** Focus-ring geometry in px (D82). One ring for every focusable part:
 * `width` is the outline width, `offset` places the ring outside a control,
 * `offsetInset` inside one whose outside ring would be clipped or would land
 * on a neighbour (Input, Select, Tab, TabPanel, Menu item, Dialog).
 *
 * px, not rem: a ring is a hairline. And `offsetInset` is a literal rather
 * than -1 × width: a custom property holding var() is computed where it is
 * declared, at :root, so a width overridden on a themed sub-tree would never
 * reach it. */
export const focusRing = { width: 2, offset: 2, offsetInset: -2 } as const;
```

`emit-utilities.ts` — import `focusRing`, and after the `--psi-z-*` loop:

```ts
lines.push("");

// Focus ring (D82) — px literals; see scales/focus-ring.ts.
lines.push(`    --psi-focus-ring-width: ${focusRing.width}px;`);
lines.push(`    --psi-focus-ring-offset: ${focusRing.offset}px;`);
lines.push(`    --psi-focus-ring-offset-inset: ${focusRing.offsetInset}px;`);
```

`emit-json.ts` — import `focusRing`; in `scales`, after `layout`: `focusRing,`.

`emit-dtcg.ts` — import `focusRing`; in `dimension`, after `container`:

```ts
focusRing: Object.fromEntries(
  Object.entries(focusRing).map(([k, px]) => [k, { $type: "dimension", $value: `${px}px` }]),
),
```

`validator.ts`:

```ts
const SCALE_FAMILY_PREFIX = /^(space|size|radius|text|font|duration|ease|z|focus-ring)-/;
```

- [ ] **Step 4: Run them green**

Same command. Expected: PASS.

- [ ] **Step 5: Commit** — `feat(tokens): focus-ring width and offsets as scale tokens (D82)`

### Task 2: Colour tokens for Menu and Dialog

**Files:**
- Modify: `packages/tokens/src/components/menu.ts`, `dialog.ts`
- Test: `packages/tokens/__tests__/menu-tokens.test.ts`, `dialog-tokens.test.ts`

**Interfaces:**
- Produces: `--psi-menu-focus-ring`, `--psi-dialog-focus-ring`, both `var(--psi-border-focus)`.

- [ ] **Step 1: Failing tests** — add `"focus-ring": "var(--psi-border-focus)",` as the last key of the `toEqual` object in each test file.
- [ ] **Step 2: Run red** — `pnpm vitest run packages/tokens/__tests__/menu-tokens.test.ts packages/tokens/__tests__/dialog-tokens.test.ts`. Expected: FAIL on the missing key.
- [ ] **Step 3: Implement** — add the same line as the last key of `menuVars` and `dialogVars`, each with a `// D82` comment naming the element it rings.
- [ ] **Step 4: Run green**, then `pnpm --filter @handamade/psi-tokens build`. Expected: contrast and scope gates pass for all four themes.
- [ ] **Step 5: Commit** — `feat(tokens): focus-ring colour tokens for Menu and Dialog (D82)`

### Task 3: The stylelint rule

**Files:**
- Modify: `tools/stylelint-plugin-psi-tokens.mjs`, `.stylelintrc.json`
- Test: `packages/tokens/__tests__/stylelint-focus-ring.test.ts` (new)

**Interfaces:**
- Produces: rule `psi/focus-ring`; `psi/component-tokens-only` admits `--psi-focus-ring-*`.

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from "vitest";
import stylelint from "stylelint";
import { fileURLToPath } from "node:url";

const pluginPath = fileURLToPath(new URL("../../../tools/stylelint-plugin-psi-tokens.mjs", import.meta.url));
const config = {
  plugins: [pluginPath],
  rules: { "psi/focus-ring": true, "psi/component-tokens-only": true },
};

async function lintCSS(code: string, codeFilename = "widget.module.css") {
  const { results } = await stylelint.lint({ code, codeFilename, config });
  return results[0].warnings.map((w) => w.text);
}

const RING = "outline: var(--psi-focus-ring-width) solid var(--psi-widget-focus-ring);";

describe("psi/focus-ring (D82)", () => {
  it("passes the shared ring, outside and inset", async () => {
    expect(await lintCSS(`.x:focus-visible { ${RING} outline-offset: var(--psi-focus-ring-offset); }`)).toEqual([]);
    expect(await lintCSS(`.x:focus-visible { ${RING} outline-offset: var(--psi-focus-ring-offset-inset); }`)).toEqual([]);
  });

  it("errors on a literal outline width", async () => {
    const warnings = await lintCSS(".x:focus-visible { outline: 2px solid var(--psi-widget-focus-ring); }");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/--psi-focus-ring-width/);
  });

  it("errors on a literal outline-offset, negative included", async () => {
    expect(await lintCSS(`.x:focus-visible { ${RING} outline-offset: 2px; }`)).toHaveLength(1);
    expect(await lintCSS(`.x:focus-visible { ${RING} outline-offset: -1px; }`)).toHaveLength(1);
  });

  it("errors on arithmetic over a token", async () => {
    expect(
      await lintCSS(`.x:focus-visible { ${RING} outline-offset: calc(var(--psi-focus-ring-offset) * -1); }`),
    ).toHaveLength(1);
  });

  it("errors on an outline keyed on :focus, or on no focus state at all", async () => {
    const onFocus = await lintCSS(`.x:focus { ${RING} }`);
    expect(onFocus).toHaveLength(1);
    expect(onFocus[0]).toMatch(/:focus-visible/);
    expect(await lintCSS(`.x { ${RING} }`)).toHaveLength(1);
  });

  it("requires :focus-visible in every selector of a list", async () => {
    expect(await lintCSS(`.a:focus-visible, .b:focus { ${RING} }`)).toHaveLength(1);
    expect(await lintCSS(`.a:focus-visible, .b:focus-visible + .c { ${RING} }`)).toEqual([]);
  });

  it("errors on removing the outline", async () => {
    expect(await lintCSS(".x:focus-visible { outline: none; }")).toHaveLength(1);
  });

  it("leaves a transition on outline alone", async () => {
    expect(
      await lintCSS(".x { transition: outline var(--psi-duration-150) var(--psi-ease-standard); }"),
    ).toEqual([]);
  });

  it("only gates component CSS Modules", async () => {
    expect(await lintCSS("a:focus-visible { outline: 2px solid red; }", "app.css")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run red** — `pnpm vitest run packages/tokens/__tests__/stylelint-focus-ring.test.ts`. Expected: FAIL (unknown rule `psi/focus-ring`; `--psi-focus-ring-width` rejected by `psi/component-tokens-only`).

- [ ] **Step 3: Implement**

In the plugin, extend the allowed scale families:

```js
const ALLOWED_GLOBAL = /^--psi-(space|size|radius|text|font|duration|ease|z|focus-ring)-/;
```

and add, before `export default`:

```js
const focusRuleName = "psi/focus-ring";
const OUTLINE_GEOMETRY = new Set(["outline", "outline-width", "outline-offset"]);

/** D82 — one focus ring. In a component CSS Module, outline geometry comes
 * from the focus-ring scale and the ring is keyed on :focus-visible. */
const focusRule = (enabled) => (root, result) => {
  if (!enabled) return;
  if (!/\.module\.css$/.test(root.source?.input.file ?? "")) return;
  const report = (node, message) =>
    stylelint.utils.report({ ruleName: focusRuleName, result, node, message: `${message} (psi/focus-ring)` });
  root.walkDecls(/^outline(-|$)/, (decl) => {
    const selectors = decl.parent?.type === "rule" ? decl.parent.selectors : [];
    if (!selectors.length || !selectors.every((s) => s.includes(":focus-visible"))) {
      report(decl, `"${decl.prop}" outside :focus-visible — the focus ring is keyed on :focus-visible in every selector`);
    }
    if (/^(none|hidden)\b/.test(decl.value.trim())) {
      report(decl, `"${decl.prop}: ${decl.value}" removes the focus ring`);
    } else if (OUTLINE_GEOMETRY.has(decl.prop) && /\d/.test(decl.value.replace(/var\([^()]*\)/g, ""))) {
      report(decl, `literal in "${decl.prop}" — bind var(--psi-focus-ring-width) and var(--psi-focus-ring-offset) or var(--psi-focus-ring-offset-inset)`);
    }
  });
};
focusRule.ruleName = focusRuleName;
focusRule.messages = stylelint.utils.ruleMessages(focusRuleName, {});
```

Add `stylelint.createPlugin(focusRuleName, focusRule)` to the default export, and `"psi/focus-ring": true` to `rules` in `.stylelintrc.json`.

- [ ] **Step 4: Run green** — the same vitest command. Expected: PASS.
- [ ] **Step 5: Prove it red on today's CSS** — `pnpm lint:css`. Expected: FAIL, with `psi/focus-ring` errors in `button`, `icon-button`, `checkbox`, `switch`, `tag`, `table`, `navbar`, `tabs` (×2), `input`, `select` modules. Record the count for the spec.
- [ ] **Step 6: Commit** — `feat(lint): psi/focus-ring forbids literal outline geometry (D82)` (the repo is red on `lint:css` until Task 5; that is the point).

### Task 4: The browser sweep

**Files:**
- Create: `apps/storybook/vr/focus-ring.interaction.spec.ts`

**Interfaces:**
- Consumes: the three custom properties from Task 1, read from the page.

- [ ] **Step 1: Write the spec**

```ts
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** D82 — one focus ring, proven in a browser.
 *
 * Loads every story, presses Tab through it, and reads the computed outline of
 * each tab stop. A stop must draw `solid`, at --psi-focus-ring-width, at
 * --psi-focus-ring-offset or --psi-focus-ring-offset-inset. The token values
 * are read from the page, so this follows them if they change.
 *
 * No screenshots, so it runs on macOS as well as CI (`pnpm test:e2e`).
 *
 * A test over CSS text can show that a rule exists. It cannot show that the
 * ring is drawn: a missing rule on Menu items and on a long drawer's panel
 * both shipped as the browser's own ring, and the brief for D82 listed a gap
 * on Toast that a browser does not have. */

interface IndexEntry { id: string; type: string; }
const index = JSON.parse(
  readFileSync(join(import.meta.dirname, "../storybook-static/index.json"), "utf8"),
) as { entries: Record<string, IndexEntry> };
const stories = Object.values(index.entries).filter((e) => e.type === "story");

/** Tab stops Psi does not style. Each entry needs a reason. */
const NOT_PSI: { story: RegExp; selector: string; reason: string }[] = [
  {
    story: /^components-tooltip--/,
    selector: "button:not([class])",
    reason: "Tooltip clones handlers onto the consumer's own trigger; the stories use a raw <button> to stand for it.",
  },
];

const MAX_STOPS = 40;

test.describe.configure({ mode: "parallel" });

for (const s of stories) {
  test(`${s.id} draws the shared ring on every tab stop @interaction`, async ({ page }) => {
    // Input and Select transition their outline; reduced motion zeroes it (D30).
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/iframe.html?id=${s.id}&globals=theme:light`, { waitUntil: "networkidle" });

    const ring = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const read = (name: string) => cs.getPropertyValue(name).trim();
      return {
        width: read("--psi-focus-ring-width"),
        offsets: [read("--psi-focus-ring-offset"), read("--psi-focus-ring-offset-inset")],
      };
    });
    expect(ring.width, "--psi-focus-ring-width is not defined on the page").not.toBe("");

    const skip = NOT_PSI.filter((a) => a.story.test(s.id)).map((a) => a.selector);

    const probe = () =>
      page.evaluate((skipSelectors) => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const w = window as unknown as { __psiSeen?: WeakSet<Element> };
        const seen = (w.__psiSeen ??= new WeakSet());
        const again = seen.has(el);
        seen.add(el);
        // Checkbox and Switch keep the native input focusable and draw the
        // ring on the indicator that follows it.
        const own = getComputedStyle(el);
        const next = el.nextElementSibling ? getComputedStyle(el.nextElementSibling) : null;
        const cs = own.outlineStyle !== "solid" && next?.outlineStyle === "solid" ? next : own;
        const cls = typeof el.className === "string" ? el.className.split(" ")[0] : "";
        return {
          again,
          skipped: skipSelectors.some((sel) => el.matches(sel)),
          name: `${el.tagName.toLowerCase()}${el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : ""}${cls ? `.${cls}` : ""}`,
          style: cs.outlineStyle,
          width: cs.outlineWidth,
          offset: cs.outlineOffset,
        };
      }, skip);

    const bad: string[] = [];
    // Dialog and Menu stories open focused: read that stop before any Tab.
    let stop = await probe();
    for (let i = 0; i < MAX_STOPS; i++) {
      if (stop?.again) break;
      if (stop && !stop.skipped) {
        const ok = stop.style === "solid" && stop.width === ring.width && ring.offsets.includes(stop.offset);
        if (!ok) bad.push(`${stop.name}: ${stop.style} ${stop.width} at ${stop.offset}`);
      }
      await page.keyboard.press("Tab");
      const next = await probe();
      // Focus left the document: the walk is over, unless it never started.
      if (!next && (stop || i > 0)) break;
      stop = next;
    }

    expect(bad, `tab stops not drawing ${ring.width} solid at ${ring.offsets.join(" or ")}`).toEqual([]);
  });
}
```

- [ ] **Step 2: Run it red** — after Tasks 1–2 are built (`pnpm build`), before Task 5: `pnpm test:e2e --grep "shared ring"`. Expected: FAIL on the Menu stories (`auto 1px at 0px`), `components-dialog--drawer-long-content` (`div.panel: auto 1px`), and every story with an `Input` or `Select` (`-1px`). Every other story passes. If a story fails for a reason not in that list, stop and read it: it is either a real gap or a flaw in the walk.
- [ ] **Step 3: Commit** — `test(vr): tab through every story and read the focus ring (D82)`

### Task 5: Bind the ring in every component

**Files:**
- Modify: `packages/react/src/{Button/button,IconButton/icon-button,Checkbox/checkbox,Switch/switch,Tag/tag,Table/table,NavBar/navbar,Tabs/tabs,Input/input,Select/select,Menu/menu,Dialog/dialog}.module.css`

**Interfaces:**
- Consumes: Task 1's scale tokens; Task 2's `--psi-menu-focus-ring`, `--psi-dialog-focus-ring`.

- [ ] **Step 1: Outside rings.** In `button`, `icon-button`, `checkbox`, `switch`, `tag`, `table`, `navbar`: replace `outline: 2px solid var(--psi-X-focus-ring);` with `outline: var(--psi-focus-ring-width) solid var(--psi-X-focus-ring);` and `outline-offset: 2px;` with `outline-offset: var(--psi-focus-ring-offset);`. Keep each file's own `X`.

- [ ] **Step 2: Tabs.** Both rules take the width token; both take `outline-offset: var(--psi-focus-ring-offset-inset);`. Above `.panel:focus-visible` add:

```css
/* Inset (D82): outside, the ring ran under the tab list's rule and was cut by
   any clipping ancestor. */
```

- [ ] **Step 3: Input and Select.** In each file:

```css
.input:hover:not(:disabled):not(:focus-visible) {
  border-color: var(--psi-input-border-hover);
}

.input:focus-visible {
  outline: var(--psi-focus-ring-width) solid var(--psi-input-focus-ring);
  outline-offset: var(--psi-focus-ring-offset-inset);
  border-color: transparent;
}
```

and `.error:hover:not(:disabled):not(:focus-visible)`. The same in `select.module.css` with `.select` and `--psi-select-*`.

- [ ] **Step 4: Menu.** After `.item:active`:

```css
/* Inset (D82): items stack with no gap inside a 4px-padded popover, so an
   outside ring would land on the neighbouring item and on the menu's border.
   Until this rule the browser's own ring showed, in every open-Menu story. */
.item:focus-visible {
  outline: var(--psi-focus-ring-width) solid var(--psi-menu-focus-ring);
  outline-offset: var(--psi-focus-ring-offset-inset);
}
```

- [ ] **Step 5: Dialog.** After `.dialog::backdrop`:

```css
/* The <dialog> and a drawer's scrolling panel are tab stops themselves:
   Chromium makes a scroll container keyboard-focusable, and a long drawer's
   panel takes the dialog's initial focus. Both drew the browser's ring (D82).
   Inset, because a drawer sits against the viewport edge. */
.dialog:focus-visible,
.panel:focus-visible {
  outline: var(--psi-focus-ring-width) solid var(--psi-dialog-focus-ring);
  outline-offset: var(--psi-focus-ring-offset-inset);
}
```

- [ ] **Step 6: Both gates green.** `pnpm lint:css` — expected: PASS. `pnpm build && pnpm test:e2e --grep "shared ring"` — expected: all stories PASS. Then the whole interaction set: `pnpm test:e2e`.
- [ ] **Step 7: Look at it.** Screenshot, with the scratch probe, the open Menu, `drawer-long-content`, a focused `Input`, `Select` and `TabPanel`, in light and ember. Check the ring is whole, unclipped, and above the content of a scrolled drawer panel.
- [ ] **Step 8: Commit** — `feat(react): every component binds the shared focus ring; Menu items and Dialog gain one (D82)`

### Task 6: Promo, prose, changeset, gates

**Files:**
- Modify: `apps/promo/src/promo.css:49-50`, `packages/tokens/src/guidance.ts:24`, `packages/tokens/llms.txt`, `packages/react/llms.txt`, the spec's status and measured numbers
- Create: `.changeset/focus-ring.md`

- [ ] **Step 1: Promo** — `outline: var(--psi-focus-ring-width) solid var(--psi-border-focus); outline-offset: var(--psi-focus-ring-offset);`
- [ ] **Step 2: Guidance** — `focus: "var(--psi-focus-ring-width) solid var(--psi-{component}-focus-ring) on :focus-visible, at --psi-focus-ring-offset (outside) or --psi-focus-ring-offset-inset (inside) — D82"`. Run `pnpm vitest run packages/tokens/__tests__/guidance.test.ts`.
- [ ] **Step 3: `packages/tokens/llms.txt`** — a `## Focus ring (--psi-focus-ring-*)` section after Layout: the three tokens and values, the rule shape, when to use inset, and that the colour is the component's `-focus-ring` token.
- [ ] **Step 4: `packages/react/llms.txt`** — one rule line: custom focusable parts bind the focus-ring tokens; never write a literal outline.
- [ ] **Step 5: Changeset** — `minor` for `@handamade/psi-tokens` and `@handamade/psi-react`, describing the tokens, the two visible offset changes, Menu and Dialog.
- [ ] **Step 6: Token dist diff** — diff `packages/tokens/dist` against the pre-change copy saved before Task 1. Expected: only the three scale properties, the two colour tokens and their machine-readable copies.
- [ ] **Step 7: The five gates, then `pnpm test:e2e`.** `git status` for regenerated tracked docs under `packages/react/docs/`; add them.
- [ ] **Step 8: Spec** — status to Implemented; fill in the measured red counts.
- [ ] **Step 9: Commit** — `docs: D82 spec, plan, guidance and changeset`

### Task 7: PR and baselines

- [ ] **Step 1:** Re-check D82 is free (`git fetch origin`; `## Decisions` entries; `git log origin/main --format=%s | grep -E 'D8[2-9]'`).
- [ ] **Step 2:** Push, open the PR, arm auto-merge and read it back (`gh pr view <n> --json autoMergeRequest`).
- [ ] **Step 3:** CI's `vr` job fails on the changed baselines by design. Download the `vr-baselines` artifact, read every changed image, replace only those baselines, and commit them.
- [ ] **Step 4:** Stop for review.
