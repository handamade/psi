/** Toolbar component tokens (--psi-toolbar-*) — D77.
 *
 * A deliberate default width for Toolbar's direct, unwrapped form-control
 * children (Input/Select used bare, as the filter-toolbar preset does) —
 * without it, their own width:100% resolves as their flex-basis and the
 * row stacks vertically instead of reading as a toolbar. Since D135 it also
 * reaches the control of a top-labelled Field that is a direct child (the
 * filter-form and date-range-filter presets), so a labelled filter row is as
 * even as an unlabelled one; a Field's controlWidth (D125) replaces it, and a
 * side-labelled Field (a "Rows per page" pair) keeps its content width.
 * 200px is a standalone literal, matching
 * Dialog's width={400|560|720} precedent — no shared scale reaches this
 * range (sizeScale tops at 48, spacingScale at 144, both for heights/gaps
 * not component widths).
 *
 * action-offset (D92) moves an unlabelled button or link onto the control
 * line of a `Toolbar align="start"` row: a Field's control starts one label
 * line and one field gap below the Field's top. It is derived from Field's
 * own tokens rather than restated, so the two cannot drift. The calc()
 * resolves where it is declared: at `:root`, being geometry (D139), and in a
 * theme whose componentOverrides retune --psi-field-label-height or
 * --psi-field-gap, which declares it again beside them. Retuning either by
 * hand on a narrower scope needs this token set on that scope.
 * Bound to margin-block-start in toolbar.module.css (Toolbar CSS may read
 * only --psi-toolbar-* and the scales, so it reads Field through this).
 */
export const toolbarVars: Record<string, string> = {
  "control-width": "200px",
  "action-offset": "calc(var(--psi-field-label-height) + var(--psi-field-gap))",
};
