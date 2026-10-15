/** Textarea component tokens (--psi-textarea-*) — D104. Pure aliases of the
 * input's semantics and the 32px value ramp, so a multi-line field reads as
 * the same control family as Input. Every value is an existing gated
 * semantic; counter-fg is fg-secondary, gated at 4.5 on every surface. No
 * size ramp: a textarea's height is its rows, not a control size. */
export const textareaVars: Record<string, string> = {
  bg: "var(--psi-bg-primary)",
  fg: "var(--psi-fg-primary)",
  placeholder: "var(--psi-fg-tertiary)",
  border: "var(--psi-border-neutral)",
  "border-hover": "var(--psi-border-strong)",
  "border-error": "var(--psi-fg-danger)",
  "focus-ring": "var(--psi-border-focus)",
  radius: "var(--psi-control-radius)",
  "padding-inline": "var(--psi-control-value-32-padding-inline)",
  font: "var(--psi-control-value-32-font)",
  "counter-fg": "var(--psi-fg-secondary)",
};
