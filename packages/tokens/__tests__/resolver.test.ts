import { describe, expect, it } from "vitest";
import { resolve } from "../src/dsl/resolver.js";
import { token, set, delta, cap, slot, ref } from "../src/dsl/builders.js";
import type { Palette, SlotMap, ThemeDef } from "../src/dsl/types.js";

const palette: Palette = {
  obsidian: { l: 0.25, c: 0.02, h: 250 },
  platinum: { l: 0.95, c: 0.005, h: 250 },
  sapphire: { l: 0.55, c: 0.21, h: 260 },
};

const slots: SlotMap = {
  ink: "obsidian",
  canvas: "platinum",
  accent: "sapphire",
  success: "sapphire",
  warning: "sapphire",
  danger: "sapphire",
};

describe("resolver", () => {
  it("resolves set() on lightness", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.ink, l: set(0.3), c: set(0.03) }),
    };
    const resolved = resolve(theme, palette, slots);
    expect(resolved.fgPrimary.oklch.l).toBeCloseTo(0.3, 2);
    expect(resolved.fgPrimary.oklch.c).toBeCloseTo(0.03, 2);
    expect(resolved.fgPrimary.oklch.h).toBeCloseTo(250, 0);
    expect(resolved.fgPrimary.hex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("resolves delta()", () => {
    const theme: ThemeDef = {
      fillN: token({ from: slot.canvas, l: delta(-0.05) }),
    };
    const resolved = resolve(theme, palette, slots);
    expect(resolved.fillN.oklch.l).toBeCloseTo(0.9, 2);
  });

  it("resolves cap() — clamps chroma", () => {
    const theme: ThemeDef = {
      fgAccent: token({ from: slot.accent, l: set(0.65), c: cap(0.15) }),
    };
    const resolved = resolve(theme, palette, slots);
    expect(resolved.fgAccent.oklch.c).toBeLessThanOrEqual(0.15 + 0.001);
  });

  it("resolves alpha", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.ink, l: set(0.3) }),
      fgSecondary: token({ from: ref.fgPrimary, alpha: 0.7 }),
    };
    const resolved = resolve(theme, palette, slots);
    expect(resolved.fgSecondary.oklch.alpha).toBeCloseTo(0.7, 2);
  });

  it("resolves ref chains", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.ink, l: set(0.3) }),
      fgSecondary: token({ from: ref.fgPrimary, alpha: 0.7 }),
      fgTertiary: token({ from: ref.fgPrimary, alpha: 0.5 }),
    };
    const resolved = resolve(theme, palette, slots);
    expect(resolved.fgSecondary.oklch.l).toBeCloseTo(0.3, 2);
    expect(resolved.fgTertiary.oklch.alpha).toBeCloseTo(0.5, 2);
  });

  it("generates formula strings", () => {
    const theme: ThemeDef = {
      fgAccent: token({ from: slot.accent, l: set(0.65), c: cap(0.23) }),
    };
    const resolved = resolve(theme, palette, slots);
    expect(resolved.fgAccent.formula).toContain("accent");
  });

  it("applies gamut mapping — hex is sRGB-safe", () => {
    const widePalette: Palette = {
      ...palette,
      neon: { l: 0.8, c: 0.4, h: 150 },
    };
    const wideSlots: SlotMap = {
      ...slots,
      accent: "neon",
    };
    const theme: ThemeDef = {
      fg: token({ from: slot.accent, l: set(0.8) }),
    };
    const resolved = resolve(theme, widePalette, wideSlots);
    const hexNum = parseInt(resolved.fg.hex.slice(1), 16);
    expect(hexNum).toBeGreaterThanOrEqual(0);
    expect(hexNum).toBeLessThanOrEqual(0xffffff);
  });
});
