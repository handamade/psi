/** Viewport breakpoints in px — build-time constants (D31): CSS custom
 * properties can't drive @media, so these are exported JS values baked into
 * emitted media queries. */
export const breakpoints = { sm: 560, md: 960 } as const;

/** Container-query thresholds in px — build-time constants like breakpoints
 * (D31), written as literals in the CSS that queries them. fieldStackColumns
 * (D115): below this width of its own, a FieldStack's fields put their labels
 * back above their controls. It measures the form, not the viewport, so it
 * sits below breakpoints.sm: a form in a 520px dialog keeps its label column. */
export const containerQueries = { fieldStackColumns: 480 } as const;

/** Page container metrics in px. gutterNarrow applies under breakpoints.md. */
export const container = { max: 1312, gutter: 40, gutterNarrow: 24 } as const;

/** Stacking rungs. `sticky` is deliberately low: it stacks a component
 * above content within its own local scroll container (e.g. a sticky
 * table header over its body rows), not above page chrome — unlike
 * nav/overlay/tooltip, which stack above the whole page. */
export const zIndex = { sticky: 1, nav: 100, overlay: 1000, tooltip: 1100 } as const;
