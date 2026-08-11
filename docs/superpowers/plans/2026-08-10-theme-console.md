# Theme Console (D57) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A prompt typed into the hero derives a WCAG-AA-solved brand as a light/dark pair, themes the whole page live, and prints the real `customers/<name>.ts` source that produces it.

**Architecture:** A pure `generate/` module in `packages/tokens` turns a prompt into a `BrandVector` (hue, chroma word, mode, radius rung, fonts, name), then derives *both* light and dark members from it, solving each to AA by binary-searching palette anchor lightness. The same module is imported by the browser (live preview), by a new `api/theme.ts` Vercel Function (which returns a `BrandVector`, never colours, so model output can never bypass the solver), and — later, out of scope — by the existing `pnpm new-theme` CLI.

**Tech Stack:** TypeScript ESM (NodeNext), `culori` for colour maths, Vitest, Vite + React 19 for `apps/promo`, Playwright for the site gate, Vercel Functions.

**Spec:** [docs/superpowers/specs/2026-08-10-theme-console-design.md](../specs/2026-08-10-theme-console-design.md)

## Global Constraints

- **Node 24** — `.nvmrc` pins `24`; pnpm dies on Node 20 with `ERR_UNKNOWN_BUILTIN_MODULE`. Run `nvm use` before the first pnpm command in every shell.
- **Dependencies are not installed in this worktree.** Step zero, once: `nvm use && pnpm install`.
- **Branch:** `d57-theme-console`. Create it before Task 1.
- **`dist/` is generated.** Never edit `packages/tokens/dist/*` by hand.
- **Never hardcode colours in component CSS** — bind `var(--psi-*)`. Enforced by the custom stylelint plugin. `apps/promo/src/promo.css` is app CSS, not component CSS, but the same rule is followed: the only colour literals permitted are `oklch(from var(--psi-*) …)` derivations.
- **Sizes are px numbers; scale names are pixel-true.** `--psi-radius-8` is 8px.
- **Radius values are on-scale rungs only** — `4 | 6 | 8 | 12` (D56). Never emit an off-scale radius.
- **One WCAG implementation.** The repo's contrast primitive is culori's `wcagContrast`, already used by `src/contrast-matrix.ts`. `solveL` calls it directly. Do not write a second luminance function. *(The spec says "using `checkContrast` as its predicate"; `checkContrast` takes a whole `ResolvedTheme` and is too heavy for a solver loop. `wcagContrast` is the shared primitive underneath it, so the single-implementation guarantee holds.)*
- **Five gates**, all from the repo root:
  ```bash
  pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site
  ```
  `test:site` needs `apps/promo/dist` to exist — run a full `pnpm build` first.
- **`pnpm vr` is CI-only.** macOS writes junk baselines. Let CI gate it.
- **Every user-visible change carries a changeset.** `packages/tokens` is published; `apps/promo` is not.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/tokens/tsconfig.build.json` | **new** — compiles `src/generate` (+ transitive imports) to `dist/` |
| `packages/tokens/src/generate/types.ts` | `BrandVector`, `DerivedTheme`, `DerivedPair`, `isBrandVector` |
| `packages/tokens/src/generate/dictionaries.ts` | hue / chroma / mode / radius keyword tables + font catalog |
| `packages/tokens/src/generate/prompt.ts` | `fnv1a`, `seededRandom`, `parsePrompt` |
| `packages/tokens/src/generate/palette.ts` | `buildBrandPalette` — one `Palette`, two `SlotMap`s |
| `packages/tokens/src/generate/solve.ts` | `hexFor`, `solveL` — the AA solver |
| `packages/tokens/src/generate/derive.ts` | `deriveTheme` — the light/dark pair, solved |
| `packages/tokens/src/generate/serialize.ts` | `serializeCustomerTheme` — the `.ts` source |
| `packages/tokens/src/generate/index.ts` | public surface of the module |
| `api/theme.ts` | **new** — Vercel Function, model → validated `BrandVector` |
| `apps/promo/src/theme.ts` | rewritten — two orthogonal keys (`psi-theme`, `psi-brand`) |
| `apps/promo/src/PsiMark.tsx` | **new** — inline Ψ SVG, `currentColor` |
| `apps/promo/src/sections/Header.tsx` | Ψ mark + binary light/dark toggle |
| `apps/promo/src/sections/Hero.tsx` | the console; absorbs the Δ-lightness swatches |
| `apps/promo/src/sections/Theming.tsx` | receives the `themes/light.ts` listing |
| `apps/promo/index.html` | boot script: validate mode, apply cached brand pre-paint |
| `apps/promo/site-gate/site.spec.ts` | key rename in lockstep + pinned-demo test |

---

## Phase A — the generator (`packages/tokens`)

### Task 1: Compile `src/generate` to `dist` and export it

`packages/tokens` is the only package that never compiles `src` — its build *generates* CSS/JSON and a one-line `dist/types/index.js`. The `exports` map has no path for source modules, so `apps/promo` and `api/theme.ts` currently cannot import any TypeScript from it. This task opens that door and nothing else, following the `packages/mcp` pattern exactly.

**Files:**
- Create: `packages/tokens/tsconfig.build.json`
- Create: `packages/tokens/src/generate/index.ts` (placeholder export, replaced in Task 2)
- Modify: `packages/tokens/package.json` (`exports`, `build` script)
- Test: `packages/tokens/__tests__/generate-exports.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `@handamade/psi-tokens/generate` resolves to `dist/generate/index.js` with types at `dist/generate/index.d.ts`. Every later task's module lives under `src/generate/`.

- [ ] **Step 1: Write the failing test**

Create `packages/tokens/__tests__/generate-exports.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../package.json"), "utf8"),
) as { exports: Record<string, unknown>; build?: string; scripts: Record<string, string> };

describe("the generate subpath", () => {
  it("is declared in exports with both types and import", () => {
    expect(pkg.exports["./generate"]).toEqual({
      types: "./dist/generate/index.d.ts",
      import: "./dist/generate/index.js",
    });
  });

  it("compiles src before the token build writes dist", () => {
    // tsc must run in the build script, or ./generate resolves to nothing.
    expect(pkg.scripts.build).toContain("tsc -p tsconfig.build.json");
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
pnpm vitest run packages/tokens/__tests__/generate-exports.test.ts
```

Expected: FAIL — `exports["./generate"]` is `undefined`.

- [ ] **Step 3: Add the tsconfig**

Create `packages/tokens/tsconfig.build.json`. `include` is scoped to `src/generate`; tsc follows its imports, so `src/dsl/*` and `src/contrast-matrix.ts` are compiled too. `rootDir: "src"` keeps the emitted tree mirroring `src/`.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src/generate"]
}
```

- [ ] **Step 4: Add the placeholder module**

Create `packages/tokens/src/generate/index.ts`:

```ts
/** Public surface of the theme generator (D57). Populated by Tasks 2–7. */
export const GENERATE_MODULE = "psi-tokens/generate";
```

- [ ] **Step 5: Wire package.json**

In `packages/tokens/package.json`, add to `exports` (after the `"./types"` entry):

```json
    "./generate": {
      "types": "./dist/generate/index.d.ts",
      "import": "./dist/generate/index.js"
    },
```

and change the build script — `tsc` runs first so the token build's own writes are never clobbered:

```json
    "build": "tsc -p tsconfig.build.json && tsx scripts/build.ts",
```

- [ ] **Step 6: Run the test and the build**

```bash
pnpm vitest run packages/tokens/__tests__/generate-exports.test.ts
pnpm --filter @handamade/psi-tokens build
```

Expected: test PASSES; build succeeds.

- [ ] **Step 7: Verify the emitted file list is tight**

```bash
find packages/tokens/dist -name '*.js' -not -path '*/resolved/*' -not -path '*/dtcg/*' | sort
```

Expected: `dist/generate/index.js`, `dist/types/index.js`, and the transitive `dist/dsl/*.js` + `dist/contrast-matrix.js` once later tasks import them. **If `dist/themes/**` or `dist/components/*.js` appear, the include is too broad** — narrow it and re-run. Confirm no `.vars.css` file was overwritten:

```bash
ls packages/tokens/dist/components/*.vars.css | head -3
```

- [ ] **Step 8: Commit**

```bash
git add packages/tokens/tsconfig.build.json packages/tokens/src/generate/index.ts packages/tokens/package.json packages/tokens/__tests__/generate-exports.test.ts
git commit -m "build(tokens): compile src/generate and export the ./generate subpath (D57)"
```

---

### Task 2: `parsePrompt` — free text to a `BrandVector`

Deterministic by construction: an FNV-1a hash of the lowercased prompt seeds a PRNG, so an unrecognised prompt still derives a coherent brand and the same prompt always derives the same one. This is what makes free text safe input with no validation and no error states.

**Files:**
- Create: `packages/tokens/src/generate/types.ts`
- Create: `packages/tokens/src/generate/dictionaries.ts`
- Create: `packages/tokens/src/generate/prompt.ts`
- Test: `packages/tokens/__tests__/generate-prompt.test.ts`

**Interfaces:**
- Consumes: Task 1's module location.
- Produces:
  - `interface BrandVector { hue: number; chroma: ChromaWord; mode: "light" | "dark"; radius: 4|6|8|12; fonts?: BrandFonts; name: string }`
  - `type ChromaWord = "muted" | "calm" | "balanced" | "vivid" | "electric"`
  - `function parsePrompt(prompt: string): BrandVector`
  - `function fnv1a(input: string): number`
  - `function isBrandVector(value: unknown): value is BrandVector`

- [ ] **Step 1: Write the failing test**

Create `packages/tokens/__tests__/generate-prompt.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parsePrompt, fnv1a } from "../src/generate/prompt.js";
import { isBrandVector } from "../src/generate/types.js";

describe("parsePrompt", () => {
  it("is deterministic — the same prompt yields an identical vector", () => {
    expect(parsePrompt("sunset over the atlantic")).toEqual(
      parsePrompt("sunset over the atlantic"),
    );
  });

  it("is case- and whitespace-insensitive", () => {
    expect(parsePrompt("  Midnight Forest ")).toEqual(parsePrompt("midnight forest"));
  });

  it("reads a hue keyword", () => {
    expect(parsePrompt("a forest brand").hue).toBe(145);
  });

  it("reads mode from the prompt", () => {
    expect(parsePrompt("midnight noir").mode).toBe("dark");
    expect(parsePrompt("bright sunrise").mode).toBe("light");
  });

  it("reads a shape keyword onto an on-scale rung", () => {
    expect(parsePrompt("sharp brutalist").radius).toBe(4);
    expect(parsePrompt("soft friendly").radius).toBe(12);
  });

  it("reads a chroma keyword", () => {
    expect(parsePrompt("a neon sign").chroma).toBe("electric");
    expect(parsePrompt("a muted palette").chroma).toBe("muted");
    expect(parsePrompt("a calm room").chroma).toBe("calm");
    expect(parsePrompt("bold and loud").chroma).toBe("vivid");
  });

  it("takes the leftmost keyword when a prompt names several", () => {
    // Deterministic precedence: firstMatch scans words in order, so the
    // earliest keyword wins. "calm muted" is calm, not muted.
    expect(parsePrompt("calm muted").chroma).toBe("calm");
    expect(parsePrompt("muted calm").chroma).toBe("muted");
  });

  it("still derives a valid vector from words it does not know", () => {
    const v = parsePrompt("zzzq wibble frobnicate");
    expect(isBrandVector(v)).toBe(true);
    expect(v.hue).toBeGreaterThanOrEqual(0);
    expect(v.hue).toBeLessThan(360);
  });

  it("derives different vectors for different unknown prompts", () => {
    expect(parsePrompt("wibble").hue).not.toBe(parsePrompt("frobnicate").hue);
  });

  it("always produces an on-scale radius", () => {
    for (const p of ["a", "quiet lagoon", "zzz", "electric grape", ""]) {
      expect([4, 6, 8, 12]).toContain(parsePrompt(p).radius);
    }
  });

  it("slugifies a name from the prompt", () => {
    expect(parsePrompt("Sunset over the Atlantic").name).toBe("sunset-over-the-atlantic");
  });

  it("falls back to a usable name for an unslugifiable prompt", () => {
    expect(parsePrompt("!!! ???").name).toMatch(/^[a-z][a-z0-9-]*$/);
  });
});

describe("fnv1a", () => {
  it("is stable and unsigned", () => {
    expect(fnv1a("psi")).toBe(fnv1a("psi"));
    expect(fnv1a("psi")).toBeGreaterThanOrEqual(0);
  });

  it("separates similar inputs", () => {
    expect(fnv1a("psi")).not.toBe(fnv1a("psj"));
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
pnpm vitest run packages/tokens/__tests__/generate-prompt.test.ts
```

Expected: FAIL — cannot resolve `../src/generate/prompt.js`.

- [ ] **Step 3: Write the types**

Create `packages/tokens/src/generate/types.ts`:

```ts
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
  if (!/^[a-z][a-z0-9-]*$/.test(v.name)) return false;
  if (v.fonts !== undefined && !isFonts(v.fonts)) return false;
  return true;
}
```

- [ ] **Step 4: Write the dictionaries**

Create `packages/tokens/src/generate/dictionaries.ts`:

```ts
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
```

- [ ] **Step 5: Write `parsePrompt`**

Create `packages/tokens/src/generate/prompt.ts`:

```ts
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
```

- [ ] **Step 6: Run the tests**

```bash
pnpm vitest run packages/tokens/__tests__/generate-prompt.test.ts
```

Expected: PASS, all 12 cases.

- [ ] **Step 7: Commit**

```bash
git add packages/tokens/src/generate packages/tokens/__tests__/generate-prompt.test.ts
git commit -m "feat(tokens): parse a prompt into a deterministic BrandVector (D57)"
```

---

### Task 3: `buildBrandPalette` — one palette, two slot maps

A brand is a pair. Hue and chroma carry across both members; only the lightness anchors invert. The anchor shapes come from `scripts/new-theme.ts`, which already documents light as `ink l≈0.25 / canvas l≈0.95` and dark as `ink l≈0.95 / canvas l≈0.15`.

**Files:**
- Create: `packages/tokens/src/generate/palette.ts`
- Test: `packages/tokens/__tests__/generate-palette.test.ts`

**Interfaces:**
- Consumes: `BrandVector`, `ChromaWord` from Task 2.
- Produces: `function buildBrandPalette(v: BrandVector): { palette: Palette; lightSlots: SlotMap; darkSlots: SlotMap }` — palette keys are exactly `brandInkLight`, `brandInkDark`, `brandCanvasLight`, `brandCanvasDark`, `brandAccent`, `brandSuccess`, `brandWarning`, `brandDanger`, `white`, `black`.

- [ ] **Step 1: Write the failing test**

Create `packages/tokens/__tests__/generate-palette.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildBrandPalette } from "../src/generate/palette.js";
import { parsePrompt } from "../src/generate/prompt.js";

const v = parsePrompt("quiet lagoon");

describe("buildBrandPalette", () => {
  it("emits both modes' ink and canvas anchors in one palette", () => {
    const { palette } = buildBrandPalette(v);
    for (const key of [
      "brandInkLight", "brandInkDark", "brandCanvasLight", "brandCanvasDark",
      "brandAccent", "brandSuccess", "brandWarning", "brandDanger",
    ]) {
      expect(palette[key], key).toBeDefined();
    }
  });

  it("inverts only lightness between the modes", () => {
    const { palette } = buildBrandPalette(v);
    expect(palette.brandCanvasLight!.l).toBeGreaterThan(0.9);
    expect(palette.brandCanvasDark!.l).toBeLessThan(0.2);
    expect(palette.brandInkLight!.l).toBeLessThan(0.35);
    expect(palette.brandInkDark!.l).toBeGreaterThan(0.9);
    // The brand hue is shared — this is what makes the pair one brand.
    expect(palette.brandInkLight!.h).toBe(palette.brandInkDark!.h);
  });

  it("carries the vector's hue onto the accent anchor", () => {
    const { palette } = buildBrandPalette(parsePrompt("a forest brand"));
    expect(palette.brandAccent!.h).toBe(145);
  });

  it("maps chroma words onto increasing accent chroma", () => {
    const c = (word: string) =>
      buildBrandPalette({ ...v, chroma: word as typeof v.chroma }).palette.brandAccent!.c;
    expect(c("muted")).toBeLessThan(c("calm"));
    expect(c("calm")).toBeLessThan(c("balanced"));
    expect(c("balanced")).toBeLessThan(c("vivid"));
    expect(c("vivid")).toBeLessThan(c("electric"));
  });

  it("points each slot map at its own mode's anchors", () => {
    const { lightSlots, darkSlots } = buildBrandPalette(v);
    expect(lightSlots.ink).toBe("brandInkLight");
    expect(lightSlots.canvas).toBe("brandCanvasLight");
    expect(darkSlots.ink).toBe("brandInkDark");
    expect(darkSlots.canvas).toBe("brandCanvasDark");
    // Status and accent slots are shared across the pair.
    expect(darkSlots.accent).toBe(lightSlots.accent);
    expect(darkSlots.danger).toBe(lightSlots.danger);
  });

  it("keeps status hues fixed regardless of the brand hue", () => {
    const a = buildBrandPalette(parsePrompt("forest")).palette;
    const b = buildBrandPalette(parsePrompt("crimson")).palette;
    expect(a.brandSuccess!.h).toBe(b.brandSuccess!.h);
    expect(a.brandDanger!.h).toBe(b.brandDanger!.h);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
pnpm vitest run packages/tokens/__tests__/generate-palette.test.ts
```

Expected: FAIL — cannot resolve `../src/generate/palette.js`.

- [ ] **Step 3: Write the implementation**

Create `packages/tokens/src/generate/palette.ts`:

```ts
import type { Palette, SlotMap } from "../dsl/types.js";
import type { BrandVector, ChromaWord } from "./types.js";

/** Accent chroma by character. Values sit inside sRGB for most hues; the
 * solver (Task 4) caps per-hue where a given hue cannot carry them. */
const ACCENT_CHROMA: Readonly<Record<ChromaWord, number>> = {
  muted: 0.06,
  calm: 0.10,
  balanced: 0.15,
  vivid: 0.20,
  electric: 0.26,
};

/** Status hues are fixed: green reads as success and red as danger regardless
 * of the brand. Only their chroma follows the brand's character. */
const STATUS_HUES = { success: 155, warning: 75, danger: 25 } as const;

export function buildBrandPalette(v: BrandVector): {
  palette: Palette;
  lightSlots: SlotMap;
  darkSlots: SlotMap;
} {
  const accentC = ACCENT_CHROMA[v.chroma];
  // Neutrals carry a trace of the brand hue so the pair reads as one family.
  const neutralC = Math.min(0.02, accentC * 0.12);
  const statusC = Math.max(0.14, Math.min(0.22, accentC));

  const palette: Palette = {
    brandInkLight: { l: 0.25, c: neutralC, h: v.hue },
    brandInkDark: { l: 0.95, c: neutralC, h: v.hue },
    brandCanvasLight: { l: 0.96, c: neutralC * 0.5, h: v.hue },
    brandCanvasDark: { l: 0.15, c: neutralC * 0.5, h: v.hue },
    brandAccent: { l: 0.55, c: accentC, h: v.hue },
    brandSuccess: { l: 0.52, c: statusC, h: STATUS_HUES.success },
    brandWarning: { l: 0.75, c: statusC, h: STATUS_HUES.warning },
    brandDanger: { l: 0.55, c: statusC, h: STATUS_HUES.danger },
    white: { l: 1.0, c: 0, h: 0 },
    black: { l: 0.0, c: 0, h: 0 },
  };

  const shared = {
    accent: "brandAccent",
    success: "brandSuccess",
    warning: "brandWarning",
    danger: "brandDanger",
  } as const;

  return {
    palette,
    lightSlots: { ink: "brandInkLight", canvas: "brandCanvasLight", ...shared },
    darkSlots: { ink: "brandInkDark", canvas: "brandCanvasDark", ...shared },
  };
}
```

- [ ] **Step 4: Run the tests**

```bash
pnpm vitest run packages/tokens/__tests__/generate-palette.test.ts
```

Expected: PASS, all 6 cases.

- [ ] **Step 5: Commit**

```bash
git add packages/tokens/src/generate/palette.ts packages/tokens/__tests__/generate-palette.test.ts
git commit -m "feat(tokens): build a brand palette carrying both modes' anchors (D57)"
```

---

### Task 4: `solveL` — the AA solver

This is the decision that lets the console accept free text. A build-time *gate* cannot serve an unbounded input space, so generated themes are *solved* instead: binary-search a channel until the pair clears its ratio. `acmeOverrides` is the hand-written precedent — acme carries per-hue chroma caps because its hues have lower in-gamut chroma at `l 0.48`. The solver automates exactly that.

**Files:**
- Create: `packages/tokens/src/generate/solve.ts`
- Test: `packages/tokens/__tests__/generate-solve.test.ts`

**Interfaces:**
- Consumes: `culori` (`wcagContrast`, `formatHex`, `clampChroma`).
- Produces:
  - `function hexFor(l: number, c: number, h: number): string` — gamut-clamped sRGB hex; **throws on non-finite input** rather than letting culori coerce `NaN` to `0` and return `#000000`, which would trivially clear contrast against any light canvas
  - `function contrastOf(aHex: string, bHex: string): number`
  - `interface SolvedL { l: number; cleared: boolean }`
  - `function solveL(opts: { c: number; h: number; against: string; target: number; direction: "darker" | "lighter" }): SolvedL` — `cleared: false` means the target was unreachable at this chroma and `l` is merely the most legible value available. **Callers must read `cleared`**; ignoring it ships a below-AA colour that looks solved.

- [ ] **Step 1: Write the failing test**

Create `packages/tokens/__tests__/generate-solve.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { contrastOf, hexFor, solveL } from "../src/generate/solve.js";

describe("hexFor", () => {
  it("returns an sRGB hex string", () => {
    expect(hexFor(0.5, 0.1, 200)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("clamps an out-of-gamut chroma rather than throwing", () => {
    expect(hexFor(0.55, 0.5, 145)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("contrastOf", () => {
  it("matches the WCAG extremes", () => {
    expect(contrastOf("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastOf("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});

describe("solveL", () => {
  const WHITE = "#ffffff";
  const NEAR_BLACK = "#0a0a0a";

  it("finds a lightness clearing 4.5:1 against a light canvas", () => {
    const l = solveL({ c: 0.15, h: 260, against: WHITE, target: 4.5, direction: "darker" });
    expect(contrastOf(hexFor(l, 0.15, 260), WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it("finds a lightness clearing 4.5:1 against a dark canvas", () => {
    const l = solveL({ c: 0.15, h: 260, against: NEAR_BLACK, target: 4.5, direction: "lighter" });
    expect(contrastOf(hexFor(l, 0.15, 260), NEAR_BLACK)).toBeGreaterThanOrEqual(4.5);
  });

  it("clears the stricter 7:1 target too", () => {
    const l = solveL({ c: 0.05, h: 30, against: WHITE, target: 7, direction: "darker" });
    expect(contrastOf(hexFor(l, 0.05, 30), WHITE)).toBeGreaterThanOrEqual(7);
  });

  it("solves every hue on the circle at 4.5:1", () => {
    for (let h = 0; h < 360; h += 15) {
      const l = solveL({ c: 0.2, h, against: WHITE, target: 4.5, direction: "darker" });
      const ratio = contrastOf(hexFor(l, 0.2, h), WHITE);
      expect(ratio, `hue ${h} gave ${ratio}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("returns a lightness inside the legal range", () => {
    const l = solveL({ c: 0.1, h: 90, against: WHITE, target: 4.5, direction: "darker" });
    expect(l).toBeGreaterThanOrEqual(0);
    expect(l).toBeLessThanOrEqual(1);
  });

  it("is deterministic", () => {
    const opts = { c: 0.12, h: 300, against: WHITE, target: 4.5, direction: "darker" } as const;
    expect(solveL(opts)).toBe(solveL(opts));
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
pnpm vitest run packages/tokens/__tests__/generate-solve.test.ts
```

Expected: FAIL — cannot resolve `../src/generate/solve.js`.

- [ ] **Step 3: Write the implementation**

Create `packages/tokens/src/generate/solve.ts`. `wcagContrast` is the repo's single WCAG implementation — the same one `contrast-matrix.ts` uses.

```ts
import { clampChroma, formatHex, wcagContrast } from "culori";

/** OKLCH → gamut-clamped sRGB hex. Mirrors what the resolver emits, so a
 * solved value renders as the same colour the token build would produce. */
export function hexFor(l: number, c: number, h: number): string {
  const clamped = clampChroma({ mode: "oklch", l, c, h }, "oklch");
  return formatHex(clamped) ?? "#000000";
}

/** The repo's one WCAG implementation, shared with contrast-matrix.ts. */
export function contrastOf(aHex: string, bHex: string): number {
  return wcagContrast(aHex, bHex);
}

const ITERATIONS = 28;

/**
 * Binary-search lightness until a colour clears `target` against `against`.
 *
 * `direction` says which way legibility lies: "darker" for ink on a light
 * canvas, "lighter" for ink on a dark one. The search runs between the
 * canvas-side bound and the far extreme, converging on the *least* extreme
 * lightness that still clears the ratio — so a solved colour stays as close
 * to the brand's intent as the target allows.
 *
 * If the target is unreachable at this chroma and hue, the extreme is
 * returned: the most legible value available rather than a thrown error.
 * Callers pair this with a chroma reduction, which is what makes the target
 * reachable for saturated hues.
 */
export function solveL(opts: {
  c: number;
  h: number;
  against: string;
  target: number;
  direction: "darker" | "lighter";
}): number {
  const { c, h, against, target, direction } = opts;
  const extreme = direction === "darker" ? 0 : 1;

  if (contrastOf(hexFor(extreme, c, h), against) < target) {
    return extreme; // Unreachable at this chroma — hand back the best available.
  }

  let lo = direction === "darker" ? 0 : 1; // known to clear
  let hi = direction === "darker" ? 1 : 0; // known to fail (or nearly)
  let best = extreme;

  for (let i = 0; i < ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    if (contrastOf(hexFor(mid, c, h), against) >= target) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return best;
}
```

- [ ] **Step 4: Run the tests**

```bash
pnpm vitest run packages/tokens/__tests__/generate-solve.test.ts
```

Expected: PASS, all 8 cases — in particular the 24-hue sweep.

- [ ] **Step 5: Commit**

```bash
git add packages/tokens/src/generate/solve.ts packages/tokens/__tests__/generate-solve.test.ts
git commit -m "feat(tokens): solve lightness to a WCAG target by binary search (D57)"
```

---

### Task 5: `deriveTheme` — the solved light/dark pair

**Files:**
- Create: `packages/tokens/src/generate/derive.ts`
- Test: `packages/tokens/__tests__/generate-derive.test.ts`

**Interfaces:**
- Consumes: `buildBrandPalette` (Task 3), `solveL`/`hexFor`/`contrastOf` (Task 4), `assembleCustomerTheme` + `CustomerTheme` from `../themes/customers/index.js`, `resolve` from `../dsl/resolver.js`, `wcagAAPairs` + `checkContrast` from `../contrast-matrix.js`.
- Produces:
  - `interface DerivedTheme { mode: "light" | "dark"; customerTheme: CustomerTheme; resolved: ResolvedTheme; customProperties: Record<string, string> }`
  - `interface DerivedPair { vector: BrandVector; light: DerivedTheme; dark: DerivedTheme }`
  - `function deriveTheme(v: BrandVector): DerivedPair`

- [ ] **Step 1: Write the failing test**

Create `packages/tokens/__tests__/generate-derive.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { deriveTheme } from "../src/generate/derive.js";
import { parsePrompt } from "../src/generate/prompt.js";
import { checkContrast, wcagAAPairs } from "../src/contrast-matrix.js";

const PROMPTS = [
  "sunset over the atlantic",
  "midnight forest",
  "neon cyber grape",
  "calm quiet linen",
  "zzzq wibble frobnicate",
  "",
];

describe("deriveTheme", () => {
  it("returns both members from one vector", () => {
    const pair = deriveTheme(parsePrompt("quiet lagoon"));
    expect(pair.light.mode).toBe("light");
    expect(pair.dark.mode).toBe("dark");
  });

  it.each(PROMPTS)("clears the AA matrix in BOTH modes for %j", (prompt) => {
    const pair = deriveTheme(parsePrompt(prompt));
    for (const member of [pair.light, pair.dark]) {
      const failures = checkContrast(member.resolved, wcagAAPairs).filter((r) => !r.pass);
      expect(
        failures.map((f) => `${f.fg}/${f.bg} ${f.ratio}<${f.minRatio}`),
        `${member.mode} failures`,
      ).toEqual([]);
    }
  });

  it("shares the brand hue across the pair", () => {
    const pair = deriveTheme(parsePrompt("a forest brand"));
    expect(pair.light.customerTheme.palette.brandAccent!.h).toBe(
      pair.dark.customerTheme.palette.brandAccent!.h,
    );
  });

  it("marks the dark member with base dark so formulas build on darkTheme", () => {
    const pair = deriveTheme(parsePrompt("midnight"));
    expect(pair.dark.customerTheme.base).toBe("dark");
    expect(pair.light.customerTheme.base).toBe("light");
  });

  it("emits --psi-prefixed custom properties including the control radius", () => {
    const pair = deriveTheme(parsePrompt("sharp forest"));
    const props = pair.light.customProperties;
    expect(Object.keys(props).every((k) => k.startsWith("--psi-"))).toBe(true);
    expect(props["--psi-bg-primary"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(props["--psi-control-radius"]).toBe("var(--psi-radius-4)");
  });

  it("is deterministic", () => {
    const a = deriveTheme(parsePrompt("quiet lagoon")).light.customProperties;
    const b = deriveTheme(parsePrompt("quiet lagoon")).light.customProperties;
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
pnpm vitest run packages/tokens/__tests__/generate-derive.test.ts
```

Expected: FAIL — cannot resolve `../src/generate/derive.js`.

- [ ] **Step 3: Write the implementation**

Create `packages/tokens/src/generate/derive.ts`:

```ts
import { checkContrast, wcagAAPairs } from "../contrast-matrix.js";
import { resolve, type ResolvedTheme } from "../dsl/resolver.js";
import { cap, set, slot, token } from "../dsl/builders.js";
import type { Palette, SlotMap, ThemeDef } from "../dsl/types.js";
import {
  assembleCustomerTheme,
  type CustomerTheme,
} from "../themes/customers/index.js";
import { buildBrandPalette } from "./palette.js";
import { contrastOf, hexFor, solveL } from "./solve.js";
import type { BrandVector } from "./types.js";

export interface DerivedTheme {
  mode: "light" | "dark";
  customerTheme: CustomerTheme;
  resolved: ResolvedTheme;
  customProperties: Record<string, string>;
}

export interface DerivedPair {
  vector: BrandVector;
  light: DerivedTheme;
  dark: DerivedTheme;
}

/** camelCase token name → --psi-kebab-case custom property. */
function cssName(token: string): string {
  return `--psi-${token.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
}

/**
 * Per-hue overrides that keep the AA matrix clean, in exactly the shape acme
 * carries by hand (`acmeOverrides`). Text tokens force their own L in the base
 * themes, so the free variables here are that L and the chroma cap.
 */
function solveOverrides(palette: Palette, slots: SlotMap, mode: "light" | "dark"): ThemeDef {
  const canvas = palette[slots.canvas]!;
  const canvasHex = hexFor(canvas.l, canvas.c, canvas.h);
  const direction = mode === "light" ? "darker" : "lighter";

  const overrides: ThemeDef = {};

  // Text-on-canvas tokens: solve L per slot, then cap chroma at what that hue
  // can actually carry at the solved L.
  //
  // The second element is the SLOT name ("accent"), not the palette key
  // ("brandAccent") — `slot.accent` is what a TokenDef sources from, while the
  // anchor is looked up through `slots` to reach the palette entry.
  const textTokens = [
    ["fgAccent", "accent"],
    ["fgSuccess", "success"],
    ["fgWarning", "warning"],
    ["fgDanger", "danger"],
  ] as const;

  for (const [name, slotName] of textTokens) {
    const anchor = palette[slots[slotName]]!;

    // Solve lightness at the anchor's own chroma. When `cleared` is false the
    // target is unreachable at that chroma, and chroma is the lever that makes
    // a saturated hue reachable — so reduce it and re-solve. This is exactly
    // what acme's hand-tuned caps (`acmeOverrides`) do by hand.
    //
    // Reading `.cleared` is not optional: `solveL` returns its most legible
    // available value when it gives up, so ignoring the flag would ship a
    // below-AA colour that looks like a solved one.
    let c = anchor.c;
    let solved = solveL({ c, h: anchor.h, against: canvasHex, target: 4.5, direction });
    while (!solved.cleared && c > 0) {
      c = Math.max(0, c - 0.008);
      solved = solveL({ c, h: anchor.h, against: canvasHex, target: 4.5, direction });
    }
    if (!solved.cleared) {
      throw new Error(
        `solveOverrides: ${name} cannot clear 4.5:1 against ${canvasHex} at any chroma`,
      );
    }

    overrides[name] = token({
      from: slot[slotName],
      l: set(Number(solved.l.toFixed(4))),
      c: cap(Number(c.toFixed(4))),
      scopes: ["text"],
    });
  }

  return overrides;
}

function deriveMember(
  v: BrandVector,
  palette: Palette,
  slots: SlotMap,
  mode: "light" | "dark",
): DerivedTheme {
  const customerTheme: CustomerTheme = {
    palette,
    slots,
    base: mode,
    overrides: solveOverrides(palette, slots, mode),
    ...(v.fonts ? { fonts: v.fonts } : {}),
    componentOverrides: { "control-radius": `var(--psi-radius-${v.radius})` },
  };

  const resolved = resolve(assembleCustomerTheme(customerTheme), palette, slots);

  const customProperties: Record<string, string> = {};
  for (const [name, tok] of Object.entries(resolved)) {
    customProperties[cssName(name)] = tok.hex;
  }
  for (const [name, value] of Object.entries(customerTheme.componentOverrides ?? {})) {
    customProperties[`--psi-${name}`] = value;
  }

  return { mode, customerTheme, resolved, customProperties };
}

/**
 * Derive both members of a brand from one vector, each solved to AA
 * independently (D57). The header toggle then selects between them — there is
 * nothing left to recompute.
 */
export function deriveTheme(v: BrandVector): DerivedPair {
  const { palette, lightSlots, darkSlots } = buildBrandPalette(v);

  const pair: DerivedPair = {
    vector: v,
    light: deriveMember(v, palette, lightSlots, "light"),
    dark: deriveMember(v, palette, darkSlots, "dark"),
  };

  // Belt and braces: the solver targets the text pairs directly, but the AA
  // matrix covers more than those. A residual failure means a bug in the
  // solver, not bad input, so surface it loudly in development.
  for (const member of [pair.light, pair.dark]) {
    const failures = checkContrast(member.resolved, wcagAAPairs).filter((r) => !r.pass);
    if (failures.length > 0) {
      throw new Error(
        `deriveTheme: ${member.mode} left ${failures.length} AA failure(s): ` +
          failures.map((f) => `${f.fg}/${f.bg} ${f.ratio}<${f.minRatio}`).join(", "),
      );
    }
  }

  return pair;
}
```

- [ ] **Step 4: Run the tests**

```bash
pnpm vitest run packages/tokens/__tests__/generate-derive.test.ts
```

Expected: PASS. **If the AA sweep fails**, the solver is not covering a pair the matrix checks — extend `solveOverrides` to that token rather than loosening the assertion. The whole design rests on this test.

- [ ] **Step 5: Commit**

```bash
git add packages/tokens/src/generate/derive.ts packages/tokens/__tests__/generate-derive.test.ts
git commit -m "feat(tokens): derive a brand as an AA-solved light/dark pair (D57)"
```

---

### Task 6: `serializeCustomerTheme` — real `customers/<name>.ts` source

The output is the CLI's template shape *extended to a pair*: one `Palette`, two `SlotMap`s, two registry entries. The CLI's single-mode output is the degenerate case of this form, which is what keeps the browser and `scripts/new-theme.ts` from drifting into two file layouts.

**Files:**
- Create: `packages/tokens/src/generate/serialize.ts`
- Modify: `packages/tokens/src/generate/index.ts` (replace the placeholder)
- Test: `packages/tokens/__tests__/generate-serialize.test.ts`

**Interfaces:**
- Consumes: `DerivedPair` (Task 5).
- Produces: `function serializeCustomerTheme(pair: DerivedPair): { filename: string; source: string; registration: string }`

- [ ] **Step 1: Write the failing test**

Create `packages/tokens/__tests__/generate-serialize.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { deriveTheme } from "../src/generate/derive.js";
import { parsePrompt } from "../src/generate/prompt.js";
import { serializeCustomerTheme } from "../src/generate/serialize.js";

const pair = deriveTheme(parsePrompt("sunset over the atlantic"));
const out = serializeCustomerTheme(pair);

describe("serializeCustomerTheme", () => {
  it("names the file after the vector", () => {
    expect(out.filename).toBe("sunset-over-the-atlantic.ts");
  });

  it("imports only from the package's own dsl", () => {
    expect(out.source).toContain('from "../../dsl/types.js"');
  });

  it("exports one palette and two slot maps", () => {
    expect(out.source).toMatch(/export const \w+Palette: Palette = \{/);
    expect(out.source).toMatch(/export const \w+Slots: SlotMap = \{/);
    expect(out.source).toMatch(/export const \w+DarkSlots: SlotMap = \{/);
  });

  it("registers both members, the second based on dark", () => {
    expect(out.registration).toContain('base: "dark"');
    expect(out.registration).toContain("sunsetOverTheAtlanticSlots");
    expect(out.registration).toContain("sunsetOverTheAtlanticDarkSlots");
  });

  it("emits the control radius as an on-scale rung", () => {
    expect(out.source).toMatch(/"control-radius": "var\(--psi-radius-(4|6|8|12)\)"/);
  });

  it("emits no raw hex — the file is formulas and anchors, not swatches", () => {
    expect(out.source).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it("carries the solved AA overrides for BOTH members", () => {
    // Without these the emitted file is not merely a different theme — the
    // token build's WCAG gate throws on it, because the default formulas miss
    // the matrix on generated palettes. That is why solveOverrides exists.
    expect(out.source).toMatch(/export const \w+Overrides: ThemeDef = \{/);
    expect(out.source).toMatch(/export const \w+DarkOverrides: ThemeDef = \{/);
    expect(out.source).toContain("token({ from: slot.accent");
    expect(out.registration).toContain("overrides:");
    expect(out.registration).toContain("DarkOverrides");
  });

  it("emits overrides that reproduce the derived theme exactly", () => {
    // Round-trip on the values, not the text: every solved op in the emitted
    // source must equal the op deriveTheme actually produced. A serializer
    // that rounds, reorders or drops an op would render a theme that differs
    // from the one the console previewed and the AA sweep validated.
    for (const [member, marker] of [
      [pair.light, "Overrides"],
      [pair.dark, "DarkOverrides"],
    ] as const) {
      for (const [name, def] of Object.entries(member.customerTheme.overrides ?? {})) {
        expect(out.source, `${marker} ${name}`).toContain(`${name}: token({`);
        if (def.l) expect(out.source).toContain(`l: set(${def.l.value})`);
        if (def.c) expect(out.source).toContain(`c: cap(${def.c.value})`);
      }
    }
  });

  it("round-trips: every anchor in the source matches the derived palette", () => {
    const palette = pair.light.customerTheme.palette;
    for (const [name, entry] of Object.entries(palette)) {
      if (name === "white" || name === "black") continue;
      expect(out.source, name).toContain(`${name}: { l: ${entry.l}`);
    }
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
pnpm vitest run packages/tokens/__tests__/generate-serialize.test.ts
```

Expected: FAIL — cannot resolve `../src/generate/serialize.js`.

- [ ] **Step 3: Write the implementation**

Create `packages/tokens/src/generate/serialize.ts`:

```ts
import type { ChannelOp, PaletteEntry, SlotMap, ThemeDef } from "../dsl/types.js";
import type { DerivedPair } from "./derive.js";

/** kebab-slug → camelCase identifier stem. */
function ident(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());
}

function entryLine(name: string, e: PaletteEntry): string {
  return `  ${name}: { l: ${e.l}, c: ${e.c}, h: ${e.h} },`;
}

function slotsLiteral(slots: SlotMap): string {
  return (Object.entries(slots) as [string, string][])
    .map(([k, v]) => `  ${k}: "${v}",`)
    .join("\n");
}

function opLiteral(op: ChannelOp): string {
  return `${op.op}(${op.value})`;
}

/**
 * Serialize the solved AA overrides.
 *
 * These are NOT optional decoration. The default theme formulas fail the
 * contrast matrix on most generated palettes — that is the entire reason
 * `solveOverrides` exists — so a `customers/<name>.ts` emitted without them
 * would not merely render differently from the console preview: it would
 * throw in the token build, whose WCAG gate runs over every committed theme.
 * An unbuildable file is not "a real customer theme out".
 *
 * The emitted shape matches `acmeOverrides` in `customers/acme.ts`, which
 * carries exactly this kind of per-hue correction by hand.
 */
function overridesLiteral(overrides: ThemeDef): string {
  return Object.entries(overrides)
    .map(([name, def]) => {
      const parts: string[] = [];
      if (def.from.type === "slot") parts.push(`from: slot.${def.from.name}`);
      else parts.push(`from: ref.${def.from.name}`);
      if (def.l) parts.push(`l: ${opLiteral(def.l)}`);
      if (def.c) parts.push(`c: ${opLiteral(def.c)}`);
      if (def.h) parts.push(`h: ${opLiteral(def.h)}`);
      if (def.alpha !== undefined) parts.push(`alpha: ${def.alpha}`);
      if (def.scopes) parts.push(`scopes: ${JSON.stringify(def.scopes)}`);
      return `  ${name}: token({ ${parts.join(", ")} }),`;
    })
    .join("\n");
}

/**
 * Emit the `customers/<name>.ts` source for a derived pair, plus the two lines
 * that register it. Shape matches `scripts/new-theme.ts`, extended to a pair.
 */
export function serializeCustomerTheme(pair: DerivedPair): {
  filename: string;
  source: string;
  registration: string;
} {
  const { vector, light, dark } = pair;
  const id = ident(vector.name);
  const palette = light.customerTheme.palette;
  const radius = `var(--psi-radius-${vector.radius})`;

  // Import ONLY the builders the emitted overrides actually use. An
  // unconditional import list leaves `delta`/`ref` unused in every generated
  // file, and `@typescript-eslint/no-unused-vars` is an ERROR here — so a
  // committed customer theme would fail `pnpm lint`, one of the five gates.
  const bodyForImports =
    overridesLiteral(light.customerTheme.overrides ?? {}) +
    overridesLiteral(dark.customerTheme.overrides ?? {});
  const builders = ["cap", "delta", "ref", "set", "slot", "token"].filter((b) =>
    new RegExp(`\\b${b}[.(]`).test(bodyForImports),
  );

  // Guard the empty case: an override set using no builders at all would
  // otherwise emit `import { } from …`, which is legal but pointless noise.
  const buildersImport =
    builders.length > 0
      ? `import { ${builders.join(", ")} } from "../../dsl/builders.js";\n`
      : "";

  const source = `${buildersImport}import type { Palette, SlotMap, ThemeDef } from "../../dsl/types.js";

// Generated by the Psi theme console from the prompt:
//   "${vector.name.replace(/-/g, " ")}"
// Every pair in the WCAG AA matrix is solved, in both modes, by construction.

export const ${id}Palette: Palette = {
${Object.entries(palette).map(([n, e]) => entryLine(n, e)).join("\n")}
};

/** Light member — ink is dark, canvas is light. */
export const ${id}Slots: SlotMap = {
${slotsLiteral(light.customerTheme.slots)}
};

/** Dark member — the same brand hue, lightness anchors inverted. */
export const ${id}DarkSlots: SlotMap = {
${slotsLiteral(dark.customerTheme.slots)}
};

/** Solved AA corrections for the light member. Without these the default
 * formulas miss the contrast matrix on this palette and the build throws. */
export const ${id}Overrides: ThemeDef = {
${overridesLiteral(light.customerTheme.overrides ?? {})}
};

/** Solved AA corrections for the dark member. */
export const ${id}DarkOverrides: ThemeDef = {
${overridesLiteral(dark.customerTheme.overrides ?? {})}
};

/** One dial for control shape (D56). */
export const ${id}ComponentOverrides: Record<string, string> = {
  "control-radius": "${radius}",
};
`;

  // BOTH keys are quoted. A kebab slug is not a valid bare object key, and
  // every multi-word prompt produces one — an unquoted `sunset-over-the-
  // atlantic:` is a TS syntax error that would break the whole package build,
  // not just the new theme.
  const registration = `  "${vector.name}": { palette: ${id}Palette, slots: ${id}Slots, overrides: ${id}Overrides, componentOverrides: ${id}ComponentOverrides },
  "${vector.name}-dark": { palette: ${id}Palette, slots: ${id}DarkSlots, base: "dark", overrides: ${id}DarkOverrides, componentOverrides: ${id}ComponentOverrides },`;

  return { filename: `${vector.name}.ts`, source, registration };
}
```

- [ ] **Step 4: Replace the placeholder index**

Overwrite `packages/tokens/src/generate/index.ts`:

```ts
export { parsePrompt, fnv1a, seededRandom } from "./prompt.js";
export { buildBrandPalette } from "./palette.js";
export { hexFor, contrastOf, solveL } from "./solve.js";
export { deriveTheme, type DerivedTheme, type DerivedPair } from "./derive.js";
export { serializeCustomerTheme } from "./serialize.js";
export {
  isBrandVector,
  CHROMA_WORDS,
  RADIUS_RUNGS,
  type BrandVector,
  type ChromaWord,
  type RadiusRung,
} from "./types.js";
```

- [ ] **Step 5: Run the tests and rebuild**

```bash
pnpm vitest run packages/tokens/__tests__/generate-serialize.test.ts
pnpm --filter @handamade/psi-tokens build
ls packages/tokens/dist/generate/
```

Expected: tests PASS; `dist/generate/index.js` and `index.d.ts` exist.

- [ ] **Step 6: Commit**

```bash
git add packages/tokens/src/generate packages/tokens/__tests__/generate-serialize.test.ts
git commit -m "feat(tokens): serialize a derived pair as customers/<name>.ts source (D57)"
```

---

## Phase B — the model stage

### Task 7: `api/theme.ts` — the Function that returns a vector, never colours

Sibling of the existing `api/mcp.ts`. The model writes a *brief*; Psi's own maths does everything downstream. A response failing `isBrandVector` is discarded and the caller's local derivation stands — so the console works completely with no API key, in local dev, in CI, and in a fork.

**Files:**
- Create: `api/theme.ts`
- Test: `packages/tokens/__tests__/generate-vector-validation.test.ts`

**Interfaces:**
- Consumes: `isBrandVector`, `parsePrompt` from `@handamade/psi-tokens/generate`.
- Produces: `POST /api/theme` with `{ prompt: string }` → `200 BrandVector` | `204` (no key configured) | `400` (bad request) | `502` (model returned something invalid).

- [ ] **Step 1: Write the failing test**

Create `packages/tokens/__tests__/generate-vector-validation.test.ts`. The Function itself is thin; what must be bulletproof is the guard it depends on.

```ts
import { describe, it, expect } from "vitest";
import { isBrandVector } from "../src/generate/types.js";
import { parsePrompt } from "../src/generate/prompt.js";

const valid = parsePrompt("sunset over the atlantic");

describe("isBrandVector", () => {
  it("accepts what parsePrompt produces", () => {
    expect(isBrandVector(valid)).toBe(true);
  });

  it.each([
    ["null", null],
    ["a string", "sunset"],
    ["an array", []],
    ["an empty object", {}],
  ])("rejects %s", (_label, value) => {
    expect(isBrandVector(value)).toBe(false);
  });

  it("rejects an off-scale radius — the D56 contract", () => {
    expect(isBrandVector({ ...valid, radius: 10 })).toBe(false);
    expect(isBrandVector({ ...valid, radius: 0 })).toBe(false);
  });

  it("rejects a hue outside the circle", () => {
    expect(isBrandVector({ ...valid, hue: 400 })).toBe(false);
    expect(isBrandVector({ ...valid, hue: -1 })).toBe(false);
    expect(isBrandVector({ ...valid, hue: Number.NaN })).toBe(false);
  });

  it("rejects an unknown chroma word", () => {
    expect(isBrandVector({ ...valid, chroma: "spicy" })).toBe(false);
  });

  it("rejects a mode that is not light or dark", () => {
    expect(isBrandVector({ ...valid, mode: "system" })).toBe(false);
  });

  it("rejects a name that is not a safe identifier stem", () => {
    expect(isBrandVector({ ...valid, name: "../../etc/passwd" })).toBe(false);
    expect(isBrandVector({ ...valid, name: "9lives" })).toBe(false);
    expect(isBrandVector({ ...valid, name: "" })).toBe(false);
    expect(isBrandVector({ ...valid, name: "Has-Capitals" })).toBe(false);
  });

  it("rejects a well-formed but absurdly long name", () => {
    // `name` becomes a filename and an identifier. A model returning 100k
    // legal characters would pass the regex and fail downstream.
    expect(isBrandVector({ ...valid, name: "a".repeat(65) })).toBe(false);
    expect(isBrandVector({ ...valid, name: "a".repeat(64) })).toBe(true);
  });

  it("rejects a fonts object carrying an unknown role", () => {
    expect(isBrandVector({ ...valid, fonts: { comic: "Comic Sans" } })).toBe(false);
  });

  it("accepts an absent fonts field", () => {
    const { fonts, ...withoutFonts } = valid;
    expect(isBrandVector(withoutFonts)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails or passes**

```bash
pnpm vitest run packages/tokens/__tests__/generate-vector-validation.test.ts
```

Expected: PASS if Task 2's `isBrandVector` is complete. **If any case fails, fix `types.ts` now** — this guard is the only thing standing between model output and the rendered page.

- [ ] **Step 3: Write the Function**

Create `api/theme.ts`:

```ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { isBrandVector, parsePrompt } from "@handamade/psi-tokens/generate";

const MODEL = "claude-sonnet-5";
const TIMEOUT_MS = 12_000;

/**
 * The model returns a BrandVector, never colours (D57). Every field is drawn
 * from a closed set, so an off-scale radius or an unlicensed font is
 * unrepresentable rather than merely discouraged — and the AA solver still
 * runs on the result exactly as it does on the local derivation.
 */
const SYSTEM = `You are an art director for a design system.
Given a brand brief, reply with ONLY a JSON object, no prose, no code fence:
{"hue":<0-359 integer>,"chroma":"muted"|"calm"|"balanced"|"vivid"|"electric",
 "mode":"light"|"dark","radius":4|6|8|12,"name":"<kebab-case slug>"}
hue is the OKLCH hue of the brand's accent. radius is corner sharpness:
4 is sharp/technical, 12 is soft/friendly. Choose mode from the brief's
imagery. Never include any other key.`;

function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

async function readPrompt(req: IncomingMessage & { body?: unknown }): Promise<string | null> {
  let parsed: unknown = req.body;
  if (parsed === undefined) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    try {
      parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return null;
    }
  }
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  const prompt = (parsed as { prompt?: unknown } | null)?.prompt;
  return typeof prompt === "string" && prompt.trim().length > 0 ? prompt : null;
}

export default async function handler(
  req: IncomingMessage & { body?: unknown; method?: string },
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") return json(res, 405, { error: "POST only" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  // No key configured is a normal state, not an error: the console's local
  // derivation is the floor, and the client treats 204 as "art director
  // unreachable" without surfacing a failure.
  if (!apiKey) return json(res, 204, {});

  const prompt = await readPrompt(req);
  if (prompt === null) return json(res, 400, { error: "Expected { prompt: string }" });

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 256,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!upstream.ok) return json(res, 502, { error: "upstream" });

    const payload = (await upstream.json()) as { content?: { text?: string }[] };
    const text = payload.content?.[0]?.text?.trim() ?? "";

    let candidate: unknown;
    try {
      candidate = JSON.parse(text);
    } catch {
      return json(res, 502, { error: "unparseable" });
    }

    // The model does not choose the fonts, and its name is only a suggestion:
    // fall back to the local slug so the filename is always well-formed.
    const local = parsePrompt(prompt);
    const merged = {
      ...local,
      ...(candidate as Record<string, unknown>),
      name:
        typeof (candidate as { name?: unknown }).name === "string" &&
        /^[a-z][a-z0-9-]*$/.test((candidate as { name: string }).name)
          ? (candidate as { name: string }).name
          : local.name,
      fonts: local.fonts,
    };

    if (!isBrandVector(merged)) return json(res, 502, { error: "invalid vector" });
    return json(res, 200, merged);
  } catch {
    return json(res, 502, { error: "unreachable" });
  }
}
```

- [ ] **Step 4: Typecheck the Function against the built package**

```bash
pnpm --filter @handamade/psi-tokens build
pnpm lint
```

Expected: clean. If `@handamade/psi-tokens/generate` does not resolve, Task 1's `exports` entry or the `tsc` step is wrong — fix there, not here.

- [ ] **Step 5: Commit**

```bash
git add api/theme.ts packages/tokens/__tests__/generate-vector-validation.test.ts
git commit -m "feat(api): add /api/theme returning a validated BrandVector (D57)"
```

---

## Phase C — the promo page

### Task 8: Two orthogonal keys, and a boot script that cannot strand a visitor

Mode and brand are independent axes. `psi-theme` holds `"light" | "dark"`; `psi-brand` holds a `BrandVector` plus a cache of its resolved properties. Neither is expressible in the other's key, so the header and the console cannot contend.

**Files:**
- Rewrite: `apps/promo/src/theme.ts`
- Modify: `apps/promo/index.html`
- Test: `apps/promo/src/__tests__/theme.test.ts` (new)

**Interfaces:**
- Consumes: `isBrandVector`, `deriveTheme`, `type BrandVector` from `@handamade/psi-tokens/generate`.
- Produces:
  - `type Mode = "light" | "dark"`
  - `function useMode(): [Mode, (m: Mode) => void, (m: Mode) => void]` — the third element is a NON-PERSISTING setter for machine-chosen modes. A derived brand's mode is not a visitor choice; persisting it opts them out of OS following forever (the same failure the OS-follow fix addressed).
  - `function useBrand(): { brand: BrandVector | null; setBrand: (v: BrandVector, cache: Record<string, string>) => void; reset: () => void }`
  - `function applyCustomProperties(props: Record<string, string>): void`
  - `function readStoredMode(): Mode | null`, `function readStoredBrand(): StoredBrand | null`
  - `const MODE_KEY = "psi-theme"`, `const BRAND_KEY = "psi-brand"`

- [ ] **Step 1: Write the failing test**

Create `apps/promo/src/__tests__/theme.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { BRAND_KEY, MODE_KEY, readStoredBrand, readStoredMode } from "../theme";

beforeEach(() => localStorage.clear());

describe("readStoredMode", () => {
  it("returns a stored light or dark", () => {
    localStorage.setItem(MODE_KEY, "dark");
    expect(readStoredMode()).toBe("dark");
  });

  it("returns null when nothing is stored, so the caller can ask the OS", () => {
    expect(readStoredMode()).toBeNull();
  });

  it("rejects a value from the old four-theme roster", () => {
    // A returning visitor holding "ember" must not be stranded in a theme the
    // header can no longer leave.
    localStorage.setItem(MODE_KEY, "ember");
    expect(readStoredMode()).toBeNull();
  });
});

describe("readStoredBrand", () => {
  it("returns null when absent", () => {
    expect(readStoredBrand()).toBeNull();
  });

  it("returns a valid stored vector", () => {
    const v = { hue: 200, chroma: "calm", mode: "light", radius: 8, name: "lagoon" };
    localStorage.setItem(BRAND_KEY, JSON.stringify({ vector: v, cache: {} }));
    expect(readStoredBrand()?.vector.name).toBe("lagoon");
  });

  it("clears and returns null for a corrupt vector", () => {
    localStorage.setItem(BRAND_KEY, JSON.stringify({ vector: { hue: 999 }, cache: {} }));
    expect(readStoredBrand()).toBeNull();
    expect(localStorage.getItem(BRAND_KEY)).toBeNull();
  });

  it("clears and returns null for non-JSON", () => {
    localStorage.setItem(BRAND_KEY, "{{{not json");
    expect(readStoredBrand()).toBeNull();
    expect(localStorage.getItem(BRAND_KEY)).toBeNull();
  });

  it("clears and returns null for an off-scale radius", () => {
    const v = { hue: 200, chroma: "calm", mode: "light", radius: 10, name: "lagoon" };
    localStorage.setItem(BRAND_KEY, JSON.stringify({ vector: v, cache: {} }));
    expect(readStoredBrand()).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
pnpm vitest run apps/promo/src/__tests__/theme.test.ts
```

Expected: FAIL — `readStoredMode` is not exported.

- [ ] **Step 3: Rewrite `apps/promo/src/theme.ts`**

```ts
import { useCallback, useEffect, useState } from "react";
import { isBrandVector, type BrandVector } from "@handamade/psi-tokens/generate";

export const MODE_KEY = "psi-theme";
export const BRAND_KEY = "psi-brand";

export type Mode = "light" | "dark";

export interface StoredBrand {
  vector: BrandVector;
  /** Resolved custom properties for the vector's own mode, so the boot script
   * can paint before `generate/` is available. Rewritten whenever it drifts. */
  cache: Record<string, string>;
}

function isMode(value: unknown): value is Mode {
  return value === "light" || value === "dark";
}

/** Null means "nothing usable stored" — the caller falls back to the OS.
 * A stale "acme"/"ember" from the old roster lands here rather than being
 * written to data-psi-theme, where it would strand the visitor. */
export function readStoredMode(): Mode | null {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    return isMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** Self-healing: anything that fails validation is cleared, not kept. */
export function readStoredBrand(): StoredBrand | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(BRAND_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  try {
    const parsed = JSON.parse(raw) as { vector?: unknown; cache?: unknown };
    if (!isBrandVector(parsed.vector)) throw new Error("invalid vector");
    const cache =
      typeof parsed.cache === "object" && parsed.cache !== null
        ? (parsed.cache as Record<string, string>)
        : {};
    return { vector: parsed.vector, cache };
  } catch {
    try {
      localStorage.removeItem(BRAND_KEY);
    } catch {
      /* storage unavailable */
    }
    // Clearing storage is not enough. The boot script has ALREADY painted the
    // cached properties onto <html> — it cannot validate the vector, because
    // it runs before any module loads. If we only cleared the key, the visitor
    // would keep looking at a theme whose vector we just rejected, with the
    // reset control living inside it. Strip the paint too.
    clearAppliedTheme();
    return null;
  }
}

/** Remove every inline --psi-* property the boot script or console applied. */
export function clearAppliedTheme(): void {
  const style = document.documentElement.style;
  for (const name of Array.from(style).filter((n) => n.startsWith("--psi-"))) {
    style.removeProperty(name);
  }
  delete document.documentElement.dataset.psiCustom;
}

function systemMode(): Mode {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Mode state, synced to <html data-psi-theme>. Follows the OS until the
 * visitor makes an explicit choice, which then wins permanently. */
export function useMode(): [Mode, (next: Mode) => void] {
  const [mode, setModeState] = useState<Mode>(() => readStoredMode() ?? systemMode());

  /** An explicit choice. This is the only path that persists. */
  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    applyMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      // An explicit choice outranks the OS, forever.
      if (readStoredMode() !== null) return;
      const next: Mode = mq.matches ? "dark" : "light";
      setModeState(next);
      applyMode(next);
      // Deliberately NOT persisted — see applyMode's comment.
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return [mode, setMode];
}

/** Brand state. Orthogonal to mode: reset clears this and never touches that. */
export function useBrand(): {
  brand: BrandVector | null;
  setBrand: (v: BrandVector, cache: Record<string, string>) => void;
  reset: () => void;
} {
  const [brand, setBrandState] = useState<BrandVector | null>(
    () => readStoredBrand()?.vector ?? null,
  );

  const setBrand = useCallback((v: BrandVector, cache: Record<string, string>) => {
    setBrandState(v);
    try {
      localStorage.setItem(BRAND_KEY, JSON.stringify({ vector: v, cache }));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const reset = useCallback(() => {
    setBrandState(null);
    try {
      localStorage.removeItem(BRAND_KEY);
    } catch {
      /* storage unavailable */
    }
    const style = document.documentElement.style;
    for (const name of Array.from(style).filter((n) => n.startsWith("--psi-"))) {
      style.removeProperty(name);
    }
    delete document.documentElement.dataset.psiCustom;
  }, []);

  return { brand, setBrand, reset };
}

/** Apply a derived member's properties to <html>. */
export function applyCustomProperties(props: Record<string, string>): void {
  const style = document.documentElement.style;
  for (const [name, value] of Object.entries(props)) {
    style.setProperty(name, value);
  }
  document.documentElement.dataset.psiCustom = "";
}

/**
 * OS following lives INSIDE useMode, and deliberately does not persist.
 *
 * An earlier design exposed `useSystemModeSync(setMode)` and passed it
 * `useMode`'s setter. That setter persists, so the first OS theme change wrote
 * an explicit value to storage, `readStoredMode()` became non-null, and the
 * guard then disabled the listener permanently — OS following worked exactly
 * once, for a visitor who had never chosen anything. Following the OS is not a
 * choice, so it must not be recorded as one.
 */
function applyMode(next: Mode): void {
  document.documentElement.dataset.psiTheme = next;
}
```

- [ ] **Step 4: Update the boot script**

Replace the `<script>` block in `apps/promo/index.html`:

```html
    <script>
      (function () {
        var doc = document.documentElement;
        var mode = null;
        var brand = null;
        try {
          var storedMode = localStorage.getItem("psi-theme");
          if (storedMode === "light" || storedMode === "dark") mode = storedMode;
          brand = JSON.parse(localStorage.getItem("psi-brand") || "null");
        } catch (_) {
          /* storage unavailable */
        }
        // No system OPTION in the switcher, but the first visit still follows
        // the OS — omitting the option is a UI decision, not a reason to flash
        // a dark-mode visitor a light page.
        doc.dataset.psiTheme =
          mode || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

        // Paint the cached brand before first paint. The app then validates the
        // vector, re-derives, and rewrites the cache if it disagrees, so a stale
        // cache costs one frame rather than pinning a visitor to old output.
        if (brand && brand.cache && typeof brand.cache === "object") {
          for (var name in brand.cache) {
            if (name.indexOf("--psi-") === 0) {
              doc.style.setProperty(name, brand.cache[name]);
            }
          }
          doc.dataset.psiCustom = "";
        }
      })();
    </script>
```

- [ ] **Step 5: Run the tests**

```bash
pnpm vitest run apps/promo/src/__tests__/theme.test.ts
```

Expected: PASS, all 9 cases. If `apps/promo` has no vitest environment configured for `localStorage`, add `environment: "jsdom"` to its vitest config — the repo's root config already runs jsdom for `packages/react`.

- [ ] **Step 6: Commit**

```bash
git add apps/promo/src/theme.ts apps/promo/index.html apps/promo/src/__tests__/theme.test.ts
git commit -m "feat(promo): split mode and brand into two orthogonal storage keys (D57)"
```

---

### Task 9: The header — Ψ mark and a binary toggle

**Files:**
- Create: `apps/promo/src/PsiMark.tsx`
- Modify: `apps/promo/src/sections/Header.tsx`
- Modify: `apps/promo/src/App.tsx`

**Interfaces:**
- Consumes: `Mode`, `useMode` (Task 8). OS following lives inside `useMode`; there is no separate sync hook.
- Produces: `<PsiMark size={number} />`; `<Header mode onMode />`.

- [ ] **Step 1: Write the mark**

Create `apps/promo/src/PsiMark.tsx`. `currentColor` is load-bearing: a hardcoded fill would be the one element on the page ignoring a console-derived theme.

```tsx
/** The Ψ mark. Inline rather than a public/ asset: no extra request, and
 * `currentColor` makes it follow whatever theme the hero just derived. */
export function PsiMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2v20" />
      <path d="M6 6v5a6 6 0 0 0 12 0V6" />
    </svg>
  );
}
```

- [ ] **Step 2: Rewrite the header's mark and switcher**

In `apps/promo/src/sections/Header.tsx`, replace the `THEMES` import with `PsiMark` and the `Mode` type, put the mark inside the wordmark link, and replace the four-button group with a single toggle:

```tsx
import { Button } from "@handamade/psi-react";

import { STORYBOOK_BASE } from "../lib/storybook";
import { PsiMark } from "../PsiMark";
import type { Mode } from "../theme";
```

The wordmark gains the mark before the existing text:

```tsx
        <a className="wordmark" href="#top" aria-label="Psi — back to top">
          <PsiMark size={24} />
          <span className="wordmark-mark" aria-hidden="true">
            psi
          </span>
          <span className="wordmark-sub">design system</span>
        </a>
```

And the switcher becomes:

```tsx
        <div className="theme-switch">
          <Button
            size={24}
            variant="neutral-subtle"
            aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
            onClick={() => onMode(mode === "dark" ? "light" : "dark")}
          >
            {mode === "dark" ? "light" : "dark"}
          </Button>
        </div>
```

with the props changed to `{ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }`.

- [ ] **Step 3: Rewire `App.tsx`**

```tsx
import { useMode } from "./theme";

export function App() {
  const [mode, setMode] = useMode();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header mode={mode} onMode={setMode} />
      {/* …unchanged… */}
    </>
  );
}
```

- [ ] **Step 4: Verify in the browser**

```bash
pnpm --dir apps/promo dev
```

Use the preview tools: confirm the mark renders, the toggle flips `data-psi-theme` on `<html>`, the label reads the *destination* not the current state, and the choice survives a reload.

- [ ] **Step 5: Commit**

```bash
git add apps/promo/src/PsiMark.tsx apps/promo/src/sections/Header.tsx apps/promo/src/App.tsx
git commit -m "feat(promo): Psi mark and a binary light/dark toggle in the header (D57)"
```

---

### Task 10: The hero console

The Δ-lightness card is subsumed, not displaced: its swatches already read `oklch(from var(--psi-fill-accent) …)` (`promo.css:332–344`), so they follow a derived accent with **no new CSS**. Their labels must stay on the panel — D76's site-gate test records that they once sat on the swatches and measured 2.88:1.

**Files:**
- Rewrite: `apps/promo/src/sections/Hero.tsx`
- Modify: `apps/promo/src/promo.css` (console layout only — no colour literals)

**Interfaces:**
- Consumes: `parsePrompt`, `deriveTheme`, `serializeCustomerTheme`, `isBrandVector` from `@handamade/psi-tokens/generate`; `useBrand`, `applyCustomProperties` from `../theme`. `mode` and `onMode` arrive as PROPS from `App.tsx` — Hero must NOT call `useMode()` itself, or it gets a second independent instance that desyncs from the header's toggle and silently breaks mode-switching after the first click.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Build the derive flow**

Replace the `formula-card` block in `Hero.tsx` with the console. The essential logic, in order:

```tsx
const derive = useCallback(
  async (prompt: string) => {
    // 1. Local derivation renders immediately — this is the floor, not a
    //    fallback. With no API key the console is fully functional.
    const localVector = parsePrompt(prompt);
    applyVector(localVector, "local seed engine");

    // 2. Then consult the art director. Failure is silent and expected.
    let remote: unknown = null;
    try {
      const res = await fetch("/api/theme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(15_000),
      });
      remote = res.status === 200 ? await res.json() : null;
    } catch {
      remote = null;
    }

    // 3. Discard a stale response: the visitor may have typed since.
    if (inputRef.current?.value.trim() !== prompt) return;

    if (isBrandVector(remote)) applyVector(remote, "claude");
    else log("// art director unreachable — the local derivation stands.");
  },
  [applyVector, log],
);
```

`applyVector` derives the pair once, applies the member matching the vector's `mode`, switches the header mode to it, stores the vector plus that member's properties as the cache, and logs the contrast readouts:

```tsx
const applyVector = useCallback(
  (vector: BrandVector, source: string) => {
    const pair = deriveTheme(vector);
    const member = pair[vector.mode];
    applyCustomProperties(member.customProperties);
    setMode(vector.mode);
    setBrand(vector, member.customProperties);
    setSource(pair);
    log(`> art direction: ${source} · "${vector.name.replace(/-/g, " ")}"`);
    log("> applied. both modes. zero failures — by construction.");
  },
  [setBrand, setMode, log],
);
```

- [ ] **Step 2: Render the console**

Four regions inside the card:

1. **Prompt row** — a `<form>` with a labelled text input and a `derive` submit button. Submit calls `derive(input.value)`.
2. **Transcript** — an `aria-live="polite"` log. Lines render instantly when `matchMedia("(prefers-reduced-motion: reduce)").matches`, otherwise staggered ~90ms.
3. **Derived-state row** — the existing `.derive` markup, unchanged, with the Δ slider. **Labels stay on `.derive-controls`, never on `.derive-swatch`.**
4. **Actions** — `copy customers/<name>.ts` (writes `serializeCustomerTheme(pair).source` to the clipboard) and `reset`, the latter rendered only while `brand !== null` and calling `reset()` from `useBrand`.

- [ ] **Step 3: Re-derive and heal the cache on mount**

```tsx
useEffect(() => {
  const stored = readStoredBrand();
  if (!stored) return;
  const pair = deriveTheme(stored.vector);
  const member = pair[mode];
  applyCustomProperties(member.customProperties);
  setSource(pair);
  // Rewrite a drifted cache so the NEXT load paints correctly pre-paint.
  setBrand(stored.vector, member.customProperties);
}, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount only
```

- [ ] **Step 4: Swap members when the mode changes**

```tsx
useEffect(() => {
  if (!brand) return;
  const member = deriveTheme(brand)[mode];
  applyCustomProperties(member.customProperties);
  setBrand(brand, member.customProperties);
}, [mode, brand, setBrand]);
```

This is the whole of "the toggle selects a member; it never re-derives" — no solver pass, no network.

- [ ] **Step 5: Verify in the browser**

Start the dev server and check, in order: derive with no API key (local path, transcript says *local seed engine*); the whole page repaints; the three Theming cards stay light/dark/acme; toggling the header swaps members instantly; reload restores with no flash; reset returns to stock and keeps the mode and the prompt text.

- [ ] **Step 6: Commit**

```bash
git add apps/promo/src/sections/Hero.tsx apps/promo/src/promo.css
git commit -m "feat(promo): the theme console in the hero (D57)"
```

---

### Task 11: Theming receives `themes/light.ts`

**Files:**
- Modify: `apps/promo/src/sections/Theming.tsx`

- [ ] **Step 1: Move the listing**

Add the `themes/light.ts` → `--psi-fg-accent` source block from the old hero beside the existing `ACME_SNIPPET`, so both theme *source* artifacts sit together:

```tsx
const LIGHT_SNIPPET = `fgAccent: token({
  from: slot.accent,
  l: set(0.48),
  c: cap(0.23),
}),`;
```

Render it in `.theming-cols` with the caption `themes/light.ts · the shipped default`, above the existing `customers/acme.ts` block.

- [ ] **Step 2: Keep the AA claim true**

The bullet at `Theming.tsx:137` reads "WCAG AA is a build gate, not a guideline." With whole-page theming, that sentence is now read while a *solved* theme is on screen. Extend it rather than deleting it:

```tsx
<strong>WCAG AA is a build gate, not a guideline.</strong> A theme
committed to the repo fails the build if it fails the contrast matrix.
A theme derived in the console can&rsquo;t fail it at all — every pair is
solved to AA before it renders.
```

- [ ] **Step 3: Leave the three preview cards alone**

They already set `data-psi-theme={name}` on themselves, which is what keeps them pinned under a generated theme. Task 12 tests this. Do not refactor them.

- [ ] **Step 4: Commit**

```bash
git add apps/promo/src/sections/Theming.tsx
git commit -m "docs(promo): move the light.ts formula beside acme.ts in Theming (D57)"
```

---

### Task 12: Site gate — key rename in lockstep, and the pinned-demo test

`site.spec.ts:20` seeds `localStorage["psi-theme"]` to run axe under both appearances. The key survives this change, but the test must stop *trusting* the seed: if a later rename breaks it, axe silently runs twice against the same appearance and the dark pass is lost without a failure.

**Files:**
- Modify: `apps/promo/site-gate/site.spec.ts`

- [ ] **Step 1: Assert the resolved attribute**

Replace the loop at lines 18–24:

```ts
for (const theme of ["light", "dark"] as const) {
  test(`no axe violations (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("psi-theme", t), theme);
    await page.goto(BASE, { waitUntil: "networkidle" });
    // Prove the seed actually took. Without this, a future key rename would
    // leave both runs on the same appearance and pass anyway (D57).
    await expect(page.locator("html")).toHaveAttribute("data-psi-theme", theme);
    expect(await runAxe(page)).toEqual([]);
  });
}
```

- [ ] **Step 2: Add the pinned-demo test**

```ts
/**
 * The Theming section's three cards each declare their own data-psi-theme, so
 * an element's own rule beats an inherited value and they stay pinned under a
 * console-derived theme. Those cards ARE the attribute-scoping argument — if a
 * generated theme swallowed them the section would refute itself (D57).
 */
test("a derived theme does not repaint the pinned Theming cards", async ({ page }) => {
  await page.goto(BASE, { waitUntil: "networkidle" });

  const cardBg = () =>
    page.evaluate(() => {
      const card = document.querySelector('[data-psi-theme="acme"]');
      return card ? getComputedStyle(card).backgroundColor : null;
    });

  const before = await cardBg();
  expect(before).not.toBeNull();

  // Apply an extreme brand directly to <html>, as the console does.
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--psi-bg-primary", "#ff00ff");
    document.documentElement.dataset.psiCustom = "";
  });

  expect(await cardBg()).toBe(before);

  // …and prove the page around them DID move, or the test proves nothing.
  const bodyBg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(bodyBg).toContain("255, 0, 255");
});
```

- [ ] **Step 3: Run the gate**

```bash
pnpm build && pnpm test:site
```

Expected: PASS. `test:site` needs `apps/promo/dist`, so the full build must run first.

- [ ] **Step 4: Commit**

```bash
git add apps/promo/site-gate/site.spec.ts
git commit -m "test(promo): assert the seeded mode took, and that pinned cards stay pinned (D57)"
```

---

### Task 13: Docs, changeset, and all five gates

**Files:**
- Modify: `packages/tokens/llms.txt`, `packages/tokens/README.md`
- Create: `.changeset/theme-console.md`

- [ ] **Step 1: Document the new subpath**

Add `@handamade/psi-tokens/generate` to `packages/tokens/llms.txt` and the README's export table, describing `parsePrompt`, `deriveTheme` and `serializeCustomerTheme` in one line each. `check-docs-drift` compares prose counts against the manifest — if it reports a mismatch, fix the prose, never the manifest.

- [ ] **Step 2: Write the changeset**

Create `.changeset/theme-console.md`:

```markdown
---
"@handamade/psi-tokens": minor
---

Add `@handamade/psi-tokens/generate` (D57): derive a brand from a text prompt
as an AA-solved light/dark pair, and serialize it as `customers/<name>.ts`
source. `parsePrompt` is deterministic — an FNV-1a hash seeds a PRNG, so an
unrecognised prompt still derives a coherent brand. `deriveTheme` returns both
members from one `BrandVector`, each solved to WCAG AA by binary-searching
lightness, so a generated theme cannot fail the contrast matrix. The package
now compiles `src/generate` to `dist/generate` via `tsc`.
```

- [ ] **Step 3: Run all five gates**

```bash
nvm use
pnpm build && node tools/check-docs-drift.mjs && pnpm test && pnpm lint && pnpm --dir apps/promo build && pnpm test:site
```

Expected: all clean. `check-docs-drift` is its own CI step and is the one that gets forgotten — do not skip it.

- [ ] **Step 4: Verify the published shape**

```bash
pnpm --filter @handamade/psi-tokens build
node -e "import('@handamade/psi-tokens/generate').then(m => console.log(Object.keys(m)))"
```

Expected: the exported names from Task 6's `index.ts`. This is the check `pnpm verify:published` automates after release, and the one that caught D68's `./styles` bug.

- [ ] **Step 5: Commit and open the PR**

```bash
git add -A
git commit -m "docs: document the generate subpath and add the D57 changeset"
git push -u origin d57-theme-console
gh pr create --title "feat: the theme console derives a brand from a prompt (D57)" --body "…"
gh pr merge --auto --squash
gh pr view --json autoMergeRequest   # MUST show non-null; exit 0 does not mean it armed
```

If `autoMergeRequest` is `null`, arm it with the `enablePullRequestAutoMerge` GraphQL mutation. CI's `vr` job is the visual-regression gate — `pnpm vr` cannot pass locally.

---

## Self-Review

**Spec coverage.** Every decision maps to a task: `BrandVector` and untrusted producers → 2, 7; pair derivation → 3, 5; solved-not-gated AA → 4, 5; whole-page theming and pinned demos → 10, 12; persistence of the vector with a cache → 8, 10; reset scope → 8, 10; formula card subsumed → 10; real `customers/<name>.ts` → 6; Ψ mark and binary toggle → 9; two orthogonal keys and the stale-value fallthrough → 8; `light.ts` relocation → 11; site-gate lockstep and the D76 label invariant → 10, 12; docs and changeset → 13.

**Deliberately deferred, per the spec's non-goals:** no `--prompt` flag on `pnpm new-theme`; no new token families; no webfont loading; no DTCG export. `ember`'s missing site surface is the Theming redesign's work — the spec's "Known carry" records it, and nothing in this plan resolves it.

**Two risks the executor should expect.**

1. **Task 1's `include` scoping is unverified** — dependencies aren't installed in this worktree, so `tsc --listFiles` couldn't be run. Step 7 exists to catch an over-broad emit. If `dist/themes/**` appears, narrow `include` and re-run rather than proceeding.
2. **Task 5's AA sweep is the plan's real gate.** `solveOverrides` targets the four text-on-canvas tokens; `wcagAAPairs` covers more. If the sweep fails, extend the solver to the failing token — never relax the assertion, because that test is what makes "zero failures by construction" true rather than decorative.

---

Plan complete and saved to `docs/superpowers/plans/2026-08-10-theme-console.md`. Two execution options:

**1. Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — tasks executed in this session using executing-plans, batched with checkpoints.
