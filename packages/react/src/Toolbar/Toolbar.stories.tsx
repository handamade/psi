import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Toolbar } from "./Toolbar.js";
import { Input } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import { Tag } from "../Tag/Tag.js";
import { Button } from "../Button/Button.js";
import { Field } from "../Field/Field.js";
import { IconSearch } from "../icons/IconSearch.js";

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
        {/* These widths deliberately override --psi-toolbar-control-width's
            200px default for this story. */}
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

/** D87: labelled filters submitted together — a real `<form>`, end-aligned so
 * the controls under their labels and Find share one control line. */
export const FilterForm: Story = {
  render: () => (
    <Toolbar as="form" align="end" gap={12} aria-label="Filters" onSubmit={(e) => e.preventDefault()}>
      <Field label="Device ID">
        <Input size={32} />
      </Field>
      <Field label="Status">
        <Select size={32}>
          <option>Any status</option>
          <option>Online</option>
          <option>Offline</option>
        </Select>
      </Field>
      <Button type="submit" variant="accent" size={32}>
        <IconSearch />
        Find
      </Button>
    </Toolbar>
  ),
};

/** D87: the same row centred (today's default) and end-aligned. Centred, the
 * button sits on the middle of label-plus-control, above the control line. */
export const AlignEnd: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24 }}>
      {(["center", "end"] as const).map((align) => (
        <Toolbar key={align} align={align} gap={12} aria-label={`align ${align}`}>
          <Field label="Device ID">
            <Input size={32} />
          </Field>
          <Button variant="neutral" size={32}>
            Apply
          </Button>
        </Toolbar>
      ))}
    </div>
  ),
};
