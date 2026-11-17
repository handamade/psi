import { describe, expect, it } from "vitest";

import { traceFor, TraceError, type TraceTarget } from "../src/trace";

describe("traceFor", () => {
  const b = traceFor("Button");

  it("code: the import line and the first example", () => {
    expect(b.code.text).toContain('import { Button } from "@handamade/psi-react"');
    expect(b.code.from).toBe("packages/docs/examples/button/variants.tsx");
  });
  it("docs: one row per prop, from the manifest", () => {
    const names = b.docs.rows!.map((r) => r[0]);
    expect(names).toContain("variant");
    expect(names).toContain("size");
    expect(b.docs.href).toBe("/docs/components/button/");
  });
  it("storybook: the stories in Button.stories.tsx", () => {
    expect(b.storybook.text).toContain("Components/Button");
    expect(b.storybook.text).toContain("AsLink");
  });
  it("figma: component tokens with the semantic variable they alias", () => {
    expect(b.figma.text).toMatch(/--psi-button-accent-bg\s+→\s+fill\/accent/);
  });
  it("llms: the rule lines", () => {
    expect(b.llms.text).toContain("variant vocabulary");
  });
  it("md: the head of the generated markdown and its URL", () => {
    expect(b.md.text).toMatch(/^# Button/);
    expect(b.md.href).toBe("/docs/components/button.md");
  });
  it("a token: its formula and its colour page", () => {
    const t = traceFor("--psi-fg-accent");
    expect(t.code.text).toContain("var(--psi-fg-accent)");
    expect(t.figma.text).toContain("fg/accent");
    expect(t.docs.href).toBe("/docs/tokens/color/");
  });
  it("a missing story is an error, not an empty tab", () => {
    expect(() => traceFor("Nope" as never)).toThrow(TraceError);
  });
  it.each(["Button", "Field", "Table", "--psi-fg-accent"] as TraceTarget[])("%s: every surface has content", (target) => {
    for (const [surface, e] of Object.entries(traceFor(target))) {
      const filled = e.kind === "rows" ? (e.rows?.length ?? 0) > 0 : (e.text ?? "").trim().length > 0;
      expect(filled, `${target} ${surface}`).toBe(true);
      expect(e.from, `${target} ${surface} from`).toBeTruthy();
    }
  });
});
