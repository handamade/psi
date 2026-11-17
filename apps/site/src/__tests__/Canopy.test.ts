import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import Canopy from "../../../../packages/docs/showcase/canopy";

function mount(node: ReturnType<typeof createElement>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => createRoot(container).render(node));
  return { container };
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, media: "", addEventListener: () => {}, removeEventListener: () => {} })));
});
afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("Canopy", () => {
  it("renders a table of zones at a wide width", () => {
    const { container } = mount(createElement(Canopy));
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.textContent).toContain("B · Basil");
  });
  it("a watering switch shows a toast", () => {
    const { container } = mount(createElement(Canopy));
    const sw = container.querySelector('input[aria-label="Watering, B · Basil"]') as HTMLInputElement;
    act(() => sw.click());
    expect(document.body.textContent).toContain("Watering on: B · Basil");
  });
});
