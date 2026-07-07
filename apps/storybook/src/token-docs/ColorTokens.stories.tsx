import React from "react";
import type { Meta, StoryObj } from "storybook";
import {
  getTokens,
  groupByPrefix,
  type DocToken,
  type ThemeName,
} from "./token-reader";

const meta: Meta = {
  title: "Tokens and Assets/Color Tokens",
};

export default meta;

type Story = StoryObj;

const COLOR_PREFIXES = ["bg", "fg", "fill", "border"] as const;

function TokenTable({ tokens }: { tokens: DocToken[] }) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        font: "var(--ds-text-14-20-regular)",
      }}
    >
      <thead>
        <tr
          style={{
            textAlign: "left",
            borderBottom: "1px solid var(--ds-border-neutral)",
          }}
        >
          <th style={{ padding: "8px 12px" }}>Swatch</th>
          <th style={{ padding: "8px 12px" }}>CSS Variable</th>
          <th style={{ padding: "8px 12px" }}>Hex</th>
          <th style={{ padding: "8px 12px" }}>Formula</th>
        </tr>
      </thead>
      <tbody>
        {tokens.map((t) => (
          <tr
            key={t.name}
            style={{ borderBottom: "1px solid var(--ds-border-neutral)" }}
          >
            <td style={{ padding: "8px 12px" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--ds-radius-4)",
                  backgroundColor: `var(${t.cssVar})`,
                  border: "1px solid var(--ds-border-neutral)",
                }}
              />
            </td>
            <td style={{ padding: "8px 12px" }}>
              <code
                style={{
                  font: "var(--ds-text-12-16-regular)",
                  fontFamily: "monospace",
                  color: "var(--ds-fg-primary)",
                }}
              >
                {t.cssVar}
              </code>
            </td>
            <td style={{ padding: "8px 12px" }}>
              <code
                style={{
                  font: "var(--ds-text-12-16-regular)",
                  fontFamily: "monospace",
                  color: "var(--ds-fg-secondary)",
                }}
              >
                {t.hex}
              </code>
            </td>
            <td style={{ padding: "8px 12px" }}>
              <span style={{ color: "var(--ds-fg-tertiary)" }}>
                {t.formula}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const AllColorTokens: Story = {
  render: (_args, { globals }) => {
    const theme = (globals.theme as ThemeName | undefined) ?? "light";
    const groups = groupByPrefix(getTokens(theme));
    return (
      <div className="ds-p-24" style={{ maxWidth: 900 }}>
        <h1
          style={{
            font: "var(--ds-text-24-32-medium)",
            color: "var(--ds-fg-primary)",
            marginBottom: "var(--ds-space-24)",
          }}
        >
          Color Tokens
        </h1>
        <p
          style={{
            color: "var(--ds-fg-secondary)",
            marginBottom: "var(--ds-space-32)",
          }}
        >
          Semantic color tokens resolved for the active{" "}
          <strong>{theme}</strong> theme. Use the toolbar above to switch
          themes and see the swatches and hex values update.
        </p>
        {COLOR_PREFIXES.map((prefix) => {
          const tokens = groups[prefix];
          if (!tokens?.length) return null;
          return (
            <section
              key={prefix}
              style={{ marginBottom: "var(--ds-space-32)" }}
            >
              <h2
                style={{
                  font: "var(--ds-text-18-28-medium)",
                  color: "var(--ds-fg-primary)",
                  marginBottom: "var(--ds-space-12)",
                  textTransform: "capitalize",
                }}
              >
                {prefix}
              </h2>
              <TokenTable tokens={tokens} />
            </section>
          );
        })}
      </div>
    );
  },
};
