import type { BrandFonts } from "../themes/customers/index.js";

export type ChromaWord = "muted" | "calm" | "balanced" | "vivid" | "electric";
export type RadiusRung = 4 | 6 | 8 | 12;

export const RADIUS_RUNGS: readonly RadiusRung[] = [4, 6, 8, 12];
export const CHROMA_WORDS: readonly ChromaWord[] = [
  "muted",
  "calm",
  "balanced",
  "vivid",
  "electric",
];

/**
 * The whole contract between a prompt and a theme (D57). Every producer of one
 * is untrusted — the model behind /api/theme returns this, never colours, so
 * nothing can reach a rendered colour without passing through the AA solver.
 *
 * `mode` is a presentation hint, not a derivation input: both members of the
 * pair are always derived, and `mode` only decides which is shown first.
 */
export interface BrandVector {
  hue: number;
  chroma: ChromaWord;
  mode: "light" | "dark";
  radius: RadiusRung;
  fonts?: BrandFonts;
  name: string;
}

const FONT_ROLES = ["sans", "serif", "mono", "display"] as const;

function isFonts(value: unknown): value is BrandFonts {
  if (typeof value !== "object" || value === null) return false;
  return Object.entries(value).every(
    ([k, v]) =>
      (FONT_ROLES as readonly string[]).includes(k) && typeof v === "string",
  );
}

/** Schema check over a closed set. Anything failing this is discarded and the
 * local derivation stands — see api/theme.ts and the promo boot script. */
export function isBrandVector(value: unknown): value is BrandVector {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.hue !== "number" || !Number.isFinite(v.hue)) return false;
  if (v.hue < 0 || v.hue >= 360) return false;
  if (!CHROMA_WORDS.includes(v.chroma as ChromaWord)) return false;
  if (v.mode !== "light" && v.mode !== "dark") return false;
  if (!RADIUS_RUNGS.includes(v.radius as RadiusRung)) return false;
  // The length bound is not cosmetic: `name` becomes a filename and a
  // TypeScript identifier, and this guard is the only thing between an
  // untrusted producer and both. parsePrompt's own slugify caps at 48.
  if (typeof v.name !== "string" || v.name.length > 64) return false;
  // Single interior hyphens only — no consecutive, no trailing. The looser
  // `^[a-z][a-z0-9-]*$` admitted `a--b` and `ab-`, which `serialize.ts`'s
  // `ident()` turned into `a-B` and `ab-`: literal hyphens inside a TypeScript
  // identifier, i.e. an emitted `customers/<name>.ts` that does not parse.
  // parsePrompt's slugify already collapses runs and strips trailing hyphens,
  // so nothing it produces is affected — this closes the untrusted path (the
  // model-supplied name in api/theme.ts, and stored brands).
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(v.name)) return false;
  if (v.fonts !== undefined && !isFonts(v.fonts)) return false;
  return true;
}
