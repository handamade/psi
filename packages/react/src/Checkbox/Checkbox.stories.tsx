import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Checkbox } from "./Checkbox.js";
import { Field } from "../Field/Field.js";

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

/** D108: in an invalid group Field every checkbox is aria-invalid, and the
 * unchecked boxes outline in the error colour; a ticked one keeps its accent. */
export const InvalidGroup: Story = {
  render: () => (
    <Field group label="Notify me by" error="Pick at least two.">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--psi-space-12)" }}>
        <Checkbox defaultChecked>Email</Checkbox>
        <Checkbox>SMS</Checkbox>
        <Checkbox>Push</Checkbox>
      </div>
    </Field>
  ),
};
