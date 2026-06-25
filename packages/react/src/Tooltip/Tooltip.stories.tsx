import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Tooltip } from "./Tooltip.js";

const meta: Meta<typeof Tooltip> = {
  title: "Components/Tooltip",
  component: Tooltip,
  argTypes: {
    placement: {
      control: "select",
      options: ["top", "bottom", "left", "right"],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: 80, display: "flex", justifyContent: "center" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Top: Story = {
  args: {
    content: "Top tooltip",
    placement: "top",
    children: <button>Hover me</button>,
  },
};

export const Bottom: Story = {
  args: {
    content: "Bottom tooltip",
    placement: "bottom",
    children: <button>Hover me</button>,
  },
};

export const Left: Story = {
  args: {
    content: "Left tooltip",
    placement: "left",
    children: <button>Hover me</button>,
  },
};

export const Right: Story = {
  args: {
    content: "Right tooltip",
    placement: "right",
    children: <button>Hover me</button>,
  },
};

export const AllPlacements: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--ds-space-32)" }}>
      <Tooltip content="Top" placement="top">
        <button>Top</button>
      </Tooltip>
      <Tooltip content="Bottom" placement="bottom">
        <button>Bottom</button>
      </Tooltip>
      <Tooltip content="Left" placement="left">
        <button>Left</button>
      </Tooltip>
      <Tooltip content="Right" placement="right">
        <button>Right</button>
      </Tooltip>
    </div>
  ),
};
