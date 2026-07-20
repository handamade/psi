import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { emitPatterns } from "./emit-patterns.js";

const root = join(import.meta.dirname, "..");
const distPath = join(root, "dist", "patterns.json");

describe("emitPatterns (real-dist posture)", () => {
  it("writes dist/patterns.json: 3 patterns sorted by id, gap-blocked patterns have no preset", () => {
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
    expect(filterToolbar.blocked).toBe(true);
    expect(filterToolbar.preset).toBeNull();
  });

  it("double-emit is byte-identical", () => {
    emitPatterns(root);
    const first = readFileSync(distPath);
    emitPatterns(root);
    const second = readFileSync(distPath);
    expect(second.equals(first)).toBe(true);
  });
});
