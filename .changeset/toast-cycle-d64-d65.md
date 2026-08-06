---
"@handamade/psi-tokens": minor
"@handamade/psi-react": minor
"@handamade/psi-mcp": minor
---

Toast — the feedback tier (D64–D65)

Adds `Toast`, `ToastRegion`, `ToastProvider` and `useToast()`, closing the
`action-feedback` pattern's gap. Drawer and Tabs are the coverage arc's
remaining two.

- **`Toast`** is presentational and controlled, like Dialog (D50) and Menu
  (D53): it holds no state, runs no timer and never removes itself —
  `onDismiss` reports and the owner disposes. Variants are Tag's status axis
  (`neutral | success | warning | danger`), not the flat action variants, and
  each variant's meaning is announced by a visually hidden status word rather
  than by colour alone.
- **`ToastRegion`** renders two always-present live wrappers (polite and
  assertive) and routes toasts between them by variant. Both stay mounted when
  the queue is empty, because a live region only announces mutations to a
  subtree that already existed. It sits on the native top layer via
  `popover="manual"`, so a toast raised while a modal `Dialog` is open is still
  painted above the backdrop and still announced — though not clickable until
  the dialog closes, since `showModal()` makes everything outside the dialog
  inert.
- **`ToastProvider` + `useToast()`** own the queue, the eviction limit and the
  auto-dismiss timers. Timers pause while the pointer or focus is inside the
  region and resume with the time remaining (WCAG 2.2.1); toasts carrying an
  action get a longer lifetime so the affordance cannot vanish before it is
  reached.

New tokens: `--psi-toast-*`, aliasing the shared surface family. Three contrast
pairs join the WCAG AA matrix (`fgSuccess`/`fgWarning`/`fgDanger` on
`bgSecondary`), all passing across light, dark, acme and ember.

Also adds the `IconInfo`, `IconAlertTriangle` and `IconAlertCircle` icons.
