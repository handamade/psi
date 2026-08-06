# Toast — ledger arc cycle 3 implementation plan (D64–D65)

Date: 2026-08-06. Spec: `docs/superpowers/specs/2026-08-06-toast-cycle-design.md`.

Ten TDD tasks. Each writes a failing test first, then the implementation,
then commits with `pnpm build` green — not just `test` and `lint`.

## Global Constraints

- **Node 24** (`.nvmrc`). Run `node -v` before the first pnpm command; `nvm use` if it reports 20. (This container reports 22.22.2, which is above pnpm 11.9's ≥22.13 floor and works; the `node:sqlite` failure is a Node 20 problem.)
- **Sizes are px numbers**, never S/M/L.
- **Never hardcode colors in component CSS** — bind `var(--psi-*)`. The custom stylelint plugin enforces this.
- **`toast.module.css` may bind only `--psi-toast-*`** plus the global scale prefixes. The plugin derives the component name from the filename (`/([a-z-]+)\.module\.css$/`), so all three components — `Toast`, `ToastRegion`, `ToastProvider` — share one module and one `--psi-toast-*` namespace, exactly as `menu.module.css` serves `Menu`/`MenuItem`/`MenuSeparator`. Aliasing to `--psi-surface-*` happens in `packages/tokens/src/components/toast.ts`, never in the CSS.
- **Allowed global prefixes** are exactly `--psi-(space|size|radius|text|font|duration|ease|z)-` (`tools/stylelint-plugin-psi-tokens.mjs:7`). `--psi-z-overlay` is therefore legal in the module; `--psi-surface-bg` is not.
- **New values go in `packages/tokens/src`**, never in `dist` (dist is generated).
- **Verified token names** (checked against `packages/tokens/dist/*.css`). These exist: `--psi-surface-{bg,border,radius}`, `--psi-fg-{primary,secondary,success,warning,danger}`, `--psi-fill-tint-{success,warning,danger}`, `--psi-border-faint`, `--psi-z-{sticky,nav,overlay,tooltip}`, `--psi-space-*`, `--psi-radius-*`, `--psi-duration-*`, `--psi-ease-*`. **These do NOT exist and must never be written**: `--psi-shadow-*` (there is no elevation scale in any form — see the spec's Tokens section), `--psi-fill-accent2`, `--psi-fg-muted`, `--psi-control-{n}-padding-inline-text`.
- **Four gates, not three:**
  ```bash
  pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint
  ```
- **Every task runs `pnpm build` before committing.** `pnpm build` runs `tsc` and is the only gate that catches a type error; a green test+lint pair says nothing about it (cycle 2, Task 5).
- **`pnpm vr` only passes in CI.** Never run it locally — its default update mode silently writes junk `-darwin` baselines.
- **Test commands.** Neither `packages/tokens` nor `packages/react` defines a `test` script; only the root does. `pnpm --filter <pkg> test` **exits 0 having run nothing**. Use `pnpm exec vitest run <pattern>` for a focused run, or `pnpm test` for the full suite (~22s).
- **`packages/react/docs/*.md` are generated AND tracked in git.** Any task that adds a component or changes props must `git add` the affected files in the same commit. `check-docs-drift.mjs` will not catch staleness — it compares aggregate counts only.
- **Fake timers.** Every auto-dismiss test uses `vi.useFakeTimers()`. No real waiting anywhere in the unit suite.

---

### Task 1: Three status icons

**Files:**
- Create: `packages/react/src/icons/IconInfo.tsx`, `IconAlertTriangle.tsx`, `IconAlertCircle.tsx`
- Modify: `packages/react/src/icons/index.ts`, `packages/react/src/index.ts`
- Test: `packages/react/src/icons/icons.test.tsx`

**Interfaces:**
- Produces: `IconInfo`, `IconAlertTriangle`, `IconAlertCircle`, each matching the existing `IconProps` shape (`size = 20`, `aria-hidden="true"`, `stroke="currentColor"`, `strokeWidth={2}`, 24×24 viewBox).
- Consumed by: Task 5.

`IconCheck` already exists and serves `success`; only three are new.

- [ ] **Step 1: failing test** — extend `icons.test.tsx`'s existing sweep to cover the three new icons (aria-hidden by default, default size 20, custom size honoured).
- [ ] **Step 2:** implement, copying `IconCheck.tsx` verbatim except for the path data.
- [ ] **Step 3:** export from `icons/index.ts` and re-export from `src/index.ts` alongside the other icons.
- [ ] **Step 4:** `pnpm exec vitest run icons` → `pnpm build` → commit.

---

### Task 2: `--psi-toast-*` token family + three contrast pairs

**Files:**
- Create: `packages/tokens/src/components/toast.ts`
- Modify: `packages/tokens/scripts/build.ts` (import + `componentVars` registry), `packages/tokens/src/contrast-matrix.ts`
- Test: `packages/tokens/__tests__/toast-tokens.test.ts` (new, modelled on `table-tokens.test.ts`)

**Interfaces:**
- Produces: `toastVars`, emitted as `--psi-toast-*` in the component-vars CSS.
- Consumed by: Task 4's CSS module.

```ts
export const toastVars: Record<string, string> = {
  bg: "var(--psi-surface-bg)",
  border: "var(--psi-surface-border)",
  radius: "var(--psi-surface-radius)",
  fg: "var(--psi-fg-primary)",
  "icon-fg-neutral": "var(--psi-fg-secondary)",
  "icon-fg-success": "var(--psi-fg-success)",
  "icon-fg-warning": "var(--psi-fg-warning)",
  "icon-fg-danger": "var(--psi-fg-danger)",
};
```

Add to `wcagAAPairs` (not `componentLabelPairs` — these are foregrounds on a
surface, which is what `wcagAAPairs` collects):

```ts
// Toast's status icon on the elevated surface (D65). The matrix gates these
// three foregrounds on bgPrimary already; --psi-surface-bg is bgSecondary.
{ fg: "fgSuccess", bg: "bgSecondary", minRatio: 4.5 },
{ fg: "fgWarning", bg: "bgSecondary", minRatio: 4.5 },
{ fg: "fgDanger",  bg: "bgSecondary", minRatio: 4.5 },
```

- [ ] **Step 1: failing test** — assert every `toastVars` value is a `var(--psi-*)` reference (no literal colors), that the four `icon-fg-*` keys exist, and that no key contains `shadow`.
- [ ] **Step 2:** create `toast.ts`, register in `build.ts`.
- [ ] **Step 3:** add the three pairs to `contrast-matrix.ts`.
- [ ] **Step 4:** `pnpm build` — the contrast gate runs here and must stay green. Expected margins, measured before the spec was written: tightest is `fgSuccess`/`bgSecondary` in light at **5.87** against 4.5. If the build throws, the token change is wrong, not the threshold.
- [ ] **Step 5:** `pnpm exec vitest run toast-tokens` → commit.

**Scope note:** geometry keys carry no `bg`/`fg`/`border` segment, so `keyGroup()` returns undefined and they stay out of both D46 gates. All eight keys here *do* carry one, so all eight are scoped — that is correct and expected.

---

### Task 3: `Toast` — the controlled presentational card

**Files:**
- Create: `packages/react/src/Toast/Toast.tsx`, `packages/react/src/Toast/toast.module.css`
- Modify: `packages/react/src/index.ts`
- Test: `packages/react/src/Toast/Toast.test.tsx`

**Interfaces:**
- Produces: `Toast`, `ToastProps`, and the exported `ToastVariant` union.
- Consumed by: Tasks 4, 5, 8, 9.

Props exactly as the spec's D64 block. **Holds no state, runs no timer, never
removes itself** — `onDismiss` reports and the owner disposes (D50/D53).

- [ ] **Step 1: failing tests**
  - renders its children as the message;
  - `variant="success"` applies the success class; default is `neutral`;
  - `onDismiss` provided → a dismiss `IconButton` with `aria-label="Dismiss notification"` renders, and clicking calls `onDismiss` **once**;
  - `onDismiss` omitted → no dismiss button;
  - the toast does **not** unmount itself after `onDismiss` fires (assert it is still in the document);
  - `action` renders into its own slot;
  - the status icon is `aria-hidden` and a visually hidden textual prefix carries the meaning ("Success:", "Warning:", "Error:"; `neutral` gets none);
  - `className` merges rather than replaces;
  - `ref` forwards to the underlying `<div>`.
- [ ] **Step 2:** implement. Icon per variant: `IconCheck` / `IconAlertTriangle` / `IconAlertCircle` / `IconInfo`.
- [ ] **Step 3:** CSS module — `pointer-events: auto` (the region sets `none`; see Task 4), grid layout, `--psi-toast-*` bindings only. Enter animation drives `var(--psi-duration-200)` and `var(--psi-ease-soft)`; no literal durations (the stylelint rule rejects them).
- [ ] **Step 4:** export from `src/index.ts`.
- [ ] **Step 5:** `pnpm exec vitest run Toast` → `pnpm build` → `pnpm lint` → commit.

---

### Task 4: `ToastRegion` — the persistent top-layer live region

**Files:**
- Create: `packages/react/src/Toast/ToastRegion.tsx`
- Modify: `packages/react/src/Toast/toast.module.css`, `packages/react/src/index.ts`
- Test: `packages/react/src/Toast/ToastRegion.test.tsx`

**Interfaces:**
- Produces: `ToastRegion`, `ToastRegionProps`, `ToastPlacement`.
- Consumed by: Tasks 5, 8, 9.

Renders `popover="manual"` and calls `showPopover()` on mount. Contains **two
always-present wrappers** — `role="status"` / `aria-live="polite"` and
`role="alert"` / `aria-live="assertive"` — and routes children into one by
variant.

Routing mechanism: `ToastRegion` inspects each child's `variant` prop via
`Children.map` + `isValidElement`, the same technique cycle 2 used for
Table's select-all injection. Children that are not `Toast` elements go to the
polite wrapper.

- [ ] **Step 1: failing tests**
  - both live wrappers are present when the region has **no children** (this is the whole point of D64 — a live region must pre-exist its content);
  - `showPopover()` is called on mount, and the polyfill's `data-open` is set;
  - `popover` attribute is exactly `"manual"`, never `"auto"` — assert the literal, since `auto` would light-dismiss on the click that raised the toast;
  - a `success` child lands inside the polite wrapper; a `danger` child inside the assertive one; `warning` assertive; `neutral` polite;
  - default `aria-label` is `"Notifications"` and is overridable;
  - default placement is `bottom-end`, and `placement` sets the data attribute.
- [ ] **Step 2:** implement.
- [ ] **Step 3:** CSS — `pointer-events: none` on the region. **This is the silent failure mode**: the region is a full-width band in the top layer, and without it an invisible strip of the page goes dead to the mouse. Add an explicit test asserting the computed style, not just a visual check.
- [ ] **Step 4:** `pnpm exec vitest run ToastRegion` → `pnpm build` → `pnpm lint` → commit.

**jsdom note:** the polyfill in `vitest.setup.ts` is attribute-agnostic — it sets `data-open` and fires `toggle` regardless of `popover="auto"` vs `"manual"`. For `manual` this is *closer* to real behaviour than it is for Menu, because manual popovers genuinely do not light-dismiss. The top-layer claim itself is still unprovable in jsdom and is Task 9's Playwright spec.

---

### Task 5: `ToastProvider` + `useToast()` — the queue

**Files:**
- Create: `packages/react/src/Toast/ToastProvider.tsx`, `packages/react/src/Toast/useToast.ts`
- Modify: `packages/react/src/index.ts`
- Test: `packages/react/src/Toast/ToastProvider.test.tsx`

**Interfaces:**
- Produces: `ToastProvider`, `ToastProviderProps`, `useToast`, `ToastHandle`.
- Consumed by: Tasks 8, 10.

```tsx
interface ToastProviderProps {
  /** Max simultaneous toasts; oldest evicted first. @default 3 */
  limit?: number;
  /** Auto-dismiss for toasts with no action, ms. @default 5000 */
  duration?: number;
  /** Auto-dismiss for toasts carrying an action, ms. @default 10000 */
  actionDuration?: number;
  placement?: ToastPlacement;
  children: ReactNode;
}

interface ToastHandle {
  show: (t: { variant?: ToastVariant; message: ReactNode; action?: ReactNode }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}
```

This is the D65 exception and the only stateful container in the library.

- [ ] **Step 1: failing tests** (all with `vi.useFakeTimers()`)
  - `show()` returns a stable id and renders the message;
  - a toast auto-dismisses after `duration`, and one carrying an `action` after `actionDuration` instead — assert it is *still present* at `duration` and gone at `actionDuration`, so the two paths cannot both pass by accident;
  - `dismiss(id)` removes exactly that toast;
  - `clear()` empties the queue;
  - at `limit`, the **oldest** is evicted, not the newest;
  - `pointerenter` on the region pauses every timer: advance past `duration` while hovered and assert the toast survives, then leave and assert it goes;
  - focus entering the region pauses too (keyboard users get the same extension — WCAG 2.2.1);
  - every timer is cleared on unmount (assert `vi.getTimerCount()` is 0), so a dismissed provider cannot fire into a dead tree;
  - `useToast()` outside a provider throws a named, actionable error rather than returning a silent no-op.
- [ ] **Step 2:** implement. The provider renders exactly one `ToastRegion` unconditionally — empty queue included.
- [ ] **Step 3:** `pnpm exec vitest run ToastProvider` → `pnpm build` → commit.

**Timer discipline:** store timer ids in a ref keyed by toast id; pause records remaining time and clears, resume re-arms with the remainder. Do not restart the full duration on resume — that lets a user hold a toast open forever by jiggling the mouse, and it makes the pause test pass for the wrong reason.

---

### Task 6: Slot contracts

**Files:**
- Create: `packages/react/src/Toast/slots.json`
- Modify: `packages/react/src/contracts.json` if a new contract is needed (expected: not)
- Test: covered by the existing `scripts/slots.test.ts` sweep

Mirrors `Dialog/slots.json`:

```json
{
  "slots": [
    { "name": "body",   "accepts": {}, "cardinality": "1..*", "order": 1 },
    { "name": "action", "accepts": { "components": ["Button"], "contracts": ["inline-content"] }, "cardinality": "0..1", "order": 2 }
  ]
}
```

- [ ] **Step 1:** write the file; confirm the slots loader picks it up (`loadSlotContracts` in `scripts/slots.ts`).
- [ ] **Step 2:** `pnpm build` → commit.

---

### Task 7: Manifest, a11y metadata, generated docs

**Files:**
- Modify: `packages/react/scripts/emit-manifest.ts` (`COMPONENTS` list), `packages/react/src/a11y-meta.ts`
- Generated: `packages/react/docs/Toast.md`, `ToastRegion.md`, `ToastProvider.md`

Append `"Toast"`, `"ToastRegion"`, `"ToastProvider"` to `COMPONENTS`. `useToast`
is a hook and is **not** a manifest entry — the count goes **25 → 28**, not 29.

`a11yMeta` entries for all three, following the Dialog entry's shape: Esc is
*not* a Toast dismissal (a toast is not modal and does not trap focus), Tab
reaches the action and dismiss controls in DOM order, and the notes record the
politeness split and the hover/focus timer pause.

- [ ] **Step 1:** edit both files.
- [ ] **Step 2:** `pnpm build` to regenerate `packages/react/docs/*.md`.
- [ ] **Step 3:** **`git add` the generated docs** — they are tracked, and no gate catches staleness. Commit.

---

### Task 8: Stories and axe cases

**Files:**
- Create: `packages/react/src/Toast/Toast.stories.tsx`
- Modify: `packages/react/src/a11y.axe.test.tsx`

Stories (each becomes a VR baseline in light and ember — the count grows by
2× the story count):

- one per variant: `Neutral`, `Success`, `Warning`, `Danger`
- `WithAction` — a ghost Button
- `WithDismiss`
- `Stacked` — three toasts in a region, the eviction-limit shape
- `LongMessage` — wrapping behaviour

Provider-driven stories are deliberately excluded from VR: they are
time-dependent, and a screenshot of a self-dismissing element is a flake
generator. `animations: "disabled"` in the Playwright config covers the enter
animation but not the dismissal timer.

- [ ] **Step 1:** write stories; add Toast cases to the axe sweep.
- [ ] **Step 2:** `pnpm exec vitest run a11y` → `pnpm build` → commit.

**VR baselines** cannot be generated locally — CI's `vr` job writes them. Expect the first CI run on this branch to fail `vr` with missing baselines and to upload the `vr-baselines` artifact; commit those, per `apps/storybook/vr/README.md`.

---

### Task 9: Playwright interaction spec — the top-layer claim

**Files:**
- Create: `apps/storybook/vr/toast.interaction.spec.ts` (modelled on `menu.interaction.spec.ts`)

The one assertion jsdom cannot make. A toast raised while a `Dialog` is open
must be visible — the reason `popover="manual"` was chosen over
`position: fixed` at `--psi-z-overlay`.

- [ ] **Step 1:** a story that opens a Dialog and raises a toast from inside it.
- [ ] **Step 2:** assert the toast is visible and its bounding box is not covered by the dialog backdrop.
- [ ] **Step 3:** also assert the pointer-events discipline — a click at a point inside the region band but outside any toast reaches the element beneath.
- [ ] **Step 4:** commit. **This runs in CI only**, alongside `vr`.

---

### Task 10: Close the gap, wire the ledger, counts, changeset, gates

**Files:**
- Modify: `packages/react/patterns/action-feedback.json`, `apps/ledger/src/TransactionsScreen.tsx`, `apps/ledger/src/main.tsx`
- Modify: `README.md`, `packages/react/README.md`, `packages/react/llms.txt`, `packages/mcp/README.md`
- Create: `.changeset/*.md`

- [ ] **Step 1:** drop `"gaps": ["Toast"]` → `"gaps": []` in `action-feedback.json`, and add `"warning"` to its `variant` options. This is the cycle's completion signal.
- [ ] **Step 2:** wrap the ledger in `ToastProvider` (`main.tsx`) and raise a `success` toast with an Undo action when a transaction is voided from the existing `row-actions` menu. This is the acceptance target — per D59, built against a real screen, not Storybook alone.
- [ ] **Step 3:** update every prose count **25 → 28**. The four files `check-docs-drift.mjs` reads are `README.md`, `packages/react/README.md`, `packages/react/llms.txt` (both counts) and `packages/mcp/README.md`, matching `/(\d+) React 19 components/`. The pattern count stays 13. Grep for the old number beyond those four — the script only checks the files it knows about.
- [ ] **Step 4:** changeset — `minor` for all three packages, in lockstep.
- [ ] **Step 5:** **all four gates in order:**
  ```bash
  pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint
  ```
- [ ] **Step 6:** push, open a **draft** PR, arm auto-merge, and **read it back** — `gh pr merge --auto --squash` exits 0 while leaving auto-merge OFF; verify with `gh pr view <n> --json autoMergeRequest` and fall back to the `enablePullRequestAutoMerge` GraphQL mutation if it reports null.

---

## Self-Review

Risks this plan is knowingly carrying:

1. **The provider is the first stateful container in the library.** D65 bounds it in prose; nothing mechanical stops the next one. Accepted — the guard is the decision-number requirement.
2. **Timer tests are the classic flake source.** Mitigated by fake timers everywhere and by asserting *both* sides of each duration boundary.
3. **VR baseline churn.** Eight stories × two themes = 16 new baselines on a job that is already the slowest gate, taking the suite from 188 toward ~204. The arc spec named this cost explicitly.
4. **`Children.map` variant routing is a structural coupling** — `ToastRegion` reads a prop off its children. Same technique as cycle 2's select-all injection, and the fallback (non-`Toast` children → polite) keeps it from throwing on unexpected input.
5. **The three new icons are scope**, but small and contained; the alternative (colour-only status) was rejected on accessibility grounds in the spec.
