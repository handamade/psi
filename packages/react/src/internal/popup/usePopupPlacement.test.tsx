import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { useRef } from "react";
import { usePopupPlacement } from "./usePopupPlacement.js";
import type { PopupPlacement } from "./usePopupPlacement.js";

function Harness({
  matchWidth,
  placement = "bottom-start",
  cap,
}: {
  matchWidth?: boolean;
  placement?: PopupPlacement;
  cap?: string;
}) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  usePopupPlacement({ popoverRef, anchorRef, open: true, placement, anchorName: "--a", matchWidth });
  return (
    <>
      <div ref={anchorRef} data-testid="anchor" />
      <div ref={popoverRef} data-testid="popup" style={cap ? { maxHeight: cap } : undefined} />
    </>
  );
}

/** CSS.supports with only the named features missing. */
function supportsAllBut(...missing: string[]) {
  CSS.supports = vi.fn((prop: string) => !missing.includes(prop)) as unknown as typeof CSS.supports;
}

const anchorRect = (top: number, height = 32, left = 100, width = 240) =>
  ({
    x: left, y: top, top, left, bottom: top + height, right: left + width,
    width, height, toJSON: () => ({}),
  }) as DOMRect;

describe("usePopupPlacement", () => {
  const originalSupports = CSS.supports;

  afterEach(() => {
    CSS.supports = originalSupports;
    vi.restoreAllMocks();
  });

  describe("matchWidth", () => {
    it("binds anchor-size(width) where anchor-size() is supported", () => {
      supportsAllBut();
      const setProperty = vi.spyOn(CSSStyleDeclaration.prototype, "setProperty");
      render(<Harness matchWidth />);
      expect(setProperty).toHaveBeenCalledWith("min-inline-size", "anchor-size(width)");
    });

    it("sets the anchor's measured width where anchor-size() is missing", () => {
      supportsAllBut("min-inline-size");
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(anchorRect(50));
      const { getByTestId } = render(<Harness matchWidth />);
      expect(getByTestId("popup").style.minInlineSize).toBe("240px");
    });

    it("leaves the width alone without matchWidth", () => {
      supportsAllBut("min-inline-size");
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(anchorRect(50));
      const { getByTestId } = render(<Harness />);
      expect(getByTestId("popup").style.minInlineSize).toBe("");
    });
  });

  describe("the fallback's height cap (D131)", () => {
    it("caps the popup at the room below when that is less than its CSS cap", () => {
      supportsAllBut("anchor-name", "min-inline-size");
      // jsdom's window is 768 tall: an anchor ending at 568 leaves 200px.
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(anchorRect(536));
      const { getByTestId } = render(<Harness cap="320px" />);
      expect(getByTestId("popup").style.maxBlockSize).toBe("200px");
    });

    it("caps at the room above for a top placement", () => {
      supportsAllBut("anchor-name", "min-inline-size");
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(anchorRect(150));
      const { getByTestId } = render(<Harness cap="320px" placement="top-start" />);
      expect(getByTestId("popup").style.maxBlockSize).toBe("150px");
    });

    it("sets no cap when the room is more than the CSS cap", () => {
      supportsAllBut("anchor-name", "min-inline-size");
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(anchorRect(50));
      const { getByTestId } = render(<Harness cap="320px" />);
      expect(getByTestId("popup").style.maxBlockSize).toBe("");
    });

    it("sets no cap above the anchor floor", () => {
      supportsAllBut();
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(anchorRect(536));
      const { getByTestId } = render(<Harness cap="320px" />);
      expect(getByTestId("popup").style.maxBlockSize).toBe("");
    });
  });
});
