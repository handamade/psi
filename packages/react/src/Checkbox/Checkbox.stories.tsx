import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Checkbox } from "./Checkbox.js";

const meta: Meta<typeof Checkbox> = {
  title: "Components/Checkbox",
  component: Checkbox,
  argTypes: {
    checked: { control: "boolean" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: { children: "Accept terms" },
};

export const Checked: Story = {
  args: { children: "I agree", checked: true },
};

export const Disabled: Story = {
  args: { children: "Can't touch this", disabled: true },
};

export const States: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--psi-space-12)" }}>
      <Checkbox>Unchecked</Checkbox>
      <Checkbox defaultChecked>Checked</Checkbox>
      <Checkbox disabled>Disabled</Checkbox>
      <Checkbox disabled defaultChecked>Disabled checked</Checkbox>
    </div>
  ),
};

/** D103: the mixed state, a dash in the checked colours, beside unchecked
 * and checked for comparison. A "select all" over a partial selection. */
export const Indeterminate: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--psi-space-12)" }}>
      <Checkbox>None selected</Checkbox>
      <Checkbox indeterminate>Some selected</Checkbox>
      <Checkbox defaultChecked>All selected</Checkbox>
      <Checkbox indeterminate disabled>Some selected, disabled</Checkbox>
    </div>
  ),
};
