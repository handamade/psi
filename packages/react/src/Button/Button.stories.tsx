import React from "react";
import type { Meta, StoryObj } from "storybook";
import { Button } from "./Button.js";
import { IconPlus } from "../icons/IconPlus.js";

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
        "outline",
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

export const Outline: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--psi-space-12)" }}>
      <Button variant="outline" size={24}>Size 24</Button>
      <Button variant="outline" size={32}>Size 32</Button>
      <Button variant="outline" size={40}>Size 40</Button>
      <Button variant="outline" size={48}>Size 48</Button>
    </div>
  ),
};

export const Disabled: Story = {
  args: { variant: "accent", children: "Disabled", disabled: true },
};

export const AsLink: Story = {
  args: {
    variant: "accent",
    children: "As Link",
    href: "https://example.com",
    target: "_blank",
    rel: "noreferrer",
  },
};

export const DisabledLink: Story = {
  args: {
    variant: "accent",
    children: "Disabled Link",
    href: "https://example.com",
    disabled: true,
  },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--psi-space-12)" }}>
      <Button variant="accent" size={24}>Size 24</Button>
      <Button variant="accent" size={32}>Size 32</Button>
      <Button variant="accent" size={40}>Size 40</Button>
      <Button variant="accent" size={48}>Size 48</Button>
    </div>
  ),
};

/** D55 optical inset: a leading icon sits one step closer to the edge than
 * text does (12 [icon] 8 [label] 16 at size 40). Compare against AllSizes,
 * whose text-only buttons must stay pixel-identical to pre-D54 output. */
export const IconLeading: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <Button variant="accent" size={24}><IconPlus size={12} />Add item</Button>
      <Button variant="accent" size={32}><IconPlus size={14} />Add item</Button>
      <Button variant="accent" size={40}><IconPlus size={18} />Add item</Button>
      <Button variant="accent" size={48}><IconPlus size={21} />Add item</Button>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--psi-space-12)" }}>
      <Button variant="accent">Accent</Button>
      <Button variant="accent-subtle">Accent Subtle</Button>
      <Button variant="neutral">Neutral</Button>
      <Button variant="neutral-subtle">Neutral Subtle</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="danger-subtle">Danger Subtle</Button>
      <Button variant="outline">Outline</Button>
    </div>
  ),
};
