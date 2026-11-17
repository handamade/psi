import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

import { docSection, summary } from "../src/data";
import { allExportNames, getExport, readGeneratedDoc } from "../src/node";
import { componentPages } from "../src/pages";

const require = createRequire(import.meta.url);
const srcDir = join(dirname(require.resolve("@handamade/psi-react/manifest.json")), "..", "src");
const folders = readdirSync(srcDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== "icons")
  .map((d) => d.name);

describe("componentPages", () => {
  it("has one page per component folder", () => {
    expect(componentPages.map((p) => p.members[0]).sort()).toEqual([...folders].sort());
  });

  it("places every manifest export on exactly one page", () => {
    const placed = componentPages.flatMap((p) => p.members);
    expect([...placed].sort()).toEqual([...allExportNames()].sort());
    expect(new Set(placed).size).toBe(placed.length);
  });

  it("uses lowercase kebab slugs, each once", () => {
    const slugs = componentPages.map((p) => p.slug);
    expect(slugs.every((s) => /^[a-z][a-z0-9-]*$/.test(s))).toBe(true);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("lib/components", () => {
  it("reads an export's props from the manifest", () => {
    const button = getExport("Button");
    expect(button.props.find((p) => p.name === "size")?.type).toBe("24 | 32 | 40 | 48");
  });

  it("reads a generated doc and cuts one section out of it", () => {
    const md = readGeneratedDoc("Tabs");
    expect(md.startsWith("<!--")).toBe(false);
    expect(docSection(md, "Keyboard & assistive tech")).toContain("| Keys |");
    expect(docSection(md, "No such section")).toBeNull();
  });
});

describe("summary", () => {
  const of = (n: string) => summary(getExport(n).description);

  it("never doubles the period", () => {
    expect(of("Card")).not.toContain("..");
    expect(of("Card").endsWith(".")).toBe(true);
  });

  it("widens a 'Not ...' opening to two sentences", () => {
    for (const n of ["CopyButton", "InlineAlert"]) {
      expect(of(n).split(/(?<=\.)\s/).length, n).toBeGreaterThan(1);
    }
  });

  it("does not cut Dialog's description to a fragment", () => {
    expect(of("Dialog").length).toBeGreaterThanOrEqual(40);
  });

  it("reads as a description on every page", () => {
    for (const p of componentPages) {
      const s = summary(getExport(p.members[0]).description);
      expect(s, p.slug).not.toContain("`");
      expect(s, p.slug).toMatch(/[^.]\.$/);
      expect(s.length, p.slug).toBeGreaterThanOrEqual(40);
    }
  });
});
