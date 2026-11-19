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

  it("renders exactly the eight stateful patterns as components named after their id, suffixed Pattern", () => {
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
    for (const p of stateful) expect(p.preset).toContain(`export function ${pascal(p.id)}Pattern(`);
  });
});

describe("destructive-confirm agrees with the Dialog page (D145)", () => {
  const preset = index.patterns.find((p) => p.id === "destructive-confirm")!.preset!;
  const page = index.docs.components.dialog.markdown;

  it("is a consequential confirmation: no close button or backdrop, Escape cancels", () => {
    expect(preset).toContain("dismissible={false}");
    expect(preset).toMatch(/closeOnEscape(=\{true\})?\b/);
    expect(page).toContain("dismissible={false}");
    expect(page).toMatch(/closeOnEscape\n/);
  });

  it("gives Cancel the neutral variant, as the page's example does", () => {
    expect(preset).toMatch(/<Button[^>]*variant="neutral"[^>]*>Cancel<\/Button>/);
    expect(page).toMatch(/<Button variant="neutral"[^\n]*\n\s*Cancel/);
    expect(preset).not.toContain('variant="ghost"');
  });
});
