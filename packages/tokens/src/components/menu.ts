/** Menu component tokens (--psi-menu-*) — D53. Container is pure indirection
 * onto the shared surface family (same posture as panel.ts and dialog.ts);
 * item states reuse Button's ghost recipe rather than introducing anchors, so
 * a brand retuning --psi-surface-* gets Menu for free. */
export const menuVars: Record<string, string> = {
  bg: "var(--psi-surface-bg)",
  border: "var(--psi-surface-border)",
  radius: "var(--psi-surface-radius)",
  fg: "var(--psi-fg-primary)",
  "item-bg": "transparent",
  "item-bg-hover": "var(--psi-fill-neutral3)",
  "item-bg-active": "var(--psi-fill-neutral4)",
  "item-fg": "var(--psi-fg-primary)",
  "item-fg-danger": "var(--psi-fg-danger)",
  "item-fg-disabled": "var(--psi-fg-quaternary)",
  "separator-border": "var(--psi-border-faint)",
};
