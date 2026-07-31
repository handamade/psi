// jsdom's default stylesheet forces `display: none` on every `[popover]`
// element (its CSS engine has no real popover-open state, so
// `:not(:popover-open)` always matches regardless of our `data-open`
// polyfill attribute). Testing Library's default role queries filter to the
// accessibility tree, so anything inside an open Menu is invisible to them
// unless `{ hidden: true }` is passed. Task 3 (Menu.test.tsx) hit the same
// limitation and used the same workaround. Each query below that needs it is
// commented at the call site.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Menu } from "./Menu.js";
import { MenuItem } from "./MenuItem.js";
import { MenuSeparator } from "./MenuSeparator.js";
import { Button } from "../Button/Button.js";

const trigger = <Button size={32}>Actions</Button>;

function open(onClose = () => {}, onSelect = () => {}) {
  return render(
    <Menu open onClose={onClose} trigger={trigger} aria-label="Actions">
      <MenuItem onSelect={onSelect}>Rename</MenuItem>
      <MenuSeparator />
      <MenuItem onSelect={onSelect} variant="danger">Delete</MenuItem>
      <MenuItem onSelect={onSelect} disabled>Archive</MenuItem>
    </Menu>,
  );
}

describe("MenuItem", () => {
  it("renders items with role=menuitem", () => {
    open();
    // { hidden: true }: jsdom workaround, see file header.
    expect(screen.getAllByRole("menuitem", { hidden: true })).toHaveLength(3);
  });

  it("clicking an item fires onSelect and closes with 'item-select'", async () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();
    open(onClose, onSelect);
    // { hidden: true }: jsdom workaround, see file header.
    await userEvent.click(screen.getByRole("menuitem", { name: "Rename", hidden: true }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledWith("item-select");
  });

  it("a disabled item is aria-disabled and fires neither callback", async () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();
    open(onClose, onSelect);
    // { hidden: true }: jsdom workaround, see file header.
    const archive = screen.getByRole("menuitem", { name: "Archive", hidden: true });
    expect(archive).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(archive);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("marks the danger variant on the element for styling", () => {
    open();
    // { hidden: true }: jsdom workaround, see file header.
    expect(screen.getByRole("menuitem", { name: "Delete", hidden: true })).toHaveAttribute(
      "data-variant",
      "danger",
    );
  });

  it("renders a separator with role=separator", () => {
    open();
    // { hidden: true }: jsdom workaround, see file header.
    expect(screen.getByRole("separator", { hidden: true })).toBeInTheDocument();
  });
});
