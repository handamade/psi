/** Motion duration scale in ms (WS3). Zeroed under prefers-reduced-motion (D30). */
export const durationScale = [150, 200, 350, 450, 600] as const;

/** Named easing curves. `soft` is the signature glide (portfolio thumbnails/cards). */
export const easings = {
  standard: "ease",
  "in-out": "ease-in-out",
  soft: "cubic-bezier(0.2, 0.6, 0.2, 1)",
} as const;

export interface MotionPreset {
  duration: (typeof durationScale)[number];
  ease: keyof typeof easings;
  /** What the motion is for: the question a component author answers to pick one. */
  intent: string;
}

/** Motion presets (D141): a duration and an easing chosen together, named by
 * intent. Each is emitted as two tokens, `--psi-motion-<name>-duration` and
 * `--psi-motion-<name>-ease`, that alias the scale, so reduced motion (D30)
 * reaches them through the duration and a component's own motion tokens can
 * point at each half. Every transition in Psi's component CSS binds one;
 * Skeleton's infinite pulse (D86) and `.psi-media-tint` (D35) stay on the scale. */
export const motionPresets = {
  feedback: {
    duration: 150,
    ease: "standard",
    intent: "A control answers a pointer or a key: a colour, a border, an outline, a chevron's turn, a toggle's thumb.",
  },
  move: {
    duration: 200,
    ease: "soft",
    intent: "Something enters, leaves or changes size: a dialog, a drawer, a toast, a sidebar.",
  },
  emphasis: {
    duration: 350,
    ease: "standard",
    intent: "A deliberate, noticeable change that draws the eye to one thing, such as a card's hover lift.",
  },
} as const satisfies Record<string, MotionPreset>;

export type MotionPresetName = keyof typeof motionPresets;
