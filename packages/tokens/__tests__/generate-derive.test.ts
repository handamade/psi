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
