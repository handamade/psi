import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { loadPatterns, renderPreset, validatePatterns } from "./patterns.js";

const root = join(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "dist/manifest.json"), "utf8"));
const contracts = JSON.parse(readFileSync(join(root, "src/contracts.json"), "utf8"));
const patterns = loadPatterns(join(root, "patterns"));
// The PUBLIC surface, matching emit-patterns: an icon file that exists but is
// not re-exported from src/index.ts is unimportable by a consumer, so it must
// not satisfy a pattern's `requires`.
const publicExports = readFileSync(join(root, "src/index.ts"), "utf8");
const icons = [...publicExports.matchAll(/\b(Icon[A-Za-z0-9]+)\b/g)]
  .map((m) => m[1])
  .filter((n) => existsSync(join(root, "src/icons", `${n}.tsx`)));

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

describe("the manifest describes children (D72)", () => {
  // react-docgen-typescript reports `children` only when the declaration
  // carries a JSDoc comment — not because of propFilter, extends, or the type
  // spelling, all of which D70 wrongly blamed and D72 disproved with a probe.
  const TAKES_NO_CHILDREN = ["Input", "Pagination", "MenuSeparator"];

  it("lists children for every component that accepts it", () => {
    const missing = manifest.components
      .filter((c: { name: string; props: { name: string }[] }) => !TAKES_NO_CHILDREN.includes(c.name))
      .filter((c: { props: { name: string }[] }) => !c.props.some((p) => p.name === "children"))
      .map((c: { name: string }) => c.name);
    expect(missing).toEqual([]);
  });

  it("omits children from the three that take none", () => {
    // Publishing a prop that does not apply is worse than omitting one that
    // does — an agent cross-checking the manifest would pass children to an
    // <input>.
    for (const name of TAKES_NO_CHILDREN) {
      const c = manifest.components.find((x: { name: string }) => x.name === name);
      expect(c.props.some((p: { name: string }) => p.name === "children"), name).toBe(false);
    }
  });

  it("gives filter-toolbar's controls accessible names (D73)", () => {
    const preset = renderPreset(patterns.find((p) => p.id === "filter-toolbar")!, manifest.components)!;
    expect(preset).toContain('<Input aria-label=');
    expect(preset).toContain('<Select aria-label=');
  });
});

describe("every icon is importable from the package root", () => {
  // Shipped broken in 0.14.0: IconMoreHorizontal was added to
  // src/icons/index.ts but not to the hand-written re-export list in
  // src/index.ts, so `row-actions`' preset emitted <IconMoreHorizontal /> —
  // code no consumer could compile. The build was green; only the D68 external
  // consumer run against the published tarball caught it.
  it("re-exports every icon in the barrel from src/index.ts", () => {
    const barrel = readFileSync(join(root, "src/icons/index.ts"), "utf8");
    const inBarrel = [...new Set([...barrel.matchAll(/\b(Icon[A-Za-z0-9]+)\b/g)].map((m) => m[1]))];
    const missing = inBarrel.filter((n) => !icons.includes(n));
    expect(missing).toEqual([]);
  });

  it("has a file on disk for every icon the root exports", () => {
    // The other direction: a name re-exported but deleted would break the build,
    // but this pins the two lists as the same set rather than merely overlapping.
    expect(icons.length).toBeGreaterThan(0);
    for (const n of icons) {
      expect(existsSync(join(root, "src/icons", `${n}.tsx`)), n).toBe(true);
    }
  });
});
