# A theme declares its color scheme (D116) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Psi theme's CSS declares `color-scheme: light|dark` from its base, so browser-drawn parts (date picker icon, select lists, scrollbars) match the theme; the resolved JSON records it.

**Architecture:** `emitThemeCSS` (`packages/tokens/src/emit/css.ts`) gains a required `scheme` argument and writes `color-scheme` as the first declaration of the theme's existing `@layer psi.theme` block. Both callers — Psi's build (`packages/tokens/scripts/build.ts`) and the consumer theme build (`buildThemeCss`, `packages/tokens/src/theme/index.ts`) — derive the scheme from the theme's base through one helper, `customerColorScheme`. `emitResolvedJSON` adds a top-level `colorScheme`. A new Input story and a Playwright `@interaction` spec prove it in a browser.

**Tech Stack:** TypeScript, Vitest, Playwright over built Storybook, pnpm workspace, changesets.

**Spec:** `docs/superpowers/specs/2026-11-16-color-scheme-design.md`

## Global Constraints

- Node 24 (`.nvmrc`). Run `node -v` before the first pnpm command; if it is not v24, run `nvm use`.
- Work only in this worktree: `/Users/dmytrokurkin/Projects/dku/ds/.claude/worktrees/theme-console-goals-3cd8f9`, branch `d116-color-scheme`. Never `cd` into another worktree.
- The value is a single keyword: `light` or `dark`. Never `light dark`, never `only …`.
- The declaration lives inside the theme's existing token block, same selector, in `@layer psi.theme`. Not in the `@layer psi.components` overrides block.
- Never edit anything under `dist/` by hand; it is generated.
- Never run `pnpm vr` (it only passes in CI and its update mode writes junk baselines on macOS).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Decision number is **D116**. Do not claim any other.

---

### Task 1: The emitter declares `color-scheme`, from one helper, on both build paths

**Files:**
- Modify: `packages/tokens/src/dsl/types.ts` (add `ColorScheme`)
- Modify: `packages/tokens/src/themes/customers/index.ts` (type `base`, add `customerColorScheme`, use it in `assembleCustomerTheme`)
- Modify: `packages/tokens/src/emit/css.ts` (`emitThemeCSS` signature + declaration)
- Modify: `packages/tokens/scripts/build.ts` (`ThemeConfig.scheme`, pass it)
- Modify: `packages/tokens/src/theme/index.ts` (pass the scheme)
- Create: `packages/tokens/__tests__/color-scheme.test.ts`
- Modify: `packages/tokens/__tests__/emit-css.test.ts`
- Modify: `packages/tokens/__tests__/theme-build.test.ts`

**Interfaces:**
- Produces:
  - `export type ColorScheme = "light" | "dark";` in `packages/tokens/src/dsl/types.ts`
  - `export function customerColorScheme(c: CustomerTheme): ColorScheme` in `packages/tokens/src/themes/customers/index.ts`
  - `emitThemeCSS(themeName: string, theme: ThemeDef, palette: Palette, slots: SlotMap, scheme: ColorScheme, opts?: { fonts?: BrandFonts; componentOverrides?: Record<string, string> }): string`
  - `ThemeConfig.scheme: ColorScheme` in `packages/tokens/scripts/build.ts` (Task 2 reads it)

- [ ] **Step 1: Write the failing helper test**

Create `packages/tokens/__tests__/color-scheme.test.ts`:

```ts
// D116 — a theme declares its color-scheme from its base, so the browser
// draws its own parts (date pickers, select lists, scrollbars) to match.
import { describe, expect, it } from "vitest";
import { customerColorScheme, customerThemes } from "../src/themes/customers/index.js";

describe("customerColorScheme (D116)", () => {
  it("is the theme's base", () => {
    expect(customerColorScheme({ ...customerThemes.acme, base: "dark" })).toBe("dark");
    expect(customerColorScheme({ ...customerThemes.acme, base: "light" })).toBe("light");
    expect(customerColorScheme(customerThemes.ember)).toBe("dark");
  });

  it("is light when the theme names no base", () => {
    expect(customerThemes.acme.base).toBeUndefined();
    expect(customerColorScheme(customerThemes.acme)).toBe("light");
  });
});
```

- [ ] **Step 2: Write the failing emitter tests**

In `packages/tokens/__tests__/emit-css.test.ts`:

1. Add an import below the `lightTheme` import:

```ts
import { darkTheme } from "../src/themes/dark.js";
```

2. Every existing `emitThemeCSS(...)` call gains the scheme as its fifth argument. Change them exactly so:
   - the four calls `emitThemeCSS("light", lightTheme, defaultPalette, defaultSlots)` → `emitThemeCSS("light", lightTheme, defaultPalette, defaultSlots, "light")`
   - `emitThemeCSS("acme", lightTheme, acmePalette, acmeSlots)` → `emitThemeCSS("acme", lightTheme, acmePalette, acmeSlots, "light")`
   - in the two ember tests (D29 fonts, D34 component overrides), insert `"dark",` as a new argument after the slot-map object literal and before the `{ fonts: … }` / `{ componentOverrides: … }` options object.

3. Append this block at the end of the `describe("emitThemeCSS", …)` block (inside it, after the D34 test):

```ts
  describe("color-scheme (D116)", () => {
    /** The body of the theme's token block: from its selector to its closing brace. */
    const block = (css: string, selector: string) => {
      const open = css.indexOf(`  ${selector} {`);
      expect(open).toBeGreaterThan(-1);
      return css.slice(open, css.indexOf("\n  }", open));
    };

    it("declares light inside the light theme's own block", () => {
      const css = emitThemeCSS("light", lightTheme, defaultPalette, defaultSlots, "light");
      expect(block(css, ':root, [data-psi-theme="light"]')).toContain("\n    color-scheme: light;\n");
    });

    it("declares dark inside a dark theme's own block, before its custom properties", () => {
      const css = emitThemeCSS("dark", darkTheme, defaultPalette, defaultSlots, "dark");
      const body = block(css, '[data-psi-theme="dark"]');
      expect(body).toContain("\n    color-scheme: dark;\n");
      expect(body.indexOf("color-scheme")).toBeLessThan(body.indexOf("--psi-"));
    });

    it("declares it once, in the theme layer, never in the component-overrides block", () => {
      const css = emitThemeCSS("ember", { bgPrimary: token({ from: slot.canvas }) },
        { emberCanvas: { l: 0.147, c: 0.004, h: 49 } },
        { ink: "emberCanvas", canvas: "emberCanvas", accent: "emberCanvas", success: "emberCanvas", warning: "emberCanvas", danger: "emberCanvas" },
        "dark",
        { componentOverrides: { "card-radius": "0" } });
      expect(css.match(/color-scheme:/g)).toHaveLength(1);
      expect(css.indexOf("color-scheme")).toBeGreaterThan(css.indexOf("@layer psi.theme"));
      expect(css.indexOf("color-scheme")).toBeLessThan(css.indexOf("@layer psi.components"));
    });
  });
```

- [ ] **Step 3: Write the failing consumer-path tests**

In `packages/tokens/__tests__/theme-build.test.ts`:

1. Change the import line

```ts
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
```

to

```ts
import { customerThemes, assembleCustomerTheme, customerColorScheme } from "../src/themes/customers/index.js";
```

2. In the first test, change

```ts
    const expected = emitThemeCSS("acme", assembleCustomerTheme(acme), acme.palette, acme.slots, {
```

to

```ts
    const expected = emitThemeCSS("acme", assembleCustomerTheme(acme), acme.palette, acme.slots, customerColorScheme(acme), {
```

3. In the test `"builds a dark-based theme for a sub-tree, such as a dark sidebar"`, replace its last line

```ts
    expect(buildThemeCss("forest-sidebar", sidebar).css).toContain('[data-psi-theme="forest-sidebar"] {');
```

with

```ts
    const { css } = buildThemeCss("forest-sidebar", sidebar);
    expect(css).toContain('[data-psi-theme="forest-sidebar"] {');
    // D116 — a dark base declares a dark scheme, so its pickers and scrollbars draw dark.
    expect(css).toContain("\n    color-scheme: dark;\n");
```

4. Add this test directly after that one, inside `describe("buildThemeCss (D81)", …)`:

```ts
  it("declares a light scheme for a theme that names no base (D116)", () => {
    expect(forest.base).toBeUndefined();
    const { css } = buildThemeCss("forest", forest);
    expect(css).toContain("\n    color-scheme: light;\n");
    expect(css).not.toContain("color-scheme: dark");
  });
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm exec vitest run packages/tokens/__tests__/color-scheme.test.ts packages/tokens/__tests__/emit-css.test.ts packages/tokens/__tests__/theme-build.test.ts`

Expected: FAIL. `color-scheme.test.ts` fails on `customerColorScheme is not a function` (or an import error); the new D116 tests in the other two files fail on missing `color-scheme:` text. (The `emitUtilities`/D94 tests in `emit-css.test.ts` read `dist/`; if `dist/` is absent they fail for that reason — run `pnpm --dir packages/tokens build` first if so.)

- [ ] **Step 5: Add the type**

In `packages/tokens/src/dsl/types.ts`, append at the end of the file:

```ts

/** D116 — the scheme a theme declares, so the browser draws its own parts
 * (form controls, scrollbars, a root canvas nobody paints) to match. */
export type ColorScheme = "light" | "dark";
```

- [ ] **Step 6: Add the helper and use it**

In `packages/tokens/src/themes/customers/index.ts`:

1. Change the first import line to

```ts
import type { ColorScheme, Palette, SlotMap, ThemeDef, TokenDef } from "../../dsl/types.js";
```

2. In `interface CustomerTheme`, change

```ts
  /** Which default theme the brand's formulas build on (D27). Default: "light". */
  base?: "light" | "dark";
```

to

```ts
  /** Which default theme the brand's formulas build on (D27), and so the
   * `color-scheme` its CSS declares (D116). Default: "light". */
  base?: ColorScheme;
```

3. Directly above `/** Assemble the full semantic ThemeDef for a customer brand (D27).`, insert:

```ts
/** D116 — a customer theme's color scheme is its base, light when it names
 * none. The one place that default lives, so Psi's build and buildThemeCss
 * cannot disagree. */
export function customerColorScheme(c: CustomerTheme): ColorScheme {
  return c.base ?? "light";
}

```

4. In `assembleCustomerTheme`, change

```ts
  const base = c.base === "dark" ? darkTheme : lightTheme;
```

to

```ts
  const base = customerColorScheme(c) === "dark" ? darkTheme : lightTheme;
```

- [ ] **Step 7: Emit the declaration**

In `packages/tokens/src/emit/css.ts`:

1. Change the type import at the top to:

```ts
import type {
  ChannelOp,
  ColorScheme,
  Palette,
  SlotMap,
  ThemeDef,
  TokenDef,
} from "../dsl/types.js";
```

2. Change the `emitThemeCSS` signature from

```ts
export function emitThemeCSS(
  themeName: string,
  theme: ThemeDef,
  palette: Palette,
  slots: SlotMap,
  opts?: { fonts?: BrandFonts; componentOverrides?: Record<string, string> },
): string {
```

to

```ts
export function emitThemeCSS(
  themeName: string,
  theme: ThemeDef,
  palette: Palette,
  slots: SlotMap,
  scheme: ColorScheme,
  opts?: { fonts?: BrandFonts; componentOverrides?: Record<string, string> },
): string {
```

3. Change

```ts
  lines.push("@layer psi.theme {");
  lines.push(`  ${selector} {`);
```

to

```ts
  lines.push("@layer psi.theme {");
  lines.push(`  ${selector} {`);

  // D116 — the one declaration a theme makes that is not a custom property.
  // It fills no element: it tells the browser which scheme to draw its own
  // parts in (date pickers, select lists, scrollbars, a root canvas nobody
  // paints). Inherited, so a sub-tree theme carries it; layered, so any
  // unlayered consumer rule overrides it.
  lines.push(`    color-scheme: ${scheme};`);
```

- [ ] **Step 8: Pass the scheme from Psi's build**

In `packages/tokens/scripts/build.ts`:

1. Change

```ts
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
```

to

```ts
import { customerThemes, assembleCustomerTheme, customerColorScheme } from "../src/themes/customers/index.js";
```

2. Change

```ts
import type { Palette, SlotMap } from "../src/dsl/types.js";
```

to

```ts
import type { ColorScheme, Palette, SlotMap } from "../src/dsl/types.js";
```

3. In `interface ThemeConfig`, add after `slots: SlotMap;`:

```ts
  /** D116 — the color-scheme the theme's CSS declares. */
  scheme: ColorScheme;
```

4. Change the `themes` map entries to:

```ts
  light: { theme: lightTheme, palette: defaultPalette, slots: defaultSlots, scheme: "light" },
  dark: { theme: darkTheme, palette: defaultPalette, slots: defaultSlots, scheme: "dark" },
  ...Object.fromEntries(Object.entries(customerThemes).map(([name, c]) => [
    name, { theme: assembleCustomerTheme(c), palette: c.palette, slots: c.slots, scheme: customerColorScheme(c), fonts: c.fonts, componentOverrides: c.componentOverrides },
  ])),
```

5. Change

```ts
    const themeCSS = emitThemeCSS(themeName, themeDef, palette, slots, {
```

to

```ts
    const themeCSS = emitThemeCSS(themeName, themeDef, palette, slots, config.scheme, {
```

- [ ] **Step 9: Pass the scheme from the consumer build**

In `packages/tokens/src/theme/index.ts`:

1. Change

```ts
import { assembleCustomerTheme, type CustomerTheme } from "../themes/customers/index.js";
```

to

```ts
import { assembleCustomerTheme, customerColorScheme, type CustomerTheme } from "../themes/customers/index.js";
```

2. Change

```ts
  const css = emitThemeCSS(name, def, theme.palette, theme.slots, {
```

to

```ts
  const css = emitThemeCSS(name, def, theme.palette, theme.slots, customerColorScheme(theme), {
```

3. Add `ColorScheme` to the type re-export, so a consumer can name it:

```ts
export type { ColorScheme, Palette, PaletteEntry, SlotMap, ThemeDef, TokenDef } from "../dsl/types.js";
```

- [ ] **Step 10: Run the tests and the type check**

Run: `pnpm exec vitest run packages/tokens/__tests__/color-scheme.test.ts packages/tokens/__tests__/emit-css.test.ts packages/tokens/__tests__/theme-build.test.ts`
Expected: PASS, all tests.

Run: `pnpm --dir packages/tokens build`
Expected: completes, prints `validated … theme` for light, dark, acme, ember, no errors. (`build` runs `tsc -p tsconfig.build.json` over `src/`, so `theme/index.ts` missing the new argument fails here; `scripts/build.ts` runs under `tsx`, which does not type-check, so the grep below is what proves the build passes the scheme.)

Run: `grep -n "color-scheme" packages/tokens/dist/light.css packages/tokens/dist/dark.css packages/tokens/dist/acme.css packages/tokens/dist/ember.css`
Expected: exactly one line each — `light`, `dark`, `light`, `dark`.

- [ ] **Step 11: Commit**

```bash
git add packages/tokens/src packages/tokens/scripts/build.ts packages/tokens/__tests__/color-scheme.test.ts packages/tokens/__tests__/emit-css.test.ts packages/tokens/__tests__/theme-build.test.ts
git commit -m "feat(tokens): every theme declares color-scheme from its base (D116)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The resolved JSON records the scheme, and the shipped build is checked

**Files:**
- Modify: `packages/tokens/scripts/emit-json.ts` (signature + field)
- Modify: `packages/tokens/scripts/build.ts:122` (pass `config.scheme`)
- Modify: `packages/tokens/__tests__/emit-json.test.ts`
- Modify: `packages/tokens/__tests__/color-scheme.test.ts`

**Interfaces:**
- Consumes: `ColorScheme` (Task 1, `packages/tokens/src/dsl/types.ts`), `ThemeConfig.scheme` (Task 1, `build.ts`).
- Produces: `emitResolvedJSON(themeName: string, resolved: ResolvedTheme, colorScheme: ColorScheme): string`; every `dist/resolved/<theme>.json` has a top-level `"colorScheme": "light" | "dark"` directly after `"theme"`.

- [ ] **Step 1: Write the failing unit test**

In `packages/tokens/__tests__/emit-json.test.ts`, change

```ts
  const json = JSON.parse(emitResolvedJSON("light", resolve(lightTheme, defaultPalette, defaultSlots)));
```

to

```ts
  const json = JSON.parse(emitResolvedJSON("light", resolve(lightTheme, defaultPalette, defaultSlots), "light"));
  it("carries the theme's color scheme beside its name (D116)", () => {
    expect(json.colorScheme).toBe("light");
    expect(Object.keys(json).slice(0, 2)).toEqual(["theme", "colorScheme"]);
  });
```

- [ ] **Step 2: Write the failing shipped-build test**

In `packages/tokens/__tests__/color-scheme.test.ts`:

1. Add below the vitest import:

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
```

2. Append at the end of the file:

```ts
describe("the shipped themes (D116)", () => {
  const dist = join(import.meta.dirname, "..", "dist");
  const expected = { light: "light", dark: "dark", acme: "light", ember: "dark" } as const;
  const resolved = (theme: string) =>
    JSON.parse(readFileSync(join(dist, "resolved", `${theme}.json`), "utf8")) as { colorScheme?: string };

  for (const [theme, scheme] of Object.entries(expected)) {
    it(`dist/${theme}.css declares ${scheme} once, and resolved/${theme}.json says so`, () => {
      const css = readFileSync(join(dist, `${theme}.css`), "utf8");
      expect(css.match(/color-scheme: [a-z ]+;/g)).toEqual([`color-scheme: ${scheme};`]);
      expect(resolved(theme).colorScheme).toBe(scheme);
    });
  }

  it("every resolved theme carries a scheme, so a new theme cannot ship without one", () => {
    for (const file of readdirSync(join(dist, "resolved")).filter((f) => f.endsWith(".json"))) {
      expect(["light", "dark"], file).toContain(resolved(file.replace(/\.json$/, "")).colorScheme);
    }
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm --dir packages/tokens build && pnpm exec vitest run packages/tokens/__tests__/emit-json.test.ts packages/tokens/__tests__/color-scheme.test.ts`
Expected: FAIL — `json.colorScheme` is `undefined` in both files; the CSS assertions of the shipped-build tests PASS (Task 1 already emits them).

- [ ] **Step 4: Emit the field**

In `packages/tokens/scripts/emit-json.ts`:

1. Add below the `ResolvedTheme` import:

```ts
import type { ColorScheme } from "../src/dsl/types.js";
```

2. Change the signature and the object's first entry from

```ts
export function emitResolvedJSON(
  themeName: string,
  resolved: ResolvedTheme,
): string {
  return JSON.stringify(
    {
      theme: themeName,
      tokens: resolved,
```

to

```ts
export function emitResolvedJSON(
  themeName: string,
  resolved: ResolvedTheme,
  colorScheme: ColorScheme,
): string {
  return JSON.stringify(
    {
      theme: themeName,
      // D116 — the scheme the theme's CSS declares, so a reader of this file
      // can tell a dark theme from a light one without parsing CSS.
      colorScheme,
      tokens: resolved,
```

3. In `packages/tokens/scripts/build.ts`, change

```ts
    const json = emitResolvedJSON(themeName, resolved);
```

to

```ts
    const json = emitResolvedJSON(themeName, resolved, config.scheme);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --dir packages/tokens build && pnpm exec vitest run packages/tokens`
Expected: PASS, every tokens test.

- [ ] **Step 6: Commit**

```bash
git add packages/tokens/scripts/emit-json.ts packages/tokens/scripts/build.ts packages/tokens/__tests__/emit-json.test.ts packages/tokens/__tests__/color-scheme.test.ts
git commit -m "feat(tokens): resolved JSON names each theme's color scheme (D116)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: A date-field story, and a browser test of the computed scheme

**Files:**
- Modify: `packages/react/src/Input/Input.stories.tsx` (new `DateField` story)
- Create: `apps/storybook/vr/color-scheme.interaction.spec.ts`
- Modify: `apps/storybook/.storybook/preview.ts:39-41` (comment)

**Interfaces:**
- Consumes: the built theme CSS from Tasks 1–2 (Storybook loads every theme stylesheet; `preview.ts` sets `data-psi-theme` on `<html>`).
- Produces: story id `components-input--date-field`. Existing ids used: `components-appshell--default` (sidebar element `#sidebar` carries `data-psi-theme="dark"`; the page is light).

- [ ] **Step 1: Add the story**

In `packages/react/src/Input/Input.stories.tsx`, append at the end of the file:

```tsx

/** D116 — the browser draws a date field's picker icon itself, in the scheme
 * the theme declares. VR renders this in light and ember (a dark theme), so a
 * dark icon on a dark field would show. */
export const DateField: Story = {
  args: { type: "date", defaultValue: "2026-11-16", "aria-label": "Date" },
};
```

- [ ] **Step 2: Write the browser test**

Create `apps/storybook/vr/color-scheme.interaction.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

/** D116 — a theme declares its color-scheme, so the browser draws its own
 * parts (a date field's picker icon, select lists, scrollbars) for that
 * scheme. jsdom computes no color-scheme, so this runs in a browser. Computed
 * values only: the Input `DateField` story's screenshots show the icon. */

for (const [theme, expected] of [["light", "light"], ["ember", "dark"]] as const) {
  test(`the page and a date field take ${expected} under ${theme} @interaction`, async ({ page }) => {
    await page.goto(`/iframe.html?id=components-input--date-field&globals=theme:${theme}`, { waitUntil: "networkidle" });
    const root = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
    const field = await page.locator('input[type="date"]').evaluate((el) => getComputedStyle(el).colorScheme);
    expect(root).toBe(expected);
    expect(field).toBe(expected);
  });
}

test("a dark sidebar in a light page takes dark, while main stays light @interaction", async ({ page }) => {
  await page.goto("/iframe.html?id=components-appshell--default&globals=theme:light", { waitUntil: "networkidle" });
  const scheme = (selector: string) =>
    page.locator(selector).first().evaluate((el) => getComputedStyle(el).colorScheme);
  expect(await scheme("#sidebar")).toBe("dark");
  expect(await scheme("main")).toBe("light");
});
```

- [ ] **Step 3: Update the preview comment**

In `apps/storybook/.storybook/preview.ts`, change

```ts
      // The preview iframe is the app root: per the house rule, the theme
      // lives on <html> and the canvas paints bg/fg itself (preview.css) —
      // theme CSS never paints backgrounds (HAN-38).
```

to

```ts
      // The preview iframe is the app root: per the house rule, the theme
      // lives on <html> and the canvas paints bg/fg itself (preview.css) —
      // theme CSS never paints backgrounds (HAN-38). It does declare
      // color-scheme, so the browser's own parts follow the theme (D116).
```

- [ ] **Step 4: Build and run the browser test**

Run: `pnpm build`
Expected: completes (it builds tokens, react and `apps/storybook/storybook-static/`).

Run: `pnpm exec playwright test -c apps/storybook/vr color-scheme.interaction`
Expected: 3 passed. (This runs no screenshots, so it is valid on macOS.)

Sanity-check that it would have caught the defect: temporarily change `lines.push(\`    color-scheme: ${scheme};\`);` in `packages/tokens/src/emit/css.ts` to a comment, run `pnpm build && pnpm exec playwright test -c apps/storybook/vr color-scheme.interaction`, confirm the `ember` and sidebar tests FAIL (computed `normal`), then restore the line and rebuild. Do not commit the temporary change.

- [ ] **Step 5: Commit**

```bash
git add packages/react/src/Input/Input.stories.tsx apps/storybook/vr/color-scheme.interaction.spec.ts apps/storybook/.storybook/preview.ts
git commit -m "test: a date-field story and a browser check of each theme's color scheme (D116)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Docs, the rule's clause, and the changeset

**Files:**
- Modify: `packages/react/llms.txt` (lines starting `- \`sidebarTheme="dark"\`` and `- Theming, programmatic:`)
- Modify: `packages/react/README.md` (`## App root`)
- Modify: `packages/react/src/AppShell/AppShell.tsx` (`sidebarTheme` doc comment) → regenerates `packages/react/docs/AppShell.md`
- Modify: `packages/tokens/llms.txt` (lines 6, 16, 54, 74)
- Modify: `packages/tokens/README.md` (`## Usage`, `## Building a theme outside this repo`, `## Machine-readable artifacts`)
- Create: `.changeset/color-scheme.md`

**Interfaces:**
- Consumes: behaviour from Tasks 1–3. No code.

- [ ] **Step 1: `packages/react/llms.txt`**

1. In the line beginning `- \`sidebarTheme="dark"\` sets \`data-psi-theme\` on the sidebar alone;`, change

```
and the sidebar paints `--psi-bg-primary` itself (a theme paints no background). Tokens `--psi-app-shell-*`.
```

to

```
and the sidebar paints `--psi-bg-primary` itself (a theme paints no background). Its `color-scheme` goes dark with it, so its scrollbars and pickers draw dark (D116). Tokens `--psi-app-shell-*`.
```

2. In the line beginning `- Theming, programmatic:`, change

```
yourself, and `font: var(--psi-text-14-20-regular)` on `body`, in `@layer psi.base` (D107).
```

to

```
yourself, and `font: var(--psi-text-14-20-regular)` on `body`, in `@layer psi.base` (D107). It does declare `color-scheme` — `light` or `dark`, from the theme's base — so the browser draws date pickers, select lists and scrollbars for the theme; it fills no element, and any `color-scheme` rule of your own overrides it (D116).
```

- [ ] **Step 2: `packages/react/README.md`**

Change

```
Theme CSS never paints the page or sets its font, so your app root does (D107):
```

to

```
Theme CSS never paints the page or sets its font, so your app root does (D107). It does declare `color-scheme` (`light` or `dark`, from the theme's base), so date pickers, select lists and scrollbars match the theme; a `color-scheme` rule of your own overrides it (D116):
```

- [ ] **Step 3: `AppShell`'s doc comment**

In `packages/react/src/AppShell/AppShell.tsx`, change

```ts
   * under that theme while the rest of the page keeps its own (D88). The
   * sidebar paints `--psi-bg-primary` itself; a theme paints no background. */
```

to

```ts
   * under that theme while the rest of the page keeps its own (D88). The
   * sidebar paints `--psi-bg-primary` itself; a theme paints no background.
   * Its `color-scheme` follows the theme, so its scrollbars do too (D116). */
```

- [ ] **Step 4: `packages/tokens/llms.txt`**

1. Change

```
- dist/resolved/{light,dark,acme,ember}.json: every token with OKLCH, hex, and derivation formula
```

to

```
- dist/resolved/{light,dark,acme,ember}.json: every token with OKLCH, hex, and derivation formula, plus the theme's `colorScheme` ("light" | "dark", D116)
```

2. Change

```
- Themes: import base.css + {theme}.css + components.css + utilities.css; set data-psi-theme="{name}" ({light,dark,acme,ember}).
```

to

```
- Themes: import base.css + {theme}.css + components.css + utilities.css; set data-psi-theme="{name}" ({light,dark,acme,ember}).
- Each theme's block also declares `color-scheme` from its base (light, acme: `light`; dark, ember: `dark`), so browser-drawn parts — date pickers, select lists, scrollbars — follow the theme, including in a sub-tree. It is the one theme declaration that is not a custom property; it fills no element (a theme still paints no background), and an unlayered consumer rule overrides it (D116).
```

3. In the line beginning `- A brand theme can declare \`base: "dark"\``, change its ending

```
rather than treating dark as an inverted afterthought.
```

to

```
rather than treating dark as an inverted afterthought. `base` also sets the theme's `color-scheme` (D116).
```

4. Change

```
- The CSS is scoped to `[data-psi-theme="<name>"]`, never `:root`, so a `base: "dark"` theme can style a sub-tree such as a dark sidebar.
```

to

```
- The CSS is scoped to `[data-psi-theme="<name>"]`, never `:root`, so a `base: "dark"` theme can style a sub-tree such as a dark sidebar. It declares `color-scheme` from `base`, `light` when none is named (D116).
```

- [ ] **Step 5: `packages/tokens/README.md`**

1. Change

```
All tokens are CSS custom properties: `--psi-bg-primary`, `--psi-fg-secondary`, `--psi-space-12`, etc.
```

to

```
All tokens are CSS custom properties: `--psi-bg-primary`, `--psi-fg-secondary`, `--psi-space-12`, etc. Each theme also declares `color-scheme` (`light` or `dark`, from its base), so date pickers, select lists and scrollbars match it; a `color-scheme` rule of your own overrides it (D116).
```

2. Change

```
The CSS is scoped to `[data-psi-theme="<name>"]`; load it after `base.css` and set the attribute on any element.
```

to

```
The CSS is scoped to `[data-psi-theme="<name>"]`; load it after `base.css` and set the attribute on any element. It declares `color-scheme` from `base`, `light` when none is named (D116).
```

3. Change

```
- `dist/resolved/{light,dark,acme}.json` — Every token with OKLCH, hex, and formula
```

to

```
- `dist/resolved/{light,dark,acme,ember}.json` — Every token with OKLCH, hex, and formula, and the theme's `colorScheme` (D116)
```

- [ ] **Step 6: The changeset**

Create `.changeset/color-scheme.md`:

```md
---
"@handamade/psi-tokens": minor
"@handamade/psi-react": patch
---

Every theme declares its `color-scheme` (D116).

- **Dark themes now draw the browser's own parts dark.** A theme's CSS declares `color-scheme: light` or `color-scheme: dark` from its base, so a date field's picker icon, a native select's list, spin buttons and scrollbars match the theme. Before, they were drawn for a light page on every theme, which put a near-black calendar icon on a dark date field. **What can change for you:** on a dark theme those parts render dark; on a light theme nothing changes. A `color-scheme` rule of your own still wins, since the theme's sits in `@layer psi.theme`.
- **Sub-trees follow.** A `data-psi-theme="dark"` element inside a light page, such as `AppShell`'s `sidebarTheme="dark"`, takes the dark scheme with its tokens.
- **Your own themes too.** `buildThemeCss` and `psi-theme` declare the scheme from the definition's `base`, `light` when none is named; rebuild to pick it up.
- **`resolved/<theme>.json` gains `colorScheme`**, `"light"` or `"dark"`.
- The rule stands: a theme still paints no background.
```

- [ ] **Step 7: Regenerate and check the docs**

Run: `pnpm build && node tools/check-docs-drift.mjs`
Expected: both succeed. `git status` shows `packages/react/docs/AppShell.md` modified with the new sentence in the `sidebarTheme` row.

- [ ] **Step 8: Commit**

```bash
git add packages/react/llms.txt packages/react/README.md packages/react/src/AppShell/AppShell.tsx packages/react/docs/AppShell.md packages/tokens/llms.txt packages/tokens/README.md .changeset/color-scheme.md
git commit -m "docs: a theme declares its color scheme, with a changeset (D116)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Gates, decision range, PR (controller, not a subagent)

- [ ] **Step 1: Re-check D116 and set the range.** `git fetch origin`, then `git grep -n "D116" origin/main -- docs/superpowers/specs` must return nothing (no other spec claims it). In `CLAUDE.md`, change `decision log **D1–D114**` to the highest `## Decisions` number `main` will hold once this PR merges — `D1–D116` — and commit.
- [ ] **Step 2: Rebase on `origin/main`** if it moved, and rebuild.
- [ ] **Step 3: All five gates**, from the worktree root:

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site
```

If `pnpm lint` trips over `.claude/` or `.cursor/`, use `pnpm exec tsc -p api/tsconfig.build.json && pnpm exec eslint . --ignore-pattern ".claude/**" --ignore-pattern ".cursor/**" && pnpm lint:css`. Also run `pnpm test:e2e` (all `@interaction` specs).
- [ ] **Step 4: Whole-branch review** (controller's own model) against the spec.
- [ ] **Step 5: Push, open the PR, arm auto-merge** with `gh pr merge <n> --auto --squash`, read back `gh pr view <n> --json autoMergeRequest`; if null, use the `enablePullRequestAutoMerge` GraphQL mutation.
- [ ] **Step 6: VR.** `vr` will fail on the two new `components-input--date-field` baselines and on any moved ember renders. Download the run's `vr-baselines` artifact into `.superpowers/`; moved renders are `test-results/**/*-actual.png`. Show them to the user with SendUserFile and wait for their go-ahead before copying any into `apps/storybook/vr/stories.spec.ts-snapshots/` and committing.
