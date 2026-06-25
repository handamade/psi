import React from "react";
import type { Meta, StoryObj } from "storybook";

const meta: Meta = {
  title: "Tokens and Assets/Spacing",
};

export default meta;

type Story = StoryObj;

const spacingScale = [0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80];

export const Scale: Story = {
  render: () => (
    <div className="ds-p-24" style={{ maxWidth: 700 }}>
      <h1
        style={{
          fontSize: "var(--ds-text-2xl-size)",
          lineHeight: "var(--ds-text-2xl-line)",
          fontWeight: "var(--ds-text-2xl-weight)",
          color: "var(--ds-fg-primary)",
          marginBottom: "var(--ds-space-24)",
        }}
      >
        Spacing Scale
      </h1>
      <p
        style={{
          color: "var(--ds-fg-secondary)",
          marginBottom: "var(--ds-space-32)",
        }}
      >
        The spacing scale provides consistent spatial values across the design
        system. Each step uses a CSS custom property.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {spacingScale.map((px) => {
          const cssVar = `--ds-space-${px}`;
          return (
            <div
              key={px}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <code
                style={{
                  fontFamily: "monospace",
                  fontSize: "var(--ds-text-xs-size)",
                  color: "var(--ds-fg-secondary)",
                  width: 140,
                  flexShrink: 0,
                }}
              >
                {cssVar}
              </code>
              <span
                style={{
                  fontSize: "var(--ds-text-xs-size)",
                  color: "var(--ds-fg-tertiary)",
                  width: 50,
                  flexShrink: 0,
                  textAlign: "right",
                }}
              >
                {px}px
              </span>
              <div
                style={{
                  height: 20,
                  width: `var(${cssVar})`,
                  minWidth: px === 0 ? 2 : undefined,
                  backgroundColor: "var(--ds-fill-accent)",
                  borderRadius: "var(--ds-radius-4)",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  ),
};
