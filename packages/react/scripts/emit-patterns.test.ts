import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { emitPatterns } from "./emit-patterns.js";

const root = join(import.meta.dirname, "..");
const distPath = join(root, "dist", "patterns.json");

describe("emitPatterns (real-dist posture)", () => {
  it("writes dist/patterns.json: 13 patterns sorted by id, none blocked (D67)", () => {
    emitPatterns(root);
    const output = JSON.parse(readFileSync(distPath, "utf8"));

    expect(output.patterns.map((p: { id: string }) => p.id)).toEqual([
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

    const dataTable = output.patterns.find((p: { id: string }) => p.id === "data-table");
    expect(dataTable.blocked).toBe(false);
    expect(dataTable.gaps).toEqual([]);
    expect(dataTable.preset).toContain("<Table");
    expect(dataTable.preset).toContain("<TableHeaderCell");

    const tablePagination = output.patterns.find((p: { id: string }) => p.id === "table-pagination");
    expect(tablePagination.blocked).toBe(false);
    expect(tablePagination.gaps).toEqual([]);
    expect(tablePagination.preset).toContain("<Pagination");

    // Unblocked by the Toast family (D64-D65); Drawer and Tabs are the arc's
    // remaining two gaps.
    const actionFeedback = output.patterns.find((p: { id: string }) => p.id === "action-feedback");
    expect(actionFeedback.blocked).toBe(false);
    expect(actionFeedback.gaps).toEqual([]);
    expect(actionFeedback.preset).toContain("<Toast");

    // D66 — unblocked without a Drawer component ever existing: a drawer is a
    // Dialog placement, so the pattern composes Dialog and the gap is removed
    // because the capability arrived, not because a named component did.
    const detailDrawer = output.patterns.find((p: { id: string }) => p.id === "detail-drawer");
    expect(detailDrawer.blocked).toBe(false);
    expect(detailDrawer.gaps).toEqual([]);
    expect(detailDrawer.preset).toContain("<Dialog");
    expect(detailDrawer.preset).toContain('placement="inline-end"');

    const tabbedWorkspace = output.patterns.find((p: { id: string }) => p.id === "tabbed-workspace");
    expect(tabbedWorkspace.blocked).toBe(false);
    expect(tabbedWorkspace.gaps).toEqual([]);
    expect(tabbedWorkspace.preset).toContain("<TabList");

    // The coverage arc's milestone (D59): the backlog was derived from what the
    // authored patterns declared, and it is now spent — every pattern composes
    // only components that exist. Note this is not the arc's completion
    // criterion, which is the retargeted eval's improvisation count; a pattern
    // set can be fully satisfied and still miss what a real screen needs.
    expect(output.patterns.filter((p: { gaps: string[] }) => p.gaps.length > 0)).toEqual([]);
    expect(output.patterns.every((p: { preset: string | null }) => p.preset !== null)).toBe(true);

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

    const bulkActionBar = output.patterns.find((p: { id: string }) => p.id === "bulk-action-bar");
    expect(bulkActionBar.blocked).toBe(false);
    expect(bulkActionBar.gaps).toEqual([]);
    expect(bulkActionBar.preset).toContain("<Toolbar");

    const emptyState = output.patterns.find((p: { id: string }) => p.id === "empty-state");
    expect(emptyState.blocked).toBe(false);
    expect(emptyState.gaps).toEqual([]);
    expect(emptyState.preset).toContain("<Panel");

    const summaryTiles = output.patterns.find((p: { id: string }) => p.id === "summary-tiles");
    expect(summaryTiles.blocked).toBe(false);
    expect(summaryTiles.gaps).toEqual([]);
    expect(summaryTiles.preset).toContain("<Card");
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
