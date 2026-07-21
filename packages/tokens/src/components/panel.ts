/** Panel component tokens (--psi-panel-*) — D51. Pure indirection onto the
 * shared surface family; exists because component CSS may only bind its own
 * family (psi/component-tokens-only). Brands retune panels and dialogs
 * together by overriding --psi-surface-*. */
export const panelVars: Record<string, string> = {
  bg: "var(--psi-surface-bg)",
  border: "var(--psi-surface-border)",
  radius: "var(--psi-surface-radius)",
  padding: "var(--psi-surface-padding)",
};
