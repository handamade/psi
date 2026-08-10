/** Toolbar component tokens (--psi-toolbar-*) — D77.
 *
 * A deliberate default width for Toolbar's direct, unwrapped form-control
 * children (Input/Select used bare, as the filter-toolbar preset does) —
 * without it, their own width:100% resolves as their flex-basis and the
 * row stacks vertically instead of reading as a toolbar. Field-wrapped
 * controls are unaffected: Field has no width of its own, so its flex-basis
 * already comes from content. 200px is a standalone literal, matching
 * Dialog's width={400|560|720} precedent — no shared scale reaches this
 * range (sizeScale tops at 48, spacingScale at 144, both for heights/gaps
 * not component widths).
 */
export const toolbarVars: Record<string, string> = {
  "control-width": "200px",
};
