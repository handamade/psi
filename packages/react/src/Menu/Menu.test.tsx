import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Menu } from "./Menu.js";
import type { MenuProps } from "./Menu.js";
import { Button } from "../Button/Button.js";

const trigger = <Button size={32}>Actions</Button>;

describe("Menu", () => {
  it("renders the trigger and does not open the popover when open=false", () => {
    render(
      <Menu open={false} onClose={() => {}} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
    expect(document.querySelector("[data-psi-menu]")).not.toHaveAttribute("data-open");
  });

  it("calls showPopover when open flips to true", () => {
    const { rerender } = render(
      <Menu open={false} onClose={() => {}} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    rerender(
      <Menu open onClose={() => {}} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    expect(document.querySelector("[data-psi-menu]")).toHaveAttribute("data-open");
  });

  it("wires aria-haspopup and aria-expanded onto the trigger", () => {
    const { rerender } = render(
      <Menu open={false} onClose={() => {}} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    const btn = screen.getByRole("button", { name: "Actions" });
    expect(btn.closest("[data-psi-menu-trigger]")).toHaveAttribute("aria-haspopup", "menu");
    expect(btn.closest("[data-psi-menu-trigger]")).toHaveAttribute("aria-expanded", "false");
    rerender(
      <Menu open onClose={() => {}} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    expect(btn.closest("[data-psi-menu-trigger]")).toHaveAttribute("aria-expanded", "true");
  });

  it("Esc calls onClose('esc')", () => {
    const onClose = vi.fn();
    render(
      <Menu open onClose={onClose} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    fireEvent.keyDown(document.querySelector("[data-psi-menu]")!, { key: "Escape" });
    expect(onClose).toHaveBeenCalledWith("esc");
  });

  it("a native toggle-to-closed with no attributed reason reports 'outside'", () => {
    const onClose = vi.fn();
    render(
      <Menu open onClose={onClose} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    const popover = document.querySelector("[data-psi-menu]")!;
    popover.removeAttribute("data-open");
    fireEvent(popover, new Event("toggle"));
    expect(onClose).toHaveBeenCalledWith("outside");
  });

  it("applies role=menu and the accessible name", () => {
    render(
      <Menu open onClose={() => {}} trigger={trigger} aria-label="Row actions">
        x
      </Menu>,
    );
    // Not screen.getByRole("menu", { name }): jsdom's own default stylesheet
    // forces `display: none` on every `[popover]` element (its CSS engine
    // has no real popover-open state, so `:not(:popover-open)` always
    // matches, regardless of our `data-open` polyfill attribute — verified
    // independently by reading computed style off a bare `[popover]`
    // element in this jsdom version). The accessible-name algorithm then
    // short-circuits hidden nodes to "", even with `{ hidden: true }` on the
    // query (that option only widens which roles are considered, not name
    // computation). So role and name are asserted directly here; in a real
    // browser, where popover="auto" genuinely renders in the top layer,
    // getByRole("menu", { name }) finds it as expected.
    const popover = screen.getByRole("menu", { hidden: true });
    expect(popover).toHaveAttribute("role", "menu");
    expect(popover).toHaveAttribute("aria-label", "Row actions");
  });

  // ── The `toggle` contract (Task 2's polyfill dispatches it; Task 3 is the
  // first consumer, so these assertions are load-bearing, not incidental). ──

  it("does not call onClose when showPopover's own toggle fires on open", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Menu open={false} onClose={onClose} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    rerender(
      <Menu open onClose={onClose} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calling hidePopover directly (simulating a browser-driven close) fires toggle and reports 'outside' exactly once", () => {
    const onClose = vi.fn();
    render(
      <Menu open onClose={onClose} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    const popover = document.querySelector("[data-psi-menu]") as HTMLElement & {
      hidePopover: () => void;
    };
    popover.hidePopover();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith("outside");
  });

  // ── The double-onClose risk: Esc (or item-select) attributes a reason and
  // closes the popover; the consumer's onClose flips `open` to false; Menu's
  // sync effect then observes the popover already closed. If the effect were
  // to call hidePopover() again — or if the attributed reason were only
  // cleared by the toggle handler and not consulted before that second call —
  // onClose would fire twice for a single dismissal. It must fire exactly
  // once, with the reason attributed at the point of dismissal.
  it("does not double-report a dismissal when the consumer's onClose flips the controlled open prop to false", () => {
    const onClose = vi.fn();

    function Controlled(props: Pick<MenuProps, "trigger">) {
      const [open, setOpen] = useState(true);
      return (
        <Menu
          open={open}
          onClose={(reason) => {
            onClose(reason);
            setOpen(false);
          }}
          trigger={props.trigger}
          aria-label="Actions"
        >
          x
        </Menu>
      );
    }

    render(<Controlled trigger={trigger} />);
    fireEvent.keyDown(document.querySelector("[data-psi-menu]")!, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith("esc");
  });
});
