import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Panel } from "./Panel.js";

const meta: Meta<typeof Panel> = {
  title: "Components/Panel",
  component: Panel,
  argTypes: {
    padding: { control: "select", options: [16, 24] },
  },
};

export default meta;
type Story = StoryObj<typeof Panel>;

export const Default: Story = {
  args: {
    children: (
      <>
        <h3 style={{ margin: 0 }}>Elevated panel</h3>
        <p style={{ margin: 0 }}>
          The shared surface recipe: secondary background, faint hairline,
          radius 12. Dialog&apos;s panel binds the same tokens.
        </p>
      </>
    ),
  },
};

export const Padding16: Story = {
  args: { padding: 16, children: <p style={{ margin: 0 }}>Compact padding.</p> },
};
