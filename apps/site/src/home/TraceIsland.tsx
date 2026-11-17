import { useState } from "react";
import { SegmentedControl, Segment, Tab, TabList, TabPanel, Tabs, Link } from "@handamade/psi-react";
import type { Excerpt, Surface, TraceTarget } from "@handamade/psi-docs/trace";

import { useMatchMedia, WIDE } from "../chrome/useWide";
import { SurfaceMap } from "./SurfaceMap";

const SURFACES: [Surface, string][] = [["code", "Code"], ["docs", "Docs"], ["storybook", "Storybook"], ["figma", "Figma"], ["mcp", "MCP"], ["llms", "llms.txt"], ["md", "Markdown"]];
const TARGET_LABEL: Record<TraceTarget, string> = { Button: "Button", Field: "Field", Table: "Table", "--psi-fg-accent": "Token" };

function ExcerptView({ e, href }: { e: Excerpt; href?: string }) {
  const link = href ?? e.href;
  return (
    <div className="trace-excerpt">
      {e.kind === "rows" ? (
        <table className="trace-rows">
          <tbody>
            {e.rows!.map((r) => (
              <tr key={r[0]}>
                {r.map((c, i) => (
                  <td key={i}><code>{c}</code></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <pre><code>{e.text}</code></pre>
      )}
      <p className="trace-from">
        <span>from {e.from}</span>
        {link && <Link href={link}>{e.hrefLabel ?? "Open"}</Link>}
      </p>
    </div>
  );
}

export function TraceIsland({ data, storybookHref, figmaHref, componentCount }: {
  data: Record<TraceTarget, Record<Surface, Excerpt>>;
  storybookHref: Record<TraceTarget, string>;
  figmaHref: string;
  componentCount: number;
}) {
  const [target, setTarget] = useState<TraceTarget>("Button");
  const [surface, setSurface] = useState<Surface>("docs");
  const [view, setView] = useState("map");
  // Server and no-JS: wide, so both the map and the trace render.
  const wide = useMatchMedia(WIDE, true);
  const hrefFor = (s: Surface) => (s === "storybook" ? storybookHref[target] : s === "figma" ? figmaHref : undefined);

  const select = (s: Surface) => {
    setSurface(s);
    if (!wide) setView("trace");
  };

  const hrefs: Record<Surface, string> = {
    code: data[target].code.href ?? (target.startsWith("--") ? "/docs/tokens/color/" : `/docs/components/${target.toLowerCase()}/`),
    docs: data[target].docs.href ?? "/docs/components/",
    storybook: storybookHref[target],
    figma: figmaHref,
    mcp: data[target].mcp.href ?? "/docs/get-started/ai/",
    llms: data[target].llms.href ?? "/llms.txt",
    md: data[target].md.href ?? "/docs/get-started/ai/",
  };
  const map = <SurfaceMap current={surface} onSelect={select} componentCount={componentCount} hrefs={hrefs} />;
  const trace = (
    <div className="trace">
      <div className="trace-top">
        <SegmentedControl aria-label="Trace" size={24} value={target} onValueChange={(v) => setTarget(v as TraceTarget)}>
          {(Object.keys(TARGET_LABEL) as TraceTarget[]).map((t) => (
            <Segment key={t} value={t}>{TARGET_LABEL[t]}</Segment>
          ))}
        </SegmentedControl>
      </div>
      <Tabs value={surface} onValueChange={(v) => setSurface(v as Surface)}>
        <TabList aria-label={`${target} across the surfaces`}>
          {SURFACES.map(([s, label]) => (
            <Tab key={s} value={s}>{label}</Tab>
          ))}
        </TabList>
        {SURFACES.map(([s]) => (
          <TabPanel key={s} value={s}>
            <ExcerptView e={data[target][s]} href={hrefFor(s)} />
          </TabPanel>
        ))}
      </Tabs>
    </div>
  );

  if (wide) {
    return (
      <div className="surfaces-grid">
        {map}
        {trace}
      </div>
    );
  }
  return (
    <Tabs value={view} onValueChange={setView}>
      <SegmentedControl aria-label="Surfaces view" fill>
        <Segment value="map">Map</Segment>
        <Segment value="trace">Trace</Segment>
      </SegmentedControl>
      <TabPanel value="map">{map}</TabPanel>
      <TabPanel value="trace">{trace}</TabPanel>
    </Tabs>
  );
}
