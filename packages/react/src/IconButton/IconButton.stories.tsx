import React from "react";
import type { Meta, StoryObj } from "storybook";
import { IconButton } from "./IconButton.js";

const StarIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M8 0l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z" />
  </svg>
);

const meta: Meta<typeof IconButton> = {
  title: "Components/IconButton",
  component: IconButton,
  argTypes: {
    variant: {
      control: "select",
      options: ["accent", "neutral", "ghost", "danger"],
    },
    size: {
      control: "select",
      options: [24, 32, 40, 48],
    },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Accent: Story = {
  args: { variant: "accent", "aria-label": "Favorite", children: <StarIcon /> },
};

export const Neutral: Story = {
  args: { variant: "neutral", "aria-label": "Favorite", children: <StarIcon /> },
};

export const Ghost: Story = {
  args: { variant: "ghost", "aria-label": "Favorite", children: <StarIcon /> },
};

export const Danger: Story = {
  args: { variant: "danger", "aria-label": "Delete", children: <StarIcon /> },
};

export const Disabled: Story = {
  args: {
    variant: "accent",
    "aria-label": "Favorite",
    disabled: true,
    children: <StarIcon />,
  },
};

export const AsLink: Story = {
  args: {
    variant: "accent",
    "aria-label": "Open in new tab",
    href: "https://example.com",
    target: "_blank",
    rel: "noreferrer",
    children: <StarIcon />,
  },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--ds-space-12)" }}>
      <IconButton variant="accent" size={24} aria-label="Size 24">
        <StarIcon />
      </IconButton>
      <IconButton variant="accent" size={32} aria-label="Size 32">
        <StarIcon />
      </IconButton>
      <IconButton variant="accent" size={40} aria-label="Size 40">
        <StarIcon />
      </IconButton>
      <IconButton variant="accent" size={48} aria-label="Size 48">
        <StarIcon />
      </IconButton>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--ds-space-12)" }}>
      <IconButton variant="accent" aria-label="Accent">
        <StarIcon />
      </IconButton>
      <IconButton variant="neutral" aria-label="Neutral">
        <StarIcon />
      </IconButton>
      <IconButton variant="ghost" aria-label="Ghost">
        <StarIcon />
      </IconButton>
      <IconButton variant="danger" aria-label="Danger">
        <StarIcon />
      </IconButton>
    </div>
  ),
};

export const VariantSizeMatrix: Story = {
  render: () => {
    const variants = ["accent", "neutral", "ghost", "danger"] as const;
    const sizes = [24, 32, 40, 48] as const;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-12)" }}>
        {variants.map((variant) => (
          <div key={variant} style={{ display: "flex", alignItems: "center", gap: "var(--ds-space-12)" }}>
            <span style={{ width: 60, font: "var(--ds-text-12-16-regular)", color: "var(--ds-fg-secondary)" }}>
              {variant}
            </span>
            {sizes.map((size) => (
              <IconButton
                key={size}
                variant={variant}
                size={size}
                aria-label={`${variant} ${size}`}
              >
                <StarIcon />
              </IconButton>
            ))}
          </div>
        ))}
      </div>
    );
  },
};
