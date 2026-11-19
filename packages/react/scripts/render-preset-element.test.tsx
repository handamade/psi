import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("creates an intrinsic option as a native <option> (D127)", () => {
    const pattern: Pattern = {
      id: "o", intent: "i", match: [], parameters: [], content: {}, gaps: [], requires: [],
      compose: {
        component: "Toolbar",
        slots: {
          body: [
            { component: "option", props: { value: "10" }, slots: { body: ["10"] } },
            { component: "option", props: { value: "50" }, slots: { body: ["50"] } },
          ],
        },
      },
    };
    const { container } = render(<select>{renderPresetElement(pattern, components, registry)}</select>);
    const opts = container.querySelectorAll("option");
    expect([...opts].map((o) => [o.value, o.textContent])).toEqual([["10", "10"], ["50", "50"]]);
  });
});

describe("renderPresetElement: stateful patterns mount working state (D143)", () => {
  function Trigger({ onClick, "aria-expanded": expanded, children }: { onClick?: () => void; "aria-expanded"?: boolean; children?: React.ReactNode }) {
    return <button aria-expanded={expanded} onClick={onClick}>{children}</button>;
  }
  function Menu({ open, trigger, children }: { open: boolean; trigger: React.ReactNode; children?: React.ReactNode }) {
    return <div>{trigger}{open ? <ul role="menu">{children}</ul> : null}</div>;
  }
  function MenuItem({ onSelect, children }: { onSelect: () => void; children?: React.ReactNode }) {
    return <li role="menuitem" onClick={onSelect}>{children}</li>;
  }
  function Panel({ open, onClose, children }: { open: boolean; onClose: () => void; children?: React.ReactNode }) {
    return open ? <section role="dialog"><button onClick={onClose}>Close</button>{children}</section> : null;
  }
  const registry = { Trigger, Menu, MenuItem, Panel };
  const base = (over: Partial<Pattern>): Pattern => ({
    id: "p", intent: "i", match: ["m"], parameters: [], content: {}, gaps: [], requires: [],
    compose: { component: "Trigger" }, ...over,
  });

  it("toggles a pattern's own state, and a set binding closes it", () => {
    const p = base({
      content: { trigger: "Actions", edit: "Edit" },
      state: [{ key: "open", initial: false }],
      compose: {
        component: "Menu",
        props: { open: "{state:open}" },
        slots: {
          trigger: [{ component: "Trigger", props: { onClick: "{toggle:open}", "aria-expanded": "{state:open}" }, content: "trigger" }],
          body: [{ component: "MenuItem", props: { onSelect: "{set:open:false}" }, content: "edit" }],
        },
      },
    });
    render(renderPresetElement(p, [], registry)!);
    const trigger = screen.getByRole("button", { name: "Actions" });
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("passes a value input its story value and a function input a no-op", () => {
    const p = base({
      content: { body: "Details" },
      inputs: [{ key: "open", type: "boolean", story: true }, { key: "onClose", type: "() => void" }],
      compose: { component: "Panel", props: { open: "{input:open}", onClose: "{input:onClose}" }, content: "body" },
    });
    render(renderPresetElement(p, [], registry)!);
    expect(screen.getByRole("dialog").textContent).toContain("Details");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("returns the same component type for the same pattern, so state survives a re-render", () => {
    const p = base({ content: { t: "T" }, state: [{ key: "open", initial: false }], compose: { component: "Trigger", props: { onClick: "{toggle:open}" }, content: "t" } });
    expect(renderPresetElement(p, [], registry)!.type).toBe(renderPresetElement(p, [], registry)!.type);
  });
});
