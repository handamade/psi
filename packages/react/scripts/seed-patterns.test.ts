import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPatterns, validatePatterns } from "./patterns.js";

const root = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "dist/manifest.json"), "utf8"));
const contracts = JSON.parse(readFileSync(join(root, "src/contracts.json"), "utf8"));
const patterns = loadPatterns(join(root, "patterns"));

describe("seed patterns against the real manifest", () => {
  it("all three load, validate, and none are gapped (Toolbar landed — D52)", () => {
    const { gaps } = validatePatterns(patterns, manifest.components, contracts);
    expect(patterns.map((p) => p.id).sort()).toEqual(["destructive-confirm", "filter-toolbar", "settings-form-row"]);
    expect(gaps).toEqual({});
  });
  it("Field declares its prop-slots in the manifest", () => {
    const field = manifest.components.find((c: { name: string }) => c.name === "Field");
    expect(field.slots.map((s: { name: string }) => s.name)).toEqual(["label", "body", "description"]);
  });
  it("Tag lists children like the other content-bearing leaves (eval run 07-21)", () => {
    const tag = manifest.components.find((c: { name: string }) => c.name === "Tag");
    expect(tag.props.map((p: { name: string }) => p.name)).toContain("children");
  });
});
