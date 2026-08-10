import { CHROMAS, DARK_WORDS, FONT_SETS, HUES, LIGHT_WORDS, RADII } from "./dictionaries.js";
import { CHROMA_WORDS, RADIUS_RUNGS, type BrandVector, type ChromaWord, type RadiusRung } from "./types.js";

/** FNV-1a, 32-bit. Seeds the PRNG so unknown prompts still derive something
 * coherent, and the same prompt always derives the same brand. */
export function fnv1a(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small counter-based PRNG. Deterministic given its seed. */
export function seededRandom(seed: number): () => number {
  let t = seed | 0;
  return () => {
    t = (t + 1831565813) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function slugify(prompt: string): string {
  const slug = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  // A name must start with a letter to be a valid identifier stem.
  return /^[a-z]/.test(slug) ? slug : `brand-${fnv1a(prompt).toString(36)}`;
}

function firstMatch<T>(words: string[], table: Readonly<Record<string, T>>): T | undefined {
  for (const w of words) {
    const hit = table[w];
    if (hit !== undefined) return hit;
  }
  return undefined;
}

export function parsePrompt(prompt: string): BrandVector {
  const normalized = prompt.trim().toLowerCase();
  const words = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  const rand = seededRandom(fnv1a(normalized));

  const hue = firstMatch(words, HUES) ?? Math.floor(rand() * 360);

  const chroma: ChromaWord =
    firstMatch(words, CHROMAS) ??
    CHROMA_WORDS[Math.floor(rand() * CHROMA_WORDS.length)]!;

  const hasDark = words.some((w) => DARK_WORDS.has(w));
  const hasLight = words.some((w) => LIGHT_WORDS.has(w));
  // A prompt naming both, or neither, leans light — the site's default.
  const mode: BrandVector["mode"] = hasDark && !hasLight ? "dark" : "light";

  const radius: RadiusRung =
    firstMatch(words, RADII) ?? RADIUS_RUNGS[Math.floor(rand() * RADIUS_RUNGS.length)]!;

  const fontSet = firstMatch(
    words,
    Object.fromEntries(Object.keys(FONT_SETS).map((k) => [k, k])),
  );

  return {
    hue,
    chroma,
    mode,
    radius,
    ...(fontSet ? { fonts: FONT_SETS[fontSet] } : {}),
    name: slugify(normalized),
  };
}
