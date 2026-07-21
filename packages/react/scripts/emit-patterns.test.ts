import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { emitPatterns } from "./emit-patterns.js";

const root = join(import.meta.dirname, "..");
const distPath = join(root, "dist", "patterns.json");

describe("emitPatterns (real-dist posture)", () => {
  it("writes dist/patterns.json: 3 patterns sorted by id, all unblocked with presets (D52)", () => {
    emitPatterns(root);
    const output = JSON.parse(readFileSync(distPath, "utf8"));

    expect(output.patterns.map((p: { id: string }) => p.id)).toEqual([
      "destructive-confirm",
      "filter-toolbar",
      "settings-form-row",
    ]);

    const destructiveConfirm = output.patterns.find((p: { id: string }) => p.id === "destructive-confirm");
    expect(destructiveConfirm.blocked).toBe(false);
    expect(destructiveConfirm.preset).toContain('variant="danger"');

    const filterToolbar = output.patterns.find((p: { id: string }) => p.id === "filter-toolbar");
    expect(filterToolbar.blocked).toBe(false);
    expect(filterToolbar.preset).toContain("<Toolbar>");
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
