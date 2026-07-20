import { describe, it, expect, beforeAll } from "vitest";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../src/index-builder.js";
import { renderAgentsBlock, applyBlock, START_MARKER, END_MARKER } from "../src/init.js";
import type { PsiIndex } from "../src/types.js";

const pkgs = fileURLToPath(new URL("../..", import.meta.url));
let index: PsiIndex;
let block: string;

beforeAll(async () => {
  index = await buildIndex({
    tokensDist: `${pkgs}tokens/dist`,
    reactDist: `${pkgs}react/dist`,
    reactDocs: `${pkgs}react/docs`,
    version: "0.0.0-test",
  });
  block = renderAgentsBlock(index);
});

describe("renderAgentsBlock", () => {
  it("is marker-delimited and versioned", () => {
    expect(block.startsWith(START_MARKER)).toBe(true);
    expect(block.trimEnd().endsWith(END_MARKER)).toBe(true);
    expect(block).toContain("0.0.0-test");
  });

  it("carries the house rules and every component with its axes", () => {
    expect(block).toContain("24 | 32 | 40 | 48");
    expect(block).toContain("utilities.css");
    expect(block).toContain("@handamade/psi-react/styles");
    expect(block).toContain("data-psi-theme");
    for (const c of index.components) expect(block).toContain(`- ${c.name}`);
    expect(block).toContain("accent-subtle");
  });

  it("includes both MCP connection methods", () => {
    expect(block).toContain("https://psi.kurkin.de/mcp");
    expect(block).toContain("npx @handamade/psi-mcp");
  });

  it("carries the pattern-first house rule (D43/D44)", () => {
    expect(block).toContain("search for a matching pattern");
  });
});

describe("applyBlock", () => {
  it("creates, preserves surroundings, and is idempotent", () => {
    const fresh = applyBlock(null, block);
    expect(fresh).toContain(START_MARKER);

    const surrounded = `# My app\n\nnotes above\n\n${block}\n\nnotes below\n`;
    const updated = applyBlock(surrounded, renderAgentsBlock({ ...index, version: "9.9.9" }));
    expect(updated).toContain("notes above");
    expect(updated).toContain("notes below");
    expect(updated).toContain("9.9.9");
    expect(updated).not.toContain("0.0.0-test");
    expect(updated.match(new RegExp(START_MARKER, "g"))!.length).toBe(1);

    expect(applyBlock(updated, renderAgentsBlock({ ...index, version: "9.9.9" }))).toBe(updated);
  });

  it("appends to a file without markers", () => {
    const out = applyBlock("# Existing content\n", block);
    expect(out.startsWith("# Existing content")).toBe(true);
    expect(out).toContain(START_MARKER);
  });
});
