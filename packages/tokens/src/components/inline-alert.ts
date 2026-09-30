/** InlineAlert component tokens (--psi-inline-alert-*) — D86. Pure
 * indirection, same posture as banner.ts.
 *
 * The same tinted surface as Banner, but it sits inside content, so it adds a
 * 1px border in the variant's colour and a radius. Neutral sits on
 * fillNeutral3 with borderNeutral; the status variants draw the border from
 * the status foreground (fgSuccess and fgWarning carry the `border` scope
 * since D86, so the D46 scope gate accepts these bindings).
 *
 * The body text is fgPrimary on all four surfaces; fgPrimary on each
 * fillTint* is gated at 4.5 in contrast-matrix.ts (D86). */
export const inlineAlertVars: Record<string, string> = {
  "bg-neutral": "var(--psi-fill-neutral3)",
  "bg-success": "var(--psi-fill-tint-success)",
  "bg-warning": "var(--psi-fill-tint-warning)",
  "bg-danger": "var(--psi-fill-tint-danger)",
  fg: "var(--psi-fg-primary)",
  "icon-fg-neutral": "var(--psi-fg-secondary)",
  "icon-fg-success": "var(--psi-fg-success)",
  "icon-fg-warning": "var(--psi-fg-warning)",
  "icon-fg-danger": "var(--psi-fg-danger)",
  "border-neutral": "var(--psi-border-neutral)",
  "border-success": "var(--psi-fg-success)",
  "border-warning": "var(--psi-fg-warning)",
  "border-danger": "var(--psi-fg-danger)",
  radius: "var(--psi-radius-8)",
};
