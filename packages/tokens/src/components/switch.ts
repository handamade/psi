/** Switch component tokens (--psi-switch-*). */
export const switchVars: Record<string, string> = {
  fg: "var(--psi-fg-primary)",
  /** D122: the unchecked track is the gated control fill (3:1 on its surface,
   * and the white thumb 3:1 on it), not fillNeutral4 (1.10-1.27). */
  "track-bg": "var(--psi-fill-control)",
  "track-bg-hover": "var(--psi-fill-control-hover)",
  "track-bg-checked": "var(--psi-fill-accent)",
  "thumb-bg": "var(--psi-fill-static-white)",
  "focus-ring": "var(--psi-border-focus)",
};
