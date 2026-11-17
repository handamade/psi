// D131: a re-render that removes the focused item keeps focus in the menu.
// { hidden: true } on role queries: jsdom hides [popover] content, see
// useMenuKeyboard.test.tsx's header.
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Menu } from "./Menu.js";
import { MenuItem } from "./MenuItem.js";
import { Button } from "../Button/Button.js";

function Harness({ labels, onClose = () => {} }: { labels: string[]; onClose?: () => void }) {
  return (
    <>
      <Menu open onClose={onClose} trigger={<Button size={32}>Actions</Button>} aria-label="Actions">
        {labels.map((label) => (
          <MenuItem key={label} onSelect={() => {}}>
            {label}
          </MenuItem>
        ))}
      </Menu>
      <input aria-label="Search" />
    </>
  );
}

const item = (name: string) => screen.getByRole("menuitem", { name, hidden: true });
const menu = () => document.querySelector("[data-psi-menu]") as HTMLElement;

describe("Menu: removing the focused item (D131)", () => {
  it("keeps focus on an item that survives the re-render", async () => {
    const { rerender } = render(<Harness labels={["Edit", "Duplicate", "Delete"]} />);
    item("Duplicate").focus();
    rerender(<Harness labels={["Duplicate", "Delete"]} />);
    await Promise.resolve();
    expect(item("Duplicate")).toHaveFocus();
  });

  it("moves focus to the item now at the same position", async () => {
    const { rerender } = render(<Harness labels={["Edit", "Duplicate", "Delete"]} />);
    item("Duplicate").focus();
    rerender(<Harness labels={["Edit", "Delete"]} />);
    await waitFor(() => expect(item("Delete")).toHaveFocus());
    expect(item("Delete")).toHaveAttribute("tabindex", "0");
  });

  it("moves focus to the new last item when the last one goes", async () => {
    const { rerender } = render(<Harness labels={["Edit", "Duplicate", "Delete"]} />);
    item("Delete").focus();
    rerender(<Harness labels={["Edit", "Duplicate"]} />);
    await waitFor(() => expect(item("Duplicate")).toHaveFocus());
  });

  it("focuses the menu itself when its only item goes, so Esc still reports esc", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<Harness labels={["Edit"]} onClose={onClose} />);
    expect(item("Edit")).toHaveFocus();
    rerender(<Harness labels={[]} onClose={onClose} />);
    await waitFor(() => expect(menu()).toHaveFocus());
    expect(menu()).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(menu(), { key: "Escape" });
    expect(onClose).toHaveBeenCalledExactlyOnceWith("esc");
  });

  it("leaves focus alone when the user had already moved it out of the menu", async () => {
    const { rerender } = render(<Harness labels={["Edit", "Duplicate", "Delete"]} />);
    item("Duplicate").focus();
    const search = screen.getByRole("textbox", { name: "Search" });
    search.focus();
    rerender(<Harness labels={["Edit", "Delete"]} />);
    await Promise.resolve();
    await Promise.resolve();
    expect(search).toHaveFocus();
  });
});
