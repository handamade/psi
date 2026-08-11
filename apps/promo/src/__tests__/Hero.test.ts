import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as GenerateModule from "@handamade/psi-tokens/generate";

// Same rationale as theme.test.ts / Header.test.ts: batch act() synchronously.
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Wrapped, not replaced: the real derivation still runs (the console's
// rendered output depends on it), but every call is now counted — the only
// way, from outside the component, to prove "selected the other solved
// member" rather than "reran the solver".
vi.mock("@handamade/psi-tokens/generate", async (importOriginal) => {
  const actual = await importOriginal<typeof GenerateModule>();
  return { ...actual, deriveTheme: vi.fn(actual.deriveTheme) };
});

import { Hero } from "../sections/Hero";
import type { Mode } from "../theme";
import { deriveTheme } from "@handamade/psi-tokens/generate";

const deriveThemeSpy = deriveTheme as unknown as ReturnType<typeof vi.fn>;

const PROMPT = "midnight fintech, confident and calm";

beforeEach(() => {
  localStorage.clear();
  deriveThemeSpy.mockClear();
  // jsdom has no real matchMedia. Hero's `log()` checks
  // prefers-reduced-motion on every transcript line; forcing it "on" here
  // replaces the 90ms typewriter stagger with an immediate microtask, so
  // tests don't need real timers to observe the console settle.
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof matchMedia,
  );
});

// Tracks every root `mount()` creates so afterEach can force-unmount them —
// a failed assertion skips a test's own manual `unmount()` call, and without
// this an earlier test's leftover container/effects (and #brand-prompt id)
// stick around in the DOM and break the *next* test's element lookups, which
// reads as that next test being broken when it is really just pollution.
const mounted: Array<() => void> = [];

afterEach(() => {
  while (mounted.length > 0) mounted.pop()!();
  const style = document.documentElement.style;
  for (const name of Array.from(style).filter((n) => n.startsWith("--psi-"))) {
    style.removeProperty(name);
  }
  delete document.documentElement.dataset.psiCustom;
  delete document.documentElement.dataset.psiTheme;
  vi.unstubAllGlobals();
});

/** Same hand-rolled renderHook/mount pattern as theme.test.ts and
 * Header.test.ts — apps/promo does not depend on @testing-library/react and
 * this task must not add one. */
function mount(node: ReturnType<typeof createElement>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  let unmounted = false;
  const unmount = () => {
    if (unmounted) return; // idempotent: afterEach may also call this
    unmounted = true;
    act(() => {
      root.unmount();
    });
    container.remove();
  };
  mounted.push(unmount);
  return { container, unmount };
}

/** Flushes the microtask queue. Every promise `derive()` awaits internally —
 * the local application, the (stubbed) fetch, and each transcript log line
 * under forced-reduced-motion — resolves in a handful of microtask ticks
 * with no real timer involved, so a generous fixed number of hops is enough
 * to let the whole chain settle inside a single `act()`. */
async function flush(times = 30) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function submit(container: HTMLElement, prompt: string) {
  const input = container.querySelector<HTMLInputElement>("#brand-prompt")!;
  input.value = prompt;
  const form = container.querySelector<HTMLFormElement>(".console-prompt")!;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function findResetButton(container: HTMLElement) {
  return [...container.querySelectorAll("button")].find(
    (b) => b.textContent?.trim() === "reset",
  );
}

function inlineStyleText() {
  return document.documentElement.getAttribute("style") ?? "";
}

describe("Hero console — reset", () => {
  it("clears the brand and the applied properties, but keeps the mode", async () => {
    // The remote leg is irrelevant to this test and must not add a second
    // brand application — fail it fast so only the local derivation lands.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const onModeCalls: Mode[] = [];
    function Harness() {
      return createElement(Hero, {
        mode: "light" as Mode,
        onMode: (m: Mode) => {
          onModeCalls.push(m);
          document.documentElement.dataset.psiTheme = m;
        },
      });
    }
    const { container, unmount } = mount(createElement(Harness));

    await act(async () => {
      submit(container, PROMPT);
      await flush();
    });

    // A brand landed: some --psi-* custom property is on <html>, and the
    // console's own reset control appeared (it renders only when a brand is
    // applied).
    expect(inlineStyleText()).toMatch(/--psi-/);
    expect(findResetButton(container), "reset control did not appear after deriving").toBeDefined();
    const modeAfterDerive = document.documentElement.dataset.psiTheme;
    expect(modeAfterDerive, "derive should have set a mode via onMode").toBeDefined();
    expect(onModeCalls.length).toBeGreaterThan(0);

    await act(async () => {
      findResetButton(container)!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // The applied properties are gone...
    expect(inlineStyleText()).not.toMatch(/--psi-/);
    expect(document.documentElement.dataset.psiCustom).toBeUndefined();
    // ...the reset control itself is gone (brand is back to null)...
    expect(findResetButton(container)).toBeUndefined();
    // ...but the mode — the whole-page decision reset must not touch — is
    // exactly what it was a moment ago. handleReset never calls onMode.
    expect(document.documentElement.dataset.psiTheme).toBe(modeAfterDerive);

    unmount();
  });
});

describe("Hero console — mode toggle", () => {
  it("selects the other solved member on a mode swap, without re-deriving", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    let setMode!: (m: Mode) => void;
    function Harness() {
      const [mode, setModeState] = useState<Mode>("light");
      setMode = setModeState;
      return createElement(Hero, { mode, onMode: () => {} });
    }
    const { container, unmount } = mount(createElement(Harness));

    await act(async () => {
      submit(container, PROMPT);
      await flush();
    });

    expect(deriveThemeSpy).toHaveBeenCalledTimes(1);
    const propsAtInitialMode = inlineStyleText();
    expect(propsAtInitialMode).toMatch(/--psi-/);

    await act(async () => {
      setMode("dark");
      await flush();
    });

    // No second solver run: the pair derived up front already holds both
    // members, so swapping mode is a lookup, not a re-derivation.
    expect(deriveThemeSpy).toHaveBeenCalledTimes(1);

    // ...and the swap must have actually done something, or the call-count
    // assertion above proves nothing (it would also hold for a toggle that
    // silently did nothing at all).
    const propsAtOtherMode = inlineStyleText();
    expect(propsAtOtherMode).toMatch(/--psi-/);
    expect(propsAtOtherMode).not.toBe(propsAtInitialMode);

    unmount();
  });
});

describe("Hero console — the generation guard", () => {
  it("discards a stale response that resolves after a reset", async () => {
    let resolveFetch!: (value: { status: number; json: () => Promise<unknown> }) => void;
    const pendingResponse = new Promise<{ status: number; json: () => Promise<unknown> }>(
      (resolve) => {
        resolveFetch = resolve;
      },
    );
    vi.stubGlobal("fetch", vi.fn(() => pendingResponse));

    function Harness() {
      return createElement(Hero, { mode: "light" as Mode, onMode: () => {} });
    }
    const { container, unmount } = mount(createElement(Harness));

    await act(async () => {
      submit(container, PROMPT);
      await flush();
    });

    // The local leg landed while the remote request is still in flight —
    // one deriveTheme call so far, and the reset control is present.
    expect(deriveThemeSpy).toHaveBeenCalledTimes(1);
    expect(findResetButton(container)).toBeDefined();

    // Reset before the (still-pending) remote response arrives. This bumps
    // the generation counter and must invalidate the in-flight request.
    await act(async () => {
      findResetButton(container)!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(findResetButton(container)).toBeUndefined();
    expect(inlineStyleText()).not.toMatch(/--psi-/);

    // The stale response "arrives" now, with a distinct, otherwise-valid
    // vector — distinguishable from the local one if it were (wrongly)
    // applied.
    const staleVector = {
      hue: 40,
      chroma: "vivid",
      mode: "dark",
      radius: 12,
      name: "stale-vector",
    };
    await act(async () => {
      resolveFetch({ status: 200, json: async () => staleVector });
      await flush();
    });

    // The Critical bug from Task 10's review: this must never apply. No
    // second deriveTheme call, no custom properties reapplied, no reset
    // control reappearing (brand must still be null).
    expect(deriveThemeSpy).toHaveBeenCalledTimes(1);
    expect(inlineStyleText()).not.toMatch(/--psi-/);
    expect(document.documentElement.dataset.psiCustom).toBeUndefined();
    expect(findResetButton(container)).toBeUndefined();

    unmount();
  });
});
