import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderPresetElement } from "./patterns.js";
import type { ManifestComponent, Pattern } from "./patterns.js";

// Minimal real-shaped fixture components — not the actual Psi components,
// so this test verifies renderPresetElement's tree-walking/resolution logic
// in isolation, the same way render-preset.test.ts's string version does.
function Button({ variant, size, children }: { variant?: string; size?: number; children?: React.ReactNode }) {
  return <button data-variant={variant} data-size={size}>{children}</button>;
}
function Dialog({ title, footer, children }: { title?: React.ReactNode; footer?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div role="dialog">
      <h2>{title}</h2>
      <div>{children}</div>
      <div>{footer}</div>
    </div>
  );
}
function Toolbar({ children, "aria-label": ariaLabel }: { children?: React.ReactNode; "aria-label"?: string }) {
  return <div role="group" aria-label={ariaLabel}>{children}</div>;
}
function IconMoreHorizontal() {
  return <svg data-testid="icon-more-horizontal" />;
}

const buttonManifest: ManifestComponent = {
  name: "Button",
  slots: [],
  props: [
    { name: "variant", type: '"ghost" | "danger"', required: false, default: "neutral" },
    { name: "size", type: "24 | 32 | 40 | 48", required: false, default: 32 },
  ],
};
const dialogManifest: ManifestComponent = {
  name: "Dialog",
  slots: [
    { name: "title", accepts: {}, cardinality: "0..1" },
    { name: "body", accepts: {}, cardinality: "0..*" },
    { name: "footer", accepts: { components: ["Button"] }, cardinality: "1..*" },
  ],
  props: [],
};
const toolbarManifest: ManifestComponent = { name: "Toolbar", slots: [], props: [] };
const components = [buttonManifest, dialogManifest, toolbarManifest];
const registry = { Button, Dialog, Toolbar, IconMoreHorizontal };

describe("renderPresetElement", () => {
  it("mounts a fully-bound pattern as real elements, not a string", () => {
    const confirm: Pattern = {
      id: "destructive-confirm",
      intent: "Dialog confirming a destructive action",
      match: [],
      compose: {
        component: "Dialog",
        slots: {
          title: ["{content:title}"],
          body: ["{content:consequence}"],
          footer: [
            { component: "Button", props: { variant: "ghost", size: "{param:size}" }, content: "cancel-label" },
            { component: "Button", props: { variant: "danger", size: "{param:size}" }, content: "confirm-label" },
          ],
        },
      },
      parameters: [{ key: "size", ask: "Button size?", options: [32, 40], default: 32 }],
      content: {
        title: "Delete the object?",
        consequence: "This cannot be undone.",
        "cancel-label": "Cancel",
        "confirm-label": "Delete",
      },
      gaps: [],
      requires: [],
    };

    const element = renderPresetElement(confirm, components, registry);
    expect(element).not.toBeNull();
    render(element!);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Delete the object?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    const cancelButton = screen.getByText("Cancel").closest("button")!;
    expect(cancelButton).toHaveAttribute("data-variant", "ghost");
    expect(cancelButton).toHaveAttribute("data-size", "32");
    const deleteButton = screen.getByText("Delete").closest("button")!;
    expect(deleteButton).toHaveAttribute("data-variant", "danger");
  });

  it("returns null for a pattern with unresolved gaps, same as renderPreset", () => {
    const blocked: Pattern = {
      id: "blocked-pattern",
      intent: "x",
      match: [],
      compose: { component: "NotYetShipped" },
      parameters: [],
      content: {},
      gaps: ["NotYetShipped"],
      requires: [],
    };
    expect(renderPresetElement(blocked, components, registry)).toBeNull();
  });

  it("returns null when a parameter has no default, same as renderPreset", () => {
    const noDefault: Pattern = {
      id: "no-default",
      intent: "x",
      match: [],
      compose: { component: "Button", props: { size: "{param:size}" } },
      parameters: [{ key: "size", ask: "?", options: [32, 40] }],
      content: {},
      gaps: [],
      requires: [],
    };
    expect(renderPresetElement(noDefault, components, registry)).toBeNull();
  });

  it("D71: a content key satisfied by an icon requirement renders the real icon element, not its prose placeholder", () => {
    const rowActions: Pattern = {
      id: "row-actions",
      intent: "x",
      match: [],
      compose: {
        component: "Toolbar",
        slots: {
          body: [{ component: "Button", content: "trigger-icon" }],
        },
      },
      parameters: [],
      content: { "trigger-icon": "the ellipsis glyph" },
      gaps: [],
      requires: [{ content: "trigger-icon", kind: "icon", name: "IconMoreHorizontal" }],
    };

    const element = renderPresetElement(rowActions, components, registry);
    render(element!);
    expect(screen.getByTestId("icon-more-horizontal")).toBeInTheDocument();
    expect(screen.queryByText("the ellipsis glyph")).not.toBeInTheDocument();
  });

  it("throws when the registry has no component for a name the manifest resolves", () => {
    const usesUnregistered: Pattern = {
      id: "x",
      intent: "x",
      match: [],
      compose: { component: "Toolbar" },
      parameters: [],
      content: {},
      gaps: [],
      requires: [],
    };
    expect(() => renderPresetElement(usesUnregistered, components, {})).toThrow(/no component registered for "Toolbar"/);
  });
});
