import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "./Dialog.js";
import { Button } from "../Button/Button.js";

describe("Dialog", () => {
  it("is closed when open=false and opens via showModal when open=true", () => {
    const { rerender } = render(
      <Dialog open={false} onClose={() => {}} title="T">Body</Dialog>,
    );
    const dialog = document.querySelector("dialog")!;
    expect(dialog.open).toBe(false);
    rerender(<Dialog open onClose={() => {}} title="T">Body</Dialog>);
    expect(dialog.open).toBe(true);
  });

  it("wires aria-labelledby to the rendered title", () => {
    render(<Dialog open onClose={() => {}} title="Delete account?">Body</Dialog>);
    const dialog = screen.getByRole("dialog");
    const heading = screen.getByRole("heading", { name: "Delete account?" });
    expect(dialog).toHaveAttribute("aria-labelledby", heading.id);
  });

  it("Esc (cancel event) calls onClose('esc') and prevents native close", () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="T">Body</Dialog>);
    const dialog = screen.getByRole("dialog");
    fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
    expect(onClose).toHaveBeenCalledWith("esc");
    expect(dialog).toHaveAttribute("open"); // still controlled-open until consumer flips
  });

  it("backdrop click (target === dialog element) calls onClose('backdrop')", () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="T">Body</Dialog>);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledWith("backdrop");
  });

  it("clicks inside the panel do not dismiss", () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="T">Body</Dialog>);
    fireEvent.click(screen.getByText("Body"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("close button calls onClose('close-button')", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="T">Body</Dialog>);
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).toHaveBeenCalledWith("close-button");
  });

  it("dismissible=false renders no close button and swallows Esc + backdrop", () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="T" dismissible={false}>Body</Dialog>);
    expect(screen.queryByRole("button", { name: "Close dialog" })).toBeNull();
    const dialog = screen.getByRole("dialog");
    fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders the footer slot", () => {
    render(
      <Dialog open onClose={() => {}} title="T" footer={<Button variant="danger">Delete</Button>}>
        Body
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("locks body scroll while open and restores on close", () => {
    const { rerender } = render(<Dialog open onClose={() => {}} title="T">B</Dialog>);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<Dialog open={false} onClose={() => {}} title="T">B</Dialog>);
    expect(document.body.style.overflow).toBe("");
  });

  it("applies the width class from the 400|560|720 union", () => {
    render(<Dialog open onClose={() => {}} title="T" width={400}>B</Dialog>);
    expect(screen.getByRole("dialog").className).toContain("w400");
  });
});
