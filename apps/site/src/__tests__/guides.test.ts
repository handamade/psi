import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { GUIDE_ORDER } from "../content/docs-nav";

const dir = join(__dirname, "..", "content", "guides");

describe("guides", () => {
  it("are the five v1 guides, one file each", () => {
    expect(readdirSync(dir).map((f) => f.replace(/\.mdx$/, "")).sort()).toEqual([...GUIDE_ORDER].sort());
  });

  it("state no component, icon or pattern count by hand", () => {
    for (const f of readdirSync(dir)) {
      const text = readFileSync(join(dir, f), "utf8");
      expect(text, f).not.toMatch(/\b\d+\s+(React 19 )?(components|icons|composition patterns)\b/);
    }
  });

  it("installation names all five stylesheets", () => {
    const text = readFileSync(join(dir, "installation.mdx"), "utf8");
    for (const s of ["base.css", "components.css", "utilities.css", "@handamade/psi-react/styles", "light.css"]) {
      expect(text).toContain(s);
    }
  });
});
