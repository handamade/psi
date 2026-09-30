import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Field } from "./Field.js";
import { Input } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
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
