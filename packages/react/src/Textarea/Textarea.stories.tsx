import type { Meta, StoryObj } from "storybook";
import { Textarea } from "./Textarea.js";
import { Field } from "../Field/Field.js";

const meta: Meta<typeof Textarea> = {
  title: "Components/Textarea",
  component: Textarea,
  decorators: [(Story) => <div style={{ maxWidth: 480 }}><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof Textarea>;

/** D104: a bounded description in a Field, with the length counter. */
export const WithCounter: Story = {
  render: () => (
    <Field label="Description" description="What happened, and what you expected.">
      <Textarea maxLength={280} defaultValue="The export stopped at 40%." />
    </Field>
  ),
};

/** The Field's error lights the textarea; the counter stays. */
export const WithError: Story = {
  render: () => (
    <Field label="Description" error="Say what happened." required>
      <Textarea maxLength={280} />
    </Field>
  ),
};

export const Plain: Story = {
  args: { "aria-label": "Notes", placeholder: "Notes", rows: 4 },
};
