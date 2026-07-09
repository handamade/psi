import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Card } from "./Card.js";

const meta: Meta<typeof Card> = {
  title: "Components/Card",
  component: Card,
  argTypes: {
    variant: {
      control: "select",
      options: ["stacked", "featured"],
    },
    hoverLift: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

// Neutral inline placeholder — avoids network flakiness in the static build.
function MediaPlaceholder({ height = 160 }: { height?: number }) {
  return (
    <div
      style={{
        background: "var(--ds-fill-neutral4)",
        height,
        width: "100%",
      }}
    />
  );
}

export const Stacked: Story = {
  args: {
    variant: "stacked",
    media: <MediaPlaceholder />,
    children: (
      <>
        <h3 style={{ margin: 0 }}>Stacked card</h3>
        <p style={{ margin: 0 }}>
          Media sits above the body; the whole thing flows top to bottom.
        </p>
      </>
    ),
  },
};

export const Featured: Story = {
  args: {
    variant: "featured",
    media: <MediaPlaceholder height={240} />,
    children: (
      <>
        <h3 style={{ margin: 0 }}>Featured card</h3>
        <p style={{ margin: 0 }}>
          Media sits beside the body (~1.6fr/1fr) and stacks under the md
          breakpoint.
        </p>
      </>
    ),
  },
};

export const HoverLift: Story = {
  args: {
    variant: "stacked",
    hoverLift: true,
    media: <MediaPlaceholder />,
    children: (
      <>
        <h3 style={{ margin: 0 }}>Hover me</h3>
        <p style={{ margin: 0 }}>
          Lifts on hover: translateY(-6px) over --ds-duration-350.
        </p>
      </>
    ),
  },
};
