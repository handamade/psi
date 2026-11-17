import { useState } from "react";
import { Segment, SegmentedControl } from "@handamade/psi-react";

/** On its own: a radio group for a setting that applies at once. */
export default function SegmentedControlSetting() {
  const [scheme, setScheme] = useState("system");
  return (
    <SegmentedControl aria-label="Color scheme" value={scheme} onValueChange={setScheme}>
      <Segment value="light">Light</Segment>
      <Segment value="dark">Dark</Segment>
      <Segment value="system">System</Segment>
    </SegmentedControl>
  );
}
