import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Select } from "./Select.js";

const meta: Meta<typeof Select> = {
  title: "Components/Select",
  component: Select,
  argTypes: {
    size: {
      control: "select",
      options: [24, 32, 40, 48],
    },
    error: { control: "boolean" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: {
    children: (
      <>
        <option>Option 1</option>
        <option>Option 2</option>
        <option>Option 3</option>
      </>
    ),
  },
};

export const Error: Story = {
  args: {
    error: true,
    children: (
      <>
        <option>Option 1</option>
        <option>Option 2</option>
      </>
    ),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: (
      <>
        <option>Option 1</option>
        <option>Option 2</option>
      </>
    ),
  },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--psi-space-12)", maxWidth: 320 }}>
      {([24, 32, 40, 48] as const).map((size) => (
        <Select key={size} size={size}>
          <option>Size {size}</option>
          <option>Another option</option>
        </Select>
      ))}
    </div>
  ),
};
