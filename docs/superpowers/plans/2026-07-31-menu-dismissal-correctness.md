# Menu Dismissal Correctness (D58) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop `Menu` reporting a dismissal for a menu the consumer has already
closed (which breaks the shipped `row-actions` pattern), fix the trigger's
anchor box, repair two broken stories, and cover the whole class with a
Playwright interaction spec.

**Architecture:** One guard in `Menu.tsx` (a latest-value ref read by the
queued `toggle` handler), one CSS line in `menu.module.css`, story hygiene in
`Menu.stories.tsx`, and a new screenshot-free Playwright spec that runs inside
the existing `apps/storybook/vr` project.

**Tech Stack:** React 19, TypeScript, CSS Modules, Storybook 9, Playwright,
Vitest (jsdom), changesets.

**Spec:** `docs/superpowers/specs/2026-07-31-menu-dismissal-correctness-design.md`

**Branch:** `d58-menu-dismissal` (already created off `main`; spec committed at
`dd9329f`).

## Global Constraints

- **Node 24.** `.nvmrc` says `24`. Run `nvm use` **before the first pnpm
  command**; pnpm 11.9 dies on Node 20 with `ERR_UNKNOWN_BUILTIN_MODULE`. A
  fresh shell may start on Node 20 — check `node -v`.
- **Never run bare `pnpm vr` locally.** Baselines are Linux renders; a macOS
  run finds no `-darwin` snapshots, fails every story, and its default update
  mode **silently writes 152 junk `-darwin.png` files**. For local sanity
  checks only: `pnpm vr --update-snapshots=none`. Never commit a `-darwin.png`.
- **Never hand-generate VR baselines.** CI produces them. The refresh loop is
  in `apps/storybook/vr/README.md` and is reproduced in Task 6.
- **Never hardcode colours** in component CSS — bind `var(--psi-*)`. The custom
  stylelint plugin enforces it.
- **This is D58.** D57 is reserved by the D56 spec for the theme console. Do
  not renumber either.
- **A changeset is required** — this is a user-visible fix to a published
  package. `packages/*` version in lockstep; target **0.8.1** (patch).
- **No API change.** `MenuProps` is untouched and `onClose` keeps its three
  reasons.
- **Do not add a re-open guard.** The hypothesis that clicking an open menu's
  trigger re-opens it was tested in Chrome 148 and **refuted** — light dismiss
  lands on `pointerdown`, before `click`, and the queued `toggle` arrives
  after. A plain toggle is correct.

## Standard commands

```bash
nvm use                                       # once per shell
pnpm build                                    # packages + storybook-static (needed before any Playwright run)
pnpm test                                     # vitest (packages/*)
pnpm lint                                     # eslint + stylelint
pnpm test:e2e                                 # NEW in Task 1 — interaction specs only, safe on macOS
```

**Browser access:** `preview_start` spawns a shell on **Node 20**, so the
`storybook` launch config cannot start. Start Storybook from Bash after
`nvm use` (`pnpm --dir apps/storybook dev`, port 6006) and attach the browser
by URL instead.

## File Structure

| File | Change | Responsibility |
| ---- | ------ | -------------- |
| `packages/react/src/Menu/Menu.tsx` | Modify | The `openRef` guard + the `onClose` invariant in its doc comment |
| `packages/react/src/Menu/menu.module.css` | Modify (line 4-6) | `.trigger` anchor box tracks its trigger, not its layout cell |
| `packages/react/src/Menu/Menu.stories.tsx` | Modify | `SwitchingBetweenMenus` story; `Placements` split into four; `FallbackPlacement` cleanup |
| `apps/storybook/vr/menu.interaction.spec.ts` | **Create** | Screenshot-free Playwright coverage of dismissal ordering |
| `package.json` | Modify (scripts) | `test:e2e` script |
| `packages/react/vitest.setup.ts` | Modify (comment) | Correct the false claim that VR covers light dismiss |
| `.changeset/*.md` | **Create** | 0.8.1 patch changeset |

---

### Task 1: Reproduce and fix the stale-dismissal bug

**Files:**
- Modify: `packages/react/src/Menu/Menu.stories.tsx`
- Create: `apps/storybook/vr/menu.interaction.spec.ts`
- Modify: `package.json` (scripts)
- Modify: `packages/react/src/Menu/Menu.tsx`

**Interfaces:**
- Consumes: `Menu`, `MenuItem` and `Button`, already imported in
  `Menu.stories.tsx`. `MenuProps["onClose"]` is
  `(reason: "item-select" | "esc" | "outside") => void`.
- Produces:
  - Story id `components-menu--switching-between-menus`, used by the spec in
    this task and screenshotted by `stories.spec.ts` in Task 6.
  - Root script `test:e2e`, used by Tasks 2–6.
  - A `@interaction` test tag — every test in `menu.interaction.spec.ts` must
    carry it, or `test:e2e` will not select it.

**The bug in one sentence:** when the platform light-dismisses menu A because
the user clicked menu B's trigger, A's popover is already closed by the time
A's `open` prop flips, so the sync effect arms no suppression and A's queued
`toggle` reports `onClose("outside")` — clearing the consumer's `openId` and
closing B, which had just opened.

- [ ] **Step 1: Add the reproduction story**

In `packages/react/src/Menu/Menu.stories.tsx`, append at the end of the file:

```tsx
/** Two menus sharing one `openId` — the shape of the `row-actions` pattern.
 *  Exists to pin D58: switching from A to B must leave B open. `onClose` is
 *  written the naive way on purpose; the component, not the consumer, is what
 *  has to make that correct. Driven by `apps/storybook/vr/menu.interaction.spec.ts`. */
function SwitchingDemo() {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [lastReason, setLastReason] = React.useState<string>("none");

  return (
    <div style={{ display: "flex", gap: 24, padding: 40, alignItems: "flex-start" }}>
      {(["a", "b"] as const).map((id) => (
        <Menu
          key={id}
          open={openId === id}
          onClose={(reason) => {
            setLastReason(reason);
            setOpenId(null);
          }}
          aria-label={`Menu ${id}`}
          trigger={
            <Button
              size={32}
              onClick={() => setOpenId((current) => (current === id ? null : id))}
            >
              {id.toUpperCase()}
            </Button>
          }
        >
          <MenuItem onSelect={() => {}}>Edit</MenuItem>
          <MenuItem onSelect={() => {}}>Duplicate</MenuItem>
        </Menu>
      ))}
      <span data-testid="last-reason">{lastReason}</span>
    </div>
  );
}

export const SwitchingBetweenMenus: Story = {
  render: () => <SwitchingDemo />,
};
```

`React.useState` is used because the file imports the default `React`
namespace. `Placements` already exports a `render`-only story with no `args`,
so the `Story` type accepts this shape.

- [ ] **Step 2: Add the interaction spec**

Create `apps/storybook/vr/menu.interaction.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

/** Interaction coverage for Menu's dismissal ordering (D58).
 *
 * These tests take NO screenshots, so unlike stories.spec.ts they are
 * platform-independent and pass on macOS as well as CI. Every test carries
 * the @interaction tag so `pnpm test:e2e` can select them alone.
 *
 * This whole class is unreachable from jsdom: vitest.setup.ts's Popover
 * polyfill dispatches `toggle` synchronously and implements neither light
 * dismiss nor the mutual dismissal of popover="auto". That gap is why D53
 * shipped the bug this file pins. */

const STORY = "/iframe.html?id=components-menu--switching-between-menus&globals=theme:light";

const menu = (id: string) => `[data-psi-menu][aria-label="Menu ${id}"]`;

test("switching from one menu to another leaves the new one open @interaction", async ({ page }) => {
  await page.goto(STORY, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "A", exact: true }).click();
  await expect(page.locator(menu("a"))).toBeVisible();
  await expect(page.locator(menu("b"))).toBeHidden();

  // The regression: the platform light-dismisses A on pointerdown, and A's
  // late toggle used to report onClose("outside") — clearing openId and
  // closing B milliseconds after it opened.
  await page.getByRole("button", { name: "B", exact: true }).click();
  await expect(page.locator(menu("b"))).toBeVisible();
  await expect(page.locator(menu("a"))).toBeHidden();

  // A's stale dismissal must not have been reported at all.
  await expect(page.getByTestId("last-reason")).toHaveText("none");
});

test("a genuine outside click still reports onClose(\"outside\") @interaction", async ({ page }) => {
  await page.goto(STORY, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "A", exact: true }).click();
  await expect(page.locator(menu("a"))).toBeVisible();

  // Far from both triggers and the open menu.
  await page.mouse.click(20, 700);

  await expect(page.locator(menu("a"))).toBeHidden();
  await expect(page.getByTestId("last-reason")).toHaveText("outside");
});

test("Esc reports onClose(\"esc\") and the consumer closes it @interaction", async ({ page }) => {
  await page.goto(STORY, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "A", exact: true }).click();
  await expect(page.locator(menu("a"))).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.locator(menu("a"))).toBeHidden();
  await expect(page.getByTestId("last-reason")).toHaveText("esc");
});
```

- [ ] **Step 3: Add the `test:e2e` script**

In the root `package.json`, add alongside the existing `"vr"` script:

```json
    "test:e2e": "playwright test -c apps/storybook/vr --grep @interaction",
```

Leave `"vr"` untouched. `pnpm vr` still runs everything (CI); `pnpm test:e2e`
runs only the screenshot-free tests and is safe on macOS.

- [ ] **Step 4: Build, then run the spec to watch it FAIL**

```bash
nvm use && pnpm build && pnpm exec playwright install chromium && pnpm test:e2e
```

Expected: the **first** test FAILS. The failure should be on
`expect(page.locator('[data-psi-menu][aria-label="Menu b"]')).toBeVisible()` —
B never stays open — or on the `last-reason` assertion reading `outside`
instead of `none`. The second and third tests should already PASS.

If the first test passes here, **stop and report**: the bug did not reproduce
in this browser, and the fix below would be unverifiable.

> **Superseded during execution (2026-08-01).** Step 5 below prescribes a
> `useRef` mirror; review found a passive effect can lag React's committed
> props, so the guard ships reading `open` from the closure with
> `useCallback` deps `[onClose, open]`. See the D58 spec's Decisions and
> Rejected-alternatives sections for the corrected reasoning. Steps 5-6 are
> left as written for the historical record.

- [ ] **Step 5: Apply the guard**

In `packages/react/src/Menu/Menu.tsx`, add the ref immediately after the
existing `suppressNextCloseRef` declaration (currently line 91):

```tsx
  // Mirrors `open` for handleToggle, which is memoised on [onClose] and would
  // otherwise read a stale capture. Updated in an effect, not during render:
  // React forbids writing refs while rendering, and effects flush long before
  // the platform's queued `toggle` (measured ~50ms in Chrome 148).
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
```

Then extend `handleToggle` (currently lines 114-126) so it reads:

```tsx
  const handleToggle = useCallback(() => {
    const el = popoverRef.current;
    if (!el) return;
    // Checked before the open/closed test on purpose: the flag must be
    // consumed by the very next toggle whatever the element's state reads as
    // by then, or a later genuine dismissal would inherit the suppression.
    if (suppressNextCloseRef.current) {
      suppressNextCloseRef.current = false;
      return;
    }
    if (isPopoverOpen(el)) return; // opening toggle — nothing to report
    // D58: the platform can close this popover before `open` flips — light
    // dismiss fires on pointerdown when another menu's trigger is clicked. In
    // that case the sync effect takes neither branch (the popover is already
    // closed), so suppressNextCloseRef is never armed. Report a dismissal only
    // for a menu that is still open according to its own prop; otherwise this
    // is a stale toggle for a close the consumer already knows about, and
    // reporting it would clear a selection that has since moved on.
    if (!openRef.current) return;
    onClose("outside");
  }, [onClose]);
```

- [ ] **Step 6: State the invariant in the `onClose` doc comment**

In the `MenuProps` interface, extend the existing `onClose` doc block by
appending this paragraph before the closing `*/`:

```
   * Invariant (D58): a dismissal is only ever reported for a menu that is
   * currently open according to its own `open` prop. The platform can close
   * an auto popover before the consumer's state catches up — clicking another
   * menu's trigger light-dismisses this one on pointerdown — and a report for
   * an already-closed menu would clear a selection that has since moved on.
```

- [ ] **Step 7: Rebuild and run the spec to verify it PASSES**

```bash
pnpm build && pnpm test:e2e
```

Expected: all three tests PASS.

- [ ] **Step 8: Confirm the jsdom suite still passes**

```bash
pnpm test
```

Expected: exit 0. The existing `Menu.test.tsx` asserts `onClose("outside")`
fires on a platform-driven close; because those tests drive `open` true and
then dispatch a close, `openRef.current` is `true` and the report still fires.
If any of them now fail, **stop and report** — that would mean the guard
suppresses a genuine dismissal, not just a stale one.

- [ ] **Step 9: Commit**

```bash
git add packages/react/src/Menu/Menu.tsx packages/react/src/Menu/Menu.stories.tsx apps/storybook/vr/menu.interaction.spec.ts package.json
git commit -m "fix(react): Menu must not report a dismissal for an already-closed menu (D58)

Switching between two menus sharing one openId left both closed. When the
platform light-dismisses A because B's trigger was clicked, A's popover is
already closed by the time A's open prop flips, so the sync effect arms no
suppression and A's queued toggle reported onClose(\"outside\") — clearing
openId and killing B. Breaks the shipped row-actions pattern.

Guards the report on a latest-value openRef. Adds a screenshot-free
Playwright interaction spec: this class is unreachable from jsdom, whose
polyfill has neither light dismiss nor mutual dismissal.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: The anchor box must track its trigger

**Files:**
- Modify: `packages/react/src/Menu/menu.module.css:4-6`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: no code interface. Changes rendered geometry, so Task 6's baseline
  refresh depends on it.

`.trigger` is `display: inline-flex` with no width. As a **grid item**
(`justify-self: stretch` by default) or a **flex-column item**
(`align-items: stretch`) it fills its cell, so the menu anchors to the cell
edge. Measured in the `Placements` grid at 1280×800: button 77px wide, wrapper
428px, menu 351px right of its trigger. Flex *rows* with `align-items: center`
are unaffected, which is why most consumers have not hit it.

This one line repairs **both** placement paths, because both read this same
wrapper: `anchor-name` is set on it (`useMenuPlacement.ts:31`) and the JS
fallback measures it with `getBoundingClientRect()` (`useMenuPlacement.ts:43`).

- [ ] **Step 1: Add the width**

In `packages/react/src/Menu/menu.module.css`, replace the `.trigger` block:

```css
.trigger {
  display: inline-flex;
  /* A grid item (justify-self: stretch) or a flex-column item
     (align-items: stretch) is stretched to its cell by default, and this
     wrapper is the anchor box for BOTH placement paths — anchor-name is set
     on it and the JS fallback measures it. Without this the menu anchors to
     the cell edge instead of the trigger (D58). */
  width: fit-content;
}
```

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

Expected: exit 0. No colour literal was added, so the stylelint plugin has
nothing to object to.

- [ ] **Step 3: Browser check**

Start Storybook from Bash (not `preview_start` — it spawns Node 20):

```bash
nvm use && pnpm --dir apps/storybook dev
```

Open `http://localhost:6006/?path=/story/components-menu--placements`. Note
this story is still broken in other ways (only one menu renders — Task 3 fixes
that); you are checking **anchoring only**.

Expected: the single rendered menu sits directly below-or-above its own
trigger button, not offset toward the middle of the page.

Cross-check with DevTools or `javascript_tool`:

```js
const t = document.querySelector('[data-psi-menu-trigger]');
({ wrapper: t.getBoundingClientRect().width, button: t.firstElementChild.getBoundingClientRect().width })
```

Expected: the two widths are equal (before the fix the wrapper was several
times wider).

- [ ] **Step 4: Commit**

```bash
git add packages/react/src/Menu/menu.module.css
git commit -m "fix(react): Menu trigger wrapper must not stretch to its cell (D58)

The wrapper is the anchor box for both placement paths, so as a grid or
flex-column item it stretched and the menu anchored to the cell edge
instead of the trigger.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Split `Placements` into four stories

**Files:**
- Modify: `packages/react/src/Menu/Menu.stories.tsx:33-52`

**Interfaces:**
- Consumes: the module-local `items` fragment and `placements` array already
  in the file.
- Produces: four story ids — `components-menu--placement-bottom-start`,
  `--placement-bottom-end`, `--placement-top-start`, `--placement-top-end`.
  `components-menu--placements` **ceases to exist**; Task 6's baseline refresh
  deletes its two snapshots.

`popover="auto"` mutually dismisses: showing one auto popover closes every
other open one that is not its ancestor. React runs the four sync effects in
tree order, so each `showPopover()` dismisses its predecessor and only the
last-mounted survives. No consumer state can fix this — the story is
unrenderable as written.

- [ ] **Step 1: Replace the `Placements` export**

Delete the `placements` array and the `Placements` export
(`Menu.stories.tsx:33-52`) and put in their place:

```tsx
/** One story per placement, deliberately NOT combined into a grid.
 *
 * popover="auto" mutually dismisses: showing one auto popover closes every
 * other open one that is not its ancestor, so four sibling menus cannot be
 * open at once — React runs the four sync effects in tree order and only the
 * last-mounted survives. The old combined `Placements` story rendered exactly
 * one menu and looked broken. Verified directly in the browser:
 *   a.showPopover()  // {a: true,  b: false}
 *   b.showPopover()  // {a: false, b: true}   <- showing b closed a
 * Do not merge these back together. (D58) */
function placementStory(placement: MenuPlacement): Story {
  return {
    args: { open: true, onClose: () => {}, placement, "aria-label": `Menu ${placement}` },
    render: (args) => (
      <div style={{ padding: 120 }}>
        <Menu {...args} trigger={<Button size={32}>{placement}</Button>}>
          {items}
        </Menu>
      </div>
    ),
  };
}

export const PlacementBottomStart: Story = placementStory("bottom-start");
export const PlacementBottomEnd: Story = placementStory("bottom-end");
export const PlacementTopStart: Story = placementStory("top-start");
export const PlacementTopEnd: Story = placementStory("top-end");
```

The `MenuPlacement` type import at the top of the file is already present and
stays.

- [ ] **Step 2: Typecheck and test**

```bash
pnpm build && pnpm test
```

Expected: both exit 0.

- [ ] **Step 3: Browser check — all four anchor correctly**

With Storybook running, visit each of the four new stories.

Expected: each renders **its own** open menu, anchored to its own trigger —
`bottom-*` below, `top-*` above, `*-start` left-aligned, `*-end` right-aligned.
This is the first time all four have been visible; combined with Task 2 it is
also the first check that placement is actually correct.

- [ ] **Step 4: Commit**

```bash
git add packages/react/src/Menu/Menu.stories.tsx
git commit -m "test(react): one story per Menu placement (D58)

popover=auto mutually dismisses, so the combined Placements story could
only ever render one of its four menus. Splitting keeps all four
placements under VR, which D53 requires.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Stop `FallbackPlacement` contaminating the preview

> **Corrected during execution (2026-08-01).** Step 1's code comment justifies
> the render-phase stub by claiming React flushes child effects before parent
> effects, so a `useLayoutEffect` stub would run too late. **That reasoning is
> wrong** — `useMenuPlacement` uses a passive `useEffect`, and all layout
> effects flush before any passive effect, so a decorator `useLayoutEffect`
> would have won. The render-phase install still ships, for a better reason:
> it is in place for every phase the story might read it from, and does not
> couple the story to which effect kind a component internal happens to use.
> The shipped comment says this; the block below is the historical record.

**Files:**
- Modify: `packages/react/src/Menu/Menu.stories.tsx` (the `FallbackPlacement`
  decorator, currently lines 78-96 before Task 3's edit shifts them)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: nothing. Behaviour-only fix to a story decorator.

The decorator overwrites `CSS.supports` and **never restores it**, and injects
a `<style>` scoped to `[data-psi-menu]` document-wide. Storybook does not
reload the preview iframe between stories, so every Menu rendered afterwards
in the same session takes the JS fallback branch while the browser still
applies `position-area` — the two fight, exactly as the decorator's own
comment warns. Because `tags: ["autodocs"]` is global in
`.storybook/preview.ts`, this also poisons the Menu docs page: all eight menus
there were measured with `anchorSupportedNow === false`.

- [ ] **Step 1: Make the decorator clean up and scope itself**

Replace the `decorators` array of `FallbackPlacement` with:

```tsx
  decorators: [
    (StoryFn) => {
      // The stub MUST be installed during render, not in an effect: React
      // flushes child effects before parent ones, so useMenuPlacement's
      // effects inside the story would run against the native CSS.supports
      // and take the anchor branch — defeating the whole story. Only the
      // *restore* can be deferred. (D58)
      const originalRef = React.useRef<typeof CSS.supports | null>(null);
      if (originalRef.current === null) {
        const original = CSS.supports.bind(CSS);
        originalRef.current = original;
        CSS.supports = ((prop: string, value?: string) =>
          prop === "anchor-name" ? false : original(prop, value as string)) as typeof CSS.supports;
      }
      // Storybook keeps ONE preview iframe for the whole session, so an
      // unrestored CSS.supports leaks into every later story and into the
      // autodocs page (tags: ["autodocs"] is global in preview.ts). (D58)
      React.useEffect(
        () => () => {
          if (originalRef.current) CSS.supports = originalRef.current;
        },
        [],
      );
      return (
        <div className="psi-fallback-probe">
          {/* Scoped to this story's subtree, not the document: the old
              [data-psi-menu] selector killed position-area for every menu on
              the autodocs page. (D58) */}
          <style>{`.psi-fallback-probe [data-psi-menu] { position-area: none !important; position-try-fallbacks: none !important; }`}</style>
          <StoryFn />
        </div>
      );
    },
  ],
```

The `useRef` guard makes the stub idempotent across re-renders — without it a
second render would capture the already-stubbed function as "original" and the
restore would be a no-op.

Keep the existing explanatory comment above the story about why both halves
are required and why the reset value must be `none` — it is still true and
hard-won.

- [ ] **Step 2: Build**

```bash
pnpm build
```

Expected: exit 0.

- [ ] **Step 3: Browser check — no contamination**

With Storybook running:

1. Visit `components-menu--fallback-placement`. Confirm the menu still renders
   in its fallback position (below its trigger, positioned by JS).
2. **Then** navigate to `components-menu--placement-bottom-start` in the same
   tab, without reloading.
3. In the console, run:

```js
CSS.supports.toString().includes("native code")
```

Expected: `true` — `CSS.supports` has been restored. Before this fix it
returned `false` for the rest of the session.

4. Visit the Menu **Docs** page and confirm its menus are anchor-positioned
   (they should sit tight against their triggers, not offset by JS placement).

- [ ] **Step 4: Commit**

```bash
git add packages/react/src/Menu/Menu.stories.tsx
git commit -m "test(react): FallbackPlacement must not leak into the preview iframe (D58)

It overwrote CSS.supports without restoring it and injected
[data-psi-menu] CSS document-wide, so every later Menu in the session --
including the autodocs page -- took the JS fallback branch while the
browser still applied position-area.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Correct the polyfill comment and add the changeset

**Files:**
- Modify: `packages/react/vitest.setup.ts` (the Popover polyfill comment,
  currently lines 22-25)
- Create: `.changeset/menu-dismissal-correctness.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the changeset that Task 6's release check reads.

- [ ] **Step 1: Fix the misleading comment**

The current comment claims light dismiss is "exercised in Playwright VR". VR
only takes screenshots — it exercises no interaction at all, and that false
assurance is why D53 shipped this bug. Replace the comment block above
`showPopover` with:

```ts
// Polyfill Popover API for jsdom (D53 — Menu). Mirrors the dialog polyfill
// above: enough surface for controlled open/close assertions, not a spec
// implementation. It dispatches `toggle` SYNCHRONOUSLY and implements neither
// light dismiss nor the mutual dismissal of popover="auto", so anything that
// depends on real dismissal ordering is invisible here — D58 was shipped
// because of exactly that gap. Those paths are covered by
// apps/storybook/vr/menu.interaction.spec.ts in a real browser; VR itself
// only takes screenshots and exercises no interaction.
```

- [ ] **Step 2: Add the changeset**

Create `.changeset/menu-dismissal-correctness.md`:

```markdown
---
"@handamade/psi-react": patch
---

Menu no longer reports a dismissal for a menu the consumer has already closed (D58)

Two menus sharing one `openId` — the shape of the `row-actions` pattern —
left **both** closed when you switched between them. Clicking B's trigger
light-dismisses A at the platform level on `pointerdown`, so A's popover was
already closed by the time its `open` prop flipped; the sync effect then armed
no suppression and A's queued `toggle` reported `onClose("outside")`, clearing
`openId` and closing B milliseconds after it opened.

`onClose` now carries an invariant: a dismissal is only ever reported for a
menu that is still open according to its own `open` prop. Genuine light
dismiss, Esc and item-select are unaffected. No API change.

Also fixed: the trigger wrapper is the anchor box for both placement paths and
was being stretched to its cell as a grid or flex-column item, so the menu
anchored to the cell edge instead of the trigger. It now sizes to its trigger.
```

Note the changeset targets `@handamade/psi-react` only — no token changed.
`packages/*` still version in lockstep at release time.

- [ ] **Step 3: Verify the changeset parses**

```bash
pnpm exec changeset status
```

Expected: it reports a pending patch bump for `@handamade/psi-react`. If it
errors on frontmatter, the package name is misspelled.

- [ ] **Step 4: Commit**

```bash
git add packages/react/vitest.setup.ts .changeset/menu-dismissal-correctness.md
git commit -m "docs(react): correct the polyfill's coverage claim; changeset for D58

vitest.setup.ts claimed light dismiss was exercised in Playwright VR. VR
only screenshots -- it was exercised nowhere, which is why D53 shipped
the bug.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Verify, open the PR, refresh baselines from CI

**Files:** `apps/storybook/vr/stories.spec.ts-snapshots/` (baselines, in Step 5)

- [ ] **Step 1: Full local gate**

```bash
nvm use && pnpm build && pnpm test && pnpm lint && pnpm test:e2e
```

Expected: all four exit 0.

- [ ] **Step 2: Confirm docs drift is clean**

```bash
node tools/check-docs-drift.mjs
```

Expected: exit 0. D58 adds no component and no pattern, so the counts it
guards are unchanged. If it fails, something outside this plan's scope changed.

- [ ] **Step 3: Do NOT run bare `pnpm vr`**

If you want a local sanity render, and only then:

```bash
pnpm vr --update-snapshots=none
```

Expected: every `stories.spec.ts` test fails with "snapshot doesn't exist"
(macOS looks for `-darwin` baselines; the committed ones are `-linux`). That
inversion is normal. The `menu.interaction.spec.ts` tests should still pass,
since they take no screenshots. **Never** commit a `-darwin.png`.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin d58-menu-dismissal
gh pr create --title "fix(react): Menu dismissal correctness and anchor box (D58)" --body "$(cat <<'EOF'
Switching between two menus sharing one `openId` — the shape of the shipped
`row-actions` pattern — left **both** closed.

When the platform light-dismisses A because B's trigger was clicked, A's
popover is already closed by the time A's `open` prop flips, so the sync
effect arms no suppression and A's queued `toggle` reports
`onClose("outside")` — clearing `openId` and killing B. `suppressNextCloseRef`
cannot cover this: it is armed only where *Menu* drives the close, and here
the platform did.

- **Fix:** `onClose` now reports only for a menu still open by its own `open`
  prop. No API change.
- **Anchor box:** the trigger wrapper was stretched to its cell as a grid or
  flex-column item, so the menu anchored to the cell edge. Both placement
  paths read that wrapper, so one line fixes both.
- **Stories:** `Placements` could only ever render one of its four menus
  (`popover="auto"` mutually dismisses) — split into four.
  `FallbackPlacement` overwrote `CSS.supports` without restoring it and
  injected document-wide CSS, poisoning every later Menu including autodocs.
- **Coverage:** a new screenshot-free Playwright interaction spec. This class
  is unreachable from jsdom, whose polyfill has neither light dismiss nor
  mutual dismissal — the gap that let D53 ship this.

**VR baselines will churn, and that is the acceptance signal:** the width fix
moves Menu pixels, `Placements` is replaced by four stories, and
`SwitchingBetweenMenus` adds two more. Any diff **outside** Menu stories means
something unintended changed.

Spec: `docs/superpowers/specs/2026-07-31-menu-dismissal-correctness-design.md`
Plan: `docs/superpowers/plans/2026-07-31-menu-dismissal-correctness.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Refresh baselines from the failed CI run**

The `vr` job **will** fail on this PR — expected, not a regression. Follow
`apps/storybook/vr/README.md`:

1. Wait for the `vr` job to fail: `gh run watch`.
2. Download the artifact:

```bash
gh run download --name vr-baselines --dir /tmp/vr-baselines
```

3. Replace the snapshot directory contents with the downloaded PNGs:

```bash
rm -rf apps/storybook/vr/stories.spec.ts-snapshots
cp -R /tmp/vr-baselines/stories.spec.ts-snapshots apps/storybook/vr/
```

4. Sanity-check the delta before committing:

```bash
git status --porcelain apps/storybook/vr/stories.spec.ts-snapshots | sort
```

Expected, and nothing else:
- **Deleted:** `components-menu--placements--{light,ember}-linux.png`
- **Added:** `components-menu--placement-{bottom-start,bottom-end,top-start,top-end}--{light,ember}-linux.png` (8 files)
- **Added:** `components-menu--switching-between-menus--{light,ember}-linux.png` (2 files)
- **Modified:** other `components-menu--*` files, if the width fix moved their pixels

Any change to a **non-Menu** story is a red flag — stop and investigate rather
than committing it.

5. Confirm no macOS baselines slipped in:

```bash
ls apps/storybook/vr/stories.spec.ts-snapshots | grep -c darwin
```

Expected: `0`.

6. Commit and push:

```bash
git add apps/storybook/vr/stories.spec.ts-snapshots
git commit -m "test(vr): refresh Menu baselines for D58

Placements replaced by four per-placement stories, SwitchingBetweenMenus
added, and the trigger width fix moved Menu pixels. Baselines are the CI
(Linux) render, per apps/storybook/vr/README.md.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

- [ ] **Step 6: Arm auto-merge, then verify it armed**

```bash
gh pr merge --auto --squash
```

Then **read it back** — `gh pr merge --auto` exits 0 and prints nothing while
leaving auto-merge OFF:

```bash
gh pr view --json autoMergeRequest
```

Expected: `autoMergeRequest` is **not** `null`. If it is null, use the
`enablePullRequestAutoMerge` GraphQL mutation, which does work:

```bash
PR_ID=$(gh pr view --json id -q .id)
gh api graphql -f query='mutation($id:ID!){enablePullRequestAutoMerge(input:{pullRequestId:$id,mergeMethod:SQUASH}){clientMutationId}}' -f id="$PR_ID"
gh pr view --json autoMergeRequest
```

---

## After merge

`.changeset/` is non-empty and `main` will be green, so per `CLAUDE.md` **cut
the release rather than letting changesets pool**: branch `release/psi-0.8.1`
→ `pnpm changeset version` → PR → merge → `pnpm release` locally → **`git push
--tags`**, which `changeset tag` does not do for you.

## Carries — not this branch

- **`anchor-name` lives on the wrapper, not the trigger element.** Task 2
  makes the wrapper track its trigger, but the structural fix is to bind the
  anchor to the cloned trigger itself. The wrapper is load-bearing for the JS
  fallback branch (`useMenuPlacement.ts:43` measures it), so revisit when the
  anchor floor rises and that branch can be deleted outright.
- **What else does the jsdom polyfill imply is covered but is not?** Dialog
  uses a parallel polyfill in the same file. D58 corrects only the Menu
  comment; the broader audit is unscoped here.
- **`pnpm release` does not push tags.** Unrelated one-liner, still open.
