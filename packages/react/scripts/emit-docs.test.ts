import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const doc = (name: string) => readFileSync(join(root, "docs", `${name}.md`), "utf8");
/** The variant names a generated doc's "Variant guidance" lists, or null when it has none. */
function guided(name: string): string[] | null {
  const m = doc(name).match(/## Variant guidance\n\n([\s\S]*?)\n\n## /);
  if (!m) return null;
  return [...m[1].matchAll(/^- \*\*([^*]+)\*\*/gm)].map((x) => x[1]);
}

describe("variant guidance is the component's own (D145)", () => {
  it("lists only the variants Tag takes", () => {
    expect(guided("Tag")).toEqual(["accent", "neutral", "danger", "success | warning"]);
  });

  it("drops the section where no variant has guidance", () => {
    expect(guided("Card")).toBeNull();
    expect(guided("Skeleton")).toBeNull();
    expect(guided("Stack")).toBeNull();
  });

  it("keeps all eight for Button and four for IconButton", () => {
    expect(guided("Button")).toHaveLength(8);
    expect(guided("IconButton")).toEqual(["accent", "neutral", "ghost", "danger"]);
  });

  it("no longer calls success and warning Tag-only", () => {
    expect(doc("Toast")).not.toContain("Tag only");
  });
});
