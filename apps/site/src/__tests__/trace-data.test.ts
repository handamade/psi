// @vitest-environment node
// loadIndex() resolves psi-index.json from import.meta.url, which is not a
// file: URL under jsdom (the package default), so this suite runs in node.
import { beforeAll, describe, expect, it } from "vitest";
import { buildTraceData, TARGETS } from "../lib/trace-data";

let data: Awaited<ReturnType<typeof buildTraceData>>;
beforeAll(async () => {
  data = await buildTraceData();
});

describe("buildTraceData", () => {
  it("every target has all seven surfaces", () => {
    for (const t of TARGETS) expect(Object.keys(data[t]).sort()).toEqual(["code", "docs", "figma", "llms", "mcp", "md", "storybook"]);
  });
  it("the Button MCP tab is a real check of a wrong variant", () => {
    expect(data.Button.mcp.text).toContain(`check({ code: '<Button variant="primary" size="md">Save</Button>' })`);
    expect(data.Button.mcp.text).toMatch(/accent/);
    expect(data.Button.mcp.from).toBe("psi.kurkin.de/mcp · check");
  });
  it("every component's MCP tab carries a report that names at least one problem", () => {
    for (const t of TARGETS.filter((x) => x !== "--psi-fg-accent")) {
      const text = data[t].mcp.text ?? "";
      expect(text, t).toMatch(/^- `\d+:\d+` \*\*[\w-]+\*\*/m);
      expect(text, t).not.toContain("No problems found");
    }
  });
  it("the token MCP tab is a real theme call showing the token in light and dark", () => {
    const m = data["--psi-fg-accent"].mcp;
    expect(m.from).toBe("psi.kurkin.de/mcp · theme");
    expect(m.text).toContain("theme({ hue: 260 })");
    expect(m.text).toMatch(/solved so every gated pair meets WCAG AA/);
    expect(m.text?.match(/--psi-fg-accent: (#[0-9a-f]{6}|oklch\()/g)).toHaveLength(2);
    expect(m.text).not.toContain("Button");
  });
});
