import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NavBar } from "./NavBar.js";

describe("NavBar", () => {
  it("renders brand, links, and actions slots", () => {
    render(
      <NavBar brand={<a href="/">DK</a>} actions={<button>Theme</button>}>
        <a href="#work">Work</a>
      </NavBar>,
    );
    expect(screen.getByText("DK")).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toContainElement(screen.getByText("Work"));
    expect(screen.getByText("Theme")).toBeInTheDocument();
  });

  it("lays out slots inside a psi-container (HAN-40: pre-D42 class name lost the gutter padding)", () => {
    render(
      <NavBar brand={<a href="/">DK</a>}>
        <a href="#work">Work</a>
      </NavBar>,
    );
    const inner = screen.getByRole("navigation").parentElement;
    expect(inner).toHaveClass("psi-container");
    expect(inner?.className).not.toMatch(/\bds-container\b/);
  });

  it("renders a banner landmark wrapping the nav", () => {
    render(
      <NavBar brand={<a href="/">DK</a>}>
        <a href="#work">Work</a>
      </NavBar>,
    );
    const banner = screen.getByRole("banner");
    expect(banner.tagName).toBe("HEADER");
    expect(banner).toContainElement(screen.getByRole("navigation"));
  });
});

describe("D88", () => {
  it("renders no <nav> when it has no children", () => {
    const { container } = render(<NavBar brand={<a href="/">DK</a>} actions={<button>Theme</button>} />);
    expect(container.querySelector("nav")).toBeNull();
    expect(screen.getByText("Theme")).toBeInTheDocument();
  });

  it("renders no <nav> for children that are all empty", () => {
    const { container } = render(<NavBar brand={<a href="/">DK</a>}>{null}{false}</NavBar>);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("navLabel names the navigation landmark", () => {
    render(
      <NavBar navLabel="Primary">
        <a href="#work">Work</a>
      </NavBar>,
    );
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
  });

  it("fluid drops psi-container for the fluid row", () => {
    render(
      <NavBar fluid brand={<a href="/">DK</a>}>
        <a href="#work">Work</a>
      </NavBar>,
    );
    const inner = screen.getByRole("navigation").parentElement;
    expect(inner).not.toHaveClass("psi-container");
    expect(inner?.className).toMatch(/fluid/);
  });

  it("keeps psi-container and no fluid class by default", () => {
    render(
      <NavBar>
        <a href="#work">Work</a>
      </NavBar>,
    );
    const inner = screen.getByRole("navigation").parentElement;
    expect(inner).toHaveClass("psi-container");
    expect(inner?.className).not.toMatch(/fluid/);
  });

  it("keeps rest props on the header", () => {
    render(
      <NavBar data-testid="bar" navLabel="Primary" fluid>
        <a href="#work">Work</a>
      </NavBar>,
    );
    expect(screen.getByTestId("bar").tagName).toBe("HEADER");
  });
});
