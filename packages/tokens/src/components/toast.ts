/** Toast component tokens (--psi-toast-*) — D64/D65. Pure indirection, same
 * posture as menu.ts (D53) and table.ts (D62): the card aliases the shared
 * surface family, so a brand retuning --psi-surface-* gets Toast for free.
 *
 * The variant lives in the status icon's colour only — Toast is an elevated
 * surface card, not a tinted one (a stack of three saturated cards is the
 * loudest thing on the screen, and a tint fights the elevated-surface language
 * every other overlay speaks). The tinted alternative was measured and also
 * passes contrast; it is rejected on design grounds, not on the gate.
 *
 * Note there is NO shadow key: --psi-shadow-* does not exist in any form, and
 * neither Menu nor Dialog declares a box-shadow. Psi's elevated surfaces are
 * border + background. Do not write --psi-shadow-overlay.
 *
 * The three semantic icon foregrounds sit on bgSecondary (what --psi-surface-bg
 * resolves to), so contrast-matrix.ts gates fgSuccess/fgWarning/fgDanger there
 * as well as on bgPrimary. Tightest measured margin is 5.87 (light) against a
 * 4.5 floor. */
export const toastVars: Record<string, string> = {
  bg: "var(--psi-surface-bg)",
  border: "var(--psi-surface-border)",
  radius: "var(--psi-surface-radius)",
  fg: "var(--psi-fg-primary)",
  "icon-fg-neutral": "var(--psi-fg-secondary)",
  "icon-fg-success": "var(--psi-fg-success)",
  "icon-fg-warning": "var(--psi-fg-warning)",
  "icon-fg-danger": "var(--psi-fg-danger)",
};
