import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { useAnchoredPopup } from "./useAnchoredPopup.js";
import type { PopupMode } from "./useAnchoredPopup.js";

function Harness({
  open,
  mode,
  onDismiss,
}: {
  open: boolean;
  mode: PopupMode;
  onDismiss: (reason: "outside") => void;
}) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const props = useAnchoredPopup({ popoverRef, anchorRef, open, mode, onDismiss });
  return (
    <>
      <div ref={anchorRef} data-testid="anchor">
        <input data-testid="input" />
      </div>
      <div ref={popoverRef} data-testid="popup" {...props}>
        <span data-testid="inside">option</span>
      </div>
      <button type="button" data-testid="outside">elsewhere</button>
    </>
  );
}

describe("useAnchoredPopup", () => {
  it("sets the popover attribute from the mode", () => {
    const { getByTestId, rerender } = render(<Harness open={false} mode="auto" onDismiss={() => {}} />);
    expect(getByTestId("popup")).toHaveAttribute("popover", "auto");
    rerender(<Harness open={false} mode="manual" onDismiss={() => {}} />);
    expect(getByTestId("popup")).toHaveAttribute("popover", "manual");
  });

  it("shows and hides the popover with open, and an owner's close reports nothing", () => {
    const onDismiss = vi.fn();
    const { getByTestId, rerender } = render(<Harness open={false} mode="manual" onDismiss={onDismiss} />);
    rerender(<Harness open mode="manual" onDismiss={onDismiss} />);
    expect(getByTestId("popup")).toHaveAttribute("data-open");
    rerender(<Harness open={false} mode="manual" onDismiss={onDismiss} />);
    expect(getByTestId("popup")).not.toHaveAttribute("data-open");
    expect(onDismiss).not.toHaveBeenCalled();
  });

  describe("manual mode", () => {
    it("reports a pointerdown outside the popup and the anchor", () => {
      const onDismiss = vi.fn();
      const { getByTestId } = render(<Harness open mode="manual" onDismiss={onDismiss} />);
      fireEvent.pointerDown(getByTestId("outside"));
      expect(onDismiss).toHaveBeenCalledExactlyOnceWith("outside");
    });

    it("ignores a pointerdown in the popup or in the anchor", () => {
      const onDismiss = vi.fn();
      const { getByTestId } = render(<Harness open mode="manual" onDismiss={onDismiss} />);
      fireEvent.pointerDown(getByTestId("inside"));
      fireEvent.pointerDown(getByTestId("input"));
      expect(onDismiss).not.toHaveBeenCalled();
    });

    it("reports nothing while closed", () => {
      const onDismiss = vi.fn();
      const { getByTestId } = render(<Harness open={false} mode="manual" onDismiss={onDismiss} />);
      fireEvent.pointerDown(getByTestId("outside"));
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  it("auto mode leaves an outside pointerdown to the platform", () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<Harness open mode="auto" onDismiss={onDismiss} />);
    fireEvent.pointerDown(getByTestId("outside"));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("auto mode reports a platform close of an open popup as outside", () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<Harness open mode="auto" onDismiss={onDismiss} />);
    // What light dismiss does: the browser hides the popover, then toggles.
    const popup = getByTestId("popup");
    popup.removeAttribute("data-open");
    popup.dispatchEvent(new Event("toggle"));
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith("outside");
  });
});
