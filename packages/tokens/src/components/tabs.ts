/** Tabs component tokens (--psi-tabs-*) — D67. Pure indirection, same posture
 * as menu.ts (D53), table.ts (D62) and toast.ts (D64): colour aliases the
 * semantic layer, geometry aliases the D54/D55 control ramp so a 32px tab and
 * a 32px Button are the same 32px from one source.
 *
 * No new contrast pairs: fgAccent and fgSecondary on bgPrimary are already in
 * wcagAAPairs, and the geometry keys carry no bg/fg/border segment so
 * keyGroup() returns undefined and they stay out of both D46 gates.
 *
 * fg-disabled is deliberately NOT contrast-gated. Disabled text is exempt from
 * WCAG 1.4.3, and gating it would force a contrast that defeats the
 * affordance — the same reasoning behind Menu's item-fg-disabled, which binds
 * the same token. */
export const tabsVars: Record<string, string> = {
  fg: "var(--psi-fg-secondary)",
  "fg-selected": "var(--psi-fg-accent)",
  "fg-disabled": "var(--psi-fg-quaternary)",
  "bg-hover": "var(--psi-fill-neutral3)",
  indicator: "var(--psi-fill-accent)",
  "list-border": "var(--psi-border-faint)",
  "focus-ring": "var(--psi-border-focus)",
  "32-height": "var(--psi-control-32-height)",
  "40-height": "var(--psi-control-40-height)",
  "32-padding-x": "var(--psi-control-32-padding-inline)",
  "40-padding-x": "var(--psi-control-40-padding-inline)",
};
