# Popup layers and Menu fixes (D131) — implementation plan

Spec: `docs/superpowers/specs/2026-11-17-popup-layers-menu-fixes-design.md`. Test-first:
each task writes its failing test, sees it fail, then implements. Menu's existing tests
must stay green through task 1 untouched.

1. **The move (D130).** `internal/popup/usePopupPlacement.ts` (from `useMenuPlacement`,
   `PopupPlacement` union, `anchorRef` instead of `triggerRef`) and
   `internal/popup/useAnchoredPopup.ts` (the sync effect, suppress flag, D58 guard).
   `Menu.tsx` calls both with `mode: "auto"`; `useMenuPlacement.ts` is deleted, its test
   file stays and still passes (it drives Menu). Run Menu's tests: green, unchanged.
2. **`manual` mode.** `useAnchoredPopup.test.tsx`: `popover="manual"`; outside
   `pointerdown` → `onDismiss("outside")`; inside popup or anchor → nothing; closed →
   nothing; consumer close silent. Then the document listener.
3. **`matchWidth` and the fallback cap.** `usePopupPlacement.test.tsx` with a stubbed
   `CSS.supports`: anchor-size supported → inline `min-inline-size` names
   `anchor-size(width)`; unsupported → the measured px. Fallback with a CSS cap of 320px
   and 200px of room → `max-block-size` 200 less margin/padding/border; with 600px of room
   → none set.
4. **Tokens.** `components/popup.ts` (`max-height: 320px`), registry entry, `menu.ts`
   `max-height: var(--psi-popup-max-height)`; a tokens test that both are emitted. Then
   `menu.module.css`: `max-block-size`, the `@position-try --psi-menu-fit` rule and the two
   extra fallbacks, `.menu:focus-visible` ring.
5. **Disabled reachable.** `useMenuKeyboard.test.tsx`: the skip tests become reach tests
   (arrows, Home/End, typeahead, open on a disabled first item); Enter on a disabled item
   reports nothing. `useTabsKeyboard.test.tsx`: arrows/Home/End reach a disabled tab, focus
   and tab stop move, `onValueChange` is not called; the next arrow moves on. Then drop the
   `:not([aria-disabled])` filters.
6. **Removal.** `Menu.test.tsx`: re-render without the focused item → neighbour; last →
   previous; only → the menu (`tabindex=-1`); focus moved to an outside input first → left
   alone. Then the `focusin` record and the `MutationObserver` in `useMenuKeyboard`.
7. **Stories and real-browser specs.** `LongMenu`, `RemovingItems` stories;
   `menu.interaction.spec.ts` (cap and scroll, End/wrap in view, short window fit on the
   larger side, removal focus, Esc in an emptied menu, disabled reach) and
   `tabs.interaction.spec.ts` (disabled tab focused, not selected; the old skip test
   inverted). Run `pnpm test:e2e` locally after `pnpm build`.
8. **Docs.** `a11y-meta.ts` for Menu, MenuItem, TabList, Tab; `guidance.ts` popup line;
   `packages/react/llms.txt`, `packages/tokens/llms.txt` if they list families; D130 spec
   note that D131 amends its token line; changeset (react and tokens, minor); `CLAUDE.md`
   range D1–D131.
9. **Gates.** `pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint &&
   pnpm --dir apps/site build && CI=1 pnpm test:site`, then rebase on `origin/main`,
   re-check D131, PR, auto-merge, CI `vr` (new baselines shown to the user first).
