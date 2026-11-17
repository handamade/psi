import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { countDecisions } from "../lib/decisions";
import { latestRelease } from "../lib/release";

describe("countDecisions", () => {
  it("counts distinct D-numbers that open an entry under ## Decisions", () => {
    const a = "# X\n\n## Decisions\n\n- **D12 — one.**\n  mentions D99 in prose\n- **D13 — two.**\n\n## Other\n\n- **D14 — not a decision section.**\n";
    const b = "## Decisions\n\n- **D13 — repeated in another spec.**\n";
    expect(countDecisions([a, b])).toBe(2);
  });
  it("ignores a spec with no Decisions section", () => {
    expect(countDecisions(["# Plan\n- **D7 — no.**"])).toBe(0);
  });
  it("reads a bold number with no dash, in a 'Decision log additions' section", () => {
    expect(countDecisions(["## Decision log additions\n\n- **D27** Brands.\n- **D28** Display.\n"])).toBe(2);
  });
  it("reads ### and #### D<n> headings in a decision section", () => {
    expect(countDecisions(["## Decisions\n\n### D77 — a\n\n#### D78. b\n"])).toBe(2);
  });
  it("reads a bold number closed by ** ", () => {
    expect(countDecisions(["## Decisions\n\n- **D40**: x\n"])).toBe(1);
  });
  it("reads table rows in a 'Decision log' section", () => {
    const t = "## Decision log (short form)\n\n| # | Decision | Choice |\n|---|---|---|\n| 1 | Shape | npm |\n| 2 | Source | code |\n\n## Next\n\n| 3 | not | here |\n";
    expect(countDecisions([t])).toBe(2);
  });
  it("claims the number in a '## ... (D<n>)' heading", () => {
    expect(countDecisions(["## The CI image (D112)\n\nbody mentions D5\n"])).toBe(1);
  });
  it("does not count prose mentions or non-decision sections", () => {
    expect(countDecisions(["## Notes\n\nSee D61, reserved.\n\n## Rides-along (no decision numbers)\n\n- **D9 — x**\n"])).toBe(0);
  });
  it("counts the real specs: at least 128, at most the highest D-number", () => {
    const dir = resolve(__dirname, "../../../../docs/superpowers/specs");
    const texts = readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => readFileSync(join(dir, f), "utf8"));
    const highest = Math.max(...texts.flatMap((t) => [...t.matchAll(/\bD(\d+)\b/g)].map((m) => Number(m[1]))));
    const n = countDecisions(texts);
    expect(n).toBeGreaterThanOrEqual(128);
    expect(n).toBeLessThanOrEqual(highest);
  });
});

describe("latestRelease", () => {
  it("reads the top entry's version and date", () => {
    const src = `export const UPDATES = [\n  {\n    date: "2026-11-17",\n    tag: "release",\n    title: "0.34.0 — a Combobox",\n  },\n  {\n    date: "2026-11-16",\n    title: "0.33.0 — x",\n  },\n];`;
    expect(latestRelease(src)).toEqual({ version: "0.34.0", date: "2026-11-17" });
  });
});
