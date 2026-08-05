/** Table component tokens (--psi-table-*) — D62. Pure indirection, same
 * posture as menu.ts (D53) and panel.ts: the container aliases the shared
 * surface family, row states reuse Menu's item recipe, and per-size geometry
 * aliases the D54/D55 control ramp so a 32px row and a 32px Button are the
 * same 32px from one source. A brand retuning --psi-surface-* or the control
 * ramp gets Table for free.
 *
 * row-bg-selected is --psi-fill-tint-accent, the same wash Button and Tag use
 * for accent-subtle. Note --psi-fill-accent2 does NOT exist; do not write it.
 * Geometry keys carry no bg/fg/border segment, so keyGroup() returns undefined
 * and they stay out of scope-map.json and both D46 gates. */
export const tableVars: Record<string, string> = {
  bg: "var(--psi-surface-bg)",
  border: "var(--psi-surface-border)",
  radius: "var(--psi-surface-radius)",
  fg: "var(--psi-fg-primary)",
  "header-fg": "var(--psi-fg-secondary)",
  "cell-border": "var(--psi-border-faint)",
  "row-bg": "transparent",
  "row-bg-hover": "var(--psi-fill-neutral3)",
  "row-bg-selected": "var(--psi-fill-tint-accent)",
  "sort-indicator-fg": "var(--psi-fg-accent)",
  "32-row-height": "var(--psi-control-32-height)",
  "40-row-height": "var(--psi-control-40-height)",
  "48-row-height": "var(--psi-control-48-height)",
  "32-cell-padding-x": "var(--psi-control-32-padding-inline)",
  "40-cell-padding-x": "var(--psi-control-40-padding-inline)",
  "48-cell-padding-x": "var(--psi-control-48-padding-inline)",
};
