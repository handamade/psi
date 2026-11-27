// D147: ToastRegion's hand-back is seen, declined or redirected through
// onFocusReturn, and a removal the consumer already handled leaves no stale
// state behind. { hidden: true } is not needed: no role queries.
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Toast } from "./Toast.js";
import { ToastRegion } from "./ToastRegion.js";
import type { FocusReturnEvent } from "../internal/focus/focusReturn.js";

function Stack({ ids, onFocusReturn }: { ids: string[]; onFocusReturn?: (e: FocusReturnEvent<"toast-removed">) => void }) {
  return (
    <>
      <button>Opener</button>
      <input aria-label="Elsewhere" />
      <ToastRegion onFocusReturn={onFocusReturn}>
        {ids.map((id) => (
          <Toast key={id} onDismiss={() => {}}>
            {id}
          </Toast>
        ))}
      </ToastRegion>
    </>
  );
}

const dismissOf = (id: string) =>
  screen.getByText(id).closest("[data-psi-toast]")!.querySelector("[data-psi-toast-dismiss]") as HTMLElement;
const opener = () => screen.getByText("Opener");
const elsewhere = () => screen.getByLabelText("Elsewhere");

function enterFromOpener(target: HTMLElement) {
  opener().focus();
  target.focus();
}

describe("ToastRegion: onFocusReturn (D147)", () => {
  it("reports the hand-back with its target and reason, then makes it", async () => {
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Stack ids={["A", "B"]} onFocusReturn={onFocusReturn} />);
    enterFromOpener(dismissOf("A"));
    rerender(<Stack ids={["B"]} onFocusReturn={onFocusReturn} />);
    await waitFor(() => expect(dismissOf("B")).toHaveFocus());
    expect(onFocusReturn).toHaveBeenCalledTimes(1);
    const event = onFocusReturn.mock.calls[0][0] as FocusReturnEvent<"toast-removed">;
    expect(event.reason).toBe("toast-removed");
    expect(event.target === dismissOf("B")).toBe(true);
  });

  it("lets the handler take focus elsewhere", async () => {
    const { rerender } = render(<Stack ids={["A", "B"]} onFocusReturn={() => elsewhere().focus()} />);
    enterFromOpener(dismissOf("A"));
    rerender(<Stack ids={["B"]} onFocusReturn={() => elsewhere().focus()} />);
    await waitFor(() => expect(elsewhere()).toHaveFocus());
  });

  it("moves nothing when the handler prevents it", async () => {
    const prevent = (e: FocusReturnEvent<"toast-removed">) => e.preventDefault();
    const { rerender } = render(<Stack ids={["A", "B"]} onFocusReturn={prevent} />);
    enterFromOpener(dismissOf("A"));
    rerender(<Stack ids={["B"]} onFocusReturn={prevent} />);
    await Promise.resolve();
    await Promise.resolve();
    expect(dismissOf("B")).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });

  it("is not called when focus had already gone elsewhere", async () => {
    const onFocusReturn = vi.fn();
    const { rerender } = render(<Stack ids={["A", "B"]} onFocusReturn={onFocusReturn} />);
    enterFromOpener(dismissOf("A"));
    elsewhere().focus();
    rerender(<Stack ids={["B"]} onFocusReturn={onFocusReturn} />);
    await Promise.resolve();
    expect(onFocusReturn).not.toHaveBeenCalled();
    expect(elsewhere()).toHaveFocus();
  });
});

describe("ToastRegion: a removal the consumer handled leaves no stale state", () => {
  it("does not move focus to a later toast", async () => {
    const { rerender } = render(<Stack ids={["A"]} />);
    enterFromOpener(dismissOf("A"));
    // The consumer's commit: the toast goes and focus moves, before the
    // region's observer runs (no await between the two lines).
    rerender(<Stack ids={[]} />);
    elsewhere().focus();
    await Promise.resolve();
    await Promise.resolve();
    expect(elsewhere()).toHaveFocus();
    // Later, focus falls to the page and a new toast arrives.
    elsewhere().blur();
    rerender(<Stack ids={["B"]} />);
    await Promise.resolve();
    await Promise.resolve();
    expect(document.body).toHaveFocus();
  });

  it("forgets the opener when the handler prevented the hand-back", async () => {
    const prevent = (e: FocusReturnEvent<"toast-removed">) => e.preventDefault();
    const { rerender } = render(<Stack ids={["A"]} onFocusReturn={prevent} />);
    enterFromOpener(dismissOf("A"));
    rerender(<Stack ids={[]} onFocusReturn={prevent} />);
    await Promise.resolve();
    await Promise.resolve();
    expect(document.body).toHaveFocus();
    // A new toast is entered from the page (no relatedTarget), then dismissed
    // by pointer: focus must not go to the opener of the earlier toast.
    rerender(<Stack ids={["B"]} onFocusReturn={prevent} />);
    fireEvent.pointerDown(dismissOf("B"));
    dismissOf("B").focus();
    rerender(<Stack ids={[]} />);
    await Promise.resolve();
    await Promise.resolve();
    expect(opener()).not.toHaveFocus();
  });
});
