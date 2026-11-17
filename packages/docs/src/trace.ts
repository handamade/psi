import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { docSection, kebab } from "./data.js";
import { tokenPageMd } from "./markdown.js";
import { EXAMPLES_DIR, loadDocsInput, getExport, readGeneratedDoc, reactRoot, resolved, tokensRoot } from "./node.js";
import { componentPages, tokenPages } from "./pages.js";

export type Surface = "code" | "docs" | "storybook" | "figma" | "llms" | "md" | "mcp";
export type TraceTarget = "Button" | "Field" | "Table" | "--psi-fg-accent";
export interface Excerpt {
  /** What the tab shows: preformatted text, or table rows. */
  kind: "text" | "rows";
  text?: string;
  rows?: string[][];
  /** Where it came from, as a repo path or artifact name. */
  from: string;
  /** The live surface, when there is one. */
  href?: string;
  hrefLabel?: string;
}
export class TraceError extends Error {}

type Trace = Record<Exclude<Surface, "mcp">, Excerpt>;

/** Psi Token Sync groups colour variables by their first word: fillAccent → fill/accent. */
const figmaName = (cssVar: string) => cssVar.replace(/^--psi-/, "").replace("-", "/");

function slugOf(name: string): string {
  const page = componentPages.find((p) => p.members.includes(name));
  if (!page) throw new TraceError(`trace: no docs page for "${name}"`);
  return page.slug;
}

/** The repo root: packages/tokens/ is two levels below it. */
const repoRoot = join(tokensRoot, "..", "..");
const COLOR_STORY = "apps/storybook/src/token-docs/ColorTokens.stories.tsx";

/** The `title:` of a story file, or a TraceError naming the file. Exported for tests. */
export function storyTitle(path: string, label: string): string {
  if (!existsSync(path)) throw new TraceError(`trace: no story file at ${label}`);
  const title = readFileSync(path, "utf8").match(/title:\s*["'`]([^"'`]+)["'`]/)?.[1];
  if (!title) throw new TraceError(`trace: ${label} has no title`);
  return title;
}

/** The first example file of a docs folder, or a TraceError. Exported for tests. */
export function firstExample(slug: string, examplesDir: string = EXAMPLES_DIR): string {
  const dir = join(examplesDir, slug);
  const file = (existsSync(dir) ? readdirSync(dir) : []).filter((f) => f.endsWith(".tsx")).sort()[0];
  if (!file) throw new TraceError(`trace: no example in packages/docs/examples/${slug}/`);
  return file;
}

/** A component's story file; the root is injectable for tests. Exported for tests. */
export function stories(name: string, root: string = reactRoot): { title: string; names: string[]; path: string } {
  const dir = join(root, "src", name);
  const file = existsSync(dir) ? readdirSync(dir).find((f) => f.endsWith(".stories.tsx")) : undefined;
  if (!file) throw new TraceError(`trace: ${name} has no story file in packages/react/src/${name}/`);
  const src = readFileSync(join(dir, file), "utf8");
  const title = src.match(/title:\s*["'`]([^"'`]+)["'`]/)?.[1];
  const names = [...src.matchAll(/^export const (\w+)\s*:/gm)].map((m) => m[1]);
  if (!title || names.length === 0) throw new TraceError(`trace: ${file} has no title or no stories`);
  return { title, names, path: `packages/react/src/${name}/${file}` };
}

const FIGMA_LINES = 12;

/** Aliases to semantic colour variables only: sizing aliases are not Figma colour variables. */
export function componentTokens(name: string, cssPath = join(tokensRoot, "dist", "components.css")): string[] {
  const css = readFileSync(cssPath, "utf8");
  const prefix = `--psi-${kebab(name)}-`;
  const lines = [
    ...new Set(
      [...css.matchAll(/(--psi-[a-z0-9-]+):\s*var\((--psi-(?:bg|fg|fill|border)-[a-z0-9-]+)\)/g)]
        .filter((m) => m[1].startsWith(prefix))
        .map((m) => `${m[1]}  →  ${figmaName(m[2])}`),
    ),
  ];
  return lines.length > FIGMA_LINES ? [...lines.slice(0, FIGMA_LINES), `… ${lines.length - FIGMA_LINES} more`] : lines;
}

function llmsLines(name: string): string {
  const lines = readFileSync(join(reactRoot, "llms.txt"), "utf8").split("\n");
  // Only lines that open on the name: a line that merely mentions it (Stack's, Toolbar's) is not Button's rule.
  const own = lines.filter((l) => new RegExp(`^(## |- <?)${name}(?![A-Za-z0-9])`).test(l));
  const rules =
    docSection(lines.join("\n"), "Rules for generated code")
      ?.split("\n")
      .filter((l) => l.startsWith("- ")) ?? [];
  return [...new Set([...own, ...rules])].slice(0, 8).join("\n");
}

function componentTrace(name: string): Trace {
  const slug = slugOf(name);
  const exampleDir = join(EXAMPLES_DIR, slug);
  const example = firstExample(slug);
  const info = getExport(name);
  const s = stories(name);
  const md = readGeneratedDoc(name);
  return {
    code: {
      kind: "text",
      text: readFileSync(join(exampleDir, example), "utf8").trim(),
      from: `packages/docs/examples/${slug}/${example}`,
    },
    docs: {
      kind: "rows",
      rows: info.props
        .filter((p) => p.name !== "ref" && p.name !== "className")
        .map((p) => [p.name, p.type, p.default == null ? "—" : String(p.default)]),
      from: "manifest.json",
      href: `/docs/components/${slug}/`,
      hrefLabel: "Open the docs page",
    },
    storybook: {
      kind: "text",
      text: [s.title, ...s.names.map((n) => `  ${n}`)].join("\n"),
      from: s.path,
      hrefLabel: "Open in Storybook",
    },
    figma: {
      kind: "text",
      text: componentTokens(name).join("\n") || "(no component tokens)",
      from: "Psi Token Sync, generated from components.css",
      hrefLabel: "Open in Figma",
    },
    llms: { kind: "text", text: llmsLines(name), from: "packages/react/llms.txt", href: "/llms.txt", hrefLabel: "/llms.txt" },
    md: {
      kind: "text",
      text: md.split("\n").slice(0, 14).join("\n"),
      from: `packages/react/docs/${name}.md`,
      href: `/docs/components/${slug}.md`,
      hrefLabel: `/docs/components/${slug}.md`,
    },
  };
}

function tokenTrace(cssVar: string): Trace {
  const light = resolved("light");
  const name = Object.keys(light.tokens).find((k) => `--psi-${kebab(k)}` === cssVar);
  if (!name) throw new TraceError(`trace: no semantic token ${cssVar}`);
  const t = light.tokens[name];
  return {
    code: { kind: "text", text: `color: var(${cssVar});\n\n/* ${t.formula} */`, from: "packages/tokens/src" },
    docs: {
      kind: "rows",
      rows: (["light", "dark", "acme", "ember"] as const).map((th) => [th, resolved(th).tokens[name].hex]),
      from: "resolved/<theme>.json",
      href: "/docs/tokens/color/",
      hrefLabel: "Open the colour tokens",
    },
    storybook: { kind: "text", text: storyTitle(join(repoRoot, COLOR_STORY), COLOR_STORY), from: COLOR_STORY, hrefLabel: "Open in Storybook" },
    figma: { kind: "text", text: `${figmaName(cssVar)}\n  Light · Dark · Acme · Ember`, from: "Psi Token Sync", hrefLabel: "Open in Figma" },
    llms: {
      kind: "text",
      text: readFileSync(join(tokensRoot, "llms.txt"), "utf8")
        .split("\n")
        .filter((l) => l.startsWith("- ") && (l.includes("--psi-fg-") || /formula/i.test(l)))
        .slice(0, 6)
        .join("\n"),
      from: "packages/tokens/llms.txt",
      href: "/llms.txt",
      hrefLabel: "/llms.txt",
    },
    md: {
      kind: "text",
      text: tokenPageMd(loadDocsInput(), tokenPages.find((p) => p.slug === "color")!).split("\n").slice(0, 14).join("\n"),
      from: "packages/docs/src/markdown.ts tokenPageMd",
      href: "/docs/tokens/color.md",
      hrefLabel: "/docs/tokens/color.md",
    },
  };
}

export function traceFor(target: TraceTarget): Trace {
  return target.startsWith("--psi-") ? tokenTrace(target) : componentTrace(target);
}
