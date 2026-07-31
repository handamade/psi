/** Checkbox component tokens (--psi-checkbox-*). */
export const checkboxVars: Record<string, string> = {
  fg: "var(--psi-fg-primary)",
  "box-bg": "var(--psi-bg-primary)",
  "box-border": "var(--psi-border-neutral)",
  "box-bg-checked": "var(--psi-fill-accent)",
  "box-border-checked": "var(--psi-fill-accent)",

  // D56: tracks a sharper theme down, never rounder than radius-4 — the box
  // is ~16px, so the 8px control default would read as a circle.
  "box-radius": "min(var(--psi-control-radius), var(--psi-radius-4))",

  "check-fg": "var(--psi-fg-on-accent)",
  "focus-ring": "var(--psi-border-focus)",
};
