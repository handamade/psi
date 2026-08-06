import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// import.meta.dirname, not fileURLToPath(import.meta.url): under vitest's jsdom
// environment import.meta.url is not a file: URL and fileURLToPath throws.
// Same idiom as emit-patterns.test.ts.
const root = join(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  exports: Record<string, unknown>;
};

/** Guards the published `exports` map, which nothing else in this repo
 * exercises — the workspace resolves `@handamade/psi-react` through pnpm
 * links, never through the export conditions a real consumer hits. That gap is
 * why D68's external consumer run exists, and this suite is the cheap part of
 * its finding brought back in-repo. */
describe("published exports", () => {
  it("gives ./styles a types condition, so the documented import typechecks", () => {
    // Every doc says `import "@handamade/psi-react/styles"`. Without a types
    // condition that is a TS2882 error in a standard TypeScript + Vite
    // consumer: vite/client declares `*.css`, but `./styles` has no extension
    // for the glob to match. Verified against a real npm install of 0.13.0.
    expect(pkg.exports["./styles"]).toEqual({
      types: "./dist/styles.d.ts",
      default: "./dist/styles.css",
    });
  });

  it("gives the ./styles.css spelling the same treatment", () => {
    // Both spellings are published, so both must typecheck — otherwise the fix
    // just moves the trap.
    expect(pkg.exports["./styles.css"]).toEqual({
      types: "./dist/styles.d.ts",
      default: "./dist/styles.css",
    });
  });

  it("emits the declaration the types condition points at", () => {
    // A types condition aimed at a file that does not exist is worse than no
    // condition: resolution fails instead of falling through.
    expect(existsSync(join(root, "dist", "styles.d.ts"))).toBe(true);
    expect(existsSync(join(root, "dist", "styles.css"))).toBe(true);
  });

  it("keeps every export target inside the published files list", () => {
    // `files` is ["dist", "docs", "README.md", "llms.txt"] — an export pointing
    // anywhere else resolves in the workspace and 404s from the tarball.
    const targets = Object.values(pkg.exports).flatMap((entry) =>
      typeof entry === "string" ? [entry] : Object.values(entry as Record<string, string>),
    );
    for (const t of targets) {
      expect(t.startsWith("./dist/"), `${t} must live under dist/`).toBe(true);
      expect(existsSync(join(root, t)), `${t} must exist after a build`).toBe(true);
    }
  });
});
