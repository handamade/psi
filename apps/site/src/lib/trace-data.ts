import { checkMarkdown, loadIndex } from "@handamade/psi-mcp";
import { traceFor, type Excerpt, type Surface, type TraceTarget } from "@handamade/psi-docs/trace";

export const TARGETS: TraceTarget[] = ["Button", "Field", "Table", "--psi-fg-accent"];

/** What a wrong call looks like for each target: the MCP tab shows `check`,
 * not `get`, because `get` returns exactly the Markdown tab's text (D129).
 * Every snippet is verified (trace-data.test.ts) to draw a real problem line.
 * `check` does not flag raw colours, so the token target uses a wrong variant
 * of the component that binds the token as a stand-in. */
const WRONG: Record<TraceTarget, string> = {
  Button: '<Button variant="primary" size="md">Save</Button>',
  Field: '<Field label="Email"><Input size="lg" /></Field>',
  Table: "<Table><TableRow><TableCell>1</TableCell></TableRow></Table>",
  "--psi-fg-accent": '<Button variant="secondary">Save</Button>',
};

export async function buildTraceData(): Promise<Record<TraceTarget, Record<Surface, Excerpt>>> {
  const index = await loadIndex();
  const out = {} as Record<TraceTarget, Record<Surface, Excerpt>>;
  for (const t of TARGETS) {
    const call = WRONG[t];
    out[t] = {
      ...traceFor(t),
      mcp: {
        kind: "text",
        text: `check(${call})\n\n${checkMarkdown(call, index)}`,
        from: "psi.kurkin.de/mcp · check",
        href: "/docs/get-started/ai/",
        hrefLabel: "Connect a client",
      },
    };
  }
  return out;
}
