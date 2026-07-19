import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Field } from "./Field.js";
import { Input } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { Switch } from "../Switch/Switch.js";

const meta: Meta<typeof Field> = {
  title: "Components/Field",
  component: Field,
};
export default meta;
type Story = StoryObj<typeof Field>;

export const Default: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24, maxWidth: 420 }}>
      <Field label="Email" description="Used for sign-in.">
        <Input size={40} type="email" defaultValue="ada@example.com" />
      </Field>
      <Field label="Email" error="That doesn't look like an email." required>
        <Input size={40} type="email" defaultValue="ada@" />
      </Field>
      <Field label="Plan" description="Billed monthly.">
        <Select size={40} defaultValue="pro">
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </Select>
      </Field>
      <Field group label="Notifications" description="Choose your channels.">
        <Checkbox defaultChecked>Email</Checkbox>
        <Switch>Push</Switch>
      </Field>
    </div>
  ),
};
