import { useState } from "react";
import type { Meta, StoryObj } from "storybook";
import { SegmentedControl } from "./SegmentedControl.js";
import type { SegmentedControlSize } from "./SegmentedControl.js";
import { Segment } from "./Segment.js";
import { Tabs } from "../Tabs/Tabs.js";
import { TabPanel } from "../Tabs/TabPanel.js";

const meta: Meta<typeof SegmentedControl> = {
  title: "Components/SegmentedControl",
  component: SegmentedControl,
};
export default meta;
type Story = StoryObj<typeof SegmentedControl>;

/** Controlled only (D132), so every story owns the selection. */
function SettingDemo({
  labels = ["Light", "Dark", "System"],
  initial,
  size,
  fill,
  disabled = [],
  label = "Color scheme",
}: {
  labels?: string[];
  initial?: string;
  size?: SegmentedControlSize;
  fill?: boolean;
  disabled?: string[];
  label?: string;
}) {
  const values = labels.map((l) => l.toLowerCase());
  const [value, setValue] = useState(initial ?? values[0]);
  return (
    <SegmentedControl aria-label={label} value={value} onValueChange={setValue} size={size} fill={fill}>
      {labels.map((l, i) => (
        <Segment key={values[i]} value={values[i]} disabled={disabled.includes(values[i])}>
          {l}
        </Segment>
      ))}
    </SegmentedControl>
  );
}

/** On its own: a radio group for a setting that applies at once. */
export const Setting: Story = { render: () => <SettingDemo initial="system" /> };

/** The homepage's theme picker: four lowercase one-word segments. */
export const ThemePicker: Story = {
  render: () => <SettingDemo label="Theme" labels={["light", "dark", "acme", "ember"]} initial="acme" />,
};

/** Inside Tabs: the tab list, switching the TabPanels. */
export const ViewSwitch: Story = {
  render: function ViewSwitchStory() {
    const [view, setView] = useState("map");
    return (
      <Tabs value={view} onValueChange={setView}>
        <SegmentedControl aria-label="Diagram">
          <Segment value="map">Map</Segment>
          <Segment value="trace">Trace</Segment>
        </SegmentedControl>
        <TabPanel value="map">One source: tokens, components and docs from the same files.</TabPanel>
        <TabPanel value="trace">Every surface: the value traced from formula to pixel.</TabPanel>
      </Tabs>
    );
  },
};

/** 24, 32 (the default) and 40: the outer height matches a Button's. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--psi-space-16)" }}>
      <SettingDemo size={24} />
      <SettingDemo size={32} />
      <SettingDemo size={40} />
    </div>
  ),
};

/** A disabled segment: skipped by the arrows, shown in fg-disabled. */
export const WithDisabledSegment: Story = {
  render: () => <SettingDemo label="Theme" labels={["light", "dark", "acme", "ember"]} disabled={["acme"]} />,
};

/** fill: the width of the container, shared equally. */
export const Fill: Story = {
  render: () => (
    <div style={{ width: "480px" }}>
      <SettingDemo fill initial="dark" />
    </div>
  ),
};

/** A 320px phone less 16px gutters: four segments fit at 32 and 40; long labels truncate. */
export const Narrow: Story = {
  render: () => (
    <div style={{ width: "288px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "var(--psi-space-16)" }}>
      <SettingDemo label="Theme" labels={["light", "dark", "acme", "ember"]} />
      <SettingDemo label="Theme" labels={["light", "dark", "acme", "ember"]} size={40} />
      <SettingDemo label="Theme" labels={["light", "dark", "acme", "ember"]} fill />
      <SettingDemo label="Range" labels={["Last 7 days", "Last 30 days", "This quarter", "All time"]} />
    </div>
  ),
};
