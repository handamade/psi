import React from "react";
import type { Meta, StoryObj } from "storybook";

import { docMotion } from "./token-reader";

const meta: Meta = {
  title: "Tokens and Assets/Motion",
};

export default meta;

type Story = StoryObj;

export const Specimens: Story = {
  render: () => (
    <div className="ds-p-24" style={{ maxWidth: 800 }}>
      <style>{`
        .ds-motion-demo {
          transform: translateX(0);
        }
        .ds-motion-demo:hover {
          transform: translateX(40px);
        }
      `}</style>
      <h1
        style={{
          font: "var(--ds-text-24-32-medium)",
          color: "var(--ds-fg-primary)",
          marginBottom: "var(--ds-space-24)",
        }}
      >
        Motion
      </h1>
      <p
        style={{
          color: "var(--ds-fg-secondary)",
          marginBottom: "var(--ds-space-32)",
        }}
      >
        Duration and easing tokens (WS3) drive every transition and
        animation in the system. Hover a square to preview its easing curve.
      </p>

      <h2
        style={{
          font: "var(--ds-text-18-28-medium)",
          color: "var(--ds-fg-primary)",
          marginBottom: "var(--ds-space-12)",
        }}
      >
        Durations
      </h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--ds-space-16)",
          marginBottom: "var(--ds-space-32)",
        }}
      >
        {docMotion.durations.map((ms) => (
          <div
            key={ms}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--ds-space-24)",
              borderBottom: "1px solid var(--ds-border-neutral)",
              paddingBottom: "var(--ds-space-8)",
            }}
          >
            <code
              style={{
                font: "var(--ds-text-12-16-regular)",
                fontFamily: "monospace",
                color: "var(--ds-fg-accent)",
                width: 200,
                flexShrink: 0,
              }}
            >
              --ds-duration-{ms}
            </code>
            <span style={{ color: "var(--ds-fg-primary)" }}>{ms}ms</span>
          </div>
        ))}
      </div>

      <h2
        style={{
          font: "var(--ds-text-18-28-medium)",
          color: "var(--ds-fg-primary)",
          marginBottom: "var(--ds-space-12)",
        }}
      >
        Easings
      </h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--ds-space-16)",
          marginBottom: "var(--ds-space-32)",
        }}
      >
        {Object.entries(docMotion.easings).map(([name, curve]) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--ds-space-24)",
              borderBottom: "1px solid var(--ds-border-neutral)",
              paddingBottom: "var(--ds-space-16)",
            }}
          >
            <div style={{ width: 200, flexShrink: 0 }}>
              <code
                style={{
                  font: "var(--ds-text-12-16-regular)",
                  fontFamily: "monospace",
                  color: "var(--ds-fg-accent)",
                  display: "block",
                }}
              >
                --ds-ease-{name}
              </code>
              <span
                style={{
                  font: "var(--ds-text-12-16-regular)",
                  color: "var(--ds-fg-tertiary)",
                }}
              >
                {curve}
              </span>
            </div>
            <div
              className="ds-motion-demo"
              style={{
                width: 48,
                height: 48,
                borderRadius: "var(--ds-radius-8)",
                backgroundColor: "var(--ds-fill-accent)",
                transition: `transform var(--ds-duration-350) var(--ds-ease-${name})`,
              }}
            />
          </div>
        ))}
      </div>

      <p
        style={{
          font: "var(--ds-text-12-16-regular)",
          color: "var(--ds-fg-tertiary)",
        }}
      >
        D30: &ldquo;All --ds-duration-* zero under prefers-reduced-motion;
        drive all transitions/animations with duration tokens.&rdquo;
      </p>
    </div>
  ),
};
