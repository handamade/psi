/** Shared sized-control ramp (--psi-control-*) — D54/D55. A token-only family
 * with no component behind it, same posture as surface.ts (D51): Button,
 * IconButton, Input and Select alias it and nothing binds it directly (the
 * psi/component-tokens-only stylelint rule makes that a lint error).
 *
 * Height and gap are shared across roles. Padding and font fork: a centred
 * label wants more air than a left-aligned value, and labels are medium
 * while values are regular. Input and Select both bind the value ramp, so
 * they cannot diverge from each other — that is the point of the family.
 *
 * The icon inset is the label ramp minus the text inset, derived so a
 * text-only control renders pixel-identical to pre-D54 output:
 *
 *   size | p (icon side) | text inset | raw gap | icon side | icon-text | text side
 *     24 |       6       |     2      |    2    |     6     |     4     |     8
 *     32 |       8       |     4      |    4    |     8     |     8     |    12
 *     40 |      12       |     4      |    4    |    12     |     8     |    16
 *     48 |      16       |     4      |    4    |    16     |     8     |    20
 *
 * The emitted padding-inline-icon and gap tokens are the effective columns. */
export const controlVars: Record<string, string> = {
  // ── Shared across roles ────────────────────────────────────────
  "24-height": "var(--psi-size-24)",
  "32-height": "var(--psi-size-32)",
  "40-height": "var(--psi-size-40)",
  "48-height": "var(--psi-size-48)",

  "24-gap": "var(--psi-space-4)",
  "32-gap": "var(--psi-space-8)",
  "40-gap": "var(--psi-space-8)",
  "48-gap": "var(--psi-space-8)",

  // ── Label ramp (Button, IconButton) ────────────────────────────
  "24-padding-inline": "var(--psi-space-8)",
  "32-padding-inline": "var(--psi-space-12)",
  "40-padding-inline": "var(--psi-space-16)",
  "48-padding-inline": "var(--psi-space-20)",

  "24-padding-inline-icon": "var(--psi-space-6)",
  "32-padding-inline-icon": "var(--psi-space-8)",
  "40-padding-inline-icon": "var(--psi-space-12)",
  "48-padding-inline-icon": "var(--psi-space-16)",

  "24-font": "var(--psi-text-12-16-medium)",
  "32-font": "var(--psi-text-14-20-medium)",
  "40-font": "var(--psi-text-16-24-medium)",
  "48-font": "var(--psi-text-18-28-medium)",

  // ── Value ramp (Input, Select) ─────────────────────────────────
  "value-24-padding-inline": "var(--psi-space-8)",
  "value-32-padding-inline": "var(--psi-space-8)",
  "value-40-padding-inline": "var(--psi-space-12)",
  "value-48-padding-inline": "var(--psi-space-16)",

  "value-24-font": "var(--psi-text-12-16-regular)",
  "value-32-font": "var(--psi-text-14-20-regular)",
  "value-40-font": "var(--psi-text-16-24-regular)",
  "value-48-font": "var(--psi-text-18-28-regular)",
};
