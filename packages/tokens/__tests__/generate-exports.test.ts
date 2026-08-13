import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../package.json"), "utf8"),
) as { exports: Record<string, unknown>; build?: string; scripts: Record<string, string> };

describe("the generate subpath", () => {
  it("is declared in exports with both types and import", () => {
    expect(pkg.exports["./generate"]).toEqual({
      types: "./dist/generate/index.d.ts",
      import: "./dist/generate/index.js",
    });
  });

  it("compiles src before the token build writes dist", () => {
    // tsc must run in the build script, or ./generate resolves to nothing.
    expect(pkg.scripts.build).toContain("tsc -p tsconfig.build.json");
  });
});
