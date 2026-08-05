import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { emitPatterns } from "./emit-patterns.js";

const root = join(import.meta.dirname, "..");
const distPath = join(root, "dist", "patterns.json");

describe("emitPatterns (real-dist posture)", () => {
  it("writes dist/patterns.json: 7 patterns sorted by id, two blocked on Table-tier gaps (D59)", () => {
    emitPatterns(root);
    const output = JSON.parse(readFileSync(distPath, "utf8"));

    expect(output.patterns.map((p: { id: string }) => p.id)).toEqual([
      "data-table",
      "date-range-filter",
      "destructive-confirm",
      "filter-toolbar",
      "row-actions",
      "settings-form-row",
      "table-pagination",
    ]);

    const dataTable = output.patterns.find((p: { id: string }) => p.id === "data-table");
    expect(dataTable.blocked).toBe(true);
    expect(dataTable.gaps).toEqual(["Table"]);
    expect(dataTable.preset).toBeNull();

    const tablePagination = output.patterns.find((p: { id: string }) => p.id === "table-pagination");
    expect(tablePagination.blocked).toBe(true);
    expect(tablePagination.gaps).toEqual(["Pagination"]);
    expect(tablePagination.preset).toBeNull();

    const destructiveConfirm = output.patterns.find((p: { id: string }) => p.id === "destructive-confirm");
    expect(destructiveConfirm.blocked).toBe(false);
    expect(destructiveConfirm.preset).toContain('variant="danger"');

    const filterToolbar = output.patterns.find((p: { id: string }) => p.id === "filter-toolbar");
    expect(filterToolbar.blocked).toBe(false);
    expect(filterToolbar.preset).toContain("<Toolbar>");

    const rowActions = output.patterns.find((p: { id: string }) => p.id === "row-actions");
    expect(rowActions.blocked).toBe(false);
    expect(rowActions.preset).toContain("<Menu");
    expect(rowActions.preset).toContain('variant="danger"');
  });

  it("double-emit is byte-identical", () => {
    emitPatterns(root);
    const first = readFileSync(distPath);
    emitPatterns(root);
    const second = readFileSync(distPath);
    expect(second.equals(first)).toBe(true);
  });

  it("package.json exports patterns.json alongside manifest.json (HAN-24)", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.exports["./manifest.json"]).toBe("./dist/manifest.json");
    expect(pkg.exports["./patterns.json"]).toBe("./dist/patterns.json");
  });
});
