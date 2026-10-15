import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Stack } from "./Stack.js";
import { Text } from "../Text/Text.js";
import { Button } from "../Button/Button.js";
import { Panel } from "../Panel/Panel.js";

const meta: Meta<typeof Stack> = {
  title: "Components/Stack",
  component: Stack,
  argTypes: {
    gap: { control: "select", options: [4, 8, 12, 16, 24, 32] },
    align: { control: "select", options: ["stretch", "start", "center", "end"] },
  },
};

export default meta;
type Story = StoryObj<typeof Stack>;

/** D109: a column at the default gap (16). `stretch` makes each child full width. */
export const Default: Story = {
  render: (args) => (
    <Stack {...args}>
      <Button variant="neutral">First</Button>
      <Button variant="neutral">Second</Button>
      <Button variant="neutral">Third</Button>
    </Stack>
  ),
};

/** `align="start"` keeps each child at its own width. */
export const AlignStart: Story = {
  render: () => (
    <Stack gap={8} align="start">
      <Text as="h3" size={16} weight="medium">Nothing matches these filters</Text>
      <Text tone="secondary">Clear a filter or widen the date range.</Text>
      <Button variant="neutral">Clear filters</Button>
    </Stack>
  ),
};

/** Every gap on the space scale, side by side. */
export const Gaps: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--psi-space-32)" }}>
      {([4, 8, 12, 16, 24, 32] as const).map((gap) => (
        <Panel key={gap} padding={16}>
          <Stack gap={gap}>
            <Text size={12} tone="secondary">gap {gap}</Text>
            <Text>One</Text>
            <Text>Two</Text>
          </Stack>
        </Panel>
      ))}
    </div>
  ),
};
