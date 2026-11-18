import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Switch } from "./Switch.js";
import { Field } from "../Field/Field.js";

const meta: Meta<typeof Switch> = {
  title: "Components/Switch",
  component: Switch,
  argTypes: {
    checked: { control: "boolean" },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  args: { children: "Dark mode" },
};

export const Checked: Story = {
  args: { children: "Enabled", checked: true },
};

export const Disabled: Story = {
  args: { children: "Locked", disabled: true },
};

export const States: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--psi-space-12)" }}>
      <Switch>Off</Switch>
      <Switch defaultChecked>On</Switch>
      <Switch disabled>Disabled off</Switch>
      <Switch disabled defaultChecked>Disabled on</Switch>
    </div>
  ),
};

/** D135: in a Field that is not a group, the switch is the Field's control. The Field's label
 * and its own name it, the Field's message describes it, and the Field's error makes it invalid. */
export const InAField: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24 }}>
      <Field label="Notifications" error="Choose how we reach you." required>
        <Switch>Email me weekly</Switch>
      </Field>
    </div>
  ),
};
