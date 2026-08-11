import { describe, it, expect } from "vitest";
import { deriveTheme } from "../src/generate/derive.js";
import { parsePrompt } from "../src/generate/prompt.js";
import { checkContrast, componentLabelPairs, wcagAAPairs } from "../src/contrast-matrix.js";
import { CHROMA_WORDS, RADIUS_RUNGS, type BrandVector } from "../src/generate/types.js";

/**
 * The SAME 33 pairs `scripts/build.ts` gates every committed theme on.
 *
 * This file used to assert against `wcagAAPairs` alone — 28 pairs — which is
 * why the suite could not catch a derived theme failing `fgOnAccent` on
 * `fillAccent`: the prompt "bold calm app" rendered that pair at 4.4979:1 in
 * both modes with every test here green, and the `customers/bold-calm-app.ts`
 * it emitted then threw in `pnpm build`. Asserting a narrower set than the
 * build gate is the defect, not a detail of it.
 */
const AA_MATRIX = [...wcagAAPairs, ...componentLabelPairs];

function failuresOf(resolved: Parameters<typeof checkContrast>[0]): string[] {
  return checkContrast(resolved, AA_MATRIX)
    .filter((r) => !r.pass)
    .map((f) => `${f.fg}/${f.bg} ${f.ratio}<${f.minRatio}`);
}

const PROMPTS = [
  "sunset over the atlantic",
  "midnight forest",
  "neon cyber grape",
  "calm quiet linen",
  "zzzq wibble frobnicate",
  "",
  // Finding 3: none of the prompts above exercise "muted" chroma (0.06, the
  // lowest, most likely to struggle clearing AA at low L) or radius rung 6.
  // "misty" -> muted (dictionaries.ts CHROMAS), "crisp" -> radius 6 (RADII),
  // "lagoon" -> hue 200 (HUES). Verified against parsePrompt directly.
  "misty crisp lagoon",
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
      expect(failuresOf(member.resolved), `${member.mode} failures`).toEqual([]);
    }
  });

  it("clears all 33 pairs for the prompt that used to miss by 0.0021", () => {
    // "bold calm app" parses to hue 146 / vivid, the worst hue for a white
    // label on a `l: 0.55` accent. Both modes share the accent anchor, so the
    // regression showed up in both at once.
    const vector = parsePrompt("bold calm app");
    expect(vector).toMatchObject({ hue: 146, chroma: "vivid" });

    const pair = deriveTheme(vector);
    for (const member of [pair.light, pair.dark]) {
      expect(failuresOf(member.resolved), `${member.mode} failures`).toEqual([]);
      const label = checkContrast(member.resolved, componentLabelPairs).find(
        (r) => r.fg === "fgOnAccent" && r.bg === "fillAccent",
      )!;
      // Not merely ≥ 4.5: the point of the palette-side fix is headroom, so a
      // future change that lands the pair back on the threshold fails here
      // rather than in someone's `pnpm build`.
      expect(label.ratio, `${member.mode} fgOnAccent/fillAccent`).toBeGreaterThan(4.6);
    }
  });

  /**
   * A sample of prompts proves nothing about "any prompt". This walks the
   * whole reachable vector space — every hue × every chroma word × both
   * modes — and asserts zero failures across all 33 pairs and zero throws.
   * `radius` and `fonts` cannot move a colour, so they are not swept.
   */
  it(
    "clears all 33 pairs across 360 hues x 5 chroma words x both modes",
    () => {
      const failures: string[] = [];
      const thrown: string[] = [];

      for (let hue = 0; hue < 360; hue++) {
        for (const chroma of CHROMA_WORDS) {
          const vector: BrandVector = {
            hue,
            chroma,
            mode: "light",
            radius: RADIUS_RUNGS[0]!,
            name: `sweep-${hue}-${chroma}`,
          };
          let pair;
          try {
            pair = deriveTheme(vector);
          } catch (e) {
            thrown.push(`${hue}/${chroma}: ${(e as Error).message}`);
            continue;
          }
          for (const member of [pair.light, pair.dark]) {
            for (const f of failuresOf(member.resolved)) {
              failures.push(`${hue}/${chroma} ${member.mode} ${f}`);
            }
          }
        }
      }

      expect(thrown.slice(0, 5)).toEqual([]);
      expect(failures.slice(0, 10)).toEqual([]);
    },
    60_000,
  );

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

  it("emits alpha-carrying tokens with the exact channels and alpha the AA sweep validated", () => {
    // Finding 1: tok.hex is always opaque (formatHex discards alpha). A
    // token like fillTintAccent carries alpha and derives from fgAccent —
    // if the alpha channel is silently dropped when emitting
    // customProperties, fillTintAccent renders byte-identical to fgAccent at
    // full strength in the browser, even though checkContrast (which
    // composites alpha correctly) still reports the AA sweep as clean.
    //
    // Finding 1's fix-round-2 attempt (hex8) is ALSO wrong, and a bare
    // `not.toBe` here would not have caught it: hex8 quantizes alpha to
    // 1/255, which is close enough to look plausible but composites to a
    // measurably different colour than the exact float alpha checkContrast
    // validated — enough to drop near-threshold pairs below 4.5 as
    // rendered. `rgb(r g b / alpha)` is the only form that carries both the
    // exact channels of the validated `tok.hex` AND the unrounded alpha, so
    // this test asserts that specific property, not just "looks different
    // from the opaque token".
    const pair = deriveTheme(parsePrompt("sunset calm"));
    const props = pair.light.customProperties;

    const tint = props["--psi-fill-tint-accent"]!;
    const accent = props["--psi-fg-accent"]!;

    // Exact alpha, not a 1/255 approximation.
    expect(tint).toMatch(/^rgb\(\d+ \d+ \d+ \/ 0?\.\d+\)$/);

    // …and "exact" means the NUMBER, not the shape. Asserting only the format
    // and the channel equality leaves a re-quantized alpha (hex8's 1/255
    // rounding, or any other formula) free to pass — which is precisely the
    // defect class that broke this branch twice. The emitted alpha must equal
    // the resolved token's own `oklch.alpha`, which is the value checkContrast
    // composited when it validated the pair.
    const sourceAlpha = pair.light.resolved.fillTintAccent!.oklch.alpha;
    expect(sourceAlpha).toBeDefined();
    expect(Number(tint.match(/\/ ([\d.]+)\)$/)![1])).toBe(sourceAlpha);

    // Same channels as the opaque token it derives from — this is what makes
    // the rendered contrast equal the contrast checkContrast measured.
    const channels = (v: string) => v.match(/\d+/g)!.slice(0, 3).join(",");
    const hexChannels = [1, 3, 5]
      .map((i) => String(parseInt(accent.slice(i, i + 2), 16)))
      .join(",");
    expect(channels(tint)).toBe(hexChannels);

    // Opaque tokens stay plain 6-digit hex.
    expect(props["--psi-bg-primary"]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("is deterministic", () => {
    const a = deriveTheme(parsePrompt("quiet lagoon")).light.customProperties;
    const b = deriveTheme(parsePrompt("quiet lagoon")).light.customProperties;
    expect(a).toEqual(b);
  });
});
