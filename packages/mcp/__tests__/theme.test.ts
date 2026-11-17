import { describe, expect, it } from "vitest";
import { deriveTheme, parseColor } from "@handamade/psi-tokens/generate";

import { ThemeError, chromaWordFor, themeMarkdown, themeVector } from "../src/theme.js";

describe("themeVector", () => {
  it("reduces a hex to its hue and the nearest chroma word", () => {
    const v = themeVector({ color: "#3b82f6" });
    expect(v.hue).toBe(Math.round(parseColor("#3b82f6")!.h!) % 360);
    expect(v.chroma).toBe(chromaWordFor(parseColor("#3b82f6")!.c));
    expect(v).toMatchObject({ radius: 8, mode: "light", name: `brand-${v.hue}` });
  });

  it("takes a hue with explicit chroma, radius and name", () => {
    expect(themeVector({ hue: 30, chroma: "calm", radius: 12, name: "acme-red" })).toEqual({
      hue: 30,
      chroma: "calm",
      radius: 12,
      mode: "light",
      name: "acme-red",
    });
  });

  it("picks the nearest chroma word", () => {
    expect(chromaWordFor(0)).toBe("muted");
    expect(chromaWordFor(0.15)).toBe("balanced");
    expect(chromaWordFor(0.4)).toBe("electric");
  });

  it.each([
    [{}, /color.*or hue/],
    [{ color: "#3b82f6", hue: 10 }, /not both/],
    [{ color: "nope" }, /Could not read "nope"/],
    [{ color: "#808080" }, /no hue/],
    [{ hue: 360 }, /0 to 359/],
    [{ hue: 10, name: "Bad_Name" }, /kebab-case/],
    [{ hue: 10, radius: 5 as never }, /radius/],
    [{ hue: 10, chroma: "loud" as never }, /chroma/],
  ])("rejects %o", (input, message) => {
    expect(() => themeVector(input)).toThrow(ThemeError);
    expect(() => themeVector(input)).toThrow(message);
  });
});

describe("themeMarkdown", () => {
  const md = themeMarkdown({ hue: 264, chroma: "balanced", name: "ocean" });
  const pair = deriveTheme({ hue: 264, chroma: "balanced", mode: "light", radius: 8, name: "ocean" });

  it("emits a light and a dark rule in the theme layer, each with its color-scheme", () => {
    expect(md).toContain('@layer psi.theme {\n  [data-psi-theme="ocean"] {\n    color-scheme: light;');
    expect(md).toContain('@layer psi.theme {\n  [data-psi-theme="ocean-dark"] {\n    color-scheme: dark;');
  });

  it("puts component overrides in the components layer", () => {
    expect(md).toContain('@layer psi.components {\n  [data-psi-theme="ocean"] {\n    --psi-control-radius: var(--psi-radius-8);');
  });

  it("carries exactly the values deriveTheme computes", () => {
    for (const member of [pair.light, pair.dark]) {
      for (const [prop, value] of Object.entries(member.customProperties)) {
        expect(md).toContain(`    ${prop}: ${value};`);
      }
    }
  });

  it("tells the agent how to install it", () => {
    expect(md).toContain('import "@handamade/psi-tokens/light.css";\nimport "./ocean.css";');
    expect(md).toContain('data-psi-theme="ocean-dark"');
  });

  it("lists every gated pair, each at or above its minimum in both members", () => {
    const rows = md.split("\n").filter((l) => /^\| `\w+` on `\w+` \|/.test(l));
    expect(rows.length).toBeGreaterThan(30);
    for (const row of rows) {
      const [, , light, dark, min] = row.split("|").map((c) => c.trim());
      expect(Number(light)).toBeGreaterThanOrEqual(Number(min));
      expect(Number(dark)).toBeGreaterThanOrEqual(Number(min));
    }
  });
});
