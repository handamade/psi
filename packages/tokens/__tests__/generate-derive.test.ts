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
