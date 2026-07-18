import React from "react";
import type { Meta, StoryObj } from "storybook";
import {
  IconPlus,
  IconMinus,
  IconClose,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconSearch,
  IconSettings,
  IconUser,
  IconEdit,
  IconTrash,
  IconCopy,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconLoader,
  IconArrowDown,
  IconArrowUpRight,
  IconLinkedIn,
  IconGitHub,
  IconX,
  IconInstagram,
} from "./index.js";

const icons = [
  { name: "IconPlus", Component: IconPlus },
  { name: "IconMinus", Component: IconMinus },
  { name: "IconClose", Component: IconClose },
  { name: "IconCheck", Component: IconCheck },
  { name: "IconChevronDown", Component: IconChevronDown },
  { name: "IconChevronRight", Component: IconChevronRight },
  { name: "IconSearch", Component: IconSearch },
  { name: "IconSettings", Component: IconSettings },
  { name: "IconUser", Component: IconUser },
  { name: "IconEdit", Component: IconEdit },
  { name: "IconTrash", Component: IconTrash },
  { name: "IconCopy", Component: IconCopy },
  { name: "IconExternalLink", Component: IconExternalLink },
  { name: "IconEye", Component: IconEye },
  { name: "IconEyeOff", Component: IconEyeOff },
  { name: "IconLoader", Component: IconLoader },
  { name: "IconArrowDown", Component: IconArrowDown },
  { name: "IconArrowUpRight", Component: IconArrowUpRight },
  { name: "IconLinkedIn", Component: IconLinkedIn },
  { name: "IconGitHub", Component: IconGitHub },
  { name: "IconX", Component: IconX },
  { name: "IconInstagram", Component: IconInstagram },
];

const meta: Meta = {
  title: "Icons/Gallery",
};

export default meta;
type Story = StoryObj;

const IconCell = ({
  name,
  Component,
  size,
}: {
  name: string;
  Component: React.ComponentType<{ size?: number }>;
  size: number;
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "var(--psi-space-4)",
      padding: "var(--psi-space-8)",
    }}
  >
    <Component size={size} />
    <span
      style={{
        font: "var(--psi-text-12-16-regular)",
        color: "var(--psi-fg-secondary)",
      }}
    >
      {name}
    </span>
  </div>
);

export const Size16: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--psi-space-8)" }}>
      {icons.map(({ name, Component }) => (
        <IconCell key={name} name={name} Component={Component} size={16} />
      ))}
    </div>
  ),
};

export const Size20: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--psi-space-8)" }}>
      {icons.map(({ name, Component }) => (
        <IconCell key={name} name={name} Component={Component} size={20} />
      ))}
    </div>
  ),
};

export const Size24: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--psi-space-8)" }}>
      {icons.map(({ name, Component }) => (
        <IconCell key={name} name={name} Component={Component} size={24} />
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--psi-space-24)" }}>
      {[16, 20, 24].map((size) => (
        <div key={size}>
          <h3 style={{ margin: "0 0 var(--psi-space-8)", font: "var(--psi-text-14-20-regular)", color: "var(--psi-fg-secondary)" }}>
            Size {size}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--psi-space-8)" }}>
            {icons.map(({ name, Component }) => (
              <IconCell key={name} name={name} Component={Component} size={size} />
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
};
