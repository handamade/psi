import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Same rationale as theme.test.ts: batch act() synchronously in tests.
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import { PsiMark } from "../PsiMark";
import { Header } from "../sections/Header";
import { MODE_KEY, useMode } from "../theme";

beforeEach(() => {
  localStorage.clear();
  // jsdom has no real matchMedia; useMode's OS-follow effect needs one to
  // attach/detach a listener even when the test never fires an OS change.
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      media: "(prefers-color-scheme: dark)",
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof matchMedia,
  );
});

afterEach(() => {
  delete document.documentElement.dataset.psiTheme;
  vi.unstubAllGlobals();
});

/** No JSX here on purpose: apps/promo's vitest include is scoped to
 * `src/**\/*.test.ts` (see vitest.config.ts), not `.tsx` — `createElement`
 * keeps this file a plain `.ts` test while still exercising the components. */
function mount(node: ReturnType<typeof createElement>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("PsiMark", () => {
  it("uses currentColor, never a hardcoded color, so it follows the derived theme", () => {
    const { container, unmount } = mount(createElement(PsiMark, { size: 24 }));
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("stroke")).toBe("currentColor");
    expect(svg?.getAttribute("fill")).toBe("none");
    unmount();
  });
});

describe("Header's mode toggle", () => {
  it("flips data-psi-theme on <html>, persists it, and re-labels itself with the new destination", () => {
    function Harness() {
      const [mode, setMode] = useMode();
      return createElement(Header, { mode, onMode: setMode });
    }
    const { container, unmount } = mount(createElement(Harness));

    const button = container.querySelector("button")!;
    const startLabel = button.getAttribute("aria-label");
    // The label names the destination, so clicking should land the page on
    // whatever mode the label just promised.
    const destination = startLabel?.includes("dark") ? "dark" : "light";

    act(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.documentElement.dataset.psiTheme).toBe(destination);
    expect(localStorage.getItem(MODE_KEY)).toBe(destination);
    // Having arrived, the button now offers the trip back.
    const otherMode = destination === "dark" ? "light" : "dark";
    expect(button.getAttribute("aria-label")).toBe(`Switch to ${otherMode} mode`);
    expect(button.getAttribute("aria-pressed")).toBeNull();

    unmount();
  });
});
