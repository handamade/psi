/** Field component tokens (--psi-field-*). Label/message/error colors alias
 * gated semantic fg tokens; gap is the label→control→message grid gap (D49). */
export const fieldVars: Record<string, string> = {
  "label-fg": "var(--psi-fg-secondary)",
  "message-fg": "var(--psi-fg-tertiary)",
  "error-fg": "var(--psi-fg-danger)",
  "marker-fg": "var(--psi-fg-danger)",
  // D84: the word a required label shows instead of the asterisk. The label's
  // own colour — gated at 4.5 on every surface — not marker-fg, which would
  // make every required label read as an error, and not fg-tertiary, the one
  // foreground the contrast matrix does not gate.
  "required-text-fg": "var(--psi-fg-secondary)",
  gap: "var(--psi-space-6)",
};
