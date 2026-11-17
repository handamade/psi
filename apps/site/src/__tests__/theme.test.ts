import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
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
  useBrand,
  useModePref,
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
 * A hand-rolled renderHook. apps/site does not depend on
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

describe("server rendering", () => {
  it("renders useModePref and useBrand without localStorage or matchMedia", () => {
    vi.stubGlobal("localStorage", undefined);
    vi.stubGlobal("matchMedia", undefined);
    function Probe() {
      const [, mode] = useModePref();
      const { brand } = useBrand();
      return createElement("p", null, `${mode}:${brand === null ? "none" : "brand"}`);
    }
    expect(renderToString(createElement(Probe))).toBe("<p>light:none</p>");
  });

  it("corrects to the stored mode before the first paint on the client", () => {
    vi.unstubAllGlobals();
    localStorage.setItem(MODE_KEY, "dark");
    stubMatchMedia(false);
    const { result, unmount } = renderHook(() => useModePref());
    expect(result.current[1]).toBe("dark");
    unmount();
  });
});

/** Mounts a node into the DOM under act(), as Header.test.ts does. */
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

describe("useModePref", () => {
  beforeEach(() => {
    // jsdom has no matchMedia; OS is light.
    stubMatchMedia(false);
  });

  function Probe({ onRender }: { onRender: (v: ReturnType<typeof useModePref>) => void }) {
    onRender(useModePref());
    return null;
  }

  it("starts at system when nothing is stored", () => {
    let last!: ReturnType<typeof useModePref>;
    mount(createElement(Probe, { onRender: (v) => (last = v) }));
    expect(last[0]).toBe("system");
    expect(last[1]).toBe("light"); // matchMedia stub: matches false
  });

  it("an explicit choice persists, and system clears it", () => {
    let last!: ReturnType<typeof useModePref>;
    mount(createElement(Probe, { onRender: (v) => (last = v) }));
    act(() => last[2]("dark"));
    expect(localStorage.getItem(MODE_KEY)).toBe("dark");
    expect(document.documentElement.dataset.psiTheme).toBe("dark");
    act(() => last[2]("system"));
    expect(localStorage.getItem(MODE_KEY)).toBeNull();
    expect(last[0]).toBe("system");
    expect(document.documentElement.dataset.psiTheme).toBe("light");
  });

  it("a stored choice is read as that preference", () => {
    localStorage.setItem(MODE_KEY, "dark");
    let last!: ReturnType<typeof useModePref>;
    mount(createElement(Probe, { onRender: (v) => (last = v) }));
    expect(last[0]).toBe("dark");
    expect(last[1]).toBe("dark");
  });
});

describe("mode preference in one document", () => {
  beforeEach(() => stubMatchMedia(false));

  it("choosing System in one instance clears the other's preference", () => {
    localStorage.setItem(MODE_KEY, "dark");
    let a!: ReturnType<typeof useModePref>;
    let c!: ReturnType<typeof useModePref>;
    function Two() {
      a = useModePref();
      c = useModePref();
      return null;
    }
    mount(createElement(Two));
    expect(c[0]).toBe("dark");
    act(() => a[2]("system"));
    expect(c[0]).toBe("system");
    expect(c[1]).toBe("light");
  });
});
