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
        .psi-motion-demo {
          transform: translateX(0);
        }
        .psi-motion-demo:hover {
          transform: translateX(40px);
        }
      `}</style>
      <h1
        style={{
          font: "var(--psi-text-24-32-medium)",
          color: "var(--psi-fg-primary)",
          marginBottom: "var(--psi-space-24)",
        }}
      >
        Motion
      </h1>
      <p
        style={{
          color: "var(--psi-fg-secondary)",
          marginBottom: "var(--psi-space-32)",
        }}
      >
        Duration and easing tokens (WS3) drive every transition and
        animation in the system. Hover a square to preview its easing curve.
      </p>

      <h2
        style={{
          font: "var(--psi-text-18-28-medium)",
          color: "var(--psi-fg-primary)",
          marginBottom: "var(--psi-space-12)",
        }}
      >
        Durations
      </h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--psi-space-16)",
          marginBottom: "var(--psi-space-32)",
        }}
      >
        {docMotion.durations.map((ms) => (
          <div
            key={ms}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "var(--psi-space-24)",
              borderBottom: "1px solid var(--psi-border-neutral)",
              paddingBottom: "var(--psi-space-8)",
            }}
          >
            <code
              style={{
                font: "var(--psi-text-12-16-regular)",
                fontFamily: "monospace",
                color: "var(--psi-fg-accent)",
                width: 200,
                flexShrink: 0,
              }}
            >
              --psi-duration-{ms}
            </code>
            <span style={{ color: "var(--psi-fg-primary)" }}>{ms}ms</span>
          </div>
        ))}
      </div>

      <h2
        style={{
          font: "var(--psi-text-18-28-medium)",
          color: "var(--psi-fg-primary)",
          marginBottom: "var(--psi-space-12)",
        }}
      >
        Easings
      </h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--psi-space-16)",
          marginBottom: "var(--psi-space-32)",
        }}
      >
        {Object.entries(docMotion.easings).map(([name, curve]) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
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
                --psi-ease-{name}
              </code>
              <span
                style={{
                  font: "var(--psi-text-12-16-regular)",
                  color: "var(--psi-fg-tertiary)",
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
                borderRadius: "var(--psi-radius-8)",
                backgroundColor: "var(--psi-fill-accent)",
                transition: `transform var(--psi-duration-350) var(--psi-ease-${name})`,
              }}
            />
          </div>
        ))}
      </div>

      <p
        style={{
          font: "var(--psi-text-12-16-regular)",
          color: "var(--psi-fg-tertiary)",
        }}
      >
        D30: &ldquo;All --psi-duration-* zero under prefers-reduced-motion;
        drive all transitions/animations with duration tokens.&rdquo;
      </p>
    </div>
  ),
};
