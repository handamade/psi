import React from "react";
import type { Meta, StoryObj } from "storybook";
import { FieldStack } from "./FieldStack.js";
import { Field } from "../Field/Field.js";
import { Input } from "../Input/Input.js";
import { Select } from "../Select/Select.js";
import { Textarea } from "../Textarea/Textarea.js";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { RadioGroup } from "../RadioGroup/RadioGroup.js";
import { Radio } from "../RadioGroup/Radio.js";

const meta: Meta<typeof FieldStack> = {
  title: "Components/FieldStack",
  component: FieldStack,
};
export default meta;
type Story = StoryObj<typeof FieldStack>;

function Form({ labelPosition = "start" as const, longLabel = false }) {
  const [status, setStatus] = React.useState("active");
  return (
    <FieldStack labelPosition={labelPosition}>
      <Field label="Name" required>
        <Input size={32} defaultValue="Ada Lovelace" />
      </Field>
      <Field label={longLabel ? "Card group that decides the profile every new card is issued with" : "Card group"} description="The group decides the profile.">
        <Select size={32} defaultValue="retail">
          <option value="retail">Retail</option>
          <option value="corporate">Corporate</option>
        </Select>
      </Field>
      <Field group label="Status" error="Blocked cards cannot be reissued.">
        <RadioGroup value={status} onValueChange={setStatus}>
          <Radio value="active">Active</Radio>
          <Radio value="blocked">Blocked</Radio>
        </RadioGroup>
      </Field>
      <Field>
        <Checkbox defaultChecked>Notify the owner</Checkbox>
      </Field>
      <Field label="Notes" labelPosition="top">
        <Textarea defaultValue="Spans both columns, with its label above." />
      </Field>
    </FieldStack>
  );
}

/** D115 — a form whose labels share one column, as wide as the longest label. */
export const SideLabels: Story = { render: () => <div style={{ maxWidth: 640 }}><Form /></div> };

/** A label longer than --psi-field-label-max-width (240px) wraps. */
export const LongLabel: Story = { render: () => <div style={{ maxWidth: 640 }}><Form longLabel /></div> };

/** Under 480px of the stack's own width, every label returns above its control. */
export const Narrow: Story = { render: () => <div style={{ width: 400 }}><Form /></div> };

/** A theme's --psi-field-label-align: end puts each label against its control. */
export const LabelsAtTheEnd: Story = {
  render: () => (
    <div style={{ maxWidth: 640, ["--psi-field-label-align" as string]: "end" }}>
      <Form />
    </div>
  ),
};

/** The columns and the label's alignment are logical, so right-to-left mirrors them. */
export const RightToLeft: Story = { render: () => <div dir="rtl" style={{ maxWidth: 640 }}><Form /></div> };

/** labelPosition="top": a column of Fields with the gap, as Stack would lay them out. */
export const LabelsAbove: Story = { render: () => <div style={{ maxWidth: 420 }}><Form labelPosition="top" /></div> };

/** D125: a stacked form in a wide column stops at --psi-field-stack-max-width (640px). Each control takes its
 * Field's controlWidth; Notes, without one, fills the control column. */
export const Capped: Story = {
  render: () => (
    <div style={{ width: 960 }}>
      <FieldStack labelPosition="start">
        <Field label="Display name" controlWidth={320}>
          <Input size={32} defaultValue="Ada Lovelace" />
        </Field>
        <Field label="ICCID" controlWidth={240} description="19 or 20 digits.">
          <Input size={32} defaultValue="89490200001234567890" />
        </Field>
        <Field label="Rows per page" controlWidth={80}>
          <Select size={32} defaultValue="50">
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </Select>
        </Field>
        <Field label="Notes">
          <Textarea rows={3} />
        </Field>
      </FieldStack>
    </div>
  ),
};
