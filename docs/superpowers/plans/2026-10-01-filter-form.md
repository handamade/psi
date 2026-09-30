# Labelled Filter Form (D87) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A filter form whose labelled controls and *Find* button share one control line, rendered as a real, named `<form>`; and an `Input` that is the size it names.

**Architecture:** `Toolbar` gains two props (`align`, `as`) and one CSS class; `Input` gains one declaration; `Button` declares a prop it already passed through. One new pattern, two edited ones. A browser spec proves what jsdom cannot: heights, edges, and *Enter* submitting.

**Tech Stack:** React 19, CSS Modules, Vitest + Testing Library, axe, Playwright over built Storybook.

Spec: `docs/superpowers/specs/2026-10-01-filter-form-design.md`.

## Global Constraints

- Node 24; `node -v` first.
- Defaults unchanged: `align="center"` adds no class; `as="div"`; a labelled `div` stays `role="group"`.
- No existing `Toolbar`, `Input` or `Button` test edited.
- Counts after: **41 components, 21 patterns**.
- Gates: `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site && pnpm test:e2e` — never `pnpm test:e2e --grep <story word>`, which also matches the screenshot spec and writes `-darwin` baselines.
- Re-check D87 is free (`## Decisions` entries and `git log origin/main --format=%s`) immediately before opening the PR.
- No VR baselines until Dmitry says go.

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/react/src/Toolbar/{Toolbar.tsx,toolbar.module.css,Toolbar.test.tsx,Toolbar.stories.tsx}` | `align`, `as`, their tests and stories |
| `packages/react/src/Input/{input.module.css,Input.test.tsx}` | `box-sizing: border-box` and its CSS test |
| `packages/react/src/Button/Button.tsx` | declare `type` |
| `packages/react/src/a11y.axe.test.tsx` | Toolbar as a form |
| `apps/storybook/vr/filter-form.interaction.spec.ts` (new) | heights, edges, *Enter* submits |
| `packages/react/patterns/filter-form.json` (new), `filter-toolbar.json`, `cursor-pagination.json` | patterns |
| `packages/react/scripts/{seed-patterns,emit-patterns}.test.ts`, `packages/mcp/__tests__/store.test.ts` | pattern lists, D61 envelope |
| `packages/tokens/src/guidance.ts` | the Field rule names `filter-form` |
| `README.md`, `packages/react/llms.txt`, `packages/mcp/README.md`, `packages/mcp/llms.txt` | counts and prose |
| `.changeset/filter-form.md` (new) | `minor` |

---

### Task 1: `Toolbar` `align` and `as`

- [ ] **Step 1: Failing tests** in `Toolbar.test.tsx`, new `describe("align and as (D87)")`: `align="end"` → class `/alignEnd/`; default and `align="center"` → no `alignEnd`; `as="form"` + `aria-label="Filters"` → `getByRole("form", { name: "Filters" })`, tag `FORM`, no `role` attribute; `fireEvent.submit` calls `onSubmit` once; a ref from `as="form"` is the `HTMLFormElement`; a labelled default is still a `group`.
- [ ] **Step 2: Red** — `pnpm vitest run packages/react/src/Toolbar`.
- [ ] **Step 3: Implement.** `align?: "center" | "end"` (`@default "center"`), `as?: "div" | "form"` (`@default "div"`), props `HTMLAttributes<HTMLElement>`, ref `Ref<HTMLDivElement | HTMLFormElement>`. `role` only when `as === "div"` and labelled. CSS `.alignEnd { align-items: flex-end; }`.
- [ ] **Step 4: Green.** **Step 5: Commit** — `feat(react): Toolbar align and as — a filter row on one control line, as a real form (D87)`

### Task 2: `Input` is the size it names; `Button` declares `type`

- [ ] **Step 1: Failing test** in `Input.test.tsx`: read `input.module.css`; the `.input` rule declares `box-sizing: border-box`.
- [ ] **Step 2: Red. Step 3:** add the declaration with a comment (content-box measured 4 px over at every size). In `Button.tsx`, declare `type?: "button" | "submit" | "reset"` with a doc saying no default is set (the platform's: submit inside a form).
- [ ] **Step 4: Green. Step 5: Commit** — `fix(react): Input is the size it names — border-box (D87)`

### Task 3: Browser spec (red first)

- [ ] **Step 1:** `apps/storybook/vr/filter-form.interaction.spec.ts`, tagged `@interaction`: (a) `components-input--all-sizes` heights 24/32/40/48; (b) `patterns-presets--filter-form`: the text input, select and submit button share top and bottom (±0.5 px); (c) *Enter* in the text field fires one `submit` (listener installed with `preventDefault`); (d) `patterns-presets--cursor-pagination`: select bottom equals the pager's bottom.
- [ ] **Step 2: Red** — build Storybook from Task 1–2 state without the pattern: (a) passes only after Task 2 (run it first against `main`'s build to see it red), (b)–(d) red until Task 4.

### Task 4: Patterns, registration, prose

- [ ] `filter-form.json`; `filter-toolbar.json` and `cursor-pagination.json` intents / `align`. Ids in `seed-patterns.test.ts` and `emit-patterns.test.ts` (twenty-one). `store.test.ts`: synthetic 1 → 0 and 19 → 18, comments.
- [ ] `guidance.ts` Field rule; `llms.txt` Toolbar paragraph (`align`, `as`, filter-form); counts 20 → 21 in `packages/react/llms.txt`, `packages/mcp/README.md`, `packages/mcp/llms.txt`, and wherever `check-docs-drift` reads.
- [ ] Toolbar stories: `FilterForm` (as form, align end, two Fields, Find with `IconSearch`), `AlignEnd` vs centred comparison.
- [ ] Axe: Toolbar as a form with labelled Fields and a submit button.
- [ ] Changeset `minor` for all packages. `pnpm build`; add regenerated docs and `Presets.stories.tsx`.
- [ ] Commit — `feat(react): the filter-form pattern; filter-toolbar and cursor-pagination point to it (D87)`

### Task 5: Gates, browser, spec, PR

- [ ] Six gates.
- [ ] In a browser: the new preset's accessibility tree (`form "Filters"`, two labelled controls, `button "Find"`), the Field widths, light and ember.
- [ ] Spec Verification and Consequences measured; status Implemented. Commit.
- [ ] Re-check D87 free; push; PR; `gh pr merge --auto --squash`; read back `autoMergeRequest`; stop for review.
