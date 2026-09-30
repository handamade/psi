/** Focus-ring geometry in px (D82). One ring for every focusable part:
 * `width` is the outline width, `offset` places the ring outside a control,
 * `offsetInset` inside one whose outside ring would be clipped or would land
 * on a neighbour (Input, Select, Tab, TabPanel, Menu item, Dialog).
 *
 * px, not rem: a ring is a hairline. And `offsetInset` is a literal rather
 * than -1 × width: a custom property holding var() is computed where it is
 * declared, at :root, so a width overridden on a themed sub-tree would never
 * reach it. */
export const focusRing = { width: 2, offset: 2, offsetInset: -2 } as const;
