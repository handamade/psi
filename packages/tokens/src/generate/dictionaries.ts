import type { ChromaWord, RadiusRung } from "./types.js";

/** Keyword → accent hue in OKLCH degrees. */
export const HUES: Readonly<Record<string, number>> = {
  ocean: 235, sea: 225, water: 220, sky: 215, lagoon: 200, aqua: 185,
  cyan: 195, teal: 190, midnight: 260, navy: 255, space: 265, cosmic: 280,
  forest: 145, moss: 130, sage: 140, mint: 165, jungle: 150, olive: 105,
  lime: 120, sunset: 35, ember: 30, fire: 28, rust: 30, terracotta: 35,
  desert: 65, sand: 75, gold: 85, amber: 75, honey: 80, mustard: 90,
  violet: 295, grape: 290, lavender: 285, plum: 320, orchid: 310,
  rose: 350, blush: 355, coral: 20, salmon: 25, crimson: 15, wine: 5,
  slate: 240, storm: 245, graphite: 250, cyber: 195, matrix: 140, retro: 40,
};

/** Keyword → chroma character. */
export const CHROMAS: Readonly<Record<string, ChromaWord>> = {
  muted: "muted", faded: "muted", minimal: "muted", quiet: "muted",
  misty: "muted", noir: "muted",
  calm: "calm", soft: "calm", gentle: "calm", pastel: "calm", zen: "calm",
  clean: "calm", simple: "calm", elegant: "calm",
  bold: "vivid", punchy: "vivid", loud: "vivid", hot: "vivid",
  vivid: "vivid", saturated: "vivid",
  neon: "electric", electric: "electric", candy: "electric",
  cyber: "electric", circus: "electric",
};

/** Words that imply the brand is shown dark-first, or light-first. */
export const DARK_WORDS: ReadonlySet<string> = new Set([
  "midnight", "noir", "dark", "night", "space", "cosmic", "cyber", "matrix",
  "storm", "graphite", "eclipse", "shadow", "deep",
]);

export const LIGHT_WORDS: ReadonlySet<string> = new Set([
  "light", "bright", "sunrise", "dawn", "day", "airy", "pastel", "cream",
  "paper", "linen", "snow", "clean",
]);

/** Keyword → on-scale radius rung (D56). */
export const RADII: Readonly<Record<string, RadiusRung>> = {
  sharp: 4, brutalist: 4, technical: 4, precise: 4, editorial: 4,
  crisp: 6, modern: 6, tailored: 6,
  soft: 12, friendly: 12, round: 12, playful: 12, whimsy: 12, candy: 12,
};

/**
 * Font roles by character. Psi ships no font files (D29) — this assigns roles
 * only, and consumers load the webfonts.
 */
export const FONT_SETS: Readonly<Record<string, { display: string; sans: string }>> = {
  editorial: { display: "Fraunces", sans: "Inter" },
  technical: { display: "IBM Plex Sans", sans: "IBM Plex Sans" },
  friendly: { display: "Nunito", sans: "Nunito Sans" },
};
