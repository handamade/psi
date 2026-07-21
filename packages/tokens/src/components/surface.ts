/** Shared elevated-surface tokens (--psi-surface-*) — D51. The recipe two
 * consumers converged on independently (Dialog's panel, promo's hand-rolled
 * .card): secondary background, faint hairline, radius-12, space-24
 * padding. Dialog and Panel bind these; there is no Surface component. */
export const surfaceVars: Record<string, string> = {
  bg: "var(--psi-bg-secondary)",
  border: "var(--psi-border-faint)",
  radius: "var(--psi-radius-12)",
  padding: "var(--psi-space-24)",
};
