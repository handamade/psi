import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deriveTheme } from "@handamade/psi-tokens/generate";

import { frameTheme, paintFrameBrand } from "../home/CanopyFrame";
import { BRAND_KEY } from "../theme";

const vector = { hue: 30, chroma: "vivid", mode: "light", radius: 8, name: "frame-test" } as const;
const pair = deriveTheme(vector);
const root = document.documentElement;

beforeEach(() => localStorage.clear());
afterEach(() => {
  for (const name of Array.from(root.style).filter((n) => n.startsWith("--psi-"))) root.style.removeProperty(name);
  delete root.dataset.psiCustom;
});

describe("frameTheme", () => {
  it("takes a known ?theme=", () => {
    for (const t of ["light", "dark", "acme", "ember"]) expect(frameTheme(`?theme=${t}`)).toBe(t);
  });
  it("is dark for anything else, never the visitor's mode", () => {
    expect(frameTheme("")).toBe("dark");
    expect(frameTheme("?theme=nope")).toBe("dark");
  });
});

describe("paintFrameBrand", () => {
  // The stored cache is whichever member the homepage was painted in: here, light.
  beforeEach(() => {
    localStorage.setItem(BRAND_KEY, JSON.stringify({ vector, cache: pair.light.customProperties, mode: "light" }));
    for (const [n, v] of Object.entries(pair.light.customProperties)) root.style.setProperty(n, v);
  });

  it("paints the dark member in the dark segment, not the stored light cache", () => {
    paintFrameBrand("dark");
    const name = "--psi-bg-primary";
    expect(pair.dark.customProperties[name]).not.toBe(pair.light.customProperties[name]);
    expect(root.style.getPropertyValue(name)).toBe(pair.dark.customProperties[name]);
    expect(root.dataset.psiCustom).toBe("");
  });

  it("paints the light member in the light segment", () => {
    paintFrameBrand("light");
    expect(root.style.getPropertyValue("--psi-bg-primary")).toBe(pair.light.customProperties["--psi-bg-primary"]);
  });

  it("strips the brand for acme and ember, which don't take one", () => {
    paintFrameBrand("ember");
    expect(Array.from(root.style).filter((n) => n.startsWith("--psi-"))).toEqual([]);
    expect(root.dataset.psiCustom).toBeUndefined();
  });
});
