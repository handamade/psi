# Drawer — ledger arc cycle 4 implementation plan (D66)

Date: 2026-08-06. Spec: `docs/superpowers/specs/2026-08-06-drawer-cycle-design.md`.

Six TDD tasks. Deliberately the smallest plan in the arc — D66's whole claim is
that a drawer is a `placement` prop and some CSS, so a plan that grew past that
would be evidence the decision was wrong.

## Global Constraints

- **Node 24** (`.nvmrc`); this container runs 22.22.2, above pnpm 11.9's ≥22.13 floor.
- **`dialog.module.css` may bind only `--psi-dialog-*`** plus the global scale prefixes `--psi-(space|size|radius|text|font|duration|ease|z)-` (`tools/stylelint-plugin-psi-tokens.mjs:7`). This cycle adds **no tokens** — everything is already in the `--psi-dialog-*` family.
- **No literal durations** in `transition`/`animation` — the stylelint rule rejects them. Use `var(--psi-duration-200)` / `var(--psi-ease-soft)`.
- **Four gates, not three:**
  ```bash
  pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint
  ```
- **Every task runs `pnpm build` before committing** — it is the only gate that runs `tsc`.
- **`pnpm vr` locally only via the verified route** (Task 6). Never `--update-snapshots` blindly.
- **Test commands.** `pnpm --filter <pkg> test` exits 0 having run nothing. Use `pnpm exec vitest run <pattern>` or `pnpm test`.
- **`packages/react/docs/*.md` are generated AND tracked.** `Dialog.md` gains the `placement` prop and must be `git add`ed in the same commit; `check-docs-drift` compares counts only and will not catch it.
- **Counts do not move this cycle.** 28 components, 13 patterns, before and after. If `check-docs-drift` fails, something unintended changed — investigate rather than update the number.

---

### Task 1: `placement` prop and its classes

**Files:** modify `packages/react/src/Dialog/Dialog.tsx`; test `packages/react/src/Dialog/Dialog.test.tsx`

- [ ] **Failing tests:** default is `center`; each of `center | inline-start | inline-end` applies its own class and sets a `data-placement` attribute; `className` still merges; the existing 10 tests keep passing untouched.
- [ ] Implement: a `placementClass` record beside the existing `widthClass`, plus `data-placement={placement}` for the VR/Playwright selectors. No change to the effects, `handleCancel`, or `handleClick`.
- [ ] `pnpm exec vitest run Dialog` → `pnpm build` → commit.

---

### Task 2: Placement CSS

**Files:** modify `packages/react/src/Dialog/dialog.module.css`

- [ ] Edge placements, verified geometry from the spec's probe:
  ```css
  .inlineEnd   { margin-inline-start: auto; margin-inline-end: 0; margin-block: 0; height: 100dvh; max-height: 100dvh; }
  .inlineStart { margin-inline-end: auto; margin-inline-start: 0; margin-block: 0; height: 100dvh; max-height: 100dvh; }
  ```
  `dvh`, not `vh` — mobile browser chrome would otherwise clip the footer.
- [ ] Radius: square the two corners against the viewport edge, keep the leading pair.
- [ ] Per-placement enter animation (`translateX(±100%)`), duration/easing from tokens. Keep `dialog-enter` for `center` exactly as-is so no existing baseline moves.
- [ ] The panel scrolls internally so the footer stays reachable — `overflow-y: auto` on the body region. A footer scrolled out of reach in a `dismissible={false}` dialog is a trap.
- [ ] `pnpm lint` (stylelint is the gate here) → `pnpm build` → commit.

**Watch:** `.dialog` currently sets `max-width: calc(100vw - var(--psi-space-32))`. That is right for a centered dialog and wrong for an edge-pinned one, which should be allowed to reach the edge. Override it in the placement classes rather than weakening the base rule.

---

### Task 3: Pattern revision — `detail-drawer` composes Dialog

**Files:** modify `packages/react/patterns/detail-drawer.json`

- [ ] `compose.component` → `"Dialog"`; `compose.props` → `{ placement: "{param:placement}" }`; parameter key → `placement` with options `["inline-end", "inline-start"]`, default `inline-end`; `gaps` → `[]`.
- [ ] Two seed/emit tests hard-code the remaining gap set — cycle 3 hit the same thing. Expect `emit-patterns.test.ts` and `seed-patterns.test.ts` to fail on "two remain gapped" and update them to **one** (`tabbed-workspace` → `Tabs`).
- [ ] `pnpm build` — the patterns validator gates this — then `pnpm test` → commit.

---

### Task 4: a11y metadata and generated docs

**Files:** modify `packages/react/src/a11y-meta.ts`; generated `packages/react/docs/Dialog.md`

- [ ] One sentence on the `Dialog` entry: `placement` moves the panel and changes nothing about modality, the focus trap, `aria-modal`, focus restore or the dismissal reasons — all of which come from `showModal()`.
- [ ] `pnpm build` to regenerate, **`git add` the generated `Dialog.md`**, commit.

---

### Task 5: Stories, axe cases, ledger acceptance target

**Files:** modify `packages/react/src/Dialog/Dialog.stories.tsx`, `packages/react/src/a11y.axe.test.tsx`, `apps/ledger/src/TransactionsScreen.tsx`

- [ ] Stories: `DrawerInlineEnd`, `DrawerInlineStart`, `DrawerLongContent` (proves internal scroll). Static and `open` — no timers, so no VR flake.
- [ ] Axe: a drawer case with title + footer, and one with `dismissible={false}`.
- [ ] Ledger: "View details" in the `row-actions` menu opens a drawer showing the transaction's fields, with Close in the footer. This is the D59 acceptance target.
- [ ] `pnpm exec vitest run a11y` → `pnpm build` → commit.

---

### Task 6: Geometry proof, baselines, changeset, gates

**Files:** create `apps/storybook/vr/drawer.interaction.spec.ts`; baselines; `.changeset/*.md`

- [ ] Playwright: an `inline-end` drawer is flush to the viewport's inline edge and full height — jsdom has no layout, so this is the only place the central D66 claim is provable. Assert `x + width === innerWidth` and `height === innerHeight`, and that `:modal` matches.
- [ ] **Baselines, via cycle 3's verified route and not otherwise:** run the full VR suite with `--update-snapshots=none` first and confirm **every existing baseline passes** in this container. Only then re-run with `--update-snapshots=missing`, and confirm `git status` shows *only* additions and no `-darwin` files. If any existing baseline modifies, stop — that is a real regression, not a baseline refresh.
- [ ] Changeset: `minor` for the three packages in lockstep.
- [ ] All four gates in order, then push and open a draft PR.

---

## Self-Review

- **The riskiest edit is Task 2's `max-width` override**, because it changes a rule the centered dialog shares. Task 1's existing-tests-still-pass requirement and the untouched `center` animation are what keep the 204 existing baselines still.
- **The pattern gap is removed for a component that will never exist.** That is the honest outcome of D66, but it means the validator's "gap no longer missing" check is not what closes it — a human decision is. Worth watching that the validator does not then complain about something else.
- **This plan is short on purpose.** If it grows, D66 was the wrong call.
