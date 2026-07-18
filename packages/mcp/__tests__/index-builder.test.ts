import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../src/index-builder.js";

const pkgs = fileURLToPath(new URL("../..", import.meta.url));

// Runs against the REAL sibling dist output — doubles as an
// artifact-shape regression gate (spec: Testing).
const inputs = {
  tokensDist: `${pkgs}tokens/dist`,
  reactDist: `${pkgs}react/dist`,
  reactDocs: `${pkgs}react/docs`,
  version: "0.0.0-test",
};

describe("buildIndex", () => {
  it("indexes every manifest component with props and doc text", async () => {
    const index = await buildIndex(inputs);
    expect(index.components.length).toBeGreaterThanOrEqual(11);
    const button = index.components.find((c) => c.name === "Button");
    expect(button).toBeDefined();
    const variant = button!.props.find((p) => p.name === "variant");
    expect(variant!.type).toContain("accent-subtle");
    expect(button!.doc).toContain("Button");
  });

  it("indexes tokens with formula and per-theme values", async () => {
    const index = await buildIndex(inputs);
    expect(index.themes).toEqual(["light", "dark", "acme", "ember"]);
    const bg = index.tokens.find((t) => t.name === "bgPrimary");
    expect(bg!.formula).toBe("slot(canvas)");
    for (const theme of index.themes) {
      expect(bg!.values[theme].hex).toMatch(/^#[0-9a-f]{6}$/i);
      expect(bg!.values[theme].oklch.l).toBeTypeOf("number");
    }
  });

  it("exposes guidance keys and getting-started as topics", async () => {
    const index = await buildIndex(inputs);
    for (const key of ["variants", "rules", "states", "motion", "getting-started"]) {
      expect(index.topics[key]).toBeDefined();
    }
    expect(index.scales).toHaveProperty("space");
    expect(index.version).toBe("0.0.0-test");
  });
});
