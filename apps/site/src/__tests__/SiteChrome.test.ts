import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Same rationale as theme.test.ts: batch act() synchronously in tests.
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// SearchDialog loads /pagefind/pagefind.js, a build-time artefact vite cannot
// resolve under test; the chrome only mounts it, so a stub is enough here.
vi.mock("../components/SearchDialog", () => ({ SearchDialog: () => null }));

import { SiteChrome } from "../chrome/SiteChrome";
import { PsiMark } from "../PsiMark";
import { MODE_KEY } from "../theme";
import { releaseVersion } from "virtual:psi-facts";

beforeEach(() => {
  localStorage.clear();
  // Every query reports no match, so the chrome renders narrow.
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      media: "",
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof matchMedia,
  );
  // jsdom has no <dialog> methods; the same stub packages/react/vitest.setup.ts uses.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

afterEach(() => {
  delete document.documentElement.dataset.psiTheme;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

/** No JSX here on purpose: apps/site's vitest include is `src/**\/*.test.ts`. */
function mount(node: ReturnType<typeof createElement>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return { container };
}

describe("PsiMark", () => {
  it("uses currentColor, never a hardcoded color, so it follows the derived theme", () => {
    const { container } = mount(createElement(PsiMark, { size: 24 }));
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("stroke")).toBe("currentColor");
    expect(svg?.getAttribute("fill")).toBe("none");
  });
});

describe("SiteChrome", () => {
  it("links pages, never fragments", () => {
    const { container } = mount(createElement(SiteChrome));
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/docs/");
    expect(hrefs).toContain("/docs/components/");
    expect(hrefs.filter((h) => h?.includes("#"))).toEqual([]);
  });

  it("System in the mode control clears a stored choice", () => {
    localStorage.setItem(MODE_KEY, "dark");
    const { container } = mount(createElement(SiteChrome));
    const system = [...container.querySelectorAll('[role="radio"]')].find((r) => r.textContent === "System")!;
    act(() => (system as HTMLElement).click());
    expect(localStorage.getItem(MODE_KEY)).toBeNull();
  });

  it("Menu opens the drawer, and the drawer holds the mode control and the links", () => {
    const { container } = mount(createElement(SiteChrome));
    const menu = [...container.querySelectorAll("button")].find((b) => b.textContent?.includes("Menu"))!;
    act(() => menu.click());
    const dialog = document.querySelector("dialog[open]")!;
    expect(dialog).not.toBeNull();
    // The Changelog entry names the release, read from the build.
    expect(dialog.textContent).toContain(`Changelog (v${releaseVersion})`);
    expect(dialog.querySelector('[role="radiogroup"]')).not.toBeNull();
  });
});
