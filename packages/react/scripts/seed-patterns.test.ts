import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { loadPatterns, renderPreset, validatePatterns } from "./patterns.js";

const root = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "dist/manifest.json"), "utf8"));
const contracts = JSON.parse(readFileSync(join(root, "src/contracts.json"), "utf8"));
const patterns = loadPatterns(join(root, "patterns"));
const icons = readdirSync(join(root, "src/icons"))
  .filter((f) => f.startsWith("Icon") && f.endsWith(".tsx"))
  .map((f) => f.replace(/\.tsx$/, ""));

describe("seed patterns against the real manifest", () => {
  it("all thirteen load and validate; the backlog is empty (D67)", () => {
    const { gaps } = validatePatterns(patterns, manifest.components, contracts, icons);
    expect(patterns.map((p) => p.id).sort()).toEqual([
      "action-feedback",
      "bulk-action-bar",
      "data-table",
      "date-range-filter",
      "destructive-confirm",
      "detail-drawer",
      "empty-state",
      "filter-toolbar",
      "row-actions",
      "settings-form-row",
      "summary-tiles",
      "tabbed-workspace",
      "table-pagination",
    ]);
    // Empty on both counts (D71): every pattern composes only components that
    // exist, *and* every affordance its content declares resolves. Before D71
    // only the first half was checked, which is how row-actions shipped
    // specifying an icon the library did not contain.
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
  // Gapped patterns (D59) are excluded: renderPreset intentionally returns
  // null for those (no manifest component to render), which emit-patterns.ts
  // surfaces as blocked: true / preset: null rather than a parse failure.
  it("every shipped ungapped preset parses as JSX", () => {
    for (const pattern of patterns) {
      if (pattern.gaps.length > 0) continue;
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

describe("declared affordances resolve (D71)", () => {
  it("row-actions requires the ellipsis icon, and it exists", () => {
    const rowActions = patterns.find((p) => p.id === "row-actions")!;
    expect(rowActions.requires).toEqual([
      { content: "trigger-icon", kind: "icon", name: "IconMoreHorizontal" },
    ]);
    expect(icons).toContain("IconMoreHorizontal");
  });

  it("would block row-actions if the icon vanished", () => {
    // The guard, exercised: strip the roster and the pattern must go blocked.
    // Without this the test above only proves the icon is present today.
    const rowActions = patterns.find((p) => p.id === "row-actions")!;
    const { gaps } = validatePatterns([rowActions], manifest.components, contracts, []);
    expect(gaps["row-actions"]).toEqual(["IconMoreHorizontal"]);
  });

  it("renders the icon into the preset rather than prose", () => {
    const rowActions = patterns.find((p) => p.id === "row-actions")!;
    const preset = renderPreset(rowActions, manifest.components)!;
    expect(preset).toContain("<IconMoreHorizontal />");
    expect(preset).not.toContain("[icon]");
  });

  it("detail-drawer's body is a real DescriptionList, not a sentence", () => {
    const drawer = patterns.find((p) => p.id === "detail-drawer")!;
    const preset = renderPreset(drawer, manifest.components)!;
    expect(preset).toContain("<DescriptionList");
    expect(preset).toContain("<DescriptionItem term=");
    expect(preset).not.toContain("key-value summary of the selected record");
  });
});
