import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { componentPages, tokenPages } from "../src/pages";
import { componentPageMd, guideMd, overviewMd, tokenPageMd } from "../src/markdown";
import { loadDocsInput } from "../src/node";
import type { GuideSource } from "../src/types";

const input = loadDocsInput();

describe("componentPageMd", () => {
  const tabs = componentPages.find((p) => p.slug === "tabs")!;
  const md = componentPageMd(
    { ...input, examples: [{ slug: "tabs", name: "basic", source: "export default function X() {}" }] },
    tabs,
  );

  it("starts with the page title and the import line", () => {
    expect(md.startsWith("# Tabs\n")).toBe(true);
    expect(md).toContain('import { Tabs, TabList, Tab, TabPanel } from "@handamade/psi-react";');
  });

  it("includes each member's generated doc, and the shared rules once", () => {
    for (const m of tabs.members) expect(md).toContain(`## ${m}`);
    expect(md.match(/^## Rules$/gm)?.length).toBe(1);
  });

  it("includes the examples as tsx code blocks", () => {
    expect(md).toContain("```tsx\nexport default function X() {}\n```");
  });
});

describe("tokenPageMd", () => {
  it("renders the Color page as a table with a row per semantic colour", () => {
    const md = tokenPageMd(input, tokenPages.find((p) => p.slug === "color")!);
    expect(md.startsWith("# Color tokens\n")).toBe(true);
    expect(md).toContain("| `--psi-bg-primary` |");
  });

  it("renders every page without throwing", () => {
    for (const p of tokenPages) expect(tokenPageMd(input, p).length).toBeGreaterThan(50);
  });
});

const dir = join(__dirname, "..", "guides");
function guide(file: string): GuideSource {
  const raw = readFileSync(join(dir, file), "utf8");
  const [, fm, body] = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)!;
  const get = (k: string) => fm.match(new RegExp(`^${k}: (.*)$`, "m"))![1];
  return { id: file.replace(/\.mdx$/, ""), title: get("title"), description: get("description"), order: 0, body };
}

/** Markdown with fenced code and inline code spans removed: what is left is
 * prose, where a leftover `{identifier}` or JSX tag would be a bug. */
function prose(md: string): string {
  return md.replace(/^```[^\n]*\n[\s\S]*?^```$/gm, "").replace(/`[^`\n]*`/g, "");
}

describe("guideMd", () => {
  const files = readdirSync(dir);

  it("leaves no import line, {identifier} or JSX tag in any guide twin", () => {
    for (const f of files) {
      const md = prose(guideMd(input, guide(f)));
      expect(md, f).not.toMatch(/^import /m);
      expect(md, f).not.toMatch(/\{[a-zA-Z.]+\}/);
      expect(md, f).not.toMatch(/<\/?[a-zA-Z][^>]*>/);
    }
  });

  it("replaces fact placeholders with their values", () => {
    const md = guideMd(input, { id: "t", title: "T", description: "D", order: 0, body: "There are {componentCount} of them.\n" });
    expect(md).not.toMatch(/\{componentCount\}/);
    expect(md).toMatch(/There are \d+ of them\./);
  });

  it("turns the sizes guide's mapped JSX table into a markdown table of every variant", () => {
    const md = guideMd(input, guide("sizes-and-variants.mdx"));
    expect(md).toContain("| Variant | Intent | Typical use |");
    for (const v of ["accent", "accent-subtle", "neutral", "ghost", "danger", "outline"]) {
      expect(md).toContain(`| \`${v}\` |`);
    }
  });

  it("keeps fenced code untouched", () => {
    const md = guideMd(input, guide("sizes-and-variants.mdx"));
    expect(md).toContain("<Button size={24}>Compact</Button>");
  });
});

describe("overviewMd", () => {
  it("links the docs llms.txt", () => {
    expect(overviewMd(input)).toContain("/docs/llms.txt");
  });
});

/** Table blocks: runs of consecutive lines starting with "|". */
function tableBlocks(md: string): string[][] {
  const blocks: string[][] = [];
  let cur: string[] = [];
  for (const line of md.split("\n")) {
    if (line.startsWith("|")) cur.push(line);
    else if (cur.length) {
      blocks.push(cur);
      cur = [];
    }
  }
  if (cur.length) blocks.push(cur);
  return blocks;
}
const cells = (row: string) => row.replace(/\\\|/g, "").split("|").length;

describe("tables in twins are real tables", () => {
  const twins = [
    ...tokenPages.map((p) => [`tokens/${p.slug}`, tokenPageMd(input, p)] as const),
    ...readdirSync(dir).map((f) => [`guide/${f}`, guideMd(input, guide(f))] as const),
  ];
  for (const [name, md] of twins) {
    it(`${name}: no blank line between rows, and every row has the header's cell count`, () => {
      expect(md).not.toMatch(/^\|.*\|\n\n\|/m);
      for (const block of tableBlocks(md)) {
        for (const row of block) expect(cells(row), row).toBe(cells(block[0]));
      }
    });
  }
});

describe("loadDocsInput", () => {
  it("reads every example and every guide, in a stable order", () => {
    expect(input.examples.length).toBeGreaterThan(30);
    expect(input.examples.map((e) => `${e.slug}/${e.name}`)).toEqual(
      [...input.examples.map((e) => `${e.slug}/${e.name}`)].sort((a, b) => a.localeCompare(b)),
    );
    expect(input.guides.map((g) => g.id)).toEqual(["installation", "theming", "dark-mode", "ai", "sizes-and-variants"]);
  });
});
