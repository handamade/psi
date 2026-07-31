/** Input component tokens (--psi-input-*). */
export const inputVars: Record<string, string> = {
  bg: "var(--psi-bg-primary)",
  fg: "var(--psi-fg-primary)",
  placeholder: "var(--psi-fg-tertiary)",
  border: "var(--psi-border-neutral)",
  "border-hover": "var(--psi-border-strong)",
  "border-error": "var(--psi-fg-danger)",
  "focus-ring": "var(--psi-border-focus)",

  // ── Shape (D56) ──
  radius: "var(--psi-control-radius)",

  // ── Size ramp (D54) — value ramp, shared with Select ──
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
};
