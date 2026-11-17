import { describe, expect, it } from "vitest";

import { ACCENT_CHROMA, contrastReport, deriveTheme, parseColor } from "../src/generate/index.js";

describe("parseColor", () => {
  it("reads a hex and an oklch() string", () => {
    const blue = parseColor("#3b82f6")!;
    expect(blue.h).toBeGreaterThan(250);
    expect(blue.h).toBeLessThan(270);
    expect(parseColor("oklch(0.6 0.15 30)")).toEqual({ l: 0.6, c: 0.15, h: 30 });
  });

  it("returns null for text that is not a colour", () => {
    expect(parseColor("not a colour")).toBeNull();
  });

  it("returns no hue for a grey", () => {
    expect(parseColor("#808080")!.h).toBeUndefined();
  });
});

describe("contrastReport", () => {
  it("reports every gated pair of a derived member, all passing", () => {
    const pair = deriveTheme({ hue: 264, chroma: "balanced", mode: "light", radius: 8, name: "t" });
    const report = contrastReport(pair.light);
    expect(report.length).toBeGreaterThan(30);
    expect(report.every((r) => r.pass && r.ratio >= r.minRatio)).toBe(true);
  });
});

describe("ACCENT_CHROMA", () => {
  it("maps each chroma word to a rising chroma", () => {
    expect(ACCENT_CHROMA.muted).toBeLessThan(ACCENT_CHROMA.electric);
  });
});
