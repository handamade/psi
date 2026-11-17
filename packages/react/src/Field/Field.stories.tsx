import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Field } from "./Field.js";
import { Input } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { Toolbar } from "../Toolbar/Toolbar.js";
import { Switch } from "../Switch/Switch.js";
import { useFieldControl } from "./useFieldControl.js";
import "./Field.stories.css";

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

/** D84 — required stated in a word, not by a glyph alone. The word is the
 * label's colour at regular weight and is aria-hidden: the control's
 * `required` is what assistive tech reads. The asterisk row shows the
 * default for comparison. */
export const RequiredText: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24, maxWidth: 420 }}>
      <Field label="Passport number" required requiredText="(Required)" description="As printed on the passport.">
        <Input size={40} />
      </Field>
      <Field label="Passport number" required description="The default marker.">
        <Input size={40} />
      </Field>
    </div>
  ),
};

/** A control Psi did not write — a combobox-shaped div standing in for one
 * built on another library. `useFieldControl()` gives it the Field's wiring;
 * Field.stories.css gives it the shared focus ring, as a consumer's own
 * control must (D82). */
function StandInCombobox() {
  const field = useFieldControl();
  return (
    <div
      role="combobox"
      tabIndex={0}
      aria-expanded="false"
      className="psi-story-stand-in"
      {...field}
    >
      Choose an airline
    </div>
  );
}

/** D84 — `useFieldControl()` joins a custom control to a Field: label
 * association, aria-describedby for the message, aria-invalid and
 * aria-required, all read off the Field. */
export const CustomControl: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24, maxWidth: 420 }}>
      <Field label="Airline" required requiredText="(Required)" error="Pick one.">
        <StandInCombobox />
      </Field>
    </div>
  ),
};

/** D115 — the label beside its control, at every control size. */
export const LabelStart: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      {([24, 32, 40, 48] as const).map((size) => (
        <div key={size} style={{ display: "flex", gap: 24 }}>
          <Field label={`Name ${size}`} labelPosition="start">
            <Input size={size} defaultValue="Ada" />
          </Field>
          <Field label={`Rows per page ${size}`} labelPosition="start">
            <Select size={size} defaultValue="50">
              <option value="10">10</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </Select>
          </Field>
        </div>
      ))}
    </div>
  ),
};

/** D125: each step, from a page size to an address. The message line keeps the Field's width, so the
 * postcode's error does not wrap at 120px. Below: a start Field, a Toolbar row whose Field is as wide as
 * its control, and a 480 step in a 360px column, where the control shrinks to the column. */
export const ControlWidth: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16, width: 560 }}>
      <Field label="Rows per page" controlWidth={80}>
        <Select size={32} defaultValue="50">
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </Select>
      </Field>
      <Field label="Postcode" controlWidth={120} error="Enter a postcode of five digits.">
        <Input size={32} defaultValue="1011" />
      </Field>
      <Field label="Amount" controlWidth={160}>
        <Input size={32} defaultValue="1,250.00" />
      </Field>
      <Field label="ICCID" controlWidth={240} description="19 or 20 digits.">
        <Input size={32} defaultValue="89490200001234567890" />
      </Field>
      <Field label="Display name" controlWidth={320}>
        <Input size={32} defaultValue="Ada Lovelace" />
      </Field>
      <Field label="Address" controlWidth={480}>
        <Input size={32} defaultValue="Unter den Linden 1, 10117 Berlin" />
      </Field>
      <Field label="ICCID" labelPosition="start" controlWidth={240}>
        <Input size={32} defaultValue="89490200001234567890" />
      </Field>
      <Toolbar align="center" gap={12}>
        <Field label="Rows per page" labelPosition="start" controlWidth={80}>
          <Select size={32} defaultValue="50">
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </Select>
        </Field>
      </Toolbar>
      <div style={{ width: 360 }}>
        <Field label="Address, in a 360px column" controlWidth={480}>
          <Input size={32} defaultValue="Unter den Linden 1, 10117 Berlin" />
        </Field>
      </div>
    </div>
  ),
};
