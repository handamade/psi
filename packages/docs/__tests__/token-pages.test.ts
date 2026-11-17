import { describe, expect, it } from "vitest";

import { THEMES, colorTokens } from "../src/data";
import { resolved } from "../src/node";
import { tokenPages } from "../src/pages";

describe("tokenPages", () => {
  it("covers every top-level token group and every scale but scopes, each once", () => {
    const r = resolved("light");
    const expected = [
      "tokens",
      "typography",
      "display",
      ...Object.keys(r.scales).filter((k) => k !== "scopes").map((k) => `scales.${k}`),
    ].sort();
    const covered = tokenPages.flatMap((p) => p.covers);
    expect([...covered].sort()).toEqual(expected);
    expect(new Set(covered).size).toBe(covered.length);
  });

  it("is the six pages, in reading order", () => {
    expect(tokenPages.map((p) => p.slug)).toEqual([
      "color",
      "typography",
      "display",
      "spacing",
      "motion",
      "layout",
    ]);
  });
});

describe("colorTokens", () => {
  it("gives every semantic colour its CSS variable, formula and a value in all four themes", () => {
    const all = colorTokens(Object.fromEntries(THEMES.map((t) => [t, resolved(t)])) as never);
    expect(all.length).toBe(Object.keys(resolved("light").tokens).length);
    const bg = all.find((t) => t.name === "bgPrimary")!;
    expect(bg.cssVar).toBe("--psi-bg-primary");
    expect(bg.formula.length).toBeGreaterThan(0);
    expect(Object.keys(bg.byTheme).sort()).toEqual(["acme", "dark", "ember", "light"]);
  });
});
