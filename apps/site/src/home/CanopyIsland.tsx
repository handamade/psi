import { useState } from "react";
import { SegmentedControl, Segment, TabPanel, Tabs } from "@handamade/psi-react";

import { CodeView } from "../components/CodeView";

const THEMES = ["light", "dark", "acme", "ember"] as const;

/** `source` comes from BuiltWithPsi.astro, so this island never imports Canopy
 * itself: the frame renders it, and the code view only needs its text. */
export function CanopyIsland({ sourceHtml, source }: { sourceHtml: string; source: string }) {
  const [view, setView] = useState("preview");
  const [theme, setTheme] = useState<(typeof THEMES)[number]>("dark");
  return (
    <div className="canopy">
      <Tabs value={view} onValueChange={setView}>
        <div className="canopy-bar">
          <SegmentedControl aria-label="Canopy view">
            <Segment value="preview">Preview</Segment>
            <Segment value="code">Code</Segment>
          </SegmentedControl>
          <SegmentedControl aria-label="Canopy theme" value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
            {THEMES.map((t) => <Segment key={t} value={t}>{t}</Segment>)}
          </SegmentedControl>
        </div>
        <TabPanel value="preview">
          <iframe
            className="canopy-frame"
            src={"/docs/examples/showcase/canopy/?theme=" + theme}
            title="Canopy, a greenhouse monitor built only from Psi"
            loading="lazy"
          />
        </TabPanel>
        <TabPanel value="code">
          <CodeView html={sourceHtml} code={source} />
        </TabPanel>
      </Tabs>
    </div>
  );
}
