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
