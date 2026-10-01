import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavTree } from "./NavTree.js";
import { NavGroup } from "./NavGroup.js";
import { NavItem } from "./NavItem.js";

describe("NavTree (D88)", () => {
  it("is a labelled navigation landmark around a list", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem>
          <a href="#a">A</a>
        </NavItem>
      </NavTree>,
    );
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("list")).toBeInTheDocument();
    expect(within(nav).getAllByRole("listitem")).toHaveLength(1);
  });

  it("merges className, passes rest props and forwards the ref to the nav", () => {
    const ref = createRef<HTMLElement>();
    render(
      <NavTree aria-label="Main" className="mine" data-testid="tree" ref={ref}>
        <NavItem>
          <a href="#a">A</a>
        </NavItem>
      </NavTree>,
    );
    const nav = screen.getByTestId("tree");
    expect(nav).toBe(ref.current);
    expect(nav.tagName).toBe("NAV");
    expect(nav).toHaveClass("mine");
    expect(nav.className).toMatch(/navTree/);
  });
});

describe("NavGroup (D88)", () => {
  function Fixture({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
    return (
      <NavTree aria-label="Main">
        <NavGroup label="Reports" open={open} onOpenChange={onOpenChange}>
          <NavItem>
            <a href="#sales">Sales</a>
          </NavItem>
        </NavGroup>
      </NavTree>
    );
  }

  it("closed: the button is collapsed and names a hidden list", () => {
    render(<Fixture open={false} onOpenChange={() => {}} />);
    const button = screen.getByRole("button", { name: "Reports" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-expanded", "false");
    const listId = button.getAttribute("aria-controls");
    expect(listId).toBeTruthy();
    const list = document.getElementById(listId!);
    expect(list?.tagName).toBe("UL");
    expect(list).toHaveAttribute("hidden");
    expect(screen.queryByRole("link", { name: "Sales" })).not.toBeInTheDocument();
  });

  it("open: the list is visible and the button is expanded", () => {
    render(<Fixture open onOpenChange={() => {}} />);
    const button = screen.getByRole("button", { name: "Reports" });
    expect(button).toHaveAttribute("aria-expanded", "true");
    const list = document.getElementById(button.getAttribute("aria-controls")!);
    expect(list).not.toHaveAttribute("hidden");
    expect(screen.getByRole("link", { name: "Sales" })).toBeVisible();
  });

  it("is controlled: a click asks, and nothing changes until the parent re-renders", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Fixture open={false} onOpenChange={onOpenChange} />);
    const button = screen.getByRole("button", { name: "Reports" });
    await userEvent.click(button);
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(button.getAttribute("aria-controls")!)).toHaveAttribute("hidden");
    rerender(<Fixture open onOpenChange={onOpenChange} />);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("asks to close when open", async () => {
    const onOpenChange = vi.fn();
    render(<Fixture open onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Reports" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("hides the chevron from assistive technology", () => {
    render(<Fixture open={false} onOpenChange={() => {}} />);
    const svg = screen.getByRole("button", { name: "Reports" }).querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("gives each group its own list id", () => {
    render(
      <NavTree aria-label="Main">
        <NavGroup label="One" open onOpenChange={() => {}}>
          <NavItem>
            <a href="#1">1</a>
          </NavItem>
        </NavGroup>
        <NavGroup label="Two" open onOpenChange={() => {}}>
          <NavItem>
            <a href="#2">2</a>
          </NavItem>
        </NavGroup>
      </NavTree>,
    );
    const a = screen.getByRole("button", { name: "One" }).getAttribute("aria-controls");
    const b = screen.getByRole("button", { name: "Two" }).getAttribute("aria-controls");
    expect(a).not.toBe(b);
  });

  it("merges className onto the li", () => {
    render(
      <NavTree aria-label="Main">
        <NavGroup label="G" open={false} onOpenChange={() => {}} className="mine">
          <NavItem>
            <a href="#a">A</a>
          </NavItem>
        </NavGroup>
      </NavTree>,
    );
    const li = screen.getByRole("button", { name: "G" }).closest("li");
    expect(li).toHaveClass("mine");
  });
});

describe("NavItem (D88)", () => {
  it("renders an li holding the passed anchor and keeps its aria-current", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem className="mine" data-testid="item">
          <a href="#a" aria-current="page">
            A
          </a>
        </NavItem>
      </NavTree>,
    );
    const li = screen.getByTestId("item");
    expect(li.tagName).toBe("LI");
    expect(li).toHaveClass("mine");
    const link = within(li).getByRole("link", { name: "A" });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("forwards the ref to the li", () => {
    const ref = createRef<HTMLLIElement>();
    render(
      <NavTree aria-label="Main">
        <NavItem ref={ref}>
          <a href="#a">A</a>
        </NavItem>
      </NavTree>,
    );
    expect(ref.current?.tagName).toBe("LI");
  });
});
