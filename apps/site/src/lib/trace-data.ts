// Build-time only. Call buildTraceData() from .astro frontmatter and pass plain
// data to islands; never import this module from a .tsx island, because it
// pulls the MCP server, its SDK and node:fs into the client graph.
import { checkMarkdown, loadIndex, themeMarkdown } from "@handamade/psi-mcp";
import { traceFor, type Excerpt, type Surface, type TraceTarget } from "@handamade/psi-docs/trace";

export const TARGETS: TraceTarget[] = ["Button", "Field", "Table", "--psi-fg-accent"];

/** What a wrong call looks like for each component: the MCP tab shows `check`,
 * not `get`, because `get` returns exactly the Markdown tab's text (D129).
 * Every snippet is verified (trace-data.test.ts) to draw a real problem line. */
const WRONG: Record<Exclude<TraceTarget, "--psi-fg-accent">, string> = {
  Button: '<Button variant="primary" size="md">Save</Button>',
  Field: '<Field label="Email"><Input size="lg" /></Field>',
  Table: "<Table><TableRow><TableCell>1</TableCell></TableRow></Table>",
};

/** Psi's own accent hue (sapphire, h 260 in palettes/default.ts). */
const TOKEN_HUE = 260;

/** The token target shows the `theme` tool: the AA-solved claim and the
 * token's light and dark values. A ThemeError propagates and fails the build. */
function themeExcerpt(): string {
  const md = themeMarkdown({ hue: TOKEN_HUE });
  const claim = md.split("\n").find((l) => l.includes("were each solved")) ?? "";
  const lines = md.split("\n").filter((l) => l.trim().startsWith("--psi-fg-accent:"));
  if (!claim || lines.length !== 2) throw new Error("theme output no longer has the claim line and two --psi-fg-accent lines");
  const sentence = claim.slice(claim.indexOf("Light and dark"));
  return [
    `theme({ hue: ${TOKEN_HUE} })`,
    "",
    sentence,
    "",
    `[data-psi-theme="brand-${TOKEN_HUE}"]       ${lines[0].trim()}`,
    `[data-psi-theme="brand-${TOKEN_HUE}-dark"]  ${lines[1].trim()}`,
  ].join("\n");
}

export async function buildTraceData(): Promise<Record<TraceTarget, Record<Surface, Excerpt>>> {
  const index = await loadIndex();
  const out = {} as Record<TraceTarget, Record<Surface, Excerpt>>;
  for (const t of TARGETS) {
    const text =
      t === "--psi-fg-accent"
        ? themeExcerpt()
        : `check({ code: '${WRONG[t]}' })\n\n${checkMarkdown(WRONG[t], index)}`;
    out[t] = {
      ...traceFor(t),
      mcp: {
        kind: "text",
        text,
        from: `psi.kurkin.de/mcp · ${t === "--psi-fg-accent" ? "theme" : "check"}`,
        href: "/docs/get-started/ai/",
        hrefLabel: "Connect a client",
      },
    };
  }
  return out;
}
