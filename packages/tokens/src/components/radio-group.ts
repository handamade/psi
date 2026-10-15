/** RadioGroup / Radio component tokens (--psi-radio-group-*) — D104. One
 * module serves both, so one prefix. The checkbox's recipe on a circle: the
 * checked circle fills with the accent and shows a dot in fg-on-accent,
 * exactly the checkbox's checked pair, already gated. No new contrast pair. */
export const radioGroupVars: Record<string, string> = {
  fg: "var(--psi-fg-primary)",
  "circle-bg": "var(--psi-bg-primary)",
  "circle-border": "var(--psi-border-neutral)",
  "circle-bg-checked": "var(--psi-fill-accent)",
  "circle-border-checked": "var(--psi-fill-accent)",
  "dot-fg": "var(--psi-fg-on-accent)",
  "focus-ring": "var(--psi-border-focus)",
};
