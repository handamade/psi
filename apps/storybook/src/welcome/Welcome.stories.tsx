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
          fontSize: "var(--ds-text-3xl-size)",
          lineHeight: "var(--ds-text-3xl-line)",
          fontWeight: "var(--ds-text-3xl-weight)",
          color: "var(--ds-fg-primary)",
          marginBottom: "var(--ds-space-16)",
        }}
      >
        DKU Design System
      </h1>
      <p
        style={{
          fontSize: "var(--ds-text-base-size)",
          lineHeight: "var(--ds-text-base-line)",
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
              color: "var(--ds-fg-static-white)",
              fontSize: "var(--ds-text-xs-size)",
              fontWeight: "var(--ds-text-xs-weight)",
            }}
          >
            {name}
          </div>
        ))}
      </div>
    </div>
  ),
};
