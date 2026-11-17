/** SegmentedControl / Segment component tokens (--psi-segmented-*) — D132.
 * One module serves both, so one prefix. Pure indirection: colour aliases the
 * semantic layer, geometry aliases the D54/D55 control ramp so a 32px
 * segmented control and a 32px Button are the same 32px from one source.
 *
 * No new contrast pair. The track paints bg-primary, so the selected tint
 * always composites onto bgPrimary, the surface the gate measures
 * fgAccent/fillTintAccent on, even on a Panel (the same move as Count's
 * attention backdrop, D124). Unselected text is fgSecondary on bgPrimary, and
 * fgPrimary on fillNeutral3 on hover; both are gated.
 *
 * The selected segment draws a 1px inset ring in fg-accent (WCAG 1.4.11): the
 * tint alone is far below 3:1 against an unselected segment. fgAccent on
 * bgPrimary is gated at 4.5, so the ring clears 3:1 without a pair of its own.
 *
 * radius is radius-full, not --psi-control-radius: pill-ness is component
 * identity, as for Tag and Switch (D56). fg-disabled is not gated (WCAG 1.4.3
 * exempts disabled text), as for --psi-tabs-fg-disabled. */
export const segmentedVars: Record<string, string> = {
  bg: "var(--psi-bg-primary)",
  border: "var(--psi-border-neutral)",
  fg: "var(--psi-fg-secondary)",
  "fg-hover": "var(--psi-fg-primary)",
  "bg-hover": "var(--psi-fill-neutral3)",
  "selected-bg": "var(--psi-fill-tint-accent)",
  "selected-fg": "var(--psi-fg-accent)",
  "selected-ring": "var(--psi-fg-accent)",
  "fg-disabled": "var(--psi-fg-quaternary)",
  "focus-ring": "var(--psi-border-focus)",
  radius: "var(--psi-radius-full)",
  inset: "var(--psi-space-2)",
  "24-height": "var(--psi-control-24-height)",
  "32-height": "var(--psi-control-32-height)",
  "40-height": "var(--psi-control-40-height)",
  "24-padding-x": "var(--psi-control-24-padding-inline)",
  "32-padding-x": "var(--psi-control-32-padding-inline)",
  "40-padding-x": "var(--psi-control-40-padding-inline)",
  "24-font": "var(--psi-control-24-font)",
  "32-font": "var(--psi-control-32-font)",
  "40-font": "var(--psi-control-40-font)",
};
