# Combobox follow-up (D134) Implementation Plan

**Goal:** Build D134 as `docs/superpowers/specs/2026-11-18-combobox-followup-design.md`
sets it out:
- single-select Escape restores, and Enter settles;
- `aria-expanded` follows the listbox, and the lines are in `aria-describedby`;
- `announce`, `valueLabel`, and a caller-held `open` with `onOpenChange`.

**Files:**
- `packages/react/src/Combobox/Combobox.tsx`, `Combobox.test.tsx` and
  `Combobox.stories.tsx`;
- `apps/storybook/vr/combobox.interaction.spec.ts`;
- `packages/react/src/a11y-meta.ts`, `packages/react/llms.txt` and
  `packages/react/scripts/types.test.ts`;
- `.changeset/`, `CLAUDE.md` and the spec's "As built".

Branch `d134-combobox-followup`. Commit after each task. Re-check D134 before
the PR.

## Task 1: reproduce both defects in Chromium (red)

1. Build the 0.34.0 code: `pnpm build`.
2. Add two `@interaction` specs to `combobox.interaction.spec.ts`:
   - **Escape:** the `clearable` story's single-select shows "Lisbon". Type
     "x", press Escape twice, then Tab. Expect "Lisbon", and expect the
     hidden input to hold `lis`. That needs a `name`, so give the story's
     single-select `name="city"`. The change is invisible, so no baseline
     moves.
   - **aria-expanded:** in the `default` story, type "qq". Expect
     `aria-expanded="false"`, and expect `aria-describedby` to name the
     status line.
3. Run them with `pnpm --dir apps/storybook exec playwright test -c vr/playwright.config.ts combobox.interaction --grep @interaction`.
   Both must fail for the stated reason. Record the output in the spec.

## Task 2: Escape and Enter (unit tests first)

1. Write the failing unit tests:
   - Escape open restores;
   - Escape closed: restores edited text, propagates when not edited;
   - "Escape, Escape, blur" keeps the value;
   - Enter with no highlight, open: reverts or clears, then closes;
   - Enter closed: settles edited text, submits unedited text;
   - multi-select unchanged.
2. Replace the old "Esc on a closed list clears the text" test.
3. Implement:
   - `shownLabel`, `edited` and `settle()`, shared with blur;
   - the new Escape and Enter branches for single-select.

## Task 3: aria-expanded and aria-describedby (unit tests first)

1. Write the failing tests:
   - `aria-expanded` with no match, while loading with no options, and with
     options;
   - the chevron's `aria-expanded` follows;
   - the ids in `aria-describedby` only while the lines show, after the
     Field's.
2. Implement `expanded`, then the status and more line ids.

## Task 4: announce (unit tests first)

1. Write the failing test: no `aria-live` element when `announce={false}`.
   The default keeps it.
2. Implement.

## Task 5: valueLabel (unit tests first)

1. Write the failing tests:
   - preset, late label, options win, no leak onto the next pick, edited
     text left alone;
   - the multi type test in `scripts/types.test.ts`.
2. Implement:
   - store the label for `values[0]` when `valueLabel` changes, in render,
     before the options loop;
   - the text follows `shownLabel` when not edited.

## Task 6: open and onOpenChange (unit tests first)

1. Write the failing tests:
   - uncontrolled reports;
   - controlled held closed through typing, the arrows and the chevron;
   - close requests are reported and not applied;
   - no echo;
   - `disabled` wins.
2. Implement `requestOpen(next)` in place of every `setOpen` and `close`.

## Task 7: stories and browser specs

1. Add the `PresetLabel` and `ReadFailed` stories.
2. Add the browser specs:
   - Escape restores a picked value inside a Dialog;
   - read failed: held closed through typing, the arrows and the chevron,
     with Enter settling and not submitting;
   - `valueLabel` shown.
3. Rebuild, then run every `@interaction` spec.

## Task 8: docs, changeset, gates

1. Update the docs: JSDoc, the `a11yMeta` rows and notes, and `llms.txt`.
2. Add a changeset (minor) naming both behaviour changes.
3. In `CLAUDE.md`, set the range to D1–D134.
4. Write the spec's "As built", with the bundle measurement.
5. Run the gates:

   ```bash
   pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/site build && CI=1 pnpm test:site
   ```

6. Open the PR, arm auto-merge, and read it back. CI's `vr` will fail on the
   two new stories. Show the user CI's renders, and on approval commit them.
