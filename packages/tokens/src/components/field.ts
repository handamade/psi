/** Field component tokens (--psi-field-*). Label/message/error colors alias
 * gated semantic fg tokens; gap is the label→control→message grid gap (D49).
 *
 * label-height (D92) is the label's line box: the line height of
 * --psi-text-14-20-medium, which the label's `font` shorthand sets. A font
 * shorthand exposes no line-height variable to read, and --psi-space-* is
 * scoped to gap/padding/margin, so the height is a standalone 20px literal
 * (the --psi-toolbar-control-width precedent). The label holds it as its
 * min-block-size, and --psi-toolbar-action-offset is derived from it, so a
 * filter row's unlabelled button and its labelled controls read one source.
 * Change it together with the label's font. */
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
  "label-height": "20px",
};
