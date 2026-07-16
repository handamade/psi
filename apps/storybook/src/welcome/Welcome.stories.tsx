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
          font: "var(--ds-text-30-36-bold)",
          color: "var(--ds-fg-primary)",
          marginBottom: "var(--ds-space-16)",
        }}
      >
        DKU Design System
      </h1>
      <p
        style={{
          font: "var(--ds-text-16-24-regular)",
          color: "var(--ds-fg-secondary)",
          marginBottom: "var(--ds-space-24)",
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
              borderRadius: "var(--ds-radius-8)",
              backgroundColor: `var(--ds-fill-${name.toLowerCase()})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: `var(--ds-tag-${name.toLowerCase()}-fg)`,
              font: "var(--ds-text-12-16-regular)",
            }}
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  ),
};
