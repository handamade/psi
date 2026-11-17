/** Shared popup tokens (--psi-popup-*) — D131. A token-only family with no
 * component behind it, same posture as surface.ts (D51) and control.ts
 * (D54): each popup aliases it (Menu now, Combobox next), so a theme retunes
 * every popup in one line and can still override one. Nothing binds it
 * directly (psi/component-tokens-only).
 *
 * max-height caps a popup's block size; past it the popup scrolls. 320px is
 * about 8.7 rows of 36px, so a cut-off ninth row shows that it scrolls. A
 * length, not a colour: no contrast pair, and no -fg/-bg/-border segment, so
 * the scope gate leaves it unscoped, like --psi-field-stack-max-width (D125). */
export const popupVars: Record<string, string> = {
  "max-height": "320px",
};
