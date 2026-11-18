# AppShell sidebar motion (D142) — implementation plan

Spec: `docs/superpowers/specs/2026-11-18-d142-app-shell-sidebar-motion-design.md`.
Test-first. Starts after D141's PR merges, on a branch from `origin/main`.

1. **Prototype.** Static page in Chromium (Playwright): two tracks, a clipping sidebar, a
   fixed-width inner scroller with a transparent border; LTR and RTL; focus inside on close.
   Done before the spec; numbers are in it.
2. **Tokens.** `app-shell-tokens.test.ts`: `sidebar-duration` =
   `var(--psi-motion-move-duration)`, `sidebar-ease` = `var(--psi-motion-move-ease)`,
   page-scoped (D139). Then `app-shell.ts` and its doc comment.
3. **Markup.** `AppShell.test.tsx`:
   - default: no `.slide`, no inner wrapper, closed sidebar `hidden` (today's tests stay);
   - `sidebarMotion="slide"`: root has `.slide`; the sidebar holds one `.sidebarInner`
     with the content; closed adds `.sidebarClosed` and does **not** set `hidden`;
   - `"slide"` with no `sidebar`: same markup as instant (no `.slide`, `hidden`).
   Then the prop, the class, the wrapper.
4. **Focus.** `AppShell.test.tsx`, both modes: focus a link in the sidebar, rerender with
   `sidebarOpen={false}` → focus on a header button with `aria-controls="sidebar"`; with no
   such button → `main`; a disabled toggle is skipped; focus outside the sidebar is left
   alone. Then the layout effect.
5. **CSS.** The slide rules in `app-shell.module.css` (spec's mechanism), including
   `--psi-app-shell-sidebar-width: inherit` on `.slide .sidebar`.
6. **Story and real browser.** `Sliding` story: a NavBar with a Menu toggle wired by
   `aria-controls`, a NavTree, `sidebarMotion="slide"`. `app-shell.interaction.spec.ts`:
   mid-close the first column is strictly between 0 and the width; closed, columns start
   `0px`, the sidebar is `visibility: hidden`, Tab from the toggle skips its links; closing
   with focus inside lands on the toggle (and in instant mode too); open slide measures the
   same as instant; RTL mirrored; `reducedMotion: "reduce"` reaches the closed state at once.
   Build Storybook, run the spec with `CI=1`.
7. **Docs.** `AppShell.tsx` JSDoc (the prop, the scroller note, the focus rule),
   `packages/react/docs/AppShell.md`, `packages/react/llms.txt`. Changeset (react + tokens,
   minor). `CLAUDE.md` range.
8. **Gates**, all five. **PR**: re-check D142, open, arm auto-merge and read it back. Show
   the user CI's `Sliding` renders before committing them as baselines.
