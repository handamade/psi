// D147: Menu's return of focus to its trigger is reported through
// onFocusReturn. { hidden: true } on role queries: jsdom hides [popover]
// content, see useMenuKeyboard.test.tsx's header.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Menu } from "./Menu.js";
import { MenuItem } from "./MenuItem.js";
import { Button } from "../Button/Button.js";
import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";

function Harness({ open, onFocusReturn }: { open: boolean; onFocusReturn?: (e: FocusReturnEvent<"close">) => void }) {
  return (
    <>
      <Menu open={open} onClose={() => {}} onFocusReturn={onFocusReturn} trigger={<Button size={32}>Actions</Button>} aria-label="Actions">
        <MenuItem onSelect={() => {}}>Edit</MenuItem>
      </Menu>
      <input aria-label="Search" />
    </>
  );
}

const trigger = () => screen.getByRole("button", { name: "Actions" });
const item = () => screen.getByRole("menuitem", { name: "Edit", hidden: true });
const search = () => screen.getByLabelText("Search");

describe("Menu: onFocusReturn (D147)", () => {
  it("reports the return to the trigger, then makes it", () => {
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Harness open onFocusReturn={onFocusReturn} />);
    item().focus();
    rerender(<Harness open={false} onFocusReturn={onFocusReturn} />);
    expect(onFocusReturn).toHaveBeenCalledTimes(1);
    const event = onFocusReturn.mock.calls[0][0] as FocusReturnEvent<"close">;
    expect(event.reason).toBe("close");
    expect(event.target).toBe(trigger());
    expect(trigger()).toHaveFocus();
  });

  it("lets the handler take focus elsewhere", () => {
    const take = () => search().focus();
    const { rerender } = render(<Harness open onFocusReturn={take} />);
    item().focus();
    rerender(<Harness open={false} onFocusReturn={take} />);
    expect(search()).toHaveFocus();
  });

  it("moves nothing when the handler prevents it", () => {
    const prevent = (e: FocusReturnEvent<"close">) => e.preventDefault();
    const { rerender } = render(<Harness open onFocusReturn={prevent} />);
    item().focus();
    rerender(<Harness open={false} onFocusReturn={prevent} />);
    expect(trigger()).not.toHaveFocus();
  });

  it("is not called after a light dismiss onto another control", () => {
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Harness open onFocusReturn={onFocusReturn} />);
    search().focus();
    rerender(<Harness open={false} onFocusReturn={onFocusReturn} />);
    expect(onFocusReturn).not.toHaveBeenCalled();
    expect(search()).toHaveFocus();
  });

  it("is not called when focus fell to the page", () => {
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Harness open onFocusReturn={onFocusReturn} />);
    (document.activeElement as HTMLElement | null)?.blur();
    rerender(<Harness open={false} onFocusReturn={onFocusReturn} />);
    expect(onFocusReturn).not.toHaveBeenCalled();
    expect(trigger()).not.toHaveFocus();
  });
});
