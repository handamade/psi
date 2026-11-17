import { describe, expect, it } from "vitest";

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { componentTokens, firstExample, stories, storyTitle, traceFor, TraceError, type TraceTarget } from "../src/trace";

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

  it("figma: colour aliases only, capped, with a remainder line", () => {
    const lines = b.figma.text!.split("\n");
    expect(lines.length).toBeLessThanOrEqual(13);
    expect(lines.some((l) => /control\/|space|radius/.test(l))).toBe(false);
    expect(lines.at(-1)).toMatch(/^… \d+ more$/);
  });
  it("llms: Table does not pick up TableCaption's section", () => {
    expect(traceFor("Table").llms.text).not.toMatch(/^## TableCaption/m);
  });
  it("token llms names fg tokens or the formula rule", () => {
    for (const l of traceFor("--psi-fg-accent").llms.text!.split("\n")) expect(l).toMatch(/--psi-fg-|formula/i);
  });
  it("token storybook and md are real excerpts", () => {
    const t = traceFor("--psi-fg-accent");
    expect(t.storybook.text).toBe("Tokens and Assets/Color Tokens");
    expect(t.storybook.from).toBe("apps/storybook/src/token-docs/ColorTokens.stories.tsx");
    expect(t.md.text).toMatch(/^# /);
    expect(t.md.text!.split("\n").length).toBeGreaterThan(3);
  });
});

describe("named errors", () => {
  const tmp = () => mkdtempSync(join(tmpdir(), "trace-"));
  it("a component with no story file", () => {
    const root = tmp();
    mkdirSync(join(root, "src", "Ghost"), { recursive: true });
    expect(() => stories("Ghost", root)).toThrow(/no story file/);
    expect(() => stories("Ghost", root)).toThrow(TraceError);
  });
  it("a story file without a title", () => {
    const root = tmp();
    mkdirSync(join(root, "src", "Bare"), { recursive: true });
    writeFileSync(join(root, "src", "Bare", "Bare.stories.tsx"), "export const A: Story = {};\n");
    expect(() => stories("Bare", root)).toThrow(/no title or no stories/);
  });
  it("a component with no example", () => {
    const dir = tmp();
    mkdirSync(join(dir, "empty"));
    expect(() => firstExample("empty", dir)).toThrow(TraceError);
    expect(() => firstExample("absent", dir)).toThrow(/no example/);
  });
  it("a missing or untitled token story", () => {
    const dir = tmp();
    expect(() => storyTitle(join(dir, "nope.tsx"), "nope.tsx")).toThrow(/no story file/);
    writeFileSync(join(dir, "x.tsx"), "export default {};\n");
    expect(() => storyTitle(join(dir, "x.tsx"), "x.tsx")).toThrow(/no title/);
  });
  it("component tokens read a given css", () => {
    const dir = tmp();
    writeFileSync(join(dir, "c.css"), "--psi-ghost-bg: var(--psi-fill-accent);\n--psi-ghost-radius: var(--psi-radius-8);\n");
    expect(componentTokens("Ghost", join(dir, "c.css"))).toEqual(["--psi-ghost-bg  →  fill/accent"]);
  });
});
