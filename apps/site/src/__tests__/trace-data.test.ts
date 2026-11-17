// @vitest-environment node
// loadIndex() resolves psi-index.json from import.meta.url, which is not a
// file: URL under jsdom (the package default), so this suite runs in node.
import { describe, expect, it } from "vitest";
import { buildTraceData, TARGETS } from "../lib/trace-data";

describe("buildTraceData", () => {
  it("every target has all seven surfaces", async () => {
    const data = await buildTraceData();
    for (const t of TARGETS) expect(Object.keys(data[t]).sort()).toEqual(["code", "docs", "figma", "llms", "mcp", "md", "storybook"]);
  });
  it("the MCP tab is a real check of a wrong variant", async () => {
    const data = await buildTraceData();
    expect(data.Button.mcp.text).toContain('variant="primary"');
    expect(data.Button.mcp.text).toMatch(/accent/);
  });
  it("every target's MCP tab carries a report that names at least one problem", async () => {
    const data = await buildTraceData();
    for (const t of TARGETS) {
      const text = data[t].mcp.text ?? "";
      expect(text, t).toMatch(/^- `\d+:\d+` \*\*[\w-]+\*\*/m);
      expect(text, t).not.toContain("No problems found");
    }
  });
});
