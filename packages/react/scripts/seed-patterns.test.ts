import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { loadPatterns, renderPreset, validatePatterns } from "./patterns.js";

const root = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "dist/manifest.json"), "utf8"));
const contracts = JSON.parse(readFileSync(join(root, "src/contracts.json"), "utf8"));
const patterns = loadPatterns(join(root, "patterns"));

describe("seed patterns against the real manifest", () => {
  it("all five load, validate, and none are gapped (date-range-filter landed — D60)", () => {
    const { gaps } = validatePatterns(patterns, manifest.components, contracts);
    expect(patterns.map((p) => p.id).sort()).toEqual([
      "date-range-filter",
      "destructive-confirm",
      "filter-toolbar",
      "row-actions",
      "settings-form-row",
    ]);
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

  // The preset is a copy-paste artifact, so "renders" is not enough — it has to
  // parse. The angle-bracket fill convention (`<verb the object>`) shipped
  // presets whose text children read as unclosed elements; class 9 now blocks
  // that at the validator, and this parses the real emitted string to prove it.
  it("every shipped preset parses as JSX", () => {
    for (const pattern of patterns) {
      const preset = renderPreset(pattern, manifest.components);
      expect(preset, `${pattern.id} has no preset`).not.toBeNull();
      const { diagnostics } = ts.transpileModule(`const _ = (\n${preset});\n`, {
        compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext },
        fileName: "preset.tsx",
        reportDiagnostics: true,
      });
      const messages = (diagnostics ?? []).map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "));
      expect(messages, `${pattern.id} preset does not parse`).toEqual([]);
    }
  });
});
