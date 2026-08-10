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
