import { describe, expect, it } from "vitest";

import { runCheck } from "../src/check/rules.js";
import { loadTestIndex } from "./test-index.js";

const index = await loadTestIndex();
const presets = index.patterns.filter((p) => p.preset !== null);
const pascal = (id: string) => id.split("-").map((w) => `${w[0].toUpperCase()}${w.slice(1)}`).join("");

describe("every pattern preset passes check (D143)", () => {
  it("has presets to check", () => {
    expect(presets.length).toBeGreaterThanOrEqual(20);
  });

  it.each(presets.map((p) => [p.id, p.preset as string] as const))("%s has no findings", (_id, preset) => {
    const findings = runCheck(preset, index).findings.map((f) => `${f.line}:${f.column} ${f.rule} ${f.message}`);
    expect(findings).toEqual([]);
  });

  it("renders exactly the eight stateful patterns as components named after their id", () => {
    const stateful = presets.filter((p) => (p.state?.length ?? 0) + (p.inputs?.length ?? 0) > 0);
    expect(stateful.map((p) => p.id).sort()).toEqual([
      "account-menu",
      "app-shell",
      "cursor-pagination",
      "destructive-confirm",
      "detail-drawer",
      "row-actions",
      "tabbed-workspace",
      "table-pagination",
    ]);
    for (const p of stateful) expect(p.preset).toContain(`export function ${pascal(p.id)}(`);
  });
});
