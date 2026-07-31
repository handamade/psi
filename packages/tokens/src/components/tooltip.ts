/** Tooltip component tokens (--psi-tooltip-*). Inverted colors: dark bg, light fg. */
export const tooltipVars: Record<string, string> = {
  bg: "var(--psi-bg-inverted)",
  fg: "var(--psi-fg-on-inverted)",

  // D56: tracks a sharper theme down, never rounder than radius-6.
  radius: "min(var(--psi-control-radius), var(--psi-radius-6))",
};
