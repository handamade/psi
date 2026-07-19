/** Field component tokens (--psi-field-*). Label/message/error colors alias
 * gated semantic fg tokens; gap is the label→control→message grid gap (D49). */
export const fieldVars: Record<string, string> = {
  "label-fg": "var(--psi-fg-secondary)",
  "message-fg": "var(--psi-fg-tertiary)",
  "error-fg": "var(--psi-fg-danger)",
  "marker-fg": "var(--psi-fg-danger)",
  gap: "var(--psi-space-6)",
};
