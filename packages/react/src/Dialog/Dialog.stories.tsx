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

export const NoTitle: Story = {
  render: () => (
    <Dialog open onClose={() => {}} aria-label="Quick action">
      Choose an action to continue.
    </Dialog>
  ),
};

export const ForcedChoice: Story = {
  render: () => (
    <Dialog
      open
      onClose={() => {}}
      title="Pick one"
      dismissible={false}
      footer={<Button variant="accent" size={40}>Keep</Button>}
    >
      No escape hatch.
    </Dialog>
  ),
};

/** D66 — a drawer is a Dialog placement, not a component. */
export const DrawerInlineEnd: Story = {
  render: () => (
    <Dialog
      open
      onClose={() => {}}
      placement="inline-end"
      title="Transaction detail"
      footer={<Button variant="neutral">Close</Button>}
    >
      <p>Acme Corp — Supplies</p>
      <p>2026-07-14 · $1,240.00</p>
    </Dialog>
  ),
};

export const DrawerInlineStart: Story = {
  render: () => (
    <Dialog
      open
      onClose={() => {}}
      placement="inline-start"
      width={400}
      title="Filters"
      footer={<Button variant="accent">Apply</Button>}
    >
      <p>Narrow the transaction list.</p>
    </Dialog>
  ),
};

/** Proves the panel scrolls internally so the footer stays reachable. */
export const DrawerLongContent: Story = {
  render: () => (
    <Dialog
      open
      onClose={() => {}}
      placement="inline-end"
      title="Audit trail"
      footer={<Button variant="neutral">Close</Button>}
    >
      {Array.from({ length: 30 }, (_, i) => (
        <p key={i}>Event {i + 1} — recorded 2026-07-{String((i % 28) + 1).padStart(2, "0")}.</p>
      ))}
    </Dialog>
  ),
};
