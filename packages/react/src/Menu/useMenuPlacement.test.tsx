import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { Menu } from "./Menu.js";
import type { Placement } from "./Menu.js";
import { MenuItem } from "./MenuItem.js";
import { Button } from "../Button/Button.js";

const trigger = <Button size={32}>Actions</Button>;

function renderMenu(placement: Placement = "bottom-start") {
  return render(
    <Menu open onClose={() => {}} trigger={trigger} placement={placement} aria-label="Actions">
      <MenuItem onSelect={() => {}}>Rename</MenuItem>
    </Menu>,
  );
}

/** Renders with an rtl/ltr ancestor (not the trigger itself), matching how
 * `direction` is actually set in a real document — the hook reads it off the
 * trigger via getComputedStyle, which must pick it up through inheritance. */
function renderMenuInDir(dir: "ltr" | "rtl", placement: Placement = "bottom-start") {
  return render(
    <div dir={dir}>
      <Menu open onClose={() => {}} trigger={trigger} placement={placement} aria-label="Actions">
        <MenuItem onSelect={() => {}}>Rename</MenuItem>
      </Menu>
    </div>,
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

  // Fix 1 (D53 review): getBoundingClientRect() is always physical, but
  // "-start"/"-end" are logical and must flip which edge gets pinned once the
  // document is RTL. This only matters below the anchor floor — above it, CSS
  // position-area already handles logical directions natively.
  describe("writing direction (fallback branch only)", () => {
    beforeEach(() => {
      CSS.supports = vi.fn().mockReturnValue(false);
    });

    const cases: Array<{ placement: Placement; dir: "ltr" | "rtl"; pinned: "left" | "right" }> = [
      { placement: "bottom-start", dir: "ltr", pinned: "left" },
      { placement: "bottom-start", dir: "rtl", pinned: "right" },
      { placement: "bottom-end", dir: "ltr", pinned: "right" },
      { placement: "bottom-end", dir: "rtl", pinned: "left" },
      { placement: "top-start", dir: "ltr", pinned: "left" },
      { placement: "top-start", dir: "rtl", pinned: "right" },
      { placement: "top-end", dir: "ltr", pinned: "right" },
      { placement: "top-end", dir: "rtl", pinned: "left" },
    ];

    it.each(cases)(
      "$placement in $dir pins the $pinned physical edge",
      ({ placement, dir, pinned }) => {
        renderMenuInDir(dir, placement);
        const popover = document.querySelector<HTMLElement>("[data-psi-menu]")!;
        if (pinned === "left") {
          expect(popover.style.left).toBe("100px"); // trigger's physical left
          expect(popover.style.right).toBe("");
        } else {
          expect(popover.style.right).toBe(`${window.innerWidth - 180}px`); // trigger's physical right
          expect(popover.style.left).toBe("");
        }
      },
    );

    it("reads direction off an ancestor via getComputedStyle, not just an own dir attribute", () => {
      // Confirms getComputedStyle(trigger).direction resolves through
      // inheritance in jsdom — if it only read own-element `dir`, this would
      // fall back to the ltr default and pin the wrong edge.
      renderMenuInDir("rtl", "bottom-start");
      const popover = document.querySelector<HTMLElement>("[data-psi-menu]")!;
      expect(popover.style.right).toBe(`${window.innerWidth - 180}px`);
      expect(popover.style.left).toBe("");
    });
  });
});
