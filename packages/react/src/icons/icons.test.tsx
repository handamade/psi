import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { IconPlus } from "./IconPlus.js";
import { IconClose } from "./IconClose.js";
import { IconSearch } from "./IconSearch.js";
import { IconArrowDown } from "./IconArrowDown.js";
import { IconArrowUpRight } from "./IconArrowUpRight.js";
import { IconLinkedIn } from "./IconLinkedIn.js";
import { IconGitHub } from "./IconGitHub.js";
import { IconX } from "./IconX.js";
import { IconInstagram } from "./IconInstagram.js";

describe("Icons", () => {
  it("renders with aria-hidden by default", () => {
    const { container } = render(<IconPlus />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("uses default size of 20", () => {
    const { container } = render(<IconPlus />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("width", "20");
    expect(svg).toHaveAttribute("height", "20");
  });

  it("accepts custom size prop", () => {
    const { container } = render(<IconPlus size={24} />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
  });

  it("accepts className", () => {
    const { container } = render(<IconClose className="custom-icon" />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("class", "custom-icon");
  });

  it("renders different icon shapes", () => {
    const { container: c1 } = render(<IconPlus />);
    const { container: c2 } = render(<IconSearch />);
    const svg1 = c1.querySelector("svg")!;
    const svg2 = c2.querySelector("svg")!;
    expect(svg1.innerHTML).not.toBe(svg2.innerHTML);
  });

  it("spreads additional SVG attributes", () => {
    const { container } = render(<IconPlus data-testid="icon" />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("data-testid", "icon");
  });

  it("can override aria-hidden", () => {
    const { container } = render(<IconPlus aria-hidden="false" />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "false");
  });

  it("renders new arrow and social icons", () => {
    const icons = [
      <IconArrowDown key="arrow-down" />,
      <IconArrowUpRight key="arrow-up-right" />,
      <IconLinkedIn key="linkedin" />,
      <IconGitHub key="github" />,
      <IconX key="x" />,
      <IconInstagram key="instagram" />,
    ];
    icons.forEach((icon) => {
      const { container } = render(icon);
      const svg = container.querySelector("svg")!;
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("width", "20");
      expect(svg).toHaveAttribute("height", "20");
    });
  });
});
