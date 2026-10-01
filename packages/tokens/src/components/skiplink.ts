/** SkipLink component tokens (--psi-skiplink-*) — D88. Pure indirection onto
 * the shared surface and focus tokens (same posture as menu.ts and
 * navbar.ts): the link shows only when focused, on a surface, so a brand
 * retuning --psi-surface-* gets it for free. radius rides the control radius
 * dial, as Button's does, so the link matches the controls around it. */
export const skiplinkVars: Record<string, string> = {
  bg: "var(--psi-surface-bg)",
  fg: "var(--psi-fg-primary)",
  border: "var(--psi-surface-border)",
  radius: "var(--psi-control-radius)",
  "focus-ring": "var(--psi-border-focus)",
};
