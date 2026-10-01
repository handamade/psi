/** NavTree component tokens (--psi-navtree-*) — D88. Pure indirection onto the
 * semantic layer (same posture as menu.ts and tabs.ts), so every key resolves
 * under a `data-psi-theme="dark"` sidebar inside a light page: component
 * tokens are declared under `:where(:root, [data-psi-theme])`.
 *
 * No new contrast pairs: wcagAAPairs already gates fgPrimary and fgSecondary
 * on bgPrimary and on fillNeutral1-6 in every theme, dark included, which
 * covers the item text on the sidebar, on the hover surface (neutral3) and on
 * the current surface (neutral4). `indicator` and `focus-ring` are non-text
 * accents and `radius` is geometry; none carries a gated pair, so the pinned
 * pair count does not move. */
export const navtreeVars: Record<string, string> = {
  "item-fg": "var(--psi-fg-secondary)",
  "item-fg-current": "var(--psi-fg-primary)",
  "item-bg-hover": "var(--psi-fill-neutral3)",
  "item-bg-current": "var(--psi-fill-neutral4)",
  // The inline-start bar on the current item: weight and surface carry the
  // state too, so colour is never the only signal.
  indicator: "var(--psi-fill-accent)",
  // A group's button reads like its items, one step quieter than the current.
  "group-fg": "var(--psi-fg-secondary)",
  // Alias of the control radius dial: a CSS Module may bind only its own
  // component prefix, and the radius lives outside it.
  radius: "var(--psi-control-radius)",
  "focus-ring": "var(--psi-border-focus)",
};
