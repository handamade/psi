import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { componentPages } from "../src/pages";

const dir = join(__dirname, "..", "examples");

describe("examples", () => {
  it("every component page has at least one example", () => {
    const missing = componentPages
      .filter((p) => !existsSync(join(dir, p.slug)) || readdirSync(join(dir, p.slug)).length === 0)
      .map((p) => p.slug);
    expect(missing).toEqual([]);
  });

  it("every example folder belongs to a page", () => {
    const slugs = new Set(componentPages.map((p) => p.slug));
    const strays = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !slugs.has(d.name))
      .map((d) => d.name);
    expect(strays).toEqual([]);
  });

  it("examples import Psi from the package root, as a consumer would", () => {
    for (const slug of readdirSync(dir)) {
      for (const file of readdirSync(join(dir, slug))) {
        const src = readFileSync(join(dir, slug, file), "utf8");
        expect(src, `${slug}/${file}`).not.toMatch(/from ["']@handamade\/psi-react\/|from ["']\.\.\/\.\.\/\.\.\//);
        expect(src, `${slug}/${file}`).toMatch(/export default function /);
      }
    }
  });

  it("the showcase imports Psi from the package root and exports a default function", () => {
    const src = readFileSync(join(__dirname, "..", "showcase", "canopy.tsx"), "utf8");
    expect(src).not.toMatch(/from ["']@handamade\/psi-react\//);
    expect(src).toMatch(/export default function Canopy/);
    expect(src).not.toMatch(/style=\{\{|className="(?!psi-)/);
  });
});
