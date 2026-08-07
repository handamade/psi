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
