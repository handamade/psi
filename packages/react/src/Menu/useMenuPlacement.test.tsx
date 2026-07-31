import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { Menu } from "./Menu.js";
import { MenuItem } from "./MenuItem.js";
import { Button } from "../Button/Button.js";

const trigger = <Button size={32}>Actions</Button>;

function renderMenu() {
  return render(
    <Menu open onClose={() => {}} trigger={trigger} placement="bottom-start" aria-label="Actions">
      <MenuItem onSelect={() => {}}>Rename</MenuItem>
    </Menu>,
  );
}

describe("useMenuPlacement", () => {
  const originalSupports = CSS.supports;

  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 100, y: 50, top: 50, left: 100, bottom: 82, right: 180,
      width: 80, height: 32, toJSON: () => ({}),
    } as DOMRect);
  });

  afterEach(() => {
    CSS.supports = originalSupports;
    vi.restoreAllMocks();
  });

  it("leaves inset alone when anchor positioning is supported", () => {
    CSS.supports = vi.fn().mockReturnValue(true);
    renderMenu();
    const popover = document.querySelector<HTMLElement>("[data-psi-menu]")!;
    expect(popover.style.top).toBe("");
    expect(popover.style.left).toBe("");
  });

  it("sets inset from the trigger rect when anchor positioning is unsupported", () => {
    CSS.supports = vi.fn().mockReturnValue(false);
    renderMenu();
    const popover = document.querySelector<HTMLElement>("[data-psi-menu]")!;
    expect(popover.style.top).toBe("82px"); // trigger bottom
    expect(popover.style.left).toBe("100px"); // trigger left, "-start"
  });

  it("declares an anchor-name linking the trigger and the popover", () => {
    CSS.supports = vi.fn().mockReturnValue(true);
    renderMenu();
    const wrapper = document.querySelector<HTMLElement>("[data-psi-menu-trigger]")!;
    const popover = document.querySelector<HTMLElement>("[data-psi-menu]")!;
    const name = wrapper.style.getPropertyValue("anchor-name");
    expect(name).toMatch(/^--psi-menu-/);
    expect(popover.style.getPropertyValue("position-anchor")).toBe(name);
  });

  it("carries the placement onto the element for the CSS rules to key off", () => {
    CSS.supports = vi.fn().mockReturnValue(true);
    renderMenu();
    expect(document.querySelector("[data-psi-menu]")).toHaveAttribute(
      "data-placement",
      "bottom-start",
    );
  });
});
