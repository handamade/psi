import { describe, expect, it } from "vitest";
import { concreteSubpaths } from "./exports-map.mjs";

const PKG = "@handamade/psi-tokens";

describe("concreteSubpaths", () => {
  it("maps a concrete subpath onto the specifier a consumer writes", () => {
    expect(concreteSubpaths(PKG, { exports: { "./generate": {} } })).toEqual([
      `${PKG}/generate`,
    ]);
  });

  it("maps '.' onto the bare package name", () => {
    expect(concreteSubpaths(PKG, { exports: { ".": {} } })).toEqual([PKG]);
  });

  it("skips wildcard patterns, which cannot be enumerated from the map alone", () => {
    const map = {
      "./*.css": "./dist/*.css",
      "./components/*": "./dist/components/*",
      "./resolved/*": "./dist/resolved/*",
      "./types": {},
    };
    expect(concreteSubpaths(PKG, { exports: map })).toEqual([`${PKG}/types`]);
  });

  it("ignores keys that are not subpaths, so conditions never leak in as specifiers", () => {
    // A package may use the conditional-only shorthand; those keys are
    // conditions ("import", "types"), not paths, and must not be resolved.
    expect(concreteSubpaths(PKG, { exports: { import: "./dist/index.js", types: "./dist/index.d.ts" } })).toEqual([]);
  });

  it("returns nothing when the package declares no exports map", () => {
    expect(concreteSubpaths(PKG, {})).toEqual([]);
    expect(concreteSubpaths(PKG, { exports: null })).toEqual([]);
    expect(concreteSubpaths(PKG, undefined)).toEqual([]);
  });

  it("returns nothing for an array exports value, which has no subpaths", () => {
    expect(concreteSubpaths(PKG, { exports: ["./dist/index.js"] })).toEqual([]);
  });

  /**
   * The regression this whole helper exists for. 0.19.0 shipped
   * `./generate` and `verify-published` never checked it, because the
   * specifier list was maintained by hand — the same shape as D68's
   * `./styles`. Derived from the map, a new subpath is covered the day it
   * ships without anyone remembering to add it.
   */
  it("covers a newly added subpath without being told about it (0.19.0 regression)", () => {
    const shipped = {
      "./*.css": "./dist/*.css",
      "./components/*": "./dist/components/*",
      "./resolved/*": "./dist/resolved/*",
      "./dtcg/*": "./dist/dtcg/*",
      "./types": { types: "./dist/types/index.d.ts", import: "./dist/types/index.js" },
      "./generate": { types: "./dist/generate/index.d.ts", import: "./dist/generate/index.js" },
      "./guidance.json": "./dist/guidance.json",
    };
    expect(concreteSubpaths(PKG, { exports: shipped })).toEqual([
      `${PKG}/types`,
      `${PKG}/generate`,
      `${PKG}/guidance.json`,
    ]);
  });
});
