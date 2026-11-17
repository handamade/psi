/** Count component tokens (--psi-count-*) — D124. Pure indirection onto the
 * semantic layer.
 *
 * A neutral count is a bare number in fg-secondary, the quiet text colour
 * wcagAAPairs gates on bgPrimary and on fillNeutral1-6 (the tree's hover and
 * current surfaces). fg-tertiary is not used: no surface gates it.
 *
 * An attention count is a pill: fg-warning on fill-tint-warning, a pair
 * wcagAAPairs already holds. The tint is translucent and the gate composites
 * it onto bgPrimary, so the pill paints the tint over attention-backdrop-bg
 * (bgPrimary) and is that composite wherever it sits. A bare tint over the
 * current entry's fillNeutral4 measured 4.43 in the light theme.
 * count-tokens.test.ts measures the backdrop composite per theme. No new
 * pair, so the pinned pair count does not move. */
export const countVars: Record<string, string> = {
  fg: "var(--psi-fg-secondary)",
  "attention-fg": "var(--psi-fg-warning)",
  "attention-bg": "var(--psi-fill-tint-warning)",
  "attention-backdrop-bg": "var(--psi-bg-primary)",
  "attention-padding-x": "var(--psi-space-6)",
};
