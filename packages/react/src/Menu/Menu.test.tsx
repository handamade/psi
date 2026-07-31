import { useContext, useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Menu, MenuContext } from "./Menu.js";
import type { MenuProps } from "./Menu.js";
import { Button } from "../Button/Button.js";

const trigger = <Button size={32}>Actions</Button>;

const popover = () => document.querySelector("[data-psi-menu]") as HTMLElement;

describe("Menu", () => {
  it("renders the trigger and does not open the popover when open=false", () => {
    render(
      <Menu open={false} onClose={() => {}} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
    expect(popover()).not.toHaveAttribute("data-open");
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
    expect(popover()).toHaveAttribute("data-open");
  });

  // ── Trigger ARIA (D53 review fix): aria-haspopup/aria-expanded belong on
  // the focusable trigger element itself, not on the layout wrapper. On the
  // wrapper — a plain <div> with no role — assistive tech never associates
  // them with the control the user actually focuses. ──

  it("wires aria-haspopup and aria-expanded onto the trigger element itself", () => {
    const { rerender } = render(
      <Menu open={false} onClose={() => {}} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    const btn = screen.getByRole("button", { name: "Actions" });
    expect(btn).toHaveAttribute("aria-haspopup", "menu");
    expect(btn).toHaveAttribute("aria-expanded", "false");
    rerender(
      <Menu open onClose={() => {}} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the anchor wrapper (Task 6's anchor box) free of the trigger ARIA", () => {
    render(
      <Menu open={false} onClose={() => {}} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    const wrapper = document.querySelector("[data-psi-menu-trigger]")!;
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).not.toHaveAttribute("aria-haspopup");
    expect(wrapper).not.toHaveAttribute("aria-expanded");
  });

  it("warns and still renders when trigger is not a single element, instead of crashing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Deliberately violating the prop type — JS consumers can do this.
    const bad = "Actions" as unknown as MenuProps["trigger"];
    expect(() =>
      render(
        <Menu open={false} onClose={() => {}} trigger={bad} aria-label="Actions">
          x
        </Menu>,
      ),
    ).not.toThrow();
    expect(document.querySelector("[data-psi-menu-trigger]")).toHaveTextContent("Actions");
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toMatch(/must be a single React element/);
    warn.mockRestore();
  });

  // ── Dismissal reasons. Menu reports; only the consumer closes (D50). ──

  it("Esc reports onClose('esc') and leaves the popover open", () => {
    const onClose = vi.fn();
    render(
      <Menu open onClose={onClose} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    fireEvent.keyDown(popover(), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledWith("esc");
    // Controlled-only: Menu does not hide itself, the consumer does.
    expect(popover()).toHaveAttribute("data-open");
  });

  it("MenuContext.close reports onClose('item-select') and leaves the popover open", () => {
    const onClose = vi.fn();

    function Item() {
      const { close } = useContext(MenuContext);
      return (
        <button type="button" onClick={() => close("item-select")}>
          Rename
        </button>
      );
    }

    render(
      <Menu open onClose={onClose} trigger={trigger} aria-label="Actions">
        <Item />
      </Menu>,
    );
    // Queried off the DOM rather than by role/name: everything inside the
    // popover inherits jsdom's forced `display: none` on `[popover]` (see the
    // role=menu test above), so it is accessibility-hidden to Testing Library.
    const item = popover().querySelector("button")!;
    expect(item).toHaveTextContent("Rename");
    fireEvent.click(item);

    expect(onClose).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledWith("item-select");
    expect(popover()).toHaveAttribute("data-open");
  });

  it("a native toggle-to-closed with no attributed reason reports 'outside'", () => {
    const onClose = vi.fn();
    render(
      <Menu open onClose={onClose} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    const el = popover();
    el.removeAttribute("data-open");
    fireEvent(el, new Event("toggle"));
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
    const el = screen.getByRole("menu", { hidden: true });
    expect(el).toHaveAttribute("role", "menu");
    expect(el).toHaveAttribute("aria-label", "Row actions");
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

  it("light dismiss (the browser hiding the popover itself) reports 'outside' exactly once", () => {
    const onClose = vi.fn();
    render(
      <Menu open onClose={onClose} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    // What light dismiss looks like from Menu's side: the popover is hidden
    // by the platform, not by us, and the resulting toggle is the first we
    // hear of it. No suppression flag is set on this path.
    popover().hidePopover();
    expect(onClose).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledWith("outside");
  });

  // ── A programmatic close is not a dismissal. When the consumer flips `open`
  // to false, the sync effect's own hidePopover() raises a `toggle`; reporting
  // that as onClose("outside") would invent a dismissal the user never made
  // (and would loop straight back into the consumer's close handler). ──

  it("does not call onClose when the consumer flips open from true to false", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Menu open onClose={onClose} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    rerender(
      <Menu open={false} onClose={onClose} trigger={trigger} aria-label="Actions">
        x
      </Menu>,
    );
    expect(popover()).not.toHaveAttribute("data-open");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("reopening after a consumer-driven close does not swallow the next real dismissal", () => {
    const onClose = vi.fn();
    const view = (open: boolean) => (
      <Menu open={open} onClose={onClose} trigger={trigger} aria-label="Actions">
        x
      </Menu>
    );
    const { rerender } = render(view(true));
    rerender(view(false)); // consumer-driven close — suppressed
    rerender(view(true)); // reopened
    expect(onClose).not.toHaveBeenCalled();

    popover().hidePopover(); // a genuine light dismiss afterwards
    expect(onClose).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledWith("outside");
  });

  it("reports a dismissal exactly once across the full controlled round trip", () => {
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
    // Esc reports "esc"; the consumer's handler flips `open` to false; the
    // sync effect then hides the popover, and that hide must stay silent.
    fireEvent.keyDown(popover(), { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledWith("esc");
    expect(popover()).not.toHaveAttribute("data-open");
  });
});
