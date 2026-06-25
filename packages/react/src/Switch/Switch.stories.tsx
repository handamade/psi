import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Switch } from "./Switch.js";

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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-12)" }}>
      <Switch>Off</Switch>
      <Switch defaultChecked>On</Switch>
      <Switch disabled>Disabled off</Switch>
      <Switch disabled defaultChecked>Disabled on</Switch>
    </div>
  ),
};
