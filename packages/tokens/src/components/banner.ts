/** Banner component tokens (--psi-banner-*) — D86. Pure indirection, same
 * posture as toast.ts (D64) and table.ts (D62).
 *
 * Unlike Toast, a Banner is a tinted surface: it spans the page edge to edge
 * and is meant to be seen, so the variant tints the whole strip. Neutral sits
 * on fillNeutral3, the status variants on the fillTint* family.
 *
 * The body text is fgPrimary on all four surfaces; fgPrimary on each
 * fillTint* is gated at 4.5 in contrast-matrix.ts (D86). The icon foregrounds
 * are not text and ride the status-foreground pairs already gated there. */
export const bannerVars: Record<string, string> = {
  "bg-neutral": "var(--psi-fill-neutral3)",
  "bg-success": "var(--psi-fill-tint-success)",
  "bg-warning": "var(--psi-fill-tint-warning)",
  "bg-danger": "var(--psi-fill-tint-danger)",
  fg: "var(--psi-fg-primary)",
  "icon-fg-neutral": "var(--psi-fg-secondary)",
  "icon-fg-success": "var(--psi-fg-success)",
  "icon-fg-warning": "var(--psi-fg-warning)",
  "icon-fg-danger": "var(--psi-fg-danger)",
};
