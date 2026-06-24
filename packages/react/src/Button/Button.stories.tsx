import type { Meta, StoryObj } from "storybook";
import { Button } from "./Button.js";

const meta: Meta<typeof Button> = {
  title: "Components/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: [
        "accent",
        "accent-subtle",
        "neutral",
        "neutral-subtle",
        "ghost",
        "danger",
        "danger-subtle",
      ],
    },
    size: {
      control: "select",
      options: [24, 32, 40, 48],
    },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Accent: Story = {
  args: { variant: "accent", children: "Accent" },
};

export const AccentSubtle: Story = {
  args: { variant: "accent-subtle", children: "Accent Subtle" },
};

export const Neutral: Story = {
  args: { variant: "neutral", children: "Neutral" },
};

export const NeutralSubtle: Story = {
  args: { variant: "neutral-subtle", children: "Neutral Subtle" },
};

export const Ghost: Story = {
  args: { variant: "ghost", children: "Ghost" },
};

export const Danger: Story = {
  args: { variant: "danger", children: "Danger" },
};

export const DangerSubtle: Story = {
  args: { variant: "danger-subtle", children: "Danger Subtle" },
};

export const Disabled: Story = {
  args: { variant: "accent", children: "Disabled", disabled: true },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--ds-space-12)" }}>
      <Button variant="accent" size={24}>Size 24</Button>
      <Button variant="accent" size={32}>Size 32</Button>
      <Button variant="accent" size={40}>Size 40</Button>
      <Button variant="accent" size={48}>Size 48</Button>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--ds-space-12)" }}>
      <Button variant="accent">Accent</Button>
      <Button variant="accent-subtle">Accent Subtle</Button>
      <Button variant="neutral">Neutral</Button>
      <Button variant="neutral-subtle">Neutral Subtle</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="danger-subtle">Danger Subtle</Button>
    </div>
  ),
};
