# SegmentedControl Implementation Plan (D132)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `SegmentedControl` and `Segment`: a pill of 2–4 segments that is a radio group on its own and the tab list inside `Tabs`.

**Architecture:** The tab-stop logic of `Tabs` (D93) moves into a shared hook, `useRovingStop`, and `useTabsKeyboard` learns an item selector and a both-axes mode. `SegmentedControl` reads `TabsContext`: inside `Tabs` it renders a `tablist` whose segments register with `Tabs`; on its own it runs `useRovingStop` itself and renders a `radiogroup`. Tokens `--psi-segmented-*` alias the semantic layer and the control ramp.

**Tech Stack:** React 19, CSS Modules, Vitest + Testing Library, Storybook 10, Playwright VR, the Psi token DSL.

**Spec:** `docs/superpowers/specs/2026-11-17-segmented-control-design.md`

## Global Constraints

- Sizes are px numbers: `size?: 24 | 32 | 40`, default `32`.
- Component CSS binds only `--psi-segmented-*` and scale tokens (`psi/component-tokens-only`).
- `radius` binds `--psi-radius-full`; focus ring is `--psi-segmented-focus-ring` at `--psi-focus-ring-width`, offset `--psi-focus-ring-offset-inset`.
- No new contrast pair; the pinned pair count does not move.
- Controlled only: no `defaultValue`.
- Component count in prose goes 57 → 59.
- Gates, all five: `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && pnpm test:site`. `pnpm vr` only in CI.

---

### Task 1: Tokens `--psi-segmented-*`

**Files:**
- Create: `packages/tokens/src/components/segmented.ts`
- Modify: `packages/tokens/src/components/registry.ts` (import and `segmented: segmentedVars`)
- Test: `packages/tokens/__tests__/segmented-tokens.test.ts`

**Interfaces:** Produces CSS vars `--psi-segmented-{bg,border,fg,fg-hover,bg-hover,selected-bg,selected-fg,selected-ring,fg-disabled,focus-ring,radius,inset,24-height,32-height,40-height,24-padding-x,32-padding-x,40-padding-x,24-font,32-font,40-font}`.

- [ ] **Step 1: Write the failing test** — declares the token map exactly; the shipped defaults pass `checkOverrideScopes`; `wcagAAPairs` contains `fgSecondary/bgPrimary`, `fgPrimary/fillNeutral3`, `fgAccent/fillTintAccent`, `fgAccent/bgPrimary`; per theme (light, dark, acme, ember) `fgAccent` on the tint composited onto `bgPrimary` ≥ 4.5 and `fgAccent` vs `bgPrimary` ≥ 3.

```ts
it.each(themes)("the selected segment clears AA and its ring 3:1 in %s", (_n, r) => {
  const t = r.fillTintAccent;
  const sel = compositeHex(t.hex, t.oklch.alpha ?? 1, r.bgPrimary.hex);
  expect(wcagContrast(r.fgAccent.hex, sel)).toBeGreaterThanOrEqual(4.5);
  expect(wcagContrast(r.fgAccent.hex, r.bgPrimary.hex)).toBeGreaterThanOrEqual(3);
  expect(wcagContrast(r.fgSecondary.hex, r.bgPrimary.hex)).toBeGreaterThanOrEqual(4.5);
});
```

- [ ] **Step 2: Run** `pnpm --dir packages/tokens vitest run __tests__/segmented-tokens.test.ts` — FAIL (`componentVars.segmented` undefined).
- [ ] **Step 3: Implement**

```ts
export const segmentedVars: Record<string, string> = {
  bg: "var(--psi-bg-primary)",
  border: "var(--psi-border-neutral)",
  fg: "var(--psi-fg-secondary)",
  "fg-hover": "var(--psi-fg-primary)",
  "bg-hover": "var(--psi-fill-neutral3)",
  "selected-bg": "var(--psi-fill-tint-accent)",
  "selected-fg": "var(--psi-fg-accent)",
  "selected-ring": "var(--psi-fg-accent)",
  "fg-disabled": "var(--psi-fg-quaternary)",
  "focus-ring": "var(--psi-border-focus)",
  radius: "var(--psi-radius-full)",
  inset: "var(--psi-space-2)",
  "24-height": "var(--psi-control-24-height)",
  "32-height": "var(--psi-control-32-height)",
  "40-height": "var(--psi-control-40-height)",
  "24-padding-x": "var(--psi-control-24-padding-inline)",
  "32-padding-x": "var(--psi-control-32-padding-inline)",
  "40-padding-x": "var(--psi-control-40-padding-inline)",
  "24-font": "var(--psi-control-24-font)",
  "32-font": "var(--psi-control-32-font)",
  "40-font": "var(--psi-control-40-font)",
};
```

- [ ] **Step 4: Run** the test and `pnpm --dir packages/tokens build` (the contrast gate) — PASS.
- [ ] **Step 5: Commit** `feat(tokens): --psi-segmented-* (D132)`.

### Task 2: Share the tab stop and the keyboard

**Files:**
- Create: `packages/react/src/Tabs/useRovingStop.ts`
- Modify: `packages/react/src/Tabs/Tabs.tsx` (use the hook; `TabEntry` becomes an alias of `RovingEntry`)
- Modify: `packages/react/src/Tabs/useTabsKeyboard.ts` (`itemSelector?: string`, `orientation: TabsOrientation | "both"`)
- Test: `packages/react/src/Tabs/useTabsKeyboard.test.tsx` (both-axes case); existing `Tabs.test.tsx` unchanged and green.

**Interfaces:**
- `useRovingStop(value: string, component: string, noun: string): { tabStop: string; register: (e: RovingEntry) => () => void }` — same rule and warning text as D93: `` `${component}: value "${value}" matches no ${noun}; the first enabled ${noun} takes the tab stop.` ``
- `RovingEntry { value: string; disabled: boolean; el: HTMLElement | null }`
- `useTabsKeyboard({ listRef, orientation, onValueChange, itemSelector = "[data-psi-tab]" })`; `"both"` maps prev to ArrowLeft/ArrowUp and next to ArrowRight/ArrowDown.

- [ ] Step 1: failing test — `orientation: "both"` moves on ArrowDown and ArrowUp, and a custom `itemSelector` picks `[data-psi-segment]` items.
- [ ] Step 2: run — FAIL.
- [ ] Step 3: implement; move the `useMemo`/`useEffect` body from `Tabs` into `useRovingStop` verbatim; `Tabs` calls `useRovingStop(value, "Tabs", "tab")`.
- [ ] Step 4: `pnpm --dir packages/react vitest run src/Tabs` — PASS, including the existing D93 warning test.
- [ ] Step 5: commit `refactor(react): the tab stop and the tabs keyboard, shareable (D132)`.

### Task 3: SegmentedControl and Segment

**Files:**
- Create: `packages/react/src/SegmentedControl/SegmentedControl.tsx`, `Segment.tsx`, `segmented.module.css`, `slots.json`, `SegmentedControl.test.tsx`
- Modify: `packages/react/src/index.ts`, `packages/react/src/Tabs/slots.json` (body accepts `SegmentedControl`)

**Interfaces:**
- `SegmentedControlProps extends Omit<HTMLAttributes<HTMLDivElement>, "role" | "onChange" | "defaultValue">`: `value?`, `onValueChange?`, `size?: 24 | 32 | 40`, `fill?: boolean`, `aria-label?`, `aria-labelledby?`, `children: ReactNode`, `ref?`.
- `SegmentProps`: `value: string`, `children: ReactNode`, `disabled?: boolean`, `className?`, `ref?: Ref<HTMLButtonElement>`.
- `SegmentedContext` value `{ mode: "radio" | "tabs"; value; onValueChange; tabStop; register?; idPrefix }`.

Tests (write first, see them fail, then implement):

1. On its own: `getByRole("radiogroup", { name })`, radios with `aria-checked`, one `tabIndex=0` on the checked radio.
2. Click selects (`onValueChange("dark")`); a disabled segment has `aria-disabled` and a click does nothing.
3. Radio keyboard: ArrowRight and ArrowDown move and select, skipping a disabled segment and wrapping; ArrowLeft/ArrowUp go back; Home/End.
4. Inside `Tabs`: `tablist` with `aria-orientation="horizontal"`, segments are `tab`s with `aria-selected` and `aria-controls` equal to the `TabPanel` id; the panel is labelled by the segment (`getByRole("tabpanel", { name: "Map" })`); ArrowRight switches the panel; ArrowDown does nothing.
5. Unmatched value: no segment checked, the first enabled one has `tabIndex=0`, a dev warning names SegmentedControl.
6. Throws: standalone without `onValueChange`; inside `Tabs` with `value`; `Segment` alone.
7. `size` and `fill` land as classes; default size 32.

Implementation: as in the spec's API section. Key points:
- Call every hook before any `throw` (rules of hooks).
- Root: `role={inTabs ? "tablist" : "radiogroup"}`, `aria-orientation` only in tabs mode, `onKeyDown` composes the caller's handler with `useTabsKeyboard({ itemSelector: "[data-psi-segment]", orientation: inTabs ? "horizontal" : "both" })`.
- Segment: `<button type="button" data-psi-segment data-value>`; tabs mode adds `role="tab" id=tabId(...) aria-selected aria-controls=panelId(...)`; radio mode `role="radio" aria-checked`; `aria-disabled` when disabled; `tabIndex = tabStop === value ? 0 : -1`; registers with `register` in a layout effect; label in `<span className={styles.label}>`.
- CSS per the spec: pill track (`inline-flex`, `max-inline-size: 100%`, 1px border, `inset` padding, `bg`), `.fill` (`flex`, `inline-size: 100%`, segments `flex: 1 1 0`), segments `flex: 0 1 auto; min-inline-size: 0`, label ellipsis, selected = tint + fg + `box-shadow: inset 0 0 0 1px var(--psi-segmented-selected-ring)`, hover only on unselected enabled segments, inset focus ring.

- [ ] Commit `feat(react): SegmentedControl, a radio group alone and the tab list inside Tabs (D132)`.

### Task 4: Machine trail

**Files:** `packages/react/scripts/emit-manifest.ts` (add both names to `COMPONENTS`, `COMPONENT_DIR.Segment = "SegmentedControl"`), `packages/react/src/a11y-meta.ts` (two entries; `SegmentedControl.accessibleName = { oneOf: ["aria-label", "aria-labelledby"] }`), `packages/react/src/a11y.axe.test.tsx` (standalone, in Tabs, with a disabled segment), `packages/tokens/src/guidance.ts` (the which-one rule), `packages/react/llms.txt` (section, 59), `README.md`, `packages/react/README.md`, `packages/mcp/README.md` and anywhere `check-docs-drift` names (57 → 59), regenerated `packages/react/docs/*.md`.

- [ ] Run `pnpm build && node tools/check-docs-drift.mjs` and fix every stale count it reports.
- [ ] Commit `docs: SegmentedControl in the manifest, guidance, llms.txt and a11y notes; 59 components (D132)`.

### Task 5: Stories, docs page, changeset

**Files:** `packages/react/src/SegmentedControl/SegmentedControl.stories.tsx` (Setting, ThemePicker, ViewSwitch, Sizes, WithDisabledSegment, Fill, Narrow at 320px), `packages/docs/src/pages.ts` (`{ slug: "segmented-control", title: "SegmentedControl", members: ["SegmentedControl", "Segment"] }`), `packages/docs/examples/segmented-control/setting.tsx` and `view-switch.tsx`, `.changeset/segmented-control.md`.

- [ ] Measure the four-segment widths at sizes 32 and 40 in Chromium (Storybook preview) and correct the spec's numbers if they differ.
- [ ] Run all five gates.
- [ ] Commit `docs: SegmentedControl stories, docs page and changeset (D132)`.

### Task 6: PR and VR baselines

- [ ] Re-check the decision number (D132) against `origin/main` and open PRs.
- [ ] Push, open the PR, arm auto-merge and read it back (`gh pr view <n> --json autoMergeRequest`).
- [ ] When CI's `vr` fails on the new stories only, commit `test-results/**/*-actual.png` from the `vr-baselines` artifact as baselines; confirm no existing baseline changed.
