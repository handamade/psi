import React from "react";
import type { Meta, StoryObj } from "storybook";

const meta: Meta = {
  title: "Tokens and Assets/Typography",
};

export default meta;

type Story = StoryObj;

const typographySteps = [
  { name: "xs", fontSize: 12, lineHeight: 16, weight: "regular", cssWeight: 400 },
  { name: "sm", fontSize: 14, lineHeight: 20, weight: "regular", cssWeight: 400 },
  { name: "base", fontSize: 16, lineHeight: 24, weight: "regular", cssWeight: 400 },
  { name: "lg", fontSize: 18, lineHeight: 28, weight: "medium", cssWeight: 500 },
  { name: "xl", fontSize: 20, lineHeight: 28, weight: "semibold", cssWeight: 600 },
  { name: "2xl", fontSize: 24, lineHeight: 32, weight: "semibold", cssWeight: 600 },
  { name: "3xl", fontSize: 30, lineHeight: 36, weight: "bold", cssWeight: 700 },
  { name: "4xl", fontSize: 36, lineHeight: 40, weight: "bold", cssWeight: 700 },
] as const;

export const Specimens: Story = {
  render: () => (
    <div className="ds-p-24" style={{ maxWidth: 800 }}>
      <h1
        style={{
          fontSize: "var(--ds-text-2xl-size)",
          lineHeight: "var(--ds-text-2xl-line)",
          fontWeight: "var(--ds-text-2xl-weight)",
          color: "var(--ds-fg-primary)",
          marginBottom: "var(--ds-space-24)",
        }}
      >
        Typography Scale
      </h1>
      <p
        style={{
          color: "var(--ds-fg-secondary)",
          marginBottom: "var(--ds-space-32)",
        }}
      >
        Each step defines font size, line height, and weight as CSS custom
        properties.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--ds-space-24)",
        }}
      >
        {typographySteps.map((step) => {
          const sizeVar = `--ds-text-${step.name}-size`;
          const lineVar = `--ds-text-${step.name}-line`;
          const weightVar = `--ds-text-${step.name}-weight`;
          return (
            <div
              key={step.name}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "var(--ds-space-24)",
                borderBottom: "1px solid var(--ds-border-neutral)",
                paddingBottom: "var(--ds-space-16)",
              }}
            >
              <div style={{ width: 160, flexShrink: 0 }}>
                <code
                  style={{
                    fontFamily: "monospace",
                    fontSize: "var(--ds-text-xs-size)",
                    color: "var(--ds-fg-accent)",
                    display: "block",
                  }}
                >
                  text-{step.name}
                </code>
                <span
                  style={{
                    fontSize: "var(--ds-text-xs-size)",
                    color: "var(--ds-fg-tertiary)",
                  }}
                >
                  {step.fontSize}px / {step.lineHeight}px &middot;{" "}
                  {step.weight} ({step.cssWeight})
                </span>
              </div>
              <span
                style={{
                  fontSize: `var(${sizeVar})`,
                  lineHeight: `var(${lineVar})`,
                  fontWeight: `var(${weightVar})`,
                  color: "var(--ds-fg-primary)",
                }}
              >
                The quick brown fox jumps over the lazy dog
              </span>
            </div>
          );
        })}
      </div>
    </div>
  ),
};
