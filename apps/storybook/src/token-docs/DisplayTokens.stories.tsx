import React from "react";
import type { Meta, StoryObj } from "storybook";

import { docDisplay } from "./token-reader";

const meta: Meta = {
  title: "Tokens and Assets/Display",
};

export default meta;

type Story = StoryObj;

export const Specimens: Story = {
  render: () => (
    <div className="ds-p-24" style={{ maxWidth: 800 }}>
      <h1
        style={{
          font: "var(--ds-text-24-32-medium)",
          color: "var(--ds-fg-primary)",
          marginBottom: "var(--ds-space-24)",
        }}
      >
        Display Scale
      </h1>
      <p
        style={{
          color: "var(--ds-fg-secondary)",
          marginBottom: "var(--ds-space-32)",
        }}
      >
        Fluid display combos (D28) clamp between a min and max pixel size.
        Tracking and uppercase transform live in the utility class, since the
        `font` shorthand can't carry them.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--ds-space-32)",
        }}
      >
        {docDisplay.map((d) => (
          <div
            key={d.name}
            style={{
              borderBottom: "1px solid var(--ds-border-neutral)",
              paddingBottom: "var(--ds-space-16)",
            }}
          >
            <code
              style={{
                font: "var(--ds-text-12-16-regular)",
                fontFamily: "monospace",
                color: "var(--ds-fg-accent)",
                display: "block",
                marginBottom: "var(--ds-space-8)",
              }}
            >
              display-{d.name}
            </code>
            <span
              style={{
                font: "var(--ds-text-12-16-regular)",
                color: "var(--ds-fg-tertiary)",
                display: "block",
                marginBottom: "var(--ds-space-8)",
              }}
            >
              {d.min}px &rarr; {d.max}px &middot; {d.vw}vw &middot; {d.weight} (
              {d.cssWeight})
            </span>
            <span
              className={"ds-display-" + d.name}
              style={{ color: "var(--ds-fg-primary)" }}
            >
              Aa Ember Field
            </span>
          </div>
        ))}
      </div>
    </div>
  ),
};
