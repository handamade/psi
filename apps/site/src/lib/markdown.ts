import { componentCount, iconCount, version } from "virtual:psi-facts";

import type { ComponentPage } from "../content/component-pages";
import type { TokenPage } from "../content/token-pages";
import { docSection, getExport, readGeneratedDoc } from "./components";
import { THEMES, colorTokens, guidance, kebab, resolved } from "./tokens";

const fence = (lang: string, code: string) => `\`\`\`${lang}\n${code.trimEnd()}\n\`\`\``;

/** Drops a member doc's "# Name" title (we add "## Name") and its Rules
 * section (identical in every generated doc; the page states it once). */
function memberBody(name: string): string {
  const md = readGeneratedDoc(name);
  const withoutTitle = md.replace(/^# [^\n]*\n/, "");
  const rules = docSection(md, "Rules");
  const withoutRules = rules === null ? withoutTitle : withoutTitle.replace(`## Rules\n\n${rules}`, "");
  return withoutRules.replace(/^## /gm, "### ").trim();
}

export function componentPageMd(page: ComponentPage, examples: { name: string; source: string }[]): string {
  const main = getExport(page.members[0]);
  const rules = docSection(readGeneratedDoc(page.members[0]), "Rules");
  return (
    [
      `# ${page.title}`,
      main.description,
      fence("ts", `import { ${page.members.join(", ")} } from "@handamade/psi-react";`),
      "## Examples",
      ...examples.map((e) => `### ${e.name}\n\n${fence("tsx", e.source)}`),
      ...page.members.map((m) => `## ${m}\n\n${memberBody(m)}`),
      ...(rules ? ["## Rules", rules] : []),
    ].join("\n\n") + "\n"
  );
}

export function tokenPageMd(page: TokenPage): string {
  const r = resolved("light");
  const g = guidance();
  const out: string[] = [`# ${page.title} tokens`];
  switch (page.slug) {
    case "color":
      out.push(
        "Every semantic colour is an OKLCH formula over the theme's anchors, so a theme is a few inputs, not a palette. Values below are each formula resolved in the four built-in themes.",
        "## Semantic colours",
        `| Token | Formula | ${THEMES.join(" | ")} |`,
        `|---|---|${THEMES.map(() => "---").join("|")}|`,
        ...colorTokens().map(
          (t) =>
            `| \`${t.cssVar}\` | \`${t.formula}\` | ${THEMES.map((th) => `${t.byTheme[th].oklch} (${t.byTheme[th].hex})`).join(" | ")} |`,
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
        "| Token | Size / line | Weight |",
        "|---|---|---|",
        ...r.typography.map((t) => `| \`--psi-text-${t.name}\` | ${t.fontSize}/${t.lineHeight} | ${t.weight} (${t.cssWeight}) |`),
      );
      break;
    case "display":
      out.push(
        "## Display styles",
        "| Name | Min–max px | vw | Line height | Weight | Tracking |",
        "|---|---|---|---|---|---|",
        ...r.display.map(
          (d) => `| \`${d.name}\` | ${d.min}–${d.max} | ${d.vw} | ${d.lineHeight} | ${d.weight} (${d.cssWeight}) | ${d.tracking} |`,
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

const facts: Record<string, string> = {
  componentCount: String(componentCount),
  iconCount: String(iconCount),
  version: String(version),
};

function variantsTable(): string {
  return [
    "| Variant | Intent | Typical use |",
    "|---|---|---|",
    ...guidance().variants.map((v) => `| \`${v.variant}\` | ${v.intent} | ${v.typicalUse} |`),
  ].join("\n");
}

/** Turns a guide's MDX body into plain markdown. Outside fenced code:
 * `import` lines are dropped, `{componentCount}`-style fact expressions become
 * their value, and the sizes guide's JSX variants table (mapped over
 * guidance.json) becomes a markdown table of the same rows. */
export function guideMd(entry: { data: { title: string; description: string }; body?: string }): string {
  const parts = (entry.body ?? "").split(/(^```[^\n]*\n[\s\S]*?^```$)/m);
  const body = parts
    .map((part, i) => {
      if (i % 2 === 1) return part; // fenced code stays as written
      return part
        .replace(/^import [^\n]*\n/gm, "")
        .replace(/<table>[\s\S]*?<\/table>/, variantsTable())
        .replace(/\{(componentCount|iconCount|version)\}/g, (_, k: string) => facts[k]);
    })
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return `# ${entry.data.title}\n\n${entry.data.description}\n\n${body}\n`;
}

export function overviewMd(): string {
  return (
    [
      "# Psi docs",
      `Psi ${version}: ${componentCount} React 19 components on OKLCH tokens, where every semantic colour is a formula rather than a swatch. Install it, theme it, and look up every component and token. Every page is also available as markdown at its URL plus \`.md\`.`,
      "- Get started: /docs/get-started/installation/",
      "- Components: /docs/components/button/",
      "- Tokens: /docs/tokens/color/",
      "- Every page as markdown: /docs/llms.txt",
      "- MCP: https://psi.kurkin.de/mcp",
    ].join("\n\n") + "\n"
  );
}
