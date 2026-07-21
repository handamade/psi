/** Dialog component tokens (--psi-dialog-*). Elevated surface — binds the
 * shared --psi-surface-* family (D51); backdrop reuses the heavy scrim the
 * NavBar glass treatment uses (D50). `fg` binds the panel's body foreground
 * so the native <dialog> UA stylesheet's `color: CanvasText` never leaks
 * through on dark themes (VR catch). */
export const dialogVars: Record<string, string> = {
  bg: "var(--psi-surface-bg)",
  border: "var(--psi-surface-border)",
  radius: "var(--psi-surface-radius)",
  backdrop: "var(--psi-scrim-heavy)",
  fg: "var(--psi-fg-primary)",
  "title-fg": "var(--psi-fg-primary)",
};
