import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Dialog } from "./Dialog.js";
import { Button } from "../Button/Button.js";
import { Field } from "../Field/Field.js";
import { Input } from "../Input/Input.js";

const meta: Meta<typeof Dialog> = {
  title: "Components/Dialog",
  component: Dialog,
};
export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => (
    <Dialog
      open
      onClose={() => {}}
      title="Delete account?"
      width={400}
      footer={
        <>
          <Button variant="ghost" size={40}>Cancel</Button>
          <Button variant="danger" size={40}>Yes, delete</Button>
        </>
      }
    >
      Deleting the account removes all data. There is no undo.
    </Dialog>
  ),
};

export const FormDialog: Story = {
  render: () => (
    <Dialog
      open
      onClose={() => {}}
      title="Rename project"
      footer={<Button variant="accent" size={40}>Save</Button>}
    >
      <Field label="Project name" description="Visible to the whole team.">
        <Input size={40} defaultValue="Psi" />
      </Field>
    </Dialog>
  ),
};
