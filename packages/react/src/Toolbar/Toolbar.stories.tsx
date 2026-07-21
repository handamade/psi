import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Toolbar } from "./Toolbar.js";
import { Input } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import { Tag } from "../Tag/Tag.js";
import { Button } from "../Button/Button.js";

const meta: Meta<typeof Toolbar> = {
  title: "Components/Toolbar",
  component: Toolbar,
  argTypes: {
    gap: { control: "select", options: [8, 12, 16] },
  },
};

export default meta;
type Story = StoryObj<typeof Toolbar>;

export const FilterToolbar: Story = {
  args: {
    "aria-label": "Filters",
    children: (
      <>
        {/* Input/Select default to width:100%; size them in the story so the
            row reads as a toolbar instead of every control stacking. */}
        <Input size={32} placeholder="Search" aria-label="Search" style={{ width: 240 }} />
        <Select size={32} aria-label="Category" style={{ width: 180 }}>
          <option>All</option>
          <option>Components</option>
        </Select>
        <Tag variant="neutral" onDismiss={() => {}}>psi-tokens</Tag>
        <Button size={32} variant="ghost">Clear all</Button>
      </>
    ),
  },
};

export const Wrapping: Story = {
  render: () => (
    <div style={{ maxWidth: 320 }}>
      <Toolbar aria-label="Filters">
        <Input size={32} placeholder="Search" aria-label="Search" style={{ width: 200 }} />
        <Select size={32} aria-label="Category" style={{ width: 140 }}><option>All</option></Select>
        <Tag variant="neutral">filter-one</Tag>
        <Tag variant="neutral">filter-two</Tag>
      </Toolbar>
    </div>
  ),
};
