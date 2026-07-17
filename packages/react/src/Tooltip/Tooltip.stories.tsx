import React from "react";
import type { Meta, StoryObj } from "storybook";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
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

// The bubble only exists while hovered/focused, so without this the story (and
// its VR screenshot) shows nothing but the bare trigger.
const showOnHover: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await userEvent.hover(canvas.getByRole("button"));
  // Opening waits out the 150ms WCAG 1.4.13 hover delay.
  await waitFor(() => expect(canvas.getByRole("tooltip")).toBeVisible());
};

export const Top: Story = {
  args: {
    content: "Top tooltip",
    placement: "top",
    children: <button>Hover me</button>,
  },
  play: showOnHover,
};

export const Bottom: Story = {
  args: {
    content: "Bottom tooltip",
    placement: "bottom",
    children: <button>Hover me</button>,
  },
  play: showOnHover,
};

export const Left: Story = {
  args: {
    content: "Left tooltip",
    placement: "left",
    children: <button>Hover me</button>,
  },
  play: showOnHover,
};

export const Right: Story = {
  args: {
    content: "Right tooltip",
    placement: "right",
    children: <button>Hover me</button>,
  },
  play: showOnHover,
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // userEvent.hover would un-hover the previous trigger and close its bubble;
    // raw mouseOver events (never followed by mouseOut) keep all four open.
    for (const button of canvas.getAllByRole("button")) {
      await fireEvent.mouseOver(button);
    }
    await waitFor(() => expect(canvas.getAllByRole("tooltip")).toHaveLength(4));
  },
};
