import { describe, it, expect } from "vitest";

describe("jsdom popover polyfill", () => {
  it("showPopover and hidePopover exist and toggle data-open", () => {
    const el = document.createElement("div");
    el.setAttribute("popover", "auto");
    document.body.appendChild(el);

    expect(typeof el.showPopover).toBe("function");
    el.showPopover();
    expect(el.getAttribute("data-open")).toBe("");

    el.hidePopover();
    expect(el.hasAttribute("data-open")).toBe(false);
  });
});
