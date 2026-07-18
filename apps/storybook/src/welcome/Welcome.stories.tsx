import React from "react";
import type { Meta, StoryObj } from "storybook";

const meta: Meta = {
  title: "Welcome",
};

export default meta;

type Story = StoryObj;

export const Introduction: Story = {
  render: () => (
    <div className="ds-p-24" style={{ maxWidth: 640 }}>
      <h1
        style={{
          font: "var(--psi-text-30-36-bold)",
          color: "var(--psi-fg-primary)",
          marginBottom: "var(--psi-space-16)",
        }}
      >
        DKU Design System
      </h1>
      <p
        style={{
          font: "var(--psi-text-16-24-regular)",
          color: "var(--psi-fg-secondary)",
          marginBottom: "var(--psi-space-24)",
        }}
      >
        A token-first design system built on OKLCH color science. Browse the
        sidebar to explore tokens, assets, and components.
      </p>
      <div className="ds-gap-12" style={{ display: "flex", flexWrap: "wrap" }}>
        {["Accent", "Success", "Warning", "Danger"].map((name) => (
          <div
            key={name}
            style={{
              width: 80,
              height: 80,
              borderRadius: "var(--psi-radius-8)",
              backgroundColor: `var(--psi-fill-${name.toLowerCase()})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: `var(--psi-tag-${name.toLowerCase()}-fg)`,
              font: "var(--psi-text-12-16-regular)",
            }}
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  ),
};
