// jsdom's default stylesheet forces `display: none` on every `[popover]`
// element (its CSS engine has no real popover-open state, so
// `:not(:popover-open)` always matches regardless of our `data-open`
// polyfill attribute). Testing Library's default role queries filter to the
// accessibility tree, so the menu items are invisible to them unless
// `{ hidden: true }` is passed. Tasks 3 and 4 hit the same limitation and
// used the same workaround; see Menu.test.tsx and MenuItem.test.tsx.
import { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Menu } from "./Menu.js";
import { MenuItem } from "./MenuItem.js";
import { Button } from "../Button/Button.js";
import type { ReactNode } from "react";

const trigger = <Button size={32}>Actions</Button>;

const defaultItems = (
  <>
    <MenuItem onSelect={() => {}}>Rename</MenuItem>
    <MenuItem onSelect={() => {}}>Duplicate</MenuItem>
    <MenuItem onSelect={() => {}} disabled>Archive</MenuItem>
    <MenuItem onSelect={() => {}}>Delete</MenuItem>
  </>
);

/** An open, *uncontrolled* Menu: `open` is pinned true, so this stands in for
 * a consumer that declines to close (D50 lets it). */
function openMenu(onClose = () => {}, children: ReactNode = defaultItems) {
  return render(
    <Menu open onClose={onClose} trigger={trigger} aria-label="Actions">
      {children}
    </Menu>,
  );
}

/** A properly controlled consumer — it flips `open` to false when Menu
 * reports a dismissal — plus an unrelated focusable control elsewhere on the
 * page, so focus can legitimately be somewhere other than the menu when the
 * close lands. */
function renderControlled(onClose = vi.fn()) {
  function Controlled() {
    const [open, setOpen] = useState(true);
    return (
      <>
        <Menu
          open={open}
          onClose={(reason) => {
            onClose(reason);
            setOpen(false);
          }}
          trigger={trigger}
          aria-label="Actions"
        >
          {defaultItems}
        </Menu>
        <input aria-label="Search" />
      </>
    );
  }
  render(<Controlled />);
  return onClose;
}

// { hidden: true }: jsdom workaround, see file header.
const items = () => screen.getAllByRole("menuitem", { hidden: true });
const popover = () => document.querySelector("[data-psi-menu]") as HTMLElement;
const triggerButton = () => screen.getByRole("button", { name: "Actions" });

/** Types into whatever currently holds focus, one keydown per character —
 * the same path userEvent takes, but synchronous, so it works under fake
 * timers without wiring userEvent's advanceTimers bridge. */
const typeChars = (text: string) => {
  for (const key of text) fireEvent.keyDown(document.activeElement as HTMLElement, { key });
};

afterEach(() => {
  vi.useRealTimers();
});

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

  it("ArrowUp moves to the previous enabled item, skipping disabled", async () => {
    openMenu();
    await userEvent.keyboard("{End}");
    expect(items()[3]).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(items()[1]).toHaveFocus(); // Archive (index 2) is disabled
  });

  it("ArrowUp with no item focused goes to the last item, not the second-to-last", () => {
    openMenu();
    // No item focused: the menu is open but focus sits outside it (the user
    // clicked the page, or an async open raced the focus effect).
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(popover(), { key: "ArrowUp" });
    expect(items()[3]).toHaveFocus();
  });

  it("Home and End jump to the first and last enabled items", async () => {
    openMenu();
    await userEvent.keyboard("{End}");
    expect(items()[3]).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(items()[0]).toHaveFocus();
  });

  it("typeahead accumulates keystrokes into one prefix query", async () => {
    openMenu();
    // Discriminating on purpose: "d" alone lands on Duplicate, so only an
    // implementation that actually accumulates gets to Delete.
    await userEvent.keyboard("de");
    expect(items()[3]).toHaveFocus();
  });

  it("typeahead skips disabled items and matches the next enabled one", async () => {
    openMenu(() => {}, (
      <>
        <MenuItem onSelect={() => {}}>Rename</MenuItem>
        <MenuItem onSelect={() => {}} disabled>Archive</MenuItem>
        <MenuItem onSelect={() => {}}>Archive all</MenuItem>
      </>
    ));
    await userEvent.keyboard("a");
    // Both "Archive" and "Archive all" match; only the enabled one may take
    // focus. Asserting the positive is what makes this test discriminating —
    // "focus is not on the disabled item" would also pass if typeahead did
    // nothing at all and focus simply stayed on Rename.
    expect(items()[2]).toHaveFocus();
    expect(items()[1]).not.toHaveFocus();
  });

  it("typeahead resets the query after the 500ms window lapses", () => {
    vi.useFakeTimers();
    openMenu();

    typeChars("de");
    expect(items()[3]).toHaveFocus(); // "de" → Delete

    vi.advanceTimersByTime(600); // past TYPEAHEAD_RESET_MS
    typeChars("d");
    // Reset: the query is "d" (→ Duplicate), not "ded" (→ no match, focus
    // would have stayed on Delete).
    expect(items()[1]).toHaveFocus();
  });

  it("Esc reports the reason and, once the consumer closes, returns focus to the trigger", async () => {
    const onClose = renderControlled();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledWith("esc");
    expect(triggerButton()).toHaveFocus();
  });

  it("Esc leaves focus in the menu when the consumer declines to close", async () => {
    const onClose = vi.fn();
    openMenu(onClose); // `open` stays true — the consumer declined
    await userEvent.keyboard("{ArrowDown}");
    expect(items()[1]).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledWith("esc");
    // The menu is still open and still interactive, so focus must not leave
    // it: outside the popover, arrow keys stop reaching the handler and a
    // second Escape is taken by the platform's close watcher, resurfacing as
    // onClose("outside").
    expect(items()[1]).toHaveFocus();
    expect(triggerButton()).not.toHaveFocus();

    // Proof that the menu is still navigable after Esc.
    await userEvent.keyboard("{Home}");
    expect(items()[0]).toHaveFocus();
  });

  it("does not steal focus back to the trigger after a light dismiss", () => {
    const onClose = renderControlled();
    const search = screen.getByRole("textbox", { name: "Search" });

    // What light dismiss looks like from React's side: the platform hides the
    // popover and moves focus to whatever the user clicked, *then* tells us
    // via `toggle`. The consumer flips `open` in response — and the resulting
    // effect cleanup must not yank focus off the control the user just chose.
    search.focus();
    popover().removeAttribute("data-open");
    fireEvent(popover(), new Event("toggle"));

    expect(onClose).toHaveBeenCalledWith("outside");
    expect(search).toHaveFocus();
    expect(triggerButton()).not.toHaveFocus();
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
