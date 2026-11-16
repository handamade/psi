import { describe, expect, it } from "vitest";
import { docsNav } from "../content/docs-nav";

describe("docsNav", () => {
  it("has Get started, Components and Tokens, in that order", () => {
    expect(docsNav.map((s) => s.label)).toEqual(["Get started", "Components", "Tokens"]);
  });

  it("uses absolute /docs/ hrefs ending in a slash, each once", () => {
    const hrefs = docsNav.flatMap((s) => s.links.map((l) => l.href));
    expect(hrefs.every((h) => h.startsWith("/docs/") && h.endsWith("/"))).toBe(true);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
