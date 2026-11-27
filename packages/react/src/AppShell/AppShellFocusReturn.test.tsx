// D147: the sidebar's hand-back (D142) is reported through onFocusReturn.
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./AppShell.js";
import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";

type Handler = (e: FocusReturnEvent<"sidebar-close">) => void;

function Toggled({ open, motion, onFocusReturn }: { open: boolean; motion: "instant" | "slide"; onFocusReturn?: Handler }) {
  return (
    <AppShell
      sidebarOpen={open}
      sidebarMotion={motion}
      onFocusReturn={onFocusReturn}
      header={<button aria-controls="sidebar">Menu</button>}
      sidebar={<nav aria-label="Main"><a href="#a">Inside</a></nav>}
    >
      <a href="#b">Outside</a>
    </AppShell>
  );
}

const toggle = () => screen.getByRole("button", { name: "Menu" });

describe("AppShell: onFocusReturn (D147)", () => {
  for (const motion of ["instant", "slide"] as const) {
    it(`${motion}: reports the hand-back to the toggle, then makes it`, () => {
      const onFocusReturn = vi.fn();
      const { rerender } = render(<Toggled open motion={motion} onFocusReturn={onFocusReturn} />);
      screen.getByText("Inside").focus();
      rerender(<Toggled open={false} motion={motion} onFocusReturn={onFocusReturn} />);
      expect(onFocusReturn).toHaveBeenCalledTimes(1);
      const event = onFocusReturn.mock.calls[0][0] as FocusReturnEvent<"sidebar-close">;
      expect(event.reason).toBe("sidebar-close");
      expect(event.target).toBe(toggle());
      expect(toggle()).toHaveFocus();
    });

    it(`${motion}: lets the handler take focus elsewhere`, () => {
      const take: Handler = () => screen.getByText("Outside").focus();
      const { rerender } = render(<Toggled open motion={motion} onFocusReturn={take} />);
      screen.getByText("Inside").focus();
      rerender(<Toggled open={false} motion={motion} onFocusReturn={take} />);
      expect(screen.getByText("Outside")).toHaveFocus();
    });

    it(`${motion}: moves nothing when the handler prevents it`, () => {
      const prevent: Handler = (e) => e.preventDefault();
      const { rerender } = render(<Toggled open motion={motion} onFocusReturn={prevent} />);
      screen.getByText("Inside").focus();
      rerender(<Toggled open={false} motion={motion} onFocusReturn={prevent} />);
      expect(toggle()).not.toHaveFocus();
    });
  }

  it("is not called when focus is outside the sidebar", () => {
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Toggled open motion="slide" onFocusReturn={onFocusReturn} />);
    screen.getByText("Outside").focus();
    rerender(<Toggled open={false} motion="slide" onFocusReturn={onFocusReturn} />);
    expect(onFocusReturn).not.toHaveBeenCalled();
  });
});
