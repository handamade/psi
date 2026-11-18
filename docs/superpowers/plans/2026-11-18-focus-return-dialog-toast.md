# Focus return: Dialog and Toast (D136) — implementation plan

Spec: `docs/superpowers/specs/2026-11-18-focus-return-dialog-toast-design.md`. Test-first:
each task writes its failing test, sees it fail, then implements.

1. **Reproduce in a real browser.** Stories `Components/Dialog` `RemovedWhileOpen` and
   `Feedback/Toast` `DismissFocused`; `apps/storybook/vr/dialog-focus.interaction.spec.ts`
   (Escape, footer button → opener) and `toast-focus.interaction.spec.ts` (next toast, new
   last, eviction). Build Storybook, run with `CI=1`: all five fail on `BODY`. Done before
   the spec was written; the numbers are in it.
2. **Dialog.** `Dialog.test.tsx`: unmount while open calls `close()` with the element still
   connected (spy on `HTMLDialogElement.prototype.close`, record `isConnected`); unmount
   while closed calls nothing. Then a `useLayoutEffect` with an unmount cleanup:
   `if (el.open) el.close()`.
3. **Toast region.** `ToastRegion.test.tsx`, composed by hand with a button before the
   region: same position; new last; a toast with no controls passed over; stack emptied →
   the button; the button removed first → the region (`tabindex="-1"`); focus moved to an
   outside input before the removal → left alone; a `pointerdown` before the dismiss → the
   button even with toasts left. `ToastProvider.test.tsx`: `dismiss(id)` of the focused
   toast → the next toast's dismiss. Then: `data-psi-toast-dismiss` on Toast's dismiss
   button; in `ToastRegion`, `tabIndex={-1}`, the `focusin`/`focusout`/`pointerdown`/
   `keydown` listeners and the `MutationObserver`; `.region:focus { outline: none }`.
4. **Real browser green.** Rebuild Storybook, run both interaction specs and the existing
   Toast and Dialog/drawer ones.
5. **Docs.** Component JSDoc (Dialog, ToastRegion), the docs pages' focus notes if they
   state the old behaviour, `llms.txt` if it does; changeset (psi-react, minor);
   `CLAUDE.md` range to D136 if it is the highest merged at merge time.
6. **Gates.** `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint &&
   pnpm --dir apps/site build && CI=1 pnpm test:site`.
7. **PR.** Re-check D136, open, arm auto-merge and read it back. CI's four new `vr`
   baselines go to the user before they are committed.
