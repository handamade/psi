import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Input } from "./Input.js";

const meta: Meta<typeof Input> = {
  title: "Components/Input",
  component: Input,
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
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: "Enter text..." },
};

export const Error: Story = {
  args: { placeholder: "Invalid input", error: true },
};

export const Disabled: Story = {
  args: { placeholder: "Disabled", disabled: true },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--psi-space-12)", maxWidth: 320 }}>
      <Input size={24} placeholder="Size 24" />
      <Input size={32} placeholder="Size 32" />
      <Input size={40} placeholder="Size 40" />
      <Input size={48} placeholder="Size 48" />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--psi-space-12)", maxWidth: 320 }}>
      <Input placeholder="Default" />
      <Input placeholder="Error" error />
      <Input placeholder="Disabled" disabled />
      <Input placeholder="With value" defaultValue="Hello world" />
    </div>
  ),
};

/** D116 — the browser draws a date field's picker icon itself, in the scheme
 * the theme declares. VR renders this in light and ember (a dark theme), so a
 * dark icon on a dark field would show. */
export const DateField: Story = {
  args: { type: "date", defaultValue: "2026-11-16", "aria-label": "Date" },
};
