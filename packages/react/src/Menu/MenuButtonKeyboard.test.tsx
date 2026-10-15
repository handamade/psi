// jsdom hides every `[popover]`, so role queries pass `{ hidden: true }`, as in
// useMenuKeyboard.test.tsx.
import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Menu } from "./Menu.js";
import type { MenuProps } from "./Menu.js";
import { MenuItem } from "./MenuItem.js";
import { Button } from "../Button/Button.js";

/** A controlled consumer: its trigger toggles `open`, and every reported
 * dismissal closes the menu. A field after it gives Tab somewhere to go. */
function Controlled({ onClose = vi.fn(), onTriggerClick = vi.fn(), id }: { onClose?: MenuProps["onClose"]; onTriggerClick?: () => void; id?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Menu
        open={open}
        id={id}
        onClose={(reason) => {
          onClose(reason);
          setOpen(false);
        }}
        aria-label="Actions"
        trigger={
          <Button
            size={32}
            onClick={() => {
              onTriggerClick();
              setOpen((o) => !o);
            }}
          >
            Actions
          </Button>
        }
      >
        <MenuItem onSelect={() => {}}>Rename</MenuItem>
        <MenuItem onSelect={() => {}}>Duplicate</MenuItem>
        <MenuItem onSelect={() => {}} disabled>Archive</MenuItem>
        <MenuItem onSelect={() => {}}>Delete</MenuItem>
      </Menu>
      <input aria-label="Search" />
    </>
  );
}

const trigger = () => screen.getByRole("button", { name: "Actions" });
const menu = () => screen.getByRole("menu", { hidden: true });
const item = (name: string) => screen.getByRole("menuitem", { name, hidden: true });

describe("Menu button keyboard (D102)", () => {
  it("names the menu it controls with aria-controls", () => {
    render(<Controlled />);
    const id = menu().id;
    expect(id).not.toBe("");
    expect(trigger()).toHaveAttribute("aria-controls", id);
  });

  it("keeps an id the consumer passes", () => {
    render(<Controlled id="row-actions" />);
    expect(menu()).toHaveAttribute("id", "row-actions");
    expect(trigger()).toHaveAttribute("aria-controls", "row-actions");
  });

  it("Arrow Down on a closed trigger opens the menu on the first item", () => {
    const onTriggerClick = vi.fn();
    render(<Controlled onTriggerClick={onTriggerClick} />);
    trigger().focus();
    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    expect(onTriggerClick).toHaveBeenCalledTimes(1);
    expect(menu()).toHaveAttribute("data-open");
    expect(item("Rename")).toHaveFocus();
  });

  it("Arrow Up on a closed trigger opens the menu on the last enabled item", () => {
    render(<Controlled />);
    trigger().focus();
    fireEvent.keyDown(trigger(), { key: "ArrowUp" });
    expect(menu()).toHaveAttribute("data-open");
    expect(item("Delete")).toHaveFocus();
  });

  it("Arrow Down on the trigger of an open menu does not click it again", () => {
    const onTriggerClick = vi.fn();
    render(<Controlled onTriggerClick={onTriggerClick} />);
    fireEvent.click(trigger());
    expect(onTriggerClick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    expect(onTriggerClick).toHaveBeenCalledTimes(1);
    expect(menu()).toHaveAttribute("data-open");
  });

  it("Tab on an item reports onClose('tab') and leaves the default alone", () => {
    const onClose = vi.fn();
    render(<Controlled onClose={onClose} />);
    fireEvent.click(trigger());
    const tab = fireEvent.keyDown(item("Rename"), { key: "Tab" });
    expect(onClose).toHaveBeenCalledWith("tab");
    expect(tab).toBe(true); // not prevented: focus moves on as the browser moves it
    expect(menu()).not.toHaveAttribute("data-open");
  });

  it("Shift Tab reports onClose('tab') too", () => {
    const onClose = vi.fn();
    render(<Controlled onClose={onClose} />);
    fireEvent.click(trigger());
    fireEvent.keyDown(item("Duplicate"), { key: "Tab", shiftKey: true });
    expect(onClose).toHaveBeenCalledWith("tab");
  });

  it("does not pull focus back to the trigger once Tab has moved it out", () => {
    render(<Controlled />);
    fireEvent.click(trigger());
    const search = screen.getByRole("textbox", { name: "Search" });
    // jsdom does not move focus on Tab; do what the browser does first.
    search.focus();
    fireEvent.keyDown(item("Rename"), { key: "Tab" });
    expect(search).toHaveFocus();
  });
});
