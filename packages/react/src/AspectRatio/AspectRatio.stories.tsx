import React from "react";
import type { Meta, StoryObj } from "storybook";
import { AspectRatio } from "./AspectRatio.js";

const meta: Meta<typeof AspectRatio> = {
  title: "Components/AspectRatio",
  component: AspectRatio,
  argTypes: {
    ratio: { control: "number" },
  },
};

export default meta;
type Story = StoryObj<typeof AspectRatio>;

export const Wide: Story = {
  args: {
    ratio: 16 / 10,
  },
  render: (args) => (
    <div style={{ width: "320px" }}>
      <AspectRatio {...args}>
        <div style={{ background: "var(--ds-fill-neutral4)", width: "100%", height: "100%" }} />
      </AspectRatio>
    </div>
  ),
};

export const Portrait: Story = {
  args: {
    ratio: 4 / 5,
  },
  render: (args) => (
    <div style={{ width: "320px" }}>
      <AspectRatio {...args}>
        <div style={{ background: "var(--ds-fill-neutral4)", width: "100%", height: "100%" }} />
      </AspectRatio>
    </div>
  ),
};
