import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { emitPatternStories, patternIdToExportName } from "./emit-pattern-stories.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("patternIdToExportName", () => {
  it("PascalCases a kebab-case pattern id", () => {
    expect(patternIdToExportName("filter-toolbar")).toBe("FilterToolbar");
    expect(patternIdToExportName("data-table")).toBe("DataTable");
    expect(patternIdToExportName("action-feedback")).toBe("ActionFeedback");
  });
});

describe("emitPatternStories", () => {
  it("emits one named export per pattern, matching patterns.json 1:1", () => {
    const patterns = [
      { id: "filter-toolbar" },
      { id: "data-table" },
    ];
    const source = emitPatternStories(patterns);
    expect(source).toContain("export const FilterToolbar: Story = {");
    expect(source).toContain("export const DataTable: Story = {");
    expect((source.match(/^export const \w+: Story = \{$/gm) ?? []).length).toBe(2);
  });

  it("double-emit is byte-identical (same discipline as emit-patterns.ts)", () => {
    const patterns = [{ id: "filter-toolbar" }];
    expect(emitPatternStories(patterns)).toBe(emitPatternStories(patterns));
  });

  it("real build output: generated file has exactly one export per real pattern.json entry", () => {
    const patternsPath = join(__dirname, "../../../packages/react/dist/patterns.json");
    const real = JSON.parse(readFileSync(patternsPath, "utf8")) as { patterns: Array<{ id: string }> };
    const source = emitPatternStories(real.patterns);
    const exportCount = (source.match(/^export const \w+: Story = \{$/gm) ?? []).length;
    expect(exportCount).toBe(real.patterns.length);
    for (const p of real.patterns) {
      expect(source).toContain(`export const ${patternIdToExportName(p.id)}: Story = {`);
    }
  });
});
