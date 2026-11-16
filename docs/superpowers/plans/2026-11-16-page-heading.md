# PageHeading (D118) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `PageHeading`, the page's one `h1` at 24/32 medium in the brand's display face with margin 0, on a new text style `--psi-text-display-24-32-medium`.

**Architecture:** One new typography combo with a `display` role feeds every existing generator (CSS var, utility, DTCG). Two component tokens (`--psi-page-heading-font`, `--psi-page-heading-fg`) bind it. A tiny React component renders the `h1`. The `app-shell` pattern and AppShell stories adopt it, and D113's browser test tightens to an exact 24px.

**Tech Stack:** TypeScript token generators (`packages/tokens`), React 19 + CSS Modules (`packages/react`), Vitest + Testing Library, Playwright interaction specs against a built Storybook.

**Spec:** `docs/superpowers/specs/2026-11-16-page-heading-design.md`.

## Global Constraints

- Node 24. Run `node -v` first, and `nvm use` if it is not 24. All commands run from the worktree root `/Users/dmytrokurkin/Projects/dku/ds/.claude/worktrees/d118-page-heading-62b3b9`. Never `cd` into another worktree.
- Never hardcode colours or fonts in component CSS: bind `var(--psi-*)` (stylelint enforces this).
- New token values go in `packages/tokens/src`, never in `dist` (dist is generated).
- Sizes are px numbers, never S/M/L.
- Decision number is **D118**. Cite it in code comments the way neighbours cite theirs (`(D118)`).
- `PageHeading` has exactly these props: `children`, `ref`, `className` and the `h1`'s host attributes. No `as`, `size`, `weight`, `face` or `tone`.
- `Text` is not changed in code.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Never run `pnpm vr` (its update mode writes junk baselines on macOS). `pnpm test:e2e` is fine.

---

### Task 1: The display text style and the page-heading tokens

**Files:**
- Modify: `packages/tokens/src/scales/typography.ts` (lines 5 and 21–46)
- Create: `packages/tokens/src/components/page-heading.ts`
- Modify: `packages/tokens/src/components/registry.ts`
- Modify: `packages/tokens/src/guidance.ts:25`
- Modify: `packages/tokens/llms.txt:36-38`
- Test: `packages/tokens/__tests__/scales.test.ts` (inside `describe("typography combos")`)
- Test: create `packages/tokens/__tests__/page-heading-tokens.test.ts`

**Interfaces:**
- Produces: CSS var `--psi-text-display-24-32-medium` (`500 1.5rem/2rem var(--psi-font-display)`), utility `.psi-text-display-24-32-medium`, component tokens `--psi-page-heading-font` and `--psi-page-heading-fg` (emitted into `components.css` through the registry key `page-heading`), and `guidance.typographyDefaults.pageHeading === "display-24-32-medium"`.

- [ ] **Step 1: Write the failing tests**

In `packages/tokens/__tests__/scales.test.ts`, add inside `describe("typography combos", …)`, after the `"emits serif/mono combos against their role font var"` test:

```ts
    it("emits the display text style against the display face (D118)", () => {
      expect(comboName({ fontSize: 24, lineHeight: 32, weight: "medium", role: "display" })).toBe("display-24-32-medium");
      expect(emitScaleVarsCSS()).toContain("--psi-text-display-24-32-medium: 500 1.5rem/2rem var(--psi-font-display);");
      expect(emitUtilitiesCSS()).toContain(".psi-text-display-24-32-medium { font: var(--psi-text-display-24-32-medium); }");
    });
```

Create `packages/tokens/__tests__/page-heading-tokens.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { componentVars } from "../src/components/registry.js";
import { checkOverrideScopes } from "../src/scope-gate.js";
import { lightTheme } from "../src/themes/light.js";
import { emitDTCG } from "../scripts/emit-dtcg.js";
import { resolve } from "../src/dsl/resolver.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { guidance } from "../src/guidance.js";

describe("page-heading tokens (D118)", () => {
  it("bind the display text style and the gated primary foreground", () => {
    expect(componentVars["page-heading"]).toEqual({
      font: "var(--psi-text-display-24-32-medium)",
      fg: "var(--psi-fg-primary)",
    });
  });

  it("a theme may swap the font for another text style and the colour for another foreground", () => {
    const overrides = {
      "page-heading-font": "var(--psi-text-30-36-bold)",
      "page-heading-fg": "var(--psi-fg-secondary)",
    };
    expect(checkOverrideScopes(overrides, componentVars, lightTheme)).toEqual([]);
  });

  it("the scope gate refuses a surface token on page-heading-fg", () => {
    const violations = checkOverrideScopes({ "page-heading-fg": "var(--psi-bg-primary)" }, componentVars, lightTheme);
    expect(violations).toHaveLength(1);
    expect(violations[0].token).toBe("bgPrimary");
  });

  it("the DTCG output sets the display text style in the display family", () => {
    const parsed = JSON.parse(emitDTCG("light", resolve(lightTheme, defaultPalette, defaultSlots)));
    expect(parsed.typography["display-24-32-medium"].$value).toEqual({
      fontFamily: "{fontFamily.display}",
      fontSize: "24px",
      lineHeight: "32px",
      fontWeight: 500,
    });
  });

  it("guidance names the page heading's style, and leaves the section heading's alone", () => {
    expect(guidance.typographyDefaults.pageHeading).toBe("display-24-32-medium");
    expect(guidance.typographyDefaults.heading).toBe("24-32-medium");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run packages/tokens/__tests__/scales.test.ts packages/tokens/__tests__/page-heading-tokens.test.ts`
Expected: FAIL. The new scales test fails on the missing `--psi-text-display-24-32-medium` line. The page-heading tests fail on `componentVars["page-heading"]` being undefined, the missing DTCG key, and `pageHeading` being undefined. (If the scope-gate refusal test fails because `bgPrimary` is reported under another name, read `src/scope-gate.ts` and match the name it reports. The point is exactly one violation for a surface token on an `fg` key.)

- [ ] **Step 3: Add the display role and combo**

In `packages/tokens/src/scales/typography.ts`, change line 5:

```ts
export type ComboRole = "sans" | "serif" | "mono" | "display";
```

and add one entry at the end of `typographyCombos`, after the mono tier:

```ts
  // Display text style (D118): the page heading's, in the brand's display face.
  // Fixed px and a px line height like every --psi-text-* style; the fluid
  // --psi-display-* tier above is a separate thing with its own utilities.
  { fontSize: 24, lineHeight: 32, weight: "medium", role: "display" },
```

`comboName` and `comboFontVar` already handle any role, so they need no change.

- [ ] **Step 4: Add the component tokens**

Create `packages/tokens/src/components/page-heading.ts`:

```ts
/** PageHeading component tokens (--psi-page-heading-*) — D118. The font is the
 * display text style; a brand swaps it in componentOverrides, as ember swaps
 * button-font. fg aliases fgPrimary, gated at 4.5 on every surface in
 * wcagAAPairs, so there is no new contrast pair. */
export const pageHeadingVars: Record<string, string> = {
  font: "var(--psi-text-display-24-32-medium)",
  fg: "var(--psi-fg-primary)",
};
```

In `packages/tokens/src/components/registry.ts`, add the import after `import { panelVars } from "./panel.js";`:

```ts
import { pageHeadingVars } from "./page-heading.js";
```

and the entry in `componentVars` after `navbar: navbarVars,`:

```ts
  "page-heading": pageHeadingVars,
```

- [ ] **Step 5: Add the guidance key**

In `packages/tokens/src/guidance.ts` line 25, replace:

```ts
  typographyDefaults: { body: "16-24-regular", compactUI: "14-20-regular", heading: "24-32-medium", caption: "12-16-regular" },
```

with:

```ts
  typographyDefaults: { body: "16-24-regular", compactUI: "14-20-regular", heading: "24-32-medium", pageHeading: "display-24-32-medium", caption: "12-16-regular" },
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run packages/tokens`
Expected: PASS, the whole tokens suite. If a snapshot or count test elsewhere in `packages/tokens/__tests__` pins the combo list or the registry keys, update that pin to include the new entry and say so in the commit message.

- [ ] **Step 7: Document the style for agents**

In `packages/tokens/llms.txt`, change the heading `## Typography: display, serif, mono` to `## Typography: display, serif, mono, page heading`. After the line that begins `- Serif and mono are first-class combo roles`, add:

```
- The display face also has a fixed text style: --psi-text-display-24-32-medium (D118), 24/32 medium in --psi-font-display. It is PageHeading's style. Unlike the fluid --psi-display-* tier, it has fixed px, no tracking and no uppercase. Its utility is .psi-text-display-24-32-medium; on a hand-written h1, also set margin 0.
```

- [ ] **Step 8: Build the tokens and commit**

Run: `pnpm --filter @handamade/psi-tokens build`
Expected: succeeds (the build is also the WCAG contrast gate, and nothing here adds a colour pair).

```bash
git add packages/tokens/src/scales/typography.ts packages/tokens/src/components/page-heading.ts packages/tokens/src/components/registry.ts packages/tokens/src/guidance.ts packages/tokens/llms.txt packages/tokens/__tests__/scales.test.ts packages/tokens/__tests__/page-heading-tokens.test.ts
git commit -m "feat(tokens): a display text style and page-heading tokens (D118)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The `PageHeading` component

**Files:**
- Create: `packages/react/src/PageHeading/PageHeading.tsx`
- Create: `packages/react/src/PageHeading/page-heading.module.css`
- Create: `packages/react/src/PageHeading/slots.json`
- Create: `packages/react/src/PageHeading/PageHeading.stories.tsx`
- Test: create `packages/react/src/PageHeading/PageHeading.test.tsx`
- Modify: `packages/react/src/index.ts:43-44`
- Modify: `packages/react/scripts/emit-manifest.ts` (`COMPONENTS` list)
- Modify: `packages/react/src/a11y-meta.ts` (after the `Text` entry, ~line 107)
- Modify: `packages/react/src/a11y.axe.test.tsx:6` and the case list (~line 26)
- Modify: `packages/react/scripts/slots.test.ts:55` and `:72`

**Interfaces:**
- Consumes: `--psi-page-heading-font`, `--psi-page-heading-fg` (Task 1).
- Produces: `export function PageHeading(props: PageHeadingProps)` and `export interface PageHeadingProps extends HTMLAttributes<HTMLHeadingElement> { children?: ReactNode; ref?: Ref<HTMLHeadingElement> }`, exported from `packages/react/src/index.ts`. Manifest name `PageHeading`, one slot `body`.

- [ ] **Step 1: Write the failing unit test**

Create `packages/react/src/PageHeading/PageHeading.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PageHeading } from "./PageHeading.js";

const css = () => readFileSync(join(import.meta.dirname, "page-heading.module.css"), "utf8");
const rule = (sel: string) => new RegExp(`\\.${sel}\\s*\\{([^}]*)\\}`).exec(css())?.[1] ?? "";

describe("PageHeading (D118)", () => {
  it("renders the page's h1 with its text", () => {
    render(<PageHeading>Sales</PageHeading>);
    expect(screen.getByRole("heading", { level: 1, name: "Sales" })).toBeInTheDocument();
  });

  it("binds its two tokens and has no margin", () => {
    const { container } = render(<PageHeading>Sales</PageHeading>);
    expect((container.firstElementChild as HTMLElement).className).toMatch(/pageHeading/);
    const r = rule("pageHeading");
    expect(r).toMatch(/margin:\s*0;/);
    expect(r).toMatch(/font:\s*var\(--psi-page-heading-font\);/);
    expect(r).toMatch(/color:\s*var\(--psi-page-heading-fg\);/);
  });

  it("passes host props, className and ref through", () => {
    const ref = createRef<HTMLHeadingElement>();
    const { container } = render(
      <PageHeading ref={ref} id="title" className="mine">
        Sales
      </PageHeading>,
    );
    const el = container.firstElementChild as HTMLElement;
    expect(ref.current).toBe(el);
    expect(el).toHaveAttribute("id", "title");
    expect(el.className).toMatch(/mine/);
  });
});
```

In `packages/react/scripts/slots.test.ts`, add `"PageHeading"` to the end of the `names` array on line 55 (after `"Text"`), and after line 72 (`expect(out.Text.map(…`) add:

```ts
    expect(out.PageHeading.map((x) => x.name)).toEqual(["body"]);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run packages/react/src/PageHeading packages/react/scripts/slots.test.ts`
Expected: FAIL. `PageHeading.test.tsx` cannot resolve `./PageHeading.js`; `slots.test.ts` fails on reading `PageHeading/slots.json`.

- [ ] **Step 3: Write the component, its stylesheet and its slot contract**

Create `packages/react/src/PageHeading/PageHeading.tsx`:

```tsx
import type { HTMLAttributes, ReactNode, Ref } from "react";
import styles from "./page-heading.module.css";

export interface PageHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** The page's title. */
  children?: ReactNode;
  /** Forwarded ref to the `h1`. */
  ref?: Ref<HTMLHeadingElement>;
}

/** The page's one heading (D118): an `h1` at 24/32 medium in the brand's
 * display face, margin 0. Use one per screen, as the first thing in the page;
 * inside an AppShell, the page's first child, after any `banner`. Margin 0
 * keeps the page one block padding below the header and below a banner
 * alike (D113). Sub-headings are `Text as="h2"` or `"h3"`. */
export function PageHeading({ className, children, ref, ...rest }: PageHeadingProps) {
  const cls = [styles.pageHeading, className].filter(Boolean).join(" ");
  return (
    <h1 ref={ref} className={cls} {...rest}>
      {children}
    </h1>
  );
}
```

Create `packages/react/src/PageHeading/page-heading.module.css`:

```css
/* D118: the page's one heading, in the brand's display face. Margin 0, so
   AppShell's main padding (D113) is the only space above it, under the header
   or under a banner. */

.pageHeading {
  margin: 0;
  font: var(--psi-page-heading-font);
  color: var(--psi-page-heading-fg);
}
```

Create `packages/react/src/PageHeading/slots.json`:

```json
{
  "slots": [
    { "name": "body", "accepts": {}, "cardinality": "0..*", "order": 1 }
  ]
}
```

- [ ] **Step 4: Export it and list it in the manifest**

In `packages/react/src/index.ts`, after line 44 (`export type { TextProps } …`), add:

```ts
export { PageHeading } from "./PageHeading/PageHeading.js";
export type { PageHeadingProps } from "./PageHeading/PageHeading.js";
```

In `packages/react/scripts/emit-manifest.ts`, in `COMPONENTS`, add `"PageHeading",` on the line after `"Text",`. (It lives in its own folder, so `COMPONENT_DIR` needs no entry.)

- [ ] **Step 5: Add its accessibility notes and an axe case**

In `packages/react/src/a11y-meta.ts`, after the `Text: { … },` entry, add:

```ts
  PageHeading: {
    keyboard: [{ keys: "Tab", behavior: "Not focusable." }],
    notes:
      "Renders the page's one h1 (D118). Use one per screen, as the first thing in the page: inside an AppShell, the page's first child, after any banner. Sub-headings are Text as=\"h2\" or \"h3\". It has no as or size prop, because a page heading is always the h1.",
  },
```

In `packages/react/src/a11y.axe.test.tsx`, add `PageHeading` to the import on line 6 (after `Text,`), and after the `["Stack of Text", …]` case on line 26 add:

```tsx
  ["PageHeading over Text (D118)", <Stack gap={8}><PageHeading>Sales</PageHeading><Text tone="secondary">Invoices from the last 30 days.</Text><Text as="h2" size={18} weight="medium">Overdue</Text></Stack>],
```

- [ ] **Step 6: Write the stories**

Create `packages/react/src/PageHeading/PageHeading.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "storybook";
import { PageHeading } from "./PageHeading.js";
import { Stack } from "../Stack/Stack.js";
import { Text } from "../Text/Text.js";

/** D118 — the page's one h1, at 24/32 medium in the brand's display face,
 * margin 0. */
const meta: Meta<typeof PageHeading> = {
  title: "Components/PageHeading",
  component: PageHeading,
};

export default meta;
type Story = StoryObj<typeof PageHeading>;

export const Default: Story = {
  args: { children: "Sales" },
};

/** Over the page's own lines: a supporting line, a section headline in Text,
 * and body text. */
export const InAPage: Story = {
  render: () => (
    <Stack gap={16}>
      <PageHeading>Sales</PageHeading>
      <Text tone="secondary">Invoices from the last 30 days.</Text>
      <Text as="h2" size={18} weight="medium">Overdue</Text>
      <Text>Three invoices are past their due date.</Text>
    </Stack>
  ),
};
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm vitest run packages/react/src/PageHeading packages/react/scripts/slots.test.ts packages/react/src/a11y.axe.test.tsx`
Expected: PASS.

- [ ] **Step 8: Build React and check the manifest**

Run: `pnpm --filter @handamade/psi-tokens build && pnpm --filter @handamade/psi-react build && node -e "const m=require('./packages/react/dist/manifest.json'); const c=m.components.find(x=>x.name==='PageHeading'); console.log(m.components.length, c && c.slots.map(s=>s.name), c && c.props.map(p=>p.name))"`
Expected: `53 [ 'body' ] [ 'children', 'ref', 'className' ]` (prop order may differ). The build also writes `packages/react/docs/PageHeading.md`. Commit that generated file with the rest.

- [ ] **Step 9: Commit**

```bash
git add packages/react/src/PageHeading packages/react/src/index.ts packages/react/scripts/emit-manifest.ts packages/react/src/a11y-meta.ts packages/react/src/a11y.axe.test.tsx packages/react/scripts/slots.test.ts packages/react/docs/PageHeading.md
git commit -m "feat(react): PageHeading, the page's h1 in the display face (D118)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The app-shell pattern, the AppShell stories and D113's browser test

**Files:**
- Modify: `packages/react/patterns/app-shell.json` (`intent`, `compose.slots.body`, `content`)
- Test: `packages/react/scripts/emit-patterns.test.ts` (after the `summaryTiles` block, ~line 117)
- Modify: `packages/react/src/AppShell/AppShell.stories.tsx` (imports; line 115)
- Modify: `packages/react/src/AppShell/AppShell.stories.css:26-28`
- Test: `apps/storybook/vr/app-shell.interaction.spec.ts` (~lines 338–354, plus one new test)

**Interfaces:**
- Consumes: `PageHeading` from `packages/react/src/PageHeading/PageHeading.js`, manifest name `PageHeading` with slot `body` (Task 2).

- [ ] **Step 1: Write the failing pattern test**

In `packages/react/scripts/emit-patterns.test.ts`, after the `summaryTiles` assertions and before the closing `});` of the first `it`, add:

```ts
    // D118: the frame's page opens with its one PageHeading, before the page's content.
    const appShell = output.patterns.find((p: { id: string }) => p.id === "app-shell");
    expect(appShell.preset.match(/<PageHeading\b/g)).toHaveLength(1);
    expect(appShell.preset.indexOf("<PageHeading")).toBeLessThan(
      appShell.preset.indexOf("[the page; it scrolls on its own]"),
    );
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run packages/react/scripts/emit-patterns.test.ts`
Expected: FAIL. `match` returns `null`, so `toHaveLength` fails. (This test reads `packages/react/dist/manifest.json`. If it errors on a missing file, run Task 2 Step 8's build first.)

- [ ] **Step 3: Put PageHeading in the pattern**

In `packages/react/patterns/app-shell.json`:

1. Replace `"body": ["{content:page}"]` with:

```json
      "body": [
        { "component": "PageHeading", "content": "title" },
        "{content:page}"
      ]
```

2. In `content`, add `"title": "[page title]",` immediately before `"page": "[the page; it scrolls on its own]"`.

3. Append to the end of `intent` (it has no closing period, so keep it without one):

```
. The page opens with its one PageHeading, the screen's h1
```

So the intent's last words read `… and aria-current="page" on the current one. The page opens with its one PageHeading, the screen's h1`.

- [ ] **Step 4: Run the pattern test to verify it passes**

Run: `pnpm --filter @handamade/psi-react build && pnpm vitest run packages/react/scripts`
Expected: PASS. The 24-pattern id list is unchanged.

- [ ] **Step 5: Use PageHeading in the AppShell stories**

In `packages/react/src/AppShell/AppShell.stories.tsx`, add after `import { NavItem } from "../NavTree/NavItem.js";`:

```tsx
import { PageHeading } from "../PageHeading/PageHeading.js";
```

and replace `      <h1>Sales</h1>` with:

```tsx
      <PageHeading>Sales</PageHeading>
```

In `packages/react/src/AppShell/AppShell.stories.css`, delete this rule and the blank line after it:

```css
.psi-story-app-root main h1 {
  font: var(--psi-text-24-32-medium);
}
```

- [ ] **Step 6: Tighten D113's browser test, and add D118's**

In `apps/storybook/vr/app-shell.interaction.spec.ts`, in the test `"a banner keeps main's three edges, and the page starts below it as it starts below the header @interaction"`, replace:

```ts
  // Without a banner the heading starts one block padding plus its own margin
  // below main's top. Under a banner it starts the same distance below the banner.
```

with:

```ts
  // The heading is a PageHeading, margin 0 (D118): without a banner it starts
  // exactly one block padding below main's top, and under a banner the same
  // distance below the banner.
```

and replace `  expect(plain.h1FromMainTop).toBeGreaterThan(24);` with:

```ts
  expect(plain.h1FromMainTop).toBeCloseTo(24, 1);
```

Then add this test directly after that test:

```ts
test("the page's heading is a PageHeading: margin 0, 24/32, in the display face (D118) @interaction", async ({ page }) => {
  await page.goto(story(SHELL), { waitUntil: "networkidle" });
  const h = await page.locator("#main h1").evaluate((h1: HTMLElement) => {
    const cs = getComputedStyle(h1);
    const norm = (s: string) => s.replace(/["'\s]/g, "");
    return {
      marginTop: cs.marginTop,
      size: cs.fontSize,
      lineHeight: cs.lineHeight,
      font: norm(cs.fontFamily),
      display: norm(cs.getPropertyValue("--psi-font-display")),
    };
  });
  expect(h.marginTop).toBe("0px");
  expect(h.size).toBe("24px");
  expect(h.lineHeight).toBe("32px");
  expect(h.display).not.toBe("");
  expect(h.font).toBe(h.display);
});
```

- [ ] **Step 7: Run the browser specs**

Run: `pnpm build && pnpm test:e2e -- app-shell.interaction story-font.interaction`
Expected: PASS. (`pnpm build` builds `apps/storybook/storybook-static`, which the Playwright web server serves. If `--` passes the filter wrongly, run `pnpm exec playwright test -c apps/storybook/vr --grep @interaction app-shell story-font`.)

- [ ] **Step 8: Commit**

```bash
git add packages/react/patterns/app-shell.json packages/react/scripts/emit-patterns.test.ts packages/react/src/AppShell/AppShell.stories.tsx packages/react/src/AppShell/AppShell.stories.css apps/storybook/vr/app-shell.interaction.spec.ts
git commit -m "feat: the app-shell page opens with its PageHeading; D113's test reads exactly 24px (D118)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Prose, counts and the changeset

**Files:**
- Modify: `packages/react/llms.txt` (line 3; lines 34–36)
- Modify: `README.md:20`
- Modify: `packages/react/README.md:3`
- Modify: `packages/mcp/README.md:3`
- Create: `.changeset/page-heading.md`

**Interfaces:**
- Consumes: the manifest now lists 53 components (Task 2).

- [ ] **Step 1: Update the counts**

Change `52 React 19 components` to `53 React 19 components` in each of: `packages/react/llms.txt` line 3, `README.md` line 20, `packages/react/README.md` line 3, `packages/mcp/README.md` line 3. In `README.md` line 20, also insert `PageHeading, ` directly after `Text, ` in the component list.

- [ ] **Step 2: Document PageHeading for agents**

In `packages/react/llms.txt`:

1. Rename the heading `## Stack and Text` to `## Stack, Text and PageHeading`.
2. At the end of the `- <Text as="p|span|div|h2|h3|h4" …` line, append: ` Text has no h1: the page's h1 is PageHeading.`
3. After that line, add:

```
- <PageHeading>Sales</PageHeading>: the page's one h1 (D118), at 24/32 medium in the brand's display face (--psi-page-heading-font → --psi-text-display-24-32-medium), margin 0. Use one per screen, as the first thing in the page: inside an AppShell, the page's first child, after any banner. Margin 0 keeps the page one block padding below the header and below a banner alike (D113). It has no as, size or face prop. Never hand-style an h1. Sub-headings are Text as="h2"/"h3". Outside React, put .psi-text-display-24-32-medium on your own h1 and set its margin to 0.
```

- [ ] **Step 3: Write the changeset**

Create `.changeset/page-heading.md`:

```md
---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
---

A page heading in the brand's display face: `PageHeading` (D118).

- **`PageHeading`**: the page's one `h1`, at 24/32 medium in `--psi-font-display`, with margin 0. Use one per screen, as the first thing in the page. Inside an `AppShell`, it goes after any `banner`, and margin 0 keeps the page one block padding below the header and below a banner alike. It has no `as`, `size` or face prop. Restyle it through `--psi-page-heading-font` and `--psi-page-heading-fg`.
- **A new text style, `--psi-text-display-24-32-medium`**, with its utility `.psi-text-display-24-32-medium`: 24/32 medium in the display face. Unlike the fluid `--psi-display-*` tier, it has fixed px, no tracking and no uppercase.
- **The `app-shell` preset** now opens its page with a `PageHeading`.
- `guidance.json`'s `typographyDefaults` gains `pageHeading`. `heading` is unchanged.
- `Text` is unchanged. It still stops at `h4`.
```

- [ ] **Step 4: Check the prose against the manifest**

Run: `node tools/check-docs-drift.mjs`
Expected: passes (it reads `packages/react/dist/manifest.json`, built in Task 2).

- [ ] **Step 5: Commit**

```bash
git add packages/react/llms.txt README.md packages/react/README.md packages/mcp/README.md .changeset/page-heading.md
git commit -m "docs: PageHeading in llms.txt and the READMEs, 53 components, changeset (D118)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Gates (controller, not a subagent)

- [ ] **Step 1:** `node -v` prints v24. Then run all five gates plus the interaction specs:

```bash
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site && pnpm test:e2e
```

Expected: all green.

- [ ] **Step 2:** `git fetch origin`, then merge `origin/main`. Re-check that no `## Decisions` entry on `origin/main` or an open branch claims D118. If D115 has merged, the component count is 54: update the four counts from Task 4 and re-run the gates.
- [ ] **Step 3:** Update `CLAUDE.md`'s "decision log **D1–D114**" to the highest decision `origin/main` holds once this merges (D118 if D115 is still unmerged). Commit.
- [ ] **Step 4:** Tell the coordinating session that a component was added (52 → 53) before opening the PR.
