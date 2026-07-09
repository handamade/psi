/** Viewport breakpoints in px — build-time constants (D31): CSS custom
 * properties can't drive @media, so these are exported JS values baked into
 * emitted media queries. */
export const breakpoints = { sm: 560, md: 960 } as const;

/** Page container metrics in px. gutterNarrow applies under breakpoints.md. */
export const container = { max: 1312, gutter: 40, gutterNarrow: 24 } as const;

/** Stacking rungs. */
export const zIndex = { nav: 100, overlay: 1000, tooltip: 1100 } as const;
