import { createRef, useEffect, useRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, within } from "@testing-library/react";
import { ToastProvider } from "./ToastProvider.js";
import { useToast } from "./useToast.js";
import type { ToastHandle, ToastOptions } from "./useToast.js";

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

/** Calls `run` with the hook's handle once, after mount — the way an app
 * reacts to an outcome rather than to a click. */
function Probe({ run }: { run: (toast: ToastHandle) => void }) {
  const toast = useToast();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    run(toast);
  }, [run, toast]);
  return null;
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

  describe("politeness and statusLabel through show() (D83)", () => {
    function Raise({ options }: { options: ToastOptions }) {
      const toast = useToast();
      return (
        <button type="button" onClick={() => toast.show(options)}>
          raise
        </button>
      );
    }
    const raise = (options: ToastOptions) => {
      render(
        <ToastProvider>
          <Raise options={options} />
        </ToastProvider>,
      );
      click("raise");
    };

    it("routes a success toast to the alert wrapper when asked", () => {
      raise({ variant: "success", message: "Accepted", politeness: "assertive" });
      expect(within(screen.getByRole("alert", { hidden: true })).getByText("Accepted")).toBeInTheDocument();
      expect(screen.getByRole("status", { hidden: true })).toBeEmptyDOMElement();
    });

    it("keeps routing by variant when politeness is not given", () => {
      raise({ variant: "success", message: "Saved" });
      expect(within(screen.getByRole("status", { hidden: true })).getByText("Saved")).toBeInTheDocument();
    });

    it("replaces the status word", () => {
      raise({ variant: "danger", message: "Nicht gespeichert", statusLabel: "Fehler:" });
      expect(screen.getByText("Fehler:")).toBeInTheDocument();
      expect(screen.queryByText("Error:")).toBeNull();
    });

    it("drops the status word on null", () => {
      raise({ variant: "danger", message: "first", statusLabel: null });
      expect(screen.queryByText("Error:")).toBeNull();
    });

    it("keeps the default status word when statusLabel is not given", () => {
      raise({ variant: "danger", message: "second" });
      expect(screen.getByText("Error:")).toBeInTheDocument();
    });
  });

  describe("announce() (D91)", () => {
    const status = () => screen.getByRole("status", { hidden: true });
    const alert = () => screen.getByRole("alert", { hidden: true });

    it("announce() renders an Announcement in the wrapper its politeness names, and no Toast (D91)", () => {
      render(
        <ToastProvider>
          <Probe run={(t) => t.announce("Saved", { politeness: "assertive" })} />
        </ToastProvider>,
      );
      expect(within(alert()).getByText("Saved")).toBeInTheDocument();
      expect(within(alert()).getByText("Saved")).toHaveAttribute("data-psi-announcement");
      expect(status()).toBeEmptyDOMElement();
      expect(document.querySelector("[data-psi-toast]")).toBeNull();
    });

    it("defaults to the polite wrapper", () => {
      render(
        <ToastProvider>
          <Probe run={(t) => t.announce("Row 12 updated")} />
        </ToastProvider>,
      );
      expect(within(status()).getByText("Row 12 updated")).toBeInTheDocument();
      expect(alert()).toBeEmptyDOMElement();
    });

    it("an announcement leaves after its dwell (D91)", () => {
      render(
        <ToastProvider>
          <Probe run={(t) => t.announce("Saved")} />
        </ToastProvider>,
      );
      expect(screen.getByText("Saved")).toBeInTheDocument();
      advance(999);
      expect(screen.getByText("Saved")).toBeInTheDocument();
      advance(1);
      expect(screen.queryByText("Saved")).toBeNull();
    });

    it("a later announcement of the same politeness does not remove the earlier one early", () => {
      function Twice() {
        const toast = useToast();
        return (
          <>
            <button type="button" onClick={() => toast.announce("first")}>
              first
            </button>
            <button type="button" onClick={() => toast.announce("second")}>
              second
            </button>
          </>
        );
      }
      render(
        <ToastProvider>
          <Twice />
        </ToastProvider>,
      );
      click("first");
      advance(500);
      click("second");
      expect(within(status()).getByText("first")).toBeInTheDocument();
      expect(within(status()).getByText("second")).toBeInTheDocument();

      advance(500); // the first's dwell is over, the second's is not
      expect(screen.queryByText("first", { selector: "div" })).toBeNull();
      expect(within(status()).getByText("second")).toBeInTheDocument();

      advance(500);
      expect(screen.queryByText("second", { selector: "div" })).toBeNull();
    });

    it("announcements never evict a visible toast through the limit (D91)", () => {
      render(
        <ToastProvider limit={1}>
          <Probe
            run={(t) => {
              t.show({ message: "Kept" });
              t.announce("a");
              t.announce("b");
            }}
          />
        </ToastProvider>,
      );
      expect(screen.getByText("Kept")).toBeInTheDocument();
      expect(screen.getByText("a")).toBeInTheDocument();
      expect(screen.getByText("b")).toBeInTheDocument();
    });

    it("returns an id that dismiss() accepts", () => {
      const ids: string[] = [];
      let handle: ToastHandle | undefined;
      render(
        <ToastProvider>
          <Probe
            run={(t) => {
              handle = t;
              ids.push(t.show({ message: "toast" }));
              ids.push(t.announce("spoken"));
            }}
          />
        </ToastProvider>,
      );
      expect(new Set(ids).size).toBe(2); // one sequence across both kinds
      act(() => handle!.dismiss(ids[1]!));
      expect(screen.queryByText("spoken")).toBeNull();
      expect(screen.getByText("toast", { selector: "div" })).toBeInTheDocument();
    });

    it("clear() removes announcements as well as toasts, with their timers", () => {
      let handle: ToastHandle | undefined;
      render(
        <ToastProvider>
          <Probe
            run={(t) => {
              handle = t;
              t.show({ message: "toast" });
              t.announce("spoken");
            }}
          />
        </ToastProvider>,
      );
      expect(vi.getTimerCount()).toBe(2);
      act(() => handle!.clear());
      expect(screen.queryByText("toast", { selector: "div" })).toBeNull();
      expect(screen.queryByText("spoken")).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("pauses an announcement's dwell with the region, like a toast's timer", () => {
      render(
        <ToastProvider>
          <Probe run={(t) => t.announce("spoken")} />
        </ToastProvider>,
      );
      const region = status().parentElement!;
      act(() => void fireEvent.pointerOver(region));
      advance(5000);
      expect(screen.getByText("spoken")).toBeInTheDocument();

      act(() => void fireEvent.pointerOut(region));
      advance(1000);
      expect(screen.queryByText("spoken")).toBeNull();
    });

    it("disposes an announcement's timer on unmount", () => {
      const { unmount } = render(
        <ToastProvider>
          <Probe run={(t) => t.announce("spoken")} />
        </ToastProvider>,
      );
      expect(vi.getTimerCount()).toBe(1);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  it("forwards aria-label, ref and a data attribute to the region (D91)", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ToastProvider aria-label="Alerts" data-test="r" ref={ref}>
        <div />
      </ToastProvider>,
    );
    // jsdom leaves the shown popover `display: none`, so the region computes no
    // name and needs `hidden: true` (as in D90); assert the attribute instead.
    const region = screen.getByRole("region", { hidden: true });
    expect(region).toHaveAttribute("aria-label", "Alerts");
    expect(region).toHaveAttribute("data-test", "r");
    expect(ref.current).toBe(region);
  });
});
