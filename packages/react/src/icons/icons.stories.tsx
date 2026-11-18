import React from "react";
import type { Meta, StoryObj } from "storybook";
import * as iconModule from "./index.js";

// Built from the barrel, not a hand-kept list: the hand-kept one fell four
// icons behind (D64, D70) before anyone noticed (D137).
const icons = Object.entries(iconModule).map(([name, Component]) => ({ name, Component }));

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
