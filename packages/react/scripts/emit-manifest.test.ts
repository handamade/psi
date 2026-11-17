import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = dirname(__dirname);
const manifest = JSON.parse(
  readFileSync(join(root, "dist", "manifest.json"), "utf8"),
) as { components: unknown[]; icons: string[] };

describe("manifest icon roster", () => {
  it("lists every Icon*.tsx in src/icons", () => {
    const onDisk = readdirSync(join(root, "src", "icons"))
      .filter((f) => f.startsWith("Icon") && f.endsWith(".tsx"))
      .map((f) => f.replace(/\.tsx$/, ""))
      .sort();
    expect(manifest.icons).toEqual(onDisk);
  });

  it("is sorted and non-empty", () => {
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.icons).toEqual([...manifest.icons].sort());
  });
});

describe("manifest: attributes, accessible names and contracts (D129)", () => {
  type Entry = { name: string; attributes: string | null; accessibleName: { oneOf: string[] } | null };
  const manifestD129 = JSON.parse(readFileSync(join(root, "dist", "manifest.json"), "utf8")) as {
    components: Entry[];
    contracts: Record<string, string[]>;
  };
  const attrs = JSON.parse(readFileSync(join(root, "dist", "attributes.json"), "utf8")) as {
    sets: string[][];
    components: Record<string, number>;
  };
  const by = (n: string) => manifestD129.components.find((c) => c.name === n)!;
  const attributeNames = (n: string) => new Set(attrs.sets[attrs.components[n]] ?? []);

  it("names the attribute interface each component extends", () => {
    expect(by("Button").attributes).toBe("ButtonHTMLAttributes");
    expect(by("Input").attributes).toBe("InputHTMLAttributes");
    expect(by("TableCell").attributes).toBe("TdHTMLAttributes");
    expect(by("MenuItem").attributes).toBeNull();
  });

  it("lists the attribute names that pass through, and leaves out declared props", () => {
    const button = attributeNames("Button");
    for (const a of ["onClick", "disabled", "id", "aria-describedby", "style"]) expect(button.has(a), a).toBe(true);
    expect(button.has("variant")).toBe(false);
    expect(attrs.components.MenuItem).toBeUndefined();
  });

  it("states which components need an accessible name", () => {
    expect(by("IconButton").accessibleName).toEqual({ oneOf: ["aria-label", "aria-labelledby"] });
    expect(by("TabList").accessibleName).toEqual({ oneOf: ["aria-label"] });
    expect(by("Button").accessibleName).toBeNull();
  });

  it("carries the slot contracts", () => {
    expect(manifestD129.contracts.interactive).toContain("Button");
  });
});
