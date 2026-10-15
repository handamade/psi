import type { Meta, StoryObj } from "storybook";
import { RadioGroup } from "./RadioGroup.js";
import { Radio } from "./Radio.js";
import { Field } from "../Field/Field.js";

const meta: Meta<typeof RadioGroup> = { title: "Components/RadioGroup", component: RadioGroup };
export default meta;
type Story = StoryObj<typeof RadioGroup>;

const options = (
  <>
    <Radio value="problem">Something is broken</Radio>
    <Radio value="idea">An idea</Radio>
    <Radio value="other" disabled>Something else</Radio>
  </>
);

/** D104: in Field's group mode, the legend names the group. */
export const InField: Story = {
  render: () => (
    <Field group label="Category" required requiredText="(Required)">
      <RadioGroup defaultValue="idea">{options}</RadioGroup>
    </Field>
  ),
};

/** The Field's error: every radio is aria-invalid, the message describes the group. */
export const WithError: Story = {
  render: () => (
    <Field group label="Category" required error="Pick a category.">
      <RadioGroup>{options}</RadioGroup>
    </Field>
  ),
};

/** Standalone, a radiogroup named by aria-label, laid out in a row. */
export const Horizontal: Story = {
  render: () => (
    <RadioGroup aria-label="Density" orientation="horizontal" defaultValue="comfortable">
      <Radio value="compact">Compact</Radio>
      <Radio value="comfortable">Comfortable</Radio>
      <Radio value="spacious">Spacious</Radio>
    </RadioGroup>
  ),
};
