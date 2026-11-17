/** Combobox component tokens (--psi-combobox-*) — D130. Pure indirection:
 * the control binds what Select binds, the popup and its options what Menu
 * binds, so the token build's contrast gate already covers every pair and no
 * new formula exists. The popup cap aliases the shared --psi-popup-max-height
 * (D131 amends D130, which gave it a literal of its own). */
export const comboboxVars: Record<string, string> = {
  // ── The control: Select's values ──
  bg: "var(--psi-bg-primary)",
  fg: "var(--psi-fg-primary)",
  placeholder: "var(--psi-fg-tertiary)",
  border: "var(--psi-border-control)",
  "border-hover": "var(--psi-border-control-hover)",
  "border-error": "var(--psi-fg-danger)",
  "focus-ring": "var(--psi-border-focus)",
  "chevron-fg": "var(--psi-fg-secondary)",
  radius: "var(--psi-control-radius)",

  "24-height": "var(--psi-control-24-height)",
  "32-height": "var(--psi-control-32-height)",
  "40-height": "var(--psi-control-40-height)",
  "48-height": "var(--psi-control-48-height)",

  "24-padding-inline": "var(--psi-control-value-24-padding-inline)",
  "32-padding-inline": "var(--psi-control-value-32-padding-inline)",
  "40-padding-inline": "var(--psi-control-value-40-padding-inline)",
  "48-padding-inline": "var(--psi-control-value-48-padding-inline)",

  "24-font": "var(--psi-control-value-24-font)",
  "32-font": "var(--psi-control-value-32-font)",
  "40-font": "var(--psi-control-value-40-font)",
  "48-font": "var(--psi-control-value-48-font)",

  // ── The popup: Menu's surface ──
  "popup-bg": "var(--psi-surface-bg)",
  "popup-border": "var(--psi-surface-border)",
  "popup-radius": "var(--psi-surface-radius)",
  // Past this the popup scrolls, keeping the highlighted option in view.
  "popup-max-height": "var(--psi-popup-max-height)",

  // ── An option: Menu's item values. Hover moves the highlight, so the two
  // share one background. ──
  "option-bg": "transparent",
  "option-bg-highlight": "var(--psi-fill-neutral3)",
  "option-fg": "var(--psi-fg-primary)",
  "option-fg-disabled": "var(--psi-fg-quaternary)",
  "option-check-fg": "var(--psi-fg-primary)",
  "option-description-fg": "var(--psi-fg-secondary)",

  // ── The status and "more" lines: MenuText's value ──
  "status-fg": "var(--psi-fg-secondary)",
};
