import type { Meta, StoryObj } from "storybook";
import { Tag } from "./Tag.js";

const meta: Meta<typeof Tag> = {
  title: "Components/Tag",
  component: Tag,
  argTypes: {
    variant: {
      control: "select",
      options: ["neutral", "accent", "success", "warning", "danger"],
    },
    subtle: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Tag>;

export const Neutral: Story = {
  args: { children: "Neutral" },
};

export const Accent: Story = {
  args: { variant: "accent", children: "Accent" },
};

export const Success: Story = {
  args: { variant: "success", children: "Success" },
};

export const Warning: Story = {
  args: { variant: "warning", children: "Warning" },
};

export const Danger: Story = {
  args: { variant: "danger", children: "Danger" },
};

export const Dismissible: Story = {
  args: {
    variant: "accent",
    children: "Removable",
    onDismiss: () => alert("Dismissed"),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--ds-space-8)" }}>
      <Tag variant="neutral">Neutral</Tag>
      <Tag variant="accent">Accent</Tag>
      <Tag variant="success">Success</Tag>
      <Tag variant="warning">Warning</Tag>
      <Tag variant="danger">Danger</Tag>
    </div>
  ),
};

export const SubtleVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--ds-space-8)" }}>
      <Tag variant="neutral" subtle>Neutral</Tag>
      <Tag variant="accent" subtle>Accent</Tag>
      <Tag variant="success" subtle>Success</Tag>
      <Tag variant="warning" subtle>Warning</Tag>
      <Tag variant="danger" subtle>Danger</Tag>
    </div>
  ),
};
