/** Motion duration scale in ms (WS3). Zeroed under prefers-reduced-motion (D30). */
export const durationScale = [150, 200, 350, 450, 600] as const;

/** Named easing curves. `soft` is the signature glide (portfolio thumbnails/cards). */
export const easings = {
  standard: "ease",
  "in-out": "ease-in-out",
  soft: "cubic-bezier(0.2, 0.6, 0.2, 1)",
} as const;
