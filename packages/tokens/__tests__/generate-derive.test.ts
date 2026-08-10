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

  it("preserves alpha on custom properties instead of collapsing onto the opaque source token", () => {
    // Finding 1: tok.hex is always opaque (formatHex discards alpha). A
    // token like fillTintAccent carries alpha and derives from fgAccent —
    // if the alpha channel is silently dropped when emitting
    // customProperties, fillTintAccent renders byte-identical to fgAccent at
    // full strength in the browser, even though checkContrast (which
    // composites alpha correctly) still reports the AA sweep as clean. That
    // would make the sweep's guarantee false for anything actually painted
    // from these custom properties (Task 10).
    const pair = deriveTheme(parsePrompt("sharp forest"));
    const props = pair.light.customProperties;

    expect(props["--psi-fill-tint-accent"]).toMatch(/^#[0-9a-f]{8}$/);
    expect(props["--psi-fill-tint-accent"]).not.toBe(props["--psi-fg-accent"]);

    // Opaque tokens must stay 6-digit — no gratuitous "ff" suffix.
    expect(props["--psi-bg-primary"]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("is deterministic", () => {
    const a = deriveTheme(parsePrompt("quiet lagoon")).light.customProperties;
    const b = deriveTheme(parsePrompt("quiet lagoon")).light.customProperties;
    expect(a).toEqual(b);
  });
});
