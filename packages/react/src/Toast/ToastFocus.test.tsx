// D136: a toast that held focus does not drop it to the page when it goes.
// Focus moves to the toast now at its position (the new last, if it was
// last), then back to the element focused before the region, then to the
// region itself. A pointer dismissal goes back first. { hidden: true } on role
// queries: jsdom hides [popover] content, see ToastRegion.test.tsx's header.
// The browser-truth half is apps/storybook/vr/toast-focus.interaction.spec.ts.
import { describe, it, expect } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Toast } from "./Toast.js";
import { ToastProvider } from "./ToastProvider.js";
import { ToastRegion } from "./ToastRegion.js";
import { useToast } from "./useToast.js";
import type { ToastHandle } from "./useToast.js";

interface Item {
  id: string;
  dismiss?: boolean;
}

function Stack({ items, opener = true }: { items: Item[]; opener?: boolean }) {
  return (
    <>
      {opener && <button>Opener</button>}
      <input aria-label="Elsewhere" />
      <ToastRegion>
        {items.map((t) => (
          <Toast key={t.id} onDismiss={t.dismiss === false ? undefined : () => {}}>
            {t.id}
          </Toast>
        ))}
      </ToastRegion>
    </>
  );
}

const items = (...ids: string[]): Item[] => ids.map((id) => ({ id }));
const dismissOf = (id: string) =>
  screen.getByText(id).closest("[data-psi-toast]")!.querySelector("[data-psi-toast-dismiss]") as HTMLElement;
const opener = () => screen.getByRole("button", { name: "Opener" });
const region = () => document.querySelector("[data-psi-toast-region]") as HTMLElement;

/** Enter the region from the opener, as Tab does: focusin carries the opener
 * as relatedTarget. */
function enterFromOpener(target: HTMLElement) {
  opener().focus();
  target.focus();
}

describe("ToastRegion: a removed toast that held focus (D136)", () => {
  it("marks the dismiss button and makes the region focusable by script only", () => {
    render(<Stack items={items("A")} />);
    expect(dismissOf("A")).toHaveAttribute("aria-label", "Dismiss notification");
    expect(region()).toHaveAttribute("tabindex", "-1");
  });

  it("moves focus to the toast now at the same position", async () => {
    const { rerender } = render(<Stack items={items("A", "B", "C")} />);
    enterFromOpener(dismissOf("B"));
    rerender(<Stack items={items("A", "C")} />);
    await waitFor(() => expect(dismissOf("C")).toHaveFocus());
  });

  it("moves focus to the new last toast when the last one goes", async () => {
    const { rerender } = render(<Stack items={items("A", "B", "C")} />);
    enterFromOpener(dismissOf("C"));
    rerender(<Stack items={items("A", "B")} />);
    await waitFor(() => expect(dismissOf("B")).toHaveFocus());
  });

  it("passes over a toast with nothing to focus", async () => {
    const { rerender } = render(
      <Stack items={[{ id: "A" }, { id: "B", dismiss: false }, { id: "C" }]} />,
    );
    enterFromOpener(dismissOf("A"));
    rerender(<Stack items={[{ id: "B", dismiss: false }, { id: "C" }]} />);
    await waitFor(() => expect(dismissOf("C")).toHaveFocus());
  });

  it("returns focus to the element before the region when the stack empties", async () => {
    const { rerender } = render(<Stack items={items("A")} />);
    enterFromOpener(dismissOf("A"));
    rerender(<Stack items={[]} />);
    await waitFor(() => expect(opener()).toHaveFocus());
  });

  it("focuses the region when the element before it has gone too", async () => {
    const { rerender } = render(<Stack items={items("A")} />);
    enterFromOpener(dismissOf("A"));
    rerender(<Stack items={items("A")} opener={false} />);
    rerender(<Stack items={[]} opener={false} />);
    await waitFor(() => expect(region()).toHaveFocus());
  });

  it("leaves focus alone when the user moved it out of the region first", async () => {
    const { rerender } = render(<Stack items={items("A", "B")} />);
    enterFromOpener(dismissOf("A"));
    const elsewhere = screen.getByRole("textbox", { name: "Elsewhere" });
    elsewhere.focus();
    rerender(<Stack items={items("B")} />);
    await act(async () => {});
    expect(elsewhere).toHaveFocus();
  });

  it("does not take focus back after a blur to nothing", async () => {
    const { rerender } = render(<Stack items={items("A", "B")} />);
    enterFromOpener(dismissOf("A"));
    dismissOf("A").blur();
    await act(async () => {});
    rerender(<Stack items={items("B")} />);
    await act(async () => {});
    expect(document.body).toHaveFocus();
  });

  it("sends a pointer dismissal back to the element before the region", async () => {
    const { rerender } = render(<Stack items={items("A", "B")} />);
    enterFromOpener(dismissOf("A"));
    fireEvent.pointerDown(dismissOf("A"));
    rerender(<Stack items={items("B")} />);
    await waitFor(() => expect(opener()).toHaveFocus());
  });

  it("keeps a keyboard dismissal in the stack after an earlier pointer press", async () => {
    const { rerender } = render(<Stack items={items("A", "B")} />);
    enterFromOpener(dismissOf("A"));
    fireEvent.pointerDown(dismissOf("A"));
    fireEvent.keyDown(dismissOf("A"), { key: "Enter" });
    rerender(<Stack items={items("B")} />);
    await waitFor(() => expect(dismissOf("B")).toHaveFocus());
  });
});

describe("ToastProvider: dismiss(id) on the focused toast (D136)", () => {
  it("hands focus to the next toast's dismiss button", async () => {
    let handle!: ToastHandle;
    function Grab() {
      handle = useToast();
      return <button>Opener</button>;
    }
    render(
      <ToastProvider duration={600000}>
        <Grab />
      </ToastProvider>,
    );
    let first = "";
    act(() => {
      first = handle.show({ message: "One" });
      handle.show({ message: "Two" });
    });
    enterFromOpener(dismissOf("One"));
    act(() => handle.dismiss(first));
    await waitFor(() => expect(dismissOf("Two")).toHaveFocus());
  });
});
