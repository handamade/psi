import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import { TraceIsland } from "../home/TraceIsland";

const ex = (s: string) => ({ kind: "text" as const, text: s, from: "x" });
const surf = (p: string) => ({ code: ex(`${p} code`), docs: { kind: "rows" as const, rows: [["variant", "accent", "neutral"]], from: "m" }, storybook: ex(`${p} sb`), figma: ex(`${p} fig`), llms: ex(`${p} llms`), md: ex(`${p} md`), mcp: ex(`${p} mcp`) });
const data = { Button: surf("B"), Field: surf("F"), Table: surf("T"), "--psi-fg-accent": surf("K") };
const props = { data, storybookHref: { Button: "/sb/b", Field: "/sb/f", Table: "/sb/t", "--psi-fg-accent": "/sb/k" }, figmaHref: "https://figma.example", componentCount: 60 };

function stubWide(matches: boolean) {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches, media: "", addEventListener: () => {}, removeEventListener: () => {} })));
}
function mount(node: ReturnType<typeof createElement>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => createRoot(container).render(node));
  return { container };
}
const click = (el: Element) => act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
/** Hidden panels still render, so assert on the visible one. */
const visible = (c: HTMLElement) => [...c.querySelectorAll('[role="tabpanel"]:not([hidden])')].map((p) => p.textContent).join("|");

beforeEach(() => stubWide(true));
afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

const lit = (c: HTMLElement) => c.querySelectorAll(".map-wire[data-on]").length;

describe("TraceIsland", () => {
  it("lights only Source's spine for Code, and the path down to the box otherwise", () => {
    const { container } = mount(createElement(TraceIsland, props));
    click(container.querySelector('a[data-surface="code"]')!);
    expect(lit(container)).toBe(1);
    click(container.querySelector('a[data-surface="figma"]')!);
    // spine1, spine2, trunk + 2 segments down the people column
    expect(lit(container)).toBe(5);
  });
  it("box hrefs come from the data and follow the target", () => {
    const d = { ...data, Button: { ...data.Button, docs: { ...data.Button.docs, href: "/d/b" } } };
    const { container } = mount(createElement(TraceIsland, { ...props, data: d }));
    const href = (s: string) => container.querySelector(`a[data-surface="${s}"]`)!.getAttribute("href");
    expect(href("docs")).toBe("/d/b");
    expect(href("storybook")).toBe("/sb/b");
    expect(href("figma")).toBe("https://figma.example");
    const field = [...container.querySelectorAll('[role="radio"]')].find((r) => r.textContent === "Field") as HTMLElement;
    act(() => field.click());
    expect(href("storybook")).toBe("/sb/f");
  });
  it("opens on Button's Docs tab, with the map's Docs box current", () => {
    const { container } = mount(createElement(TraceIsland, props));
    expect(visible(container)).toContain("variant");
    expect(container.querySelector('[data-surface="docs"][data-current]')).not.toBeNull();
  });
  it("a map box selects its tab", () => {
    const { container } = mount(createElement(TraceIsland, props));
    click(container.querySelector('a[data-surface="mcp"]')!);
    expect(visible(container)).toContain("B mcp");
    expect(container.querySelector('[data-surface="mcp"][data-current]')).not.toBeNull();
  });
  it("another target changes the excerpt", () => {
    const { container } = mount(createElement(TraceIsland, props));
    const field = [...container.querySelectorAll('[role="radio"]')].find((r) => r.textContent === "Field") as HTMLElement;
    act(() => field.click());
    click(container.querySelector('a[data-surface="code"]')!);
    expect(visible(container)).toContain("F code");
  });
  it("narrow: the map shows first, and a map surface switches to the trace on it", () => {
    stubWide(false);
    const { container } = mount(createElement(TraceIsland, props));
    expect(container.querySelector(".surfaces-grid")).toBeNull();
    expect(visible(container)).toContain("SOURCE");
    expect(container.querySelector(".trace")!.closest("[hidden]")).not.toBeNull();
    const seg = [...container.querySelectorAll('[role="tablist"] [role="tab"]')].map((t) => t.textContent);
    expect(seg.slice(0, 2)).toEqual(["Map", "Trace"]);
    expect(container.querySelectorAll('[role="tabpanel"][aria-labelledby]').length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('[role="radiogroup"][aria-label="Surfaces view"]')).toBeNull();
    click(container.querySelector('a[data-surface="mcp"]')!);
    expect(container.querySelector(".trace")!.closest("[hidden]")).toBeNull();
    expect(visible(container)).toContain("B mcp");
  });
});
