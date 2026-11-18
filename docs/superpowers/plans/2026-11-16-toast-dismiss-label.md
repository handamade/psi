# Toast `dismissLabel` and ESLint agent-folder ignores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Toast`, `show()` and `ToastProvider` take `dismissLabel`, the dismiss button's accessible name (D117); ESLint skips `.claude/` and `.cursor/`.

**Architecture:** `Toast` takes the prop with the current name as its default. `show()` stores a per-toast value in the queue; `ToastProvider` reads its own prop at render and passes `t.dismissLabel ?? dismissLabel`. Generated docs and the manifest come from the TSDoc.

**Tech Stack:** TypeScript, React, vitest, vitest-axe, changesets, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-16-toast-dismiss-label-design.md`

## Global Constraints

- Node 24: run `node -v` before the first pnpm command; `nvm use` if it prints `v20.x`.
- Never edit `dist/` or the generated `packages/react/docs/*.md`; they come from `pnpm build`.
- No story and no baseline: the change is not visible. Do not run `pnpm vr`.
- Do not bump `CLAUDE.md`'s D-range past what `origin/main` holds when the PR opens.
- Commit after each task; end commits with the attribution line the session gives.

## File Map

- Modify `packages/react/src/Toast/Toast.tsx`, `useToast.ts`, `ToastProvider.tsx`
- Modify tests `Toast.test.tsx`, `ToastProvider.test.tsx`, `src/a11y.axe.test.tsx`
- Modify hand-written docs `src/a11y-meta.ts`, `packages/react/llms.txt`
- Modify `eslint.config.js`
- Create `.changeset/toast-dismiss-label.md`

## Task 1: `Toast.dismissLabel`

- [ ] **Step 1: failing tests** in `Toast.test.tsx`, a `describe("dismissLabel (D117)")`: with `dismissLabel="Benachrichtigung schließen"` and `onDismiss`, `getByRole("button", { name: "Benachrichtigung schließen" })` exists and `queryByRole("button", { name: "Dismiss notification" })` is null; clicking it calls `onDismiss` once; without the prop the name is still "Dismiss notification" (the existing tests keep covering this).
- [ ] **Step 2:** `pnpm vitest run packages/react/src/Toast/Toast.test.tsx` — the new cases fail.
- [ ] **Step 3: implement.** In `Toast.tsx` add to `ToastProps`:

  ```ts
  /** The dismiss button's accessible name (D117). Pass the translated string.
   * Only meaningful with `onDismiss`. @default "Dismiss notification" */
  dismissLabel?: string;
  ```

  destructure `dismissLabel = "Dismiss notification"` and use it as the `aria-label`.
- [ ] **Step 4:** the Toast tests pass. Commit.

## Task 2: `show()` and `ToastProvider`

- [ ] **Step 1: failing tests** in `ToastProvider.test.tsx`, a `describe("dismissLabel (D117)")` using the file's `Raise` helper pattern:
  - `show({ message, dismissLabel: "Schließen" })` names the button "Schließen".
  - `<ToastProvider dismissLabel="Schließen">` names the button of a toast raised without one.
  - A per-toast label beats the provider's: provider "Schließen", `show` "Dismiss this one" → the latter.
  - Neither set → "Dismiss notification".
  - Rerendering the provider with a new `dismissLabel` renames a toast already shown.
  - The prop does not reach the region element: `container.querySelector('[aria-label="Notifications"]')` has no `dismisslabel` attribute.
- [ ] **Step 2:** run the file; the new cases fail.
- [ ] **Step 3: implement.** `useToast.ts`: add `dismissLabel?: string` to `ToastOptions` with TSDoc. `ToastProvider.tsx`: add `dismissLabel?: string` to `ToastProviderProps` (TSDoc: the default for every queued toast, `@default "Dismiss notification"`); add it to `QueuedToast` as optional; take it out of the rest props with `dismissLabel,` in the destructure; pass it through `show()`; render `dismissLabel={t.dismissLabel ?? dismissLabel}` on `<Toast>`. Leave the provider's `dismissLabel` undefined by default so `Toast`'s default does the final fall-through, and say so in the TSDoc.
- [ ] **Step 4:** tests pass. Commit.

## Task 3: a11y case, hand-written docs

- [ ] **Step 1:** in `a11y.axe.test.tsx`, after "Toast with a translated status word", add `["Toast with a translated dismiss label (D117)", <ToastRegion><Toast onDismiss={() => {}} dismissLabel="Benachrichtigung schließen">Gespeichert</Toast></ToastRegion>]`. Run the axe file.
- [ ] **Step 2:** `a11y-meta.ts`, Toast notes: replace "The dismiss button requires no props — it is labelled "Dismiss notification"." with a sentence that it is labelled "Dismiss notification" and `dismissLabel` (also on `show()` and `ToastProvider`) renames it (D117).
- [ ] **Step 3:** `llms.txt`: the `<Toast …>` line gains `dismissLabel` and a clause (`dismissLabel="Schließen"` renames the dismiss button, D117); the `<ToastProvider …>` line gains `dismissLabel` as a provider default and in the `show({…})` list.
- [ ] **Step 4:** commit.

## Task 4: ESLint skips agent folders

- [ ] **Step 1: reproduce.** Create `.claude/worktrees/probe/probe.ts` containing `const unused: any = 1;`. Run `pnpm exec eslint .` and confirm it reports the file. Delete it after Step 3.
- [ ] **Step 2:** in `eslint.config.js` add `".claude/**"` and `".cursor/**"` to the `ignores` array.
- [ ] **Step 3:** run the same command; the file is no longer reported. Remove the probe. Commit.

## Task 5: changeset, gates, PR

- [ ] **Step 1:** `.changeset/toast-dismiss-label.md`: `"@handamade/psi-react": minor` plus the lockstep `@handamade/psi-tokens`, as the last changesets do; text: new `dismissLabel` on `Toast`, `show()` and `ToastProvider`, nothing changes by default.
- [ ] **Step 2:** `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site`. Confirm `packages/react/docs/Toast.md`, `ToastProvider.md` and `dist/manifest.json` list the prop.
- [ ] **Step 3:** `git fetch`; check the highest claimed D-number on `origin/main` and whether D116 merged; set `CLAUDE.md`'s range only to what `main` holds plus D117 if that is true then.
- [ ] **Step 4:** push `d117-toast-dismiss-label`, open the PR, `gh pr merge <n> --auto --squash`, read it back with `gh pr view <n> --json autoMergeRequest`; if null, use the `enablePullRequestAutoMerge` mutation.
