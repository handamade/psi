import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ToastProvider } from "./ToastProvider.js";
import { useToast } from "./useToast.js";

/** Renders a button per action so tests drive the hook the way an app does. */
function Harness() {
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => toast.show({ message: "plain" })}>
        plain
      </button>
      <button
        type="button"
        onClick={() => toast.show({ message: "with-action", action: <button type="button">Undo</button> })}
      >
        with-action
      </button>
      <button type="button" onClick={() => toast.clear()}>
        clear
      </button>
    </>
  );
}

const click = (name: string) => act(() => void screen.getByRole("button", { name }).click());
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("ToastProvider", () => {
  it("renders the region even with an empty queue", () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    expect(screen.getByRole("status", { hidden: true })).toBeInTheDocument();
  });

  it("shows a toast and returns a stable id", () => {
    const ids: string[] = [];
    function Capture() {
      const toast = useToast();
      return (
        <button type="button" onClick={() => ids.push(toast.show({ message: "m" }))}>
          go
        </button>
      );
    }
    render(
      <ToastProvider>
        <Capture />
      </ToastProvider>,
    );

    click("go");
    click("go");
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it("auto-dismisses a plain toast after `duration`", () => {
    render(
      <ToastProvider duration={5000}>
        <Harness />
      </ToastProvider>,
    );
    click("plain");
    expect(screen.getByText("plain", { selector: "div" })).toBeInTheDocument();

    advance(4999);
    expect(screen.queryByText("plain", { selector: "div" })).toBeInTheDocument();

    advance(2);
    expect(screen.queryByText("plain", { selector: "div" })).toBeNull();
  });

  it("holds a toast carrying an action for `actionDuration` instead", () => {
    // Asserting both sides of the boundary: still present at the plain
    // duration, gone at the action duration. Otherwise a single implementation
    // bug could satisfy either assertion alone.
    render(
      <ToastProvider duration={5000} actionDuration={10000}>
        <Harness />
      </ToastProvider>,
    );
    click("with-action");

    advance(5001);
    expect(screen.getByText("with-action", { selector: "div" })).toBeInTheDocument();

    advance(5000);
    expect(screen.queryByText("with-action", { selector: "div" })).toBeNull();
  });

  it("evicts the oldest when the queue exceeds `limit`", () => {
    function Seq() {
      const toast = useToast();
      return (
        <>
          {["a", "b", "c", "d"].map((m) => (
            <button key={m} type="button" onClick={() => toast.show({ message: m })}>
              {m}
            </button>
          ))}
        </>
      );
    }
    render(
      <ToastProvider limit={3}>
        <Seq />
      </ToastProvider>,
    );

    click("a");
    click("b");
    click("c");
    click("d");

    expect(screen.queryByText("a", { selector: "div" })).toBeNull(); // oldest evicted
    for (const m of ["b", "c", "d"]) {
      expect(screen.getByText(m, { selector: "div" })).toBeInTheDocument();
    }
  });

  it("dismisses exactly the requested toast by id", () => {
    function Pair() {
      const toast = useToast();
      const idRef = { current: "" };
      return (
        <>
          <button type="button" onClick={() => (idRef.current = toast.show({ message: "keep" }))}>
            first
          </button>
          <button type="button" onClick={() => toast.show({ message: "drop" })}>
            second
          </button>
          <button type="button" onClick={() => toast.dismiss(idRef.current)}>
            kill-first
          </button>
        </>
      );
    }
    render(
      <ToastProvider>
        <Pair />
      </ToastProvider>,
    );

    click("first");
    click("second");
    click("kill-first");

    expect(screen.queryByText("keep", { selector: "div" })).toBeNull();
    expect(screen.getByText("drop", { selector: "div" })).toBeInTheDocument();
  });

  it("clear() empties the queue", () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    click("plain");
    click("plain");
    click("clear");

    expect(screen.queryByText("plain", { selector: "div" })).toBeNull();
  });

  it("pauses every timer while the pointer is over the region", () => {
    render(
      <ToastProvider duration={5000}>
        <Harness />
      </ToastProvider>,
    );
    click("plain");

    const region = screen.getByRole("status", { hidden: true }).parentElement!;
    act(() => void fireEvent.pointerOver(region));

    advance(20000); // far past the duration
    expect(screen.getByText("plain", { selector: "div" })).toBeInTheDocument();

    act(() => void fireEvent.pointerOut(region));
    advance(5001);
    expect(screen.queryByText("plain", { selector: "div" })).toBeNull();
  });

  it("pauses on focus too, so keyboard users get the same extension", () => {
    render(
      <ToastProvider duration={5000}>
        <Harness />
      </ToastProvider>,
    );
    click("plain");

    const region = screen.getByRole("status", { hidden: true }).parentElement!;
    act(() => void fireEvent.focusIn(region));

    advance(20000);
    expect(screen.getByText("plain", { selector: "div" })).toBeInTheDocument();
  });

  it("resumes with the time remaining, not a fresh full duration", () => {
    // The obvious implementation restarts the full duration on resume, which
    // lets a user hold a toast open forever by jiggling the mouse — and makes
    // the pause test above pass for the wrong reason.
    render(
      <ToastProvider duration={5000}>
        <Harness />
      </ToastProvider>,
    );
    click("plain");

    advance(4000); // 1000ms left
    const region = screen.getByRole("status", { hidden: true }).parentElement!;
    act(() => void fireEvent.pointerOver(region));
    advance(10000); // paused — burns nothing
    act(() => void fireEvent.pointerOut(region));

    advance(999);
    expect(screen.getByText("plain", { selector: "div" })).toBeInTheDocument();
    advance(2);
    expect(screen.queryByText("plain", { selector: "div" })).toBeNull();
  });

  it("clears every timer on unmount", () => {
    const { unmount } = render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );
    click("plain");
    click("plain");
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("throws an actionable error when useToast is called outside a provider", () => {
    // A silent no-op would make a missing provider look like a broken toast.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Harness />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
