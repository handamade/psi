import React from "react";
import type { Meta, StoryObj } from "storybook";

import { docTypography } from "./token-reader";

const meta: Meta = {
  title: "Tokens and Assets/Typography",
};

export default meta;

type Story = StoryObj;

export const Specimens: Story = {
  render: () => (
    <div className="ds-p-24" style={{ maxWidth: 800 }}>
      <h1
        style={{
          font: "var(--psi-text-24-32-medium)",
          color: "var(--psi-fg-primary)",
          marginBottom: "var(--psi-space-24)",
        }}
      >
        Typography Scale
      </h1>
      <p
        style={{
          color: "var(--psi-fg-secondary)",
          marginBottom: "var(--psi-space-32)",
        }}
      >
        Each combo defines font size, line height, and weight together as a
        single CSS custom property using the `font` shorthand.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--psi-space-24)",
        }}
      >
        {docTypography.map((combo) => (
          <div
            key={combo.name}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--psi-space-24)",
              borderBottom: "1px solid var(--psi-border-neutral)",
              paddingBottom: "var(--psi-space-16)",
            }}
          >
            <div style={{ width: 200, flexShrink: 0 }}>
              <code
                style={{
                  font: "var(--psi-text-12-16-regular)",
                  fontFamily: "monospace",
                  color: "var(--psi-fg-accent)",
                  display: "block",
                }}
              >
                text-{combo.name}
              </code>
              <span
                style={{
                  font: "var(--psi-text-12-16-regular)",
                  color: "var(--psi-fg-tertiary)",
                }}
              >
                {combo.fontSize}px / {combo.lineHeight}px &middot;{" "}
                {combo.weight} ({combo.cssWeight})
              </span>
            </div>
            <span
              style={{
                font: `var(--psi-text-${combo.name})`,
                color: "var(--psi-fg-primary)",
              }}
            >
              The quick brown fox jumps over the lazy dog
            </span>
          </div>
        ))}
      </div>
    </div>
  ),
};
