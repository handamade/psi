/** Select component tokens (--psi-select-*). */
export const selectVars: Record<string, string> = {
  bg: "var(--psi-bg-primary)",
  fg: "var(--psi-fg-primary)",
  placeholder: "var(--psi-fg-tertiary)",
  border: "var(--psi-border-neutral)",
  "border-hover": "var(--psi-border-strong)",
  "border-error": "var(--psi-fg-danger)",
  "focus-ring": "var(--psi-border-focus)",
  "chevron-fg": "var(--psi-fg-secondary)",

  // ── Size ramp (D54) — same value ramp as Input, by construction ──
  "24-height": "var(--psi-control-24-height)",
  "32-height": "var(--psi-control-32-height)",
  "40-height": "var(--psi-control-40-height)",
  "48-height": "var(--psi-control-48-height)",

  "24-padding-inline": "var(--psi-control-value-24-padding-inline)",
  "32-padding-inline": "var(--psi-control-value-32-padding-inline)",
  "40-padding-inline": "var(--psi-control-value-40-padding-inline)",
  "48-padding-inline": "var(--psi-control-value-48-padding-inline)",

  "24-font": "var(--psi-control-value-24-font)",
  "32-font": "var(--psi-control-value-32-font)",
  "40-font": "var(--psi-control-value-40-font)",
  "48-font": "var(--psi-control-value-48-font)",

  // Chevron well: the glyph is a fixed 12x12 data URI, so the end padding is
  // offset + 12 + 4 breathing = offset + 16. 28px is not on the spacing
  // scale, so the +16 is expressed as calc rather than a scale step.
  "24-chevron-offset": "var(--psi-control-value-24-padding-inline)",
  "32-chevron-offset": "var(--psi-control-value-32-padding-inline)",
  "40-chevron-offset": "var(--psi-control-value-40-padding-inline)",
  "48-chevron-offset": "var(--psi-control-value-48-padding-inline)",

  "24-padding-inline-end": "calc(var(--psi-control-value-24-padding-inline) + var(--psi-space-16))",
  "32-padding-inline-end": "calc(var(--psi-control-value-32-padding-inline) + var(--psi-space-16))",
  "40-padding-inline-end": "calc(var(--psi-control-value-40-padding-inline) + var(--psi-space-16))",
  "48-padding-inline-end": "calc(var(--psi-control-value-48-padding-inline) + var(--psi-space-16))",
};
