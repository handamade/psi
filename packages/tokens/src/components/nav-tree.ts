/** NavTree component tokens (--psi-nav-tree-*) — D88. Pure indirection onto the
 * semantic layer (same posture as menu.ts and tabs.ts), so every key resolves
 * under a `data-psi-theme="dark"` sidebar inside a light page: component
 * tokens are declared under `:where(:root, [data-psi-theme])`.
 *
 * No new contrast pairs: wcagAAPairs already gates fgPrimary and fgSecondary
 * on bgPrimary and on fillNeutral1-6 in every theme, dark included, which
 * covers the item text on the sidebar, on the hover surface (neutral3) and on
 * the current surface (neutral4). `indicator` and `focus-ring` are non-text
 * accents and `radius` is geometry; none carries a gated pair, so the pinned
 * pair count does not move. `icon-size` and `icon-gap` (D124) are geometry, so
 * they carry no gated pair.
 *
 * D138 adds no pair either. The icon colours default to `currentColor` (the
 * text's, already gated) and the icons are decorative; the guide line is
 * decorative structure (the indent and the group's button carry it), and the
 * bar stays a non-text accent. `item-icon-fg` and `group-icon-fg` end in -fg
 * (scope: text, bound to `color`); `guide-border` ends in -border (scope:
 * border, bound to `border-inline-start`). The rest is geometry. */
export const navTreeVars: Record<string, string> = {
  "item-fg": "var(--psi-fg-secondary)",
  "item-fg-current": "var(--psi-fg-primary)",
  "item-bg-hover": "var(--psi-fill-neutral3)",
  "item-bg-current": "var(--psi-fill-neutral4)",
  // The inline-start bar on the current item: weight and surface carry the
  // state too, so colour is never the only signal.
  indicator: "var(--psi-fill-accent)",
  // A group's button reads like its items, one step quieter than the current.
  "group-fg": "var(--psi-fg-secondary)",
  // Alias of the control radius dial: a CSS Module may bind only its own
  // component prefix, and the radius lives outside it.
  radius: "var(--psi-control-radius)",
  "focus-ring": "var(--psi-border-focus)",
  // D124: an icon before an entry's or a group's label. Half the entry's
  // height, as D97 sizes a button's icon, which is 16 like the group chevron.
  "icon-size": "calc(var(--psi-size-32) / 2)",
  "icon-gap": "var(--psi-space-8)",
  // D138: an icon's colour apart from its text. Two keys, because a look can
  // move them in opposite directions (a group's icon louder than its label, an
  // entry's quieter than its text). `currentColor` is the text's colour, so the
  // defaults change nothing. The current entry's icon (aria-current page or
  // true) always follows its text: there is no item-icon-fg-current.
  "item-icon-fg": "currentColor",
  "group-icon-fg": "currentColor",
  // D138: a line along an open group's entries, centred under the group's
  // icon. Psi computes its column from the button's padding and icon-size;
  // there is no column token. Only a group with an icon draws it. `0px` draws
  // nothing; keep the unit, since the width is used inside calc().
  "guide-width": "0px",
  "guide-border": "var(--psi-border-strong)",
  // D138: the current page's bar. With a guide line drawn, the bar in that
  // group moves onto the line's column, computed from the same geometry.
  "indicator-width": "3px",
  "indicator-inset-block": "0",
  "indicator-radius": "var(--psi-nav-tree-radius)",
};
