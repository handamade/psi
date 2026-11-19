import { describe, expect, it } from "vitest";
import { renderPreset } from "./patterns.js";
import type { Pattern } from "./patterns.js";

const base = (over: Partial<Pattern>): Pattern => ({
  id: "row-actions", intent: "i", match: ["m"], parameters: [], content: {}, gaps: [], requires: [],
  compose: { component: "Button" }, ...over,
});

describe("renderPreset: stateful patterns render a component module (D143)", () => {
  it("renders state, inputs and every binding form", () => {
    const p = base({
      content: { trigger: "Actions", edit: "Edit" },
      state: [{ key: "open", initial: false }],
      inputs: [{ key: "onEdit", type: "() => void" }],
      compose: {
        component: "Menu",
        props: { open: "{state:open}", onClose: "{set:open:false}" },
        slots: {
          trigger: [{ component: "Button", props: { onClick: "{toggle:open}", "aria-expanded": "{state:open}" }, content: "trigger" }],
          body: [{ component: "MenuItem", props: { onSelect: "{input:onEdit}" }, content: "edit" }],
        },
      },
    });
    expect(renderPreset(p, [])).toBe(
`import { useState } from "react";
import { Button, Menu, MenuItem } from "@handamade/psi-react";

export function RowActions({ onEdit }: {
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Menu
      onClose={() => setOpen(false)}
      open={open}
      trigger={<Button aria-expanded={open} onClick={() => setOpen(!open)}>Actions</Button>}
    >
      <MenuItem onSelect={onEdit}>Edit</MenuItem>
    </Menu>
  );
}
`);
  });

  it("omits the react import without state, and the props parameter without inputs", () => {
    const inputsOnly = base({
      id: "destructive-confirm",
      content: { body: "Body" },
      inputs: [{ key: "open", type: "boolean", story: true }, { key: "onClose", type: "() => void" }],
      compose: { component: "Dialog", props: { open: "{input:open}", onClose: "{input:onClose}" }, content: "body" },
    });
    expect(renderPreset(inputsOnly, [])).toBe(
`import { Dialog } from "@handamade/psi-react";

export function DestructiveConfirm({ open, onClose }: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog onClose={onClose} open={open}>Body</Dialog>
  );
}
`);
    const stateOnly = base({
      id: "tabbed-workspace",
      content: { panels: "Panels" },
      state: [{ key: "value", initial: "all" }],
      compose: { component: "Tabs", props: { value: "{state:value}", onValueChange: "{setter:value}" }, content: "panels" },
    });
    expect(renderPreset(stateOnly, [])).toBe(
`import { useState } from "react";
import { Tabs } from "@handamade/psi-react";

export function TabbedWorkspace() {
  const [value, setValue] = useState("all");
  return (
    <Tabs onValueChange={setValue} value={value}>Panels</Tabs>
  );
}
`);
  });

  it("imports every component and icon the tree uses, sorted, and never an intrinsic", () => {
    const p = base({
      content: { icon: "[icon]" },
      requires: [{ content: "icon", kind: "icon", name: "IconMoreHorizontal" }],
      inputs: [{ key: "onChange", type: "() => void" }],
      compose: {
        component: "Toolbar",
        slots: {
          body: [
            { component: "Select", props: { onChange: "{input:onChange}" }, slots: { body: [{ component: "option", props: { value: "10" }, slots: { body: ["10"] } }] } },
            { component: "Button", content: "icon" },
          ],
        },
      },
    });
    expect(renderPreset(p, [])!.split("\n")[0]).toBe(
      'import { Button, IconMoreHorizontal, Select, Toolbar } from "@handamade/psi-react";',
    );
  });

  it("leaves a pattern with neither array a bare element", () => {
    const p = base({ content: { label: "Save" }, compose: { component: "Button", props: { variant: "accent" }, content: "label" } });
    expect(renderPreset(p, [])).toBe('<Button variant="accent">Save</Button>\n');
  });
});
