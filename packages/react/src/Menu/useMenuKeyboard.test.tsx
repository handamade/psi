// jsdom's default stylesheet forces `display: none` on every `[popover]`
// element (its CSS engine has no real popover-open state, so
// `:not(:popover-open)` always matches regardless of our `data-open`
// polyfill attribute). Testing Library's default role queries filter to the
// accessibility tree, so the menu items are invisible to them unless
// `{ hidden: true }` is passed. Tasks 3 and 4 hit the same limitation and
// used the same workaround; see Menu.test.tsx and MenuItem.test.tsx.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Menu } from "./Menu.js";
import { MenuItem } from "./MenuItem.js";
import { Button } from "../Button/Button.js";

const trigger = <Button size={32}>Actions</Button>;

function openMenu(onClose = () => {}) {
  return render(
    <Menu open onClose={onClose} trigger={trigger} aria-label="Actions">
      <MenuItem onSelect={() => {}}>Rename</MenuItem>
      <MenuItem onSelect={() => {}}>Duplicate</MenuItem>
      <MenuItem onSelect={() => {}} disabled>Archive</MenuItem>
      <MenuItem onSelect={() => {}}>Delete</MenuItem>
    </Menu>,
  );
}

// { hidden: true }: jsdom workaround, see file header.
const items = () => screen.getAllByRole("menuitem", { hidden: true });

describe("useMenuKeyboard", () => {
  it("focuses the first enabled item when the menu opens", () => {
    openMenu();
    expect(items()[0]).toHaveFocus();
  });

  it("ArrowDown moves to the next enabled item, skipping disabled", async () => {
    openMenu();
    await userEvent.keyboard("{ArrowDown}");
    expect(items()[1]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(items()[3]).toHaveFocus(); // Archive (index 2) is disabled
  });

  it("ArrowDown wraps from the last item to the first", async () => {
    openMenu();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(items()[0]).toHaveFocus();
  });

  it("ArrowUp moves backwards and wraps", async () => {
    openMenu();
    await userEvent.keyboard("{ArrowUp}");
    expect(items()[3]).toHaveFocus();
  });

  it("Home and End jump to the first and last enabled items", async () => {
    openMenu();
    await userEvent.keyboard("{End}");
    expect(items()[3]).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(items()[0]).toHaveFocus();
  });

  it("typeahead focuses the first item whose label starts with the typed text", async () => {
    openMenu();
    await userEvent.keyboard("du");
    expect(items()[1]).toHaveFocus();
  });

  it("typeahead skips disabled items", async () => {
    openMenu();
    await userEvent.keyboard("a");
    expect(items()[2]).not.toHaveFocus();
  });

  it("Esc reports the reason and returns focus to the trigger", async () => {
    const onClose = vi.fn();
    openMenu(onClose);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledWith("esc");
    expect(screen.getByRole("button", { name: "Actions" })).toHaveFocus();
  });

  it("only the focused item is in the tab order", async () => {
    openMenu();
    expect(items()[0]).toHaveAttribute("tabindex", "0");
    expect(items()[1]).toHaveAttribute("tabindex", "-1");
    await userEvent.keyboard("{ArrowDown}");
    expect(items()[0]).toHaveAttribute("tabindex", "-1");
    expect(items()[1]).toHaveAttribute("tabindex", "0");
  });
});
