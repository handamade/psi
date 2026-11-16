// @vitest-environment node
// Shiki inlined WASM loader needs Node Blob/stream, which jsdom shadows.
import { describe, expect, it } from "vitest";
import { highlight } from "../lib/highlight";

describe("highlight", () => {
  it("colours tokens only through CSS variables, never literal colours", async () => {
    const html = await highlight(`const x: number = 1; // note`, "ts");
    expect(html).toContain("var(--shiki-");
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(html).not.toMatch(/rgb\(|hsl\(|oklch\(/i);
  });
});
