import { colorTokens, docSection, formatOklch, kebab, THEMES } from "./data.js";
import { componentPages, tokenPages } from "./pages.js";
import type { ComponentPage, TokenPage } from "./pages.js";
import type {
  DocsInput,
  DocsPages,
  ExportInfo,
  GuideSource,
  HookMember,
  PatternLike,
  PatternNodeLike,
} from "./types.js";

/** A table cell value: a literal "|" would split the cell. */
const cell = (v: unknown) => String(v).replace(/\|/g, "\\|");
/** One GFM table as one string, so blocks joined by blank lines never split it. */
const table = (header: string[], rows: unknown[][]) =>
  [
    `| ${header.join(" | ")} |`,
    `|${header.map(() => "---").join("|")}|`,
    ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`),
  ].join("\n");

const fence = (lang: string, code: string) => `\`\`\`${lang}\n${code.trimEnd()}\n\`\`\``;

function exportOf(input: DocsInput, name: string): ExportInfo {
  const found = input.exports.find((e) => e.name === name);
  if (!found) throw new Error(`No export "${name}" in the docs input`);
  return found;
}

function generatedDoc(input: DocsInput, name: string): string {
  const doc = input.generatedDocs[name];
  if (doc === undefined) throw new Error(`No generated doc for "${name}" in the docs input`);
  return doc;
}

/** Drops a member doc's "# Name" title (we add "## Name") and its Rules
 * section (identical in every generated doc; the page states it once). */
function memberBody(input: DocsInput, name: string): string {
  const md = generatedDoc(input, name);
  const withoutTitle = md.replace(/^# [^\n]*\n/, "");
  const rules = docSection(md, "Rules");
  const withoutRules = rules === null ? withoutTitle : withoutTitle.replace(`## Rules\n\n${rules}`, "");
  return withoutRules.replace(/^## /gm, "### ").trim();
}

export function componentPageMd(input: DocsInput, page: ComponentPage): string {
  const main = exportOf(input, page.members[0]);
  const rules = docSection(generatedDoc(input, page.members[0]), "Rules");
  const examples = input.examples.filter((e) => e.slug === page.slug);
  return (
    [
      `# ${page.title}`,
      main.description,
      fence("ts", `import { ${page.members.join(", ")} } from "@handamade/psi-react";`),
      "## Examples",
      ...examples.map((e) => `### ${e.name}\n\n${fence("tsx", e.source)}`),
      ...page.members.map((m) => `## ${m}\n\n${memberBody(input, m)}`),
      ...(page.hooks ?? []).map((h) => hookMd(input, h)),
      ...(rules ? ["## Rules", rules] : []),
    ].join("\n\n") + "\n"
  );
}

const code = (v: string) => `\`${v.replace(/\s+/g, " ")}\``;

/** D145: a hook's section on its component page, generated from the hook's
 * source by emit-manifest: what it returns, each member's signature, and the
 * fields of every options interface those members take. */
export function hookMd(input: DocsInput, name: string): string {
  const hook = input.hooks.find((h) => h.name === name);
  if (!hook) throw new Error(`No hook "${name}" in the docs input`);
  const fields = (rows: HookMember[]) =>
    table(
      ["Field", "Type", "Default", "Required", "Description"],
      rows.map((f) => [code(f.name), code(f.type), f.default ?? "—", f.required ? "yes" : "no", f.description || "—"]),
    );
  return [
    `## ${hook.name}()`,
    hook.description,
    fence("ts", `const ${hook.name.replace(/^use(.)/, (_, c: string) => c.toLowerCase())} = ${hook.name}(); // ${hook.returns}`),
    `### ${hook.returns}`,
    // A handle of functions (useToast) is a table of methods; a bag of props
    // (useFieldControl) is a table of fields.
    hook.members.every((m) => m.type.includes("=>"))
      ? table(
          ["Method", "Signature", "Description"],
          hook.members.map((m) => [code(m.name), code(m.type), m.description || "—"]),
        )
      : fields(hook.members),
    ...hook.types.flatMap((t) => [`### ${t.name}`, fields(t.fields)]),
  ].join("\n\n");
}

const ICON_IMPORT = (name: string) => fence("ts", `import { ${name} } from "@handamade/psi-react";`);

function iconPropsMd(input: DocsInput): string {
  return [
    `Every icon takes the same props, and passes any other SVG attribute (\`${input.icons.attributes ?? "SVGAttributes"}\`: \`style\`, \`strokeWidth\`, \`onClick\`, \`aria-*\`, \`data-*\`) to its \`<svg>\`.`,
    table(
      ["Prop", "Type", "Default", "Description"],
      input.icons.props.map((p) => [code(p.name), code(p.type), p.default ?? "—", p.description || "—"]),
    ),
  ].join("\n\n");
}

const ICON_A11Y =
  'Every icon renders `aria-hidden="true"`: it is decorative, and the control it sits in carries the name. ' +
  "An IconButton takes `aria-label`; a Button's or a NavItem's text names it. " +
  "An icon is drawn in `currentColor`, so it takes the colour of the text around it.";

/** D145: every icon, its keywords, and the props they share. */
export function iconsPageMd(input: DocsInput): string {
  const { names, keywords } = input.icons;
  return (
    [
      "# Icons",
      `${names.length} icons, each its own export from \`@handamade/psi-react\`, drawn on a 24-unit grid at 20px by default.`,
      ICON_IMPORT("IconMoreHorizontal, IconTrash"),
      "## Props",
      iconPropsMd(input),
      "## Accessibility",
      ICON_A11Y,
      fence(
        "tsx",
        '<IconButton aria-label="More actions" variant="ghost">\n  <IconMoreHorizontal />\n</IconButton>',
      ),
      "## Icons",
      table(
        ["Icon", "Keywords"],
        names.map((n) => [code(n), keywords[n].join(", ")]),
      ),
    ].join("\n\n") + "\n"
  );
}

/** D145: one icon's page. */
export function iconMd(input: DocsInput, name: string): string {
  const words = input.icons.keywords[name];
  if (!words) throw new Error(`No icon "${name}" in the docs input`);
  return (
    [
      `# ${name}`,
      `Icon. Keywords: ${words.join(", ")}.`,
      ICON_IMPORT(name),
      "## Props",
      iconPropsMd(input),
      "## Accessibility",
      ICON_A11Y,
      `One of ${input.icons.names.length} icons; the icons page lists them all.`,
    ].join("\n\n") + "\n"
  );
}

export function tokenPageMd(input: DocsInput, page: TokenPage): string {
  const r = input.resolved.light;
  const g = input.guidance;
  const out: string[] = [`# ${page.title} tokens`];
  switch (page.slug) {
    case "color":
      out.push(
        "Every semantic colour is an OKLCH formula over the theme's anchors, so a theme is a few inputs, not a palette. Values below are each formula resolved in the four built-in themes.",
        "## Semantic colours",
        table(
          ["Token", "Formula", ...THEMES],
          colorTokens(input.resolved).map((t) => [
            `\`${t.cssVar}\``,
            `\`${t.formula}\``,
            ...THEMES.map((th) => `${t.byTheme[th].oklch} (${t.byTheme[th].hex})`),
          ]),
        ),
      );
      break;
    case "typography":
      out.push(
        "Text styles are `--psi-text-{size}-{lineHeight}-{weight}`, shorthand `font` values. Defaults by role:",
        Object.entries(g.typographyDefaults)
          .map(([role, combo]) => `- \`${role}\`: \`--psi-text-${combo}\``)
          .join("\n"),
        "## Text styles",
        table(
          ["Token", "Size / line", "Weight"],
          r.typography.map((t) => [`\`--psi-text-${t.name}\``, `${t.fontSize}/${t.lineHeight}`, `${t.weight} (${t.cssWeight})`]),
        ),
      );
      break;
    case "display":
      out.push(
        "## Display styles",
        table(
          ["Name", "Min–max px", "vw", "Line height", "Weight", "Tracking"],
          r.display.map((d) => [`\`${d.name}\``, `${d.min}–${d.max}`, d.vw, d.lineHeight, `${d.weight} (${d.cssWeight})`, d.tracking]),
        ),
      );
      break;
    case "spacing":
      out.push(
        g.geometry.note,
        `Control sizes: ${g.geometry.sizes.map((s) => `\`${s}\``).join(", ")}`,
        `Scale names are pixel-true: \`--psi-space-8\` is 8px. The space scale also feeds the ${Object.entries(r.scales.scopes)
          .map(([scale, fams]) => `${scale} → ${fams.join(", ")}`)
          .join("; ")} utility families, for example \`.psi-gap-8\`.`,
        `## Space\n\n${r.scales.space.map((v) => `\`--psi-space-${v}\``).join(", ")}`,
        `## Size\n\n${r.scales.size.map((v) => `\`--psi-size-${v}\``).join(", ")}`,
        `## Radius\n\n${r.scales.radius.map((v) => `\`--psi-radius-${v}\``).join(", ")}`,
        `## Focus ring\n\n${Object.entries(r.scales.focusRing)
          .map(([k, v]) => `- \`--psi-focus-ring-${kebab(k)}\`: ${v}px`)
          .join("\n")}`,
      );
      break;
    case "motion":
      out.push(
        "Under `prefers-reduced-motion: reduce`, every `--psi-duration-*` token resolves to `0.01ms`, so anything driven by a duration token effectively stops animating. Drive transitions and animations with duration tokens rather than hardcoded times.",
        `## Durations\n\n${r.scales.motion.durations.map((d) => `\`--psi-duration-${d}\``).join(", ")}`,
        `## Easings\n\n${Object.entries(r.scales.motion.easings)
          .map(([k, v]) => `- \`--psi-ease-${k}\`: \`${v}\``)
          .join("\n")}`,
      );
      break;
    case "layout":
      out.push(
        g.layout.note,
        ...(
          [
            ["Breakpoints", r.scales.layout.breakpoints, ""],
            ["Container", r.scales.layout.container, g.layout.container],
            ["Z-index", r.scales.layout.zIndex, ""],
          ] as const
        ).map(
          ([label, values, note]) =>
            `## ${label}\n\n${note ? `${note}\n\n` : ""}${Object.entries(values)
              .map(([k, v]) => `- \`${k}\`: ${v}`)
              .join("\n")}`,
        ),
      );
      break;
  }
  return out.join("\n\n") + "\n";
}

function variantsTable(input: DocsInput): string {
  return table(
    ["Variant", "Intent", "Typical use"],
    input.guidance.variants.map((v) => [`\`${v.variant}\``, v.intent, v.typicalUse]),
  );
}

/** Turns a guide's MDX body into plain markdown. Outside fenced code:
 * `import` lines are dropped, `{componentCount}`-style fact expressions become
 * their value, and the sizes guide's JSX variants table (mapped over
 * guidance.json) becomes a markdown table of the same rows. */
export function guideMd(input: DocsInput, guide: GuideSource): string {
  const facts: Record<string, string> = {
    componentCount: String(input.componentCount),
    iconCount: String(input.iconCount),
    version: String(input.version),
  };
  const parts = guide.body.split(/(^```[^\n]*\n[\s\S]*?^```$)/m);
  const body = parts
    .map((part, i) => {
      if (i % 2 === 1) return part; // fenced code stays as written
      return part
        .replace(/^import [^\n]*\n/gm, "")
        .replace(/<table>[\s\S]*?<\/table>/, variantsTable(input))
        .replace(/\{(componentCount|iconCount|version)\}/g, (_, k: string) => facts[k]);
    })
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return `# ${guide.title}\n\n${guide.description}\n\n${body}\n`;
}

export function overviewMd(input: DocsInput): string {
  return (
    [
      "# Psi docs",
      `Psi ${input.version}: ${input.componentCount} React 19 components on OKLCH tokens, where every semantic colour is a formula rather than a swatch. Install it, theme it, and look up every component and token. Every page is also available as markdown at its URL plus \`.md\`.`,
      "- Get started: /docs/get-started/installation/",
      "- Components: /docs/components/button/",
      "- Tokens: /docs/tokens/color/",
      "- Every page as markdown: /docs/llms.txt",
      "- MCP: https://psi.kurkin.de/mcp",
    ].join("\n\n") + "\n"
  );
}

export function tokenMd(input: DocsInput, name: string): string {
  const light = input.resolved.light.tokens[name];
  if (!light) throw new Error(`No token "${name}" in the docs input`);
  return (
    [
      `# \`--psi-${kebab(name)}\``,
      `Token \`${name}\`. Formula: \`${light.formula}\``,
      table(
        ["Theme", "OKLCH", "Hex"],
        THEMES.map((t) => {
          const v = input.resolved[t].tokens[name];
          return [t, formatOklch(v.oklch), v.hex];
        }),
      ),
    ].join("\n\n") + "\n"
  );
}

function composeTree(node: PatternNodeLike | string, indent: string): string[] {
  if (typeof node === "string") return [`${indent}- ${JSON.stringify(node)}`];
  const props = node.props && Object.keys(node.props).length > 0 ? ` ${JSON.stringify(node.props)}` : "";
  const content = node.content ? `: ${node.content}` : "";
  const lines = [`${indent}- \`${node.component}\`${props}${content}`];
  for (const [slot, children] of Object.entries(node.slots ?? {})) {
    lines.push(`${indent}  - ${slot}:`);
    for (const child of children) lines.push(...composeTree(child, `${indent}    `));
  }
  return lines;
}

export function patternMd(p: PatternLike): string {
  const out: string[] = [`# Pattern: ${p.id}`, p.intent, `Matches: ${p.match.join("; ")}.`];
  if (p.parameters.length > 0) {
    out.push(
      "## Parameters",
      table(
        ["Key", "Ask", "Options", "Default"],
        p.parameters.map((q) => [`\`${q.key}\``, q.ask, q.options.join(", "), q.default ?? "—"]),
      ),
    );
  }
  const content = Object.entries(p.content);
  if (content.length > 0) out.push("## Content", content.map(([k, v]) => `- \`${k}\`: ${v}`).join("\n"));
  out.push("## Composition", composeTree(p.compose, "").join("\n"));
  out.push(
    "## Status",
    p.blocked
      ? `Blocked. Gaps: ${p.gaps.join("; ")}`
      : p.gaps.length > 0
        ? `Gaps: ${p.gaps.join("; ")}`
        : "Ready.",
  );
  if (p.preset) out.push("## Preset", fence("tsx", p.preset));
  return out.join("\n\n") + "\n";
}

const isScalar = (v: unknown): v is string | number | boolean => ["string", "number", "boolean"].includes(typeof v);

function topicList(v: unknown, indent: string): string {
  if (Array.isArray(v)) {
    if (v.length === 0) return `${indent}- (none)`;
    return v.map((x) => (isScalar(x) ? `${indent}- ${x}` : `${indent}-\n${topicList(x, `${indent}  `)}`)).join("\n");
  }
  if (v !== null && typeof v === "object") {
    return Object.entries(v)
      .map(([k, x]) => (isScalar(x) ? `${indent}- **${k}**: ${x}` : `${indent}- **${k}**:\n${topicList(x, `${indent}  `)}`))
      .join("\n");
  }
  return `${indent}- ${isScalar(v) ? v : "(none)"}`;
}

export function topicMd(name: string, content: unknown): string {
  return `# Topic: ${name}\n\n${isScalar(content) ? content : topicList(content, "")}\n`;
}

export function buildDocsPages(
  input: DocsInput,
  extra: { patterns: PatternLike[]; topics: Record<string, unknown> },
): DocsPages {
  return {
    overview: overviewMd(input),
    components: Object.fromEntries(
      componentPages.map((p) => [
        p.slug,
        { title: p.title, members: p.members, hooks: p.hooks ?? [], markdown: componentPageMd(input, p) },
      ]),
    ),
    tokenPages: Object.fromEntries(
      tokenPages.map((p) => [p.slug, { title: `${p.title} tokens`, markdown: tokenPageMd(input, p) }]),
    ),
    guides: Object.fromEntries(
      input.guides.map((g) => [g.id, { title: g.title, description: g.description, markdown: guideMd(input, g) }]),
    ),
    tokens: Object.fromEntries(Object.keys(input.resolved.light.tokens).map((n) => [n, tokenMd(input, n)])),
    patterns: Object.fromEntries(extra.patterns.map((p) => [p.id, patternMd(p)])),
    topics: Object.fromEntries(Object.entries(extra.topics).map(([n, c]) => [n, topicMd(n, c)])),
    icons: {
      all: iconsPageMd(input),
      byName: Object.fromEntries(input.icons.names.map((n) => [n, iconMd(input, n)])),
    },
  };
}
