# Tabs — ledger arc cycle 5 implementation plan (D67)

Date: 2026-08-06. Spec: `docs/superpowers/specs/2026-08-06-tabs-cycle-design.md`.

Eight TDD tasks. This is the cycle that empties the coverage backlog.

## Global Constraints

- **Node 24** (`.nvmrc`); this container runs 22.22.2, above pnpm 11.9's ≥22.13 floor.
- **Sizes are px numbers** — Tabs uses `32 | 40`.
- **`tabs.module.css` may bind only `--psi-tabs-*`** plus the global scale prefixes `--psi-(space|size|radius|text|font|duration|ease|z)-`. The plugin derives the namespace from the filename, so one module serves all four components. Aliasing to `--psi-control-*` / `--psi-fill-*` happens in `packages/tokens/src/components/tabs.ts`, never in the CSS.
- **Verified token names.** These exist: `--psi-fg-{secondary,accent,quaternary}`, `--psi-fill-{accent,neutral3}`, `--psi-border-{faint,focus}`, `--psi-control-{32,40}-{height,padding-inline}`. These do **not** exist: `--psi-shadow-*`, `--psi-fill-accent2`, `--psi-fg-muted`.
- **No literal durations** in `transition`/`animation` — stylelint rejects them.
- **Four gates, not three:**
  ```bash
  pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint
  ```
- **Every task runs `pnpm build` before committing** — the only gate that runs `tsc`.
- **Test commands.** `pnpm --filter <pkg> test` exits 0 having run nothing. Use `pnpm exec vitest run <pattern>` or `pnpm test`.
- **`packages/react/docs/*.md` are generated AND tracked** — `git add` the four new files in the same commit; `check-docs-drift` compares counts only.
- **Counts move 28 → 32 components**; patterns stay 13.

---

### Task 1: `--psi-tabs-*` tokens

**Files:** create `packages/tokens/src/components/tabs.ts`, `packages/tokens/__tests__/tabs-tokens.test.ts`; modify `packages/tokens/scripts/build.ts`

- [ ] Failing test modelled on `toast-tokens.test.ts`: every value is a `var(--psi-*)` reference; the geometry keys exist; **no** new contrast pairs are added (assert the matrix length is unchanged, so a future edit that sneaks one in is visible).
- [ ] Implement per the spec's table; register in `componentVars`.
- [ ] `pnpm build` — the contrast gate runs here and must stay green — then `pnpm exec vitest run tabs-tokens` → commit.

**Note:** `fg-disabled` is intentionally not contrast-gated. Disabled text is exempt from WCAG 1.4.3 and gating it would force a contrast that defeats the affordance. Same posture as Menu's `item-fg-disabled`.

---

### Task 2: `Tabs` context and `TabList`

**Files:** create `packages/react/src/Tabs/Tabs.tsx`, `TabList.tsx`, `tabs.module.css`; modify `packages/react/src/index.ts`; test `Tabs.test.tsx`

- [ ] Failing tests: `Tabs` renders children and provides `value`/`onValueChange`/`orientation`/id-prefix through context; `TabList` renders `role="tablist"` with `aria-orientation` matching; `aria-label` lands on the tablist.
- [ ] `aria-label` is **declared on `TabListProps`** (not inherited) so docgen surfaces it — the D60 mechanism, exactly as `Menu` and `Checkbox` do.
- [ ] `pnpm exec vitest run Tabs` → `pnpm build` → commit.

---

### Task 3: `Tab` and `TabPanel` — pairing and ARIA wiring

**Files:** create `Tab.tsx`, `TabPanel.tsx`; test `Tab.test.tsx`

- [ ] Failing tests: `Tab` renders `role="tab"` with `aria-selected` reflecting `value === context.value`; `aria-controls` matches the panel's id; `TabPanel` renders `role="tabpanel"` with `aria-labelledby` matching the tab's id; unselected panels are present but `hidden`; the panel has `tabIndex={0}` so it is reachable when its content has no focusable element; exactly one tab has `tabIndex` 0.
- [ ] Ids come from `useId` in `Tabs` and are derived per value, so both sides resolve without consumer wiring.
- [ ] `disabled` sets `aria-disabled`, never the `disabled` attribute (D53 precedent), and clicking a disabled tab does not call `onValueChange`.
- [ ] `pnpm exec vitest run Tab` → `pnpm build` → commit.

---

### Task 4: `useTabsKeyboard` — roving tabindex

**Files:** create `useTabsKeyboard.ts`, `useTabsKeyboard.test.tsx`

- [ ] Failing tests: horizontal responds to Left/Right and ignores Up/Down; vertical the reverse; both wrap at each end; Home/End jump to the first/last **enabled** tab; disabled tabs are skipped in both directions; selection follows focus (automatic activation); `onValueChange` is called with the new value and `Tabs` does not select itself.
- [ ] Deliberately separate from `useMenuKeyboard` — the spec records why. Do not refactor them together.
- [ ] `pnpm exec vitest run useTabsKeyboard` → `pnpm build` → commit.

---

### Task 5: CSS, slots, exports

**Files:** `tabs.module.css`, `packages/react/src/Tabs/slots.json`, `packages/react/src/index.ts`, `packages/react/src/contracts.json` (only if a contract is genuinely needed — expected: not)

- [ ] Horizontal: a row with a bottom rule (`list-border`) and a selected-tab indicator; vertical: a column with an inline-start rule. Indicator binds `--psi-tabs-indicator`.
- [ ] Focus ring via `:focus-visible` on `--psi-tabs-focus-ring`, matching the other controls.
- [ ] `slots.json`: `list` (1..1) and `panels` (1..*), mirroring the pattern's slot names.
- [ ] Export all four components and their prop types.
- [ ] `pnpm lint` (stylelint is the gate) → `pnpm build` → commit.

---

### Task 6: Manifest, a11y metadata, generated docs

**Files:** `packages/react/scripts/emit-manifest.ts`, `packages/react/src/a11y-meta.ts`; generated `docs/Tabs.md`, `TabList.md`, `Tab.md`, `TabPanel.md`

- [ ] Append the four to `COMPONENTS`, and add `TabList`/`Tab`/`TabPanel` → `"Tabs"` to `COMPONENT_DIR` — the emitter resolves `<Name>/<Name>.tsx` and all four live in `Tabs/`. Cycle 3 hit exactly this with `ToastRegion`.
- [ ] `a11yMeta` entries for all four: the key table, that `Tab` is one tab stop (roving tabindex), that selection follows focus, and that disabled tabs stay discoverable via `aria-disabled`.
- [ ] `pnpm build` to regenerate, **`git add` the four generated docs**, commit.

---

### Task 7: Close the gap, stories, axe, ledger

**Files:** `packages/react/patterns/tabbed-workspace.json`, `Tabs.stories.tsx`, `a11y.axe.test.tsx`, `apps/ledger/src/TransactionsScreen.tsx`, count files

- [ ] `gaps: ["Tabs"]` → `[]`. **The backlog is now empty** — expect the two hard-coded gap tests (`emit-patterns.test.ts`, `seed-patterns.test.ts`) to fail and update them to assert **zero** gapped patterns. That assertion is the arc's milestone, so write it as one.
- [ ] Stories: `Horizontal`, `Vertical`, `WithDisabledTab`, `ManyTabs`. Static and controlled via a small wrapper — no timers.
- [ ] Axe cases: horizontal, vertical, disabled.
- [ ] Ledger: a tab set above the toolbar switching saved views (All / Uncategorised / This month), each applying a different filter to the same table. The D59 acceptance target.
- [ ] Counts **28 → 32** in the four files `check-docs-drift` reads (`README.md`, `packages/react/README.md`, `packages/react/llms.txt`, `packages/mcp/README.md`) **plus** README's enumerated component list, which the script does not check. Add a Tabs section to `llms.txt`.
- [ ] `pnpm build && node tools/check-docs-drift.mjs && pnpm test` → commit.

---

### Task 8: Browser proof, baselines, changeset, gates

**Files:** `apps/storybook/vr/tabs.interaction.spec.ts`; baselines; `.changeset/*.md`

- [ ] Playwright: arrow keys move focus *and* selection in a real browser; Tab from the list lands on the panel, not the next tab. jsdom approximates focus rather than reproducing it, so this is where the keyboard contract is actually proven.
- [ ] Baselines by the documented route: `--update-snapshots=none` first, read the **failure count**, expect the 16 known token-specimen divergences plus the new stories, then `--update-snapshots=missing`, then confirm `git status` shows only additions and no `-darwin`.
- [ ] Changeset: `minor`, three packages in lockstep.
- [ ] Four gates in order, push, draft PR.

---

## Self-Review

- **The riskiest task is 4.** Roving tabindex plus automatic activation means focus and selection move together, and it is easy to write a test that passes because the component re-renders rather than because focus moved. Assert `document.activeElement` explicitly, and let Task 8's browser spec be the real proof.
- **Two keyboard hooks will look like duplication** to the next reader. The spec argues it; if a third arrives, that is the signal to abstract.
- **`hidden` panels are a deliberate DOM cost.** If a ledger panel turns out heavy, the fix is rendering less inside it, not unmounting behind the consumer's back.
- **Empty-backlog assertion:** after Task 7 the arc's derived backlog is spent. That does not mean the arc is done — cycle 6's retargeted eval is the completion criterion (D59), and it may well surface gaps these patterns never described.
