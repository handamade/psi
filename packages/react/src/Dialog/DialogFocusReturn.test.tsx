// packages/react/src/Dialog/DialogFocusReturn.test.tsx
// D147: Dialog reports the platform's focus restore through onFocusReturn,
// after close(). jsdom restores nothing, so close() is spied to do what the
// platform does: return focus to the opener.
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dialog } from "./Dialog.js";
import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";

type Handler = (e: FocusReturnEvent<"close" | "unmount">) => void;

function Page({ open, show = true, onFocusReturn }: { open: boolean; show?: boolean; onFocusReturn?: Handler }) {
  return (
    <>
      <button>Opener</button>
      <button>Other</button>
      {show && (
        <Dialog open={open} onClose={() => {}} title="T" onFocusReturn={onFocusReturn}>
          <button>Inside</button>
        </Dialog>
      )}
    </>
  );
}

const opener = () => screen.getByRole("button", { name: "Opener" });
const other = () => screen.getByRole("button", { name: "Other" });
const inside = () => screen.getByText("Inside");

function restoreToOpener() {
  return vi.spyOn(HTMLDialogElement.prototype, "close").mockImplementation(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    opener().focus();
  });
}

afterEach(() => vi.restoreAllMocks());

describe("Dialog: onFocusReturn (D147)", () => {
  it("reports a controlled close after the platform's restore", () => {
    restoreToOpener();
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Page open onFocusReturn={onFocusReturn} />);
    inside().focus();
    rerender(<Page open={false} onFocusReturn={onFocusReturn} />);
    expect(onFocusReturn).toHaveBeenCalledTimes(1);
    const event = onFocusReturn.mock.calls[0][0] as FocusReturnEvent<"close" | "unmount">;
    expect(event.reason).toBe("close");
    expect(event.target).toBe(opener());
    expect(opener()).toHaveFocus();
  });

  it("reports a removal while open as unmount", () => {
    restoreToOpener();
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Page open onFocusReturn={onFocusReturn} />);
    inside().focus();
    rerender(<Page open show={false} onFocusReturn={onFocusReturn} />);
    expect(onFocusReturn).toHaveBeenCalledTimes(1);
    const event = onFocusReturn.mock.calls[0][0] as FocusReturnEvent<"close" | "unmount">;
    expect(event.reason).toBe("unmount");
    expect(event.target).toBe(opener());
  });

  it("lets the handler take focus elsewhere", () => {
    restoreToOpener();
    const take: Handler = () => other().focus();
    const { rerender } = render(<Page open onFocusReturn={take} />);
    inside().focus();
    rerender(<Page open={false} onFocusReturn={take} />);
    expect(other()).toHaveFocus();
  });

  it("treats preventDefault as a no-op: the platform has already moved focus", () => {
    restoreToOpener();
    const prevent: Handler = (e) => e.preventDefault();
    const { rerender } = render(<Page open onFocusReturn={prevent} />);
    inside().focus();
    rerender(<Page open={false} onFocusReturn={prevent} />);
    expect(opener()).toHaveFocus();
  });

  it("is not called when focus was not in the dialog", () => {
    restoreToOpener();
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Page open onFocusReturn={onFocusReturn} />);
    other().focus();
    rerender(<Page open={false} onFocusReturn={onFocusReturn} />);
    expect(onFocusReturn).not.toHaveBeenCalled();
  });
});
