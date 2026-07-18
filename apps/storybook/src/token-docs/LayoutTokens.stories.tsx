import React from "react";
import type { Meta, StoryObj } from "storybook";

import { docLayout } from "./token-reader";

const meta: Meta = {
  title: "Tokens and Assets/Layout",
};

export default meta;

type Story = StoryObj;

function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--psi-border-neutral)" }}>
      {children}
    </tr>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "8px 12px" }}>{children}</td>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        font: "var(--psi-text-12-16-regular)",
        fontFamily: "monospace",
        color: "var(--psi-fg-accent)",
      }}
    >
      {children}
    </code>
  );
}

function Table({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        font: "var(--psi-text-14-20-regular)",
        marginBottom: "var(--psi-space-32)",
      }}
    >
      <thead>
        <tr
          style={{
            textAlign: "left",
            borderBottom: "1px solid var(--psi-border-neutral)",
          }}
        >
          {headers.map((h) => (
            <th key={h} style={{ padding: "8px 12px" }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

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
        Layout
      </h1>
      <p
        style={{
          color: "var(--psi-fg-secondary)",
          marginBottom: "var(--psi-space-32)",
        }}
      >
        Breakpoint, container, and z-index tokens (WS4) drive responsive
        layout and stacking across the system.
      </p>

      <h2
        style={{
          font: "var(--psi-text-18-28-medium)",
          color: "var(--psi-fg-primary)",
          marginBottom: "var(--psi-space-12)",
        }}
      >
        Breakpoints
      </h2>
      <p
        style={{
          font: "var(--psi-text-12-16-regular)",
          color: "var(--psi-fg-tertiary)",
          marginBottom: "var(--psi-space-12)",
        }}
      >
        Build-time constants (D31) — imported from{" "}
        <Code>@handamade/psi-tokens/types</Code>, not exposed as CSS vars, since custom
        properties cannot drive <Code>@media</Code>.
      </p>
      <Table headers={["Name", "Value"]}>
        {Object.entries(docLayout.breakpoints).map(([name, px]) => (
          <Row key={name}>
            <Cell>
              <Code>{name}</Code>
            </Cell>
            <Cell>{px}px</Cell>
          </Row>
        ))}
      </Table>

      <h2
        style={{
          font: "var(--psi-text-18-28-medium)",
          color: "var(--psi-fg-primary)",
          marginBottom: "var(--psi-space-12)",
        }}
      >
        Container
      </h2>
      <Table headers={["Name", "CSS Variable", "Value"]}>
        <Row>
          <Cell>
            <Code>max</Code>
          </Cell>
          <Cell>
            <Code>--psi-container-max</Code>
          </Cell>
          <Cell>{docLayout.container.max}px</Cell>
        </Row>
        <Row>
          <Cell>
            <Code>gutter</Code>
          </Cell>
          <Cell>
            <Code>--psi-gutter</Code>
          </Cell>
          <Cell>{docLayout.container.gutter}px</Cell>
        </Row>
        <Row>
          <Cell>
            <Code>gutterNarrow</Code>
          </Cell>
          <Cell>
            <Code>--psi-gutter</Code> (≤ md)
          </Cell>
          <Cell>{docLayout.container.gutterNarrow}px</Cell>
        </Row>
      </Table>

      <p
        style={{
          color: "var(--psi-fg-secondary)",
          marginBottom: "var(--psi-space-12)",
        }}
      >
        <Code>.psi-container</Code> applies max-width and gutter padding
        together — resize the preview to see the gutter narrow under md.
      </p>
      <div
        style={{
          backgroundColor: "var(--psi-fill-neutral2)",
          marginBottom: "var(--psi-space-32)",
        }}
      >
        <div
          className="ds-container"
          style={{
            backgroundColor: "var(--psi-fill-tint-accent)",
            paddingBlock: "var(--psi-space-16)",
          }}
        >
          <span
            style={{
              font: "var(--psi-text-12-16-regular)",
              color: "var(--psi-fg-primary)",
            }}
          >
            .psi-container — max-width {docLayout.container.max}px, gutter{" "}
            {docLayout.container.gutter}px
          </span>
        </div>
      </div>

      <h2
        style={{
          font: "var(--psi-text-18-28-medium)",
          color: "var(--psi-fg-primary)",
          marginBottom: "var(--psi-space-12)",
        }}
      >
        Z-index
      </h2>
      <Table headers={["Name", "CSS Variable", "Value"]}>
        {Object.entries(docLayout.zIndex).map(([name, z]) => (
          <Row key={name}>
            <Cell>
              <Code>{name}</Code>
            </Cell>
            <Cell>
              <Code>--psi-z-{name}</Code>
            </Cell>
            <Cell>{z}</Cell>
          </Row>
        ))}
      </Table>

      <h2
        style={{
          font: "var(--psi-text-18-28-medium)",
          color: "var(--psi-fg-primary)",
          marginBottom: "var(--psi-space-12)",
        }}
      >
        Border &amp; scrim
      </h2>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--psi-space-24)",
          borderBottom: "1px solid var(--psi-border-neutral)",
          paddingBottom: "var(--psi-space-16)",
          marginBottom: "var(--psi-space-16)",
        }}
      >
        <div style={{ width: 200, flexShrink: 0 }}>
          <Code>--psi-border-faint</Code>
        </div>
        <div
          style={{
            width: 120,
            borderBottom: "1px solid var(--psi-border-faint)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: "var(--psi-space-24)",
          marginBottom: "var(--psi-space-32)",
        }}
      >
        {(["scrimSoft", "scrimMedium", "scrimHeavy"] as const).map((name) => {
          const cssVar = `--psi-${camelToKebab(name)}`;
          return (
            <div key={name} style={{ textAlign: "center" }}>
              <div
                style={{
                  position: "relative",
                  width: 96,
                  height: 96,
                  borderRadius: "var(--psi-radius-8)",
                  backgroundColor: "var(--psi-fill-accent)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: `var(${cssVar})`,
                  }}
                />
              </div>
              <Code>{cssVar}</Code>
            </div>
          );
        })}
      </div>

      <p
        style={{
          font: "var(--psi-text-12-16-regular)",
          color: "var(--psi-fg-tertiary)",
        }}
      >
        D31: breakpoints/container/z-index tokens; D32: borderFaint hairline
        + scrim alphas over a sample fill.
      </p>
    </div>
  ),
};
