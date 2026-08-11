import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, it, expect, beforeEach, vi } from "vitest";

// Tells React this is a test environment, so `act()` batches synchronously
// instead of warning. @testing-library/react sets this same global
// internally; renderHook below is the hand-rolled stand-in for it.
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import {
  BRAND_KEY,
  MODE_KEY,
  readStoredBrand,
  readStoredMode,
  useMode,
  type Mode,
} from "../theme";

beforeEach(() => localStorage.clear());

afterEach(() => {
  // Undo anything a test painted onto <html> directly.
  const style = document.documentElement.style;
  for (const name of Array.from(style).filter((n) => n.startsWith("--psi-"))) {
    style.removeProperty(name);
  }
  delete document.documentElement.dataset.psiCustom;
  delete document.documentElement.dataset.psiTheme;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * A hand-rolled renderHook. apps/promo does not depend on
 * @testing-library/react (only packages/react does, as a devDependency
 * that isn't hoisted here) and this task must not add a dependency, so a
 * tiny host component plus react-dom/client stands in for it.
 */
function renderHook<T>(hook: () => T): { result: { current: T }; unmount: () => void } {
  const result = { current: undefined as unknown as T };
  function Harness() {
    result.current = hook();
    return null;
  }
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: Root;
  act(() => {
    root = createRoot(container);
    root.render(createElement(Harness));
  });
  return {
    result,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

/** Controllable `prefers-color-scheme: dark` stub — jsdom has no real matchMedia. */
function stubMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  const mql = {
    get matches() {
      return matches;
    },
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_event: string, cb: () => void) => {
      listeners.add(cb);
    },
    removeEventListener: (_event: string, cb: () => void) => {
      listeners.delete(cb);
    },
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => mql as unknown as MediaQueryList),
  );
  return {
    setMatches(next: boolean) {
      matches = next;
      act(() => {
        listeners.forEach((cb) => cb());
      });
    },
  };
}

describe("readStoredMode", () => {
  it("returns a stored light or dark", () => {
    localStorage.setItem(MODE_KEY, "dark");
    expect(readStoredMode()).toBe("dark");
  });

  it("returns null when nothing is stored, so the caller can ask the OS", () => {
    expect(readStoredMode()).toBeNull();
  });

  it("rejects a value from the old four-theme roster", () => {
    // A returning visitor holding "ember" must not be stranded in a theme the
    // header can no longer leave.
    localStorage.setItem(MODE_KEY, "ember");
    expect(readStoredMode()).toBeNull();
  });
});

describe("readStoredBrand", () => {
  it("returns null when absent", () => {
    expect(readStoredBrand()).toBeNull();
  });

  it("returns a valid stored vector", () => {
    const v = { hue: 200, chroma: "calm", mode: "light", radius: 8, name: "lagoon" };
    localStorage.setItem(BRAND_KEY, JSON.stringify({ vector: v, cache: {} }));
    expect(readStoredBrand()?.vector.name).toBe("lagoon");
  });

  it("clears and returns null for a corrupt vector", () => {
    localStorage.setItem(BRAND_KEY, JSON.stringify({ vector: { hue: 999 }, cache: {} }));
    expect(readStoredBrand()).toBeNull();
    expect(localStorage.getItem(BRAND_KEY)).toBeNull();
  });

  it("clears and returns null for non-JSON", () => {
    localStorage.setItem(BRAND_KEY, "{{{not json");
    expect(readStoredBrand()).toBeNull();
    expect(localStorage.getItem(BRAND_KEY)).toBeNull();
  });

  it("clears and returns null for an off-scale radius", () => {
    const v = { hue: 200, chroma: "calm", mode: "light", radius: 10, name: "lagoon" };
    localStorage.setItem(BRAND_KEY, JSON.stringify({ vector: v, cache: {} }));
    expect(readStoredBrand()).toBeNull();
  });

  it("strips previously-applied --psi-* inline properties when the stored vector is corrupt", () => {
    // The boot script paints brand.cache onto <html> before any module —
    // including this validator — can run. Rejecting the vector must not
    // leave that paint on screen (Finding 2): the reset control lives
    // inside the very theme being rejected.
    document.documentElement.style.setProperty("--psi-accent", "oklch(0.5 0.1 200)");
    document.documentElement.dataset.psiCustom = "";

    localStorage.setItem(BRAND_KEY, JSON.stringify({ vector: { hue: 999 }, cache: {} }));
    expect(readStoredBrand()).toBeNull();

    expect(document.documentElement.style.getPropertyValue("--psi-accent")).toBe("");
    expect(document.documentElement.dataset.psiCustom).toBeUndefined();
  });
});

describe("storage failures (e.g. Safari private mode)", () => {
  it("readStoredMode returns null when localStorage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    expect(readStoredMode()).toBeNull();
  });

  it("readStoredBrand returns null when localStorage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    expect(readStoredBrand()).toBeNull();
  });
});

describe("useMode", () => {
  it("follows an OS change when nothing is stored, and does not persist it", () => {
    const media = stubMatchMedia(false); // OS starts light
    const { result, unmount } = renderHook(() => useMode());
    expect(result.current[0]).toBe("light");

    media.setMatches(true); // OS flips to dark
    expect(result.current[0]).toBe("dark");
    expect(localStorage.getItem(MODE_KEY)).toBeNull();

    unmount();
  });

  it("ignores further OS changes once an explicit choice has been made", () => {
    const media = stubMatchMedia(false); // OS starts light
    const { result, unmount } = renderHook(() => useMode());

    act(() => {
      const setMode = result.current[1];
      setMode("dark" as Mode); // an explicit choice, contradicting the OS
    });
    expect(result.current[0]).toBe("dark");
    expect(localStorage.getItem(MODE_KEY)).toBe("dark");

    media.setMatches(false); // OS "changes" back to light — already was light
    expect(result.current[0]).toBe("dark");

    media.setMatches(true); // OS flips to dark and back to light again
    media.setMatches(false);
    expect(result.current[0]).toBe("dark"); // never reverted by the OS once explicit

    unmount();
  });
});
