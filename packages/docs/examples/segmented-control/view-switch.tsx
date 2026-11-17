import { useState } from "react";
import { Segment, SegmentedControl, TabPanel, Tabs } from "@handamade/psi-react";

/** Inside Tabs: the tab list, switching the panels. Tabs owns the value. */
export default function SegmentedControlViewSwitch() {
  const [view, setView] = useState("preview");
  return (
    <Tabs value={view} onValueChange={setView}>
      <SegmentedControl aria-label="Example">
        <Segment value="preview">Preview</Segment>
        <Segment value="code">Code</Segment>
      </SegmentedControl>
      <TabPanel value="preview">The rendered example.</TabPanel>
      <TabPanel value="code">The example's source.</TabPanel>
    </Tabs>
  );
}
