import { createRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./AppShell.js";

function Shell(props: Partial<React.ComponentProps<typeof AppShell>>) {
  return (
    <AppShell
      skipLink={<a href="#main">Skip to content</a>}
      header={<header>Header</header>}
      sidebar={<nav aria-label="Main">Side</nav>}
      {...props}
    >
      <p>Content</p>
    </AppShell>
  );
}

// jsdom does no layout and no paint, so the rule tests below read the rules;
// what they paint is measured in a browser by
// apps/storybook/vr/app-shell.interaction.spec.ts.
const css = readFileSync(join(import.meta.dirname, "app-shell.module.css"), "utf8");
const rule = (selector: string) => new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`).exec(css)?.[1];

describe("AppShell (D88)", () => {
  it("renders the skip link, then the header, then the sidebar, then main", () => {
    render(<Shell />);
    const skip = screen.getByRole("link", { name: "Skip to content" });
    const header = screen.getByRole("banner");
    const nav = screen.getByRole("navigation", { name: "Main" });
    const main = screen.getByRole("main");
    const order = (a: Node, b: Node) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(order(skip, header)).toBeTruthy();
    expect(order(header, nav)).toBeTruthy();
    expect(order(nav, main)).toBeTruthy();
  });

  it("main has the default id, tabIndex -1 and the children", () => {
    render(<Shell />);
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main");
    expect(main).toHaveAttribute("tabindex", "-1");
    expect(main).toHaveTextContent("Content");
  });

  it("honours mainId and sidebarId", () => {
    render(<Shell mainId="content" sidebarId="nav" />);
    expect(screen.getByRole("main")).toHaveAttribute("id", "content");
    expect(document.getElementById("nav")).not.toBeNull();
    expect(document.getElementById("sidebar")).toBeNull();
  });

  it("the sidebar is open by default under the id sidebar", () => {
    render(<Shell />);
    const sidebar = document.getElementById("sidebar")!;
    expect(sidebar).not.toHaveAttribute("hidden");
    expect(sidebar).toContainElement(screen.getByRole("navigation", { name: "Main" }));
  });

  it("sidebarOpen={false} keeps the sidebar in the DOM, hidden", () => {
    render(<Shell sidebarOpen={false} />);
    const sidebar = document.getElementById("sidebar")!;
    expect(sidebar).toHaveAttribute("hidden");
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
  });

  it("sidebarTheme sets data-psi-theme on the sidebar only", () => {
    const { container } = render(<Shell sidebarTheme="dark" />);
    expect(document.getElementById("sidebar")).toHaveAttribute("data-psi-theme", "dark");
    expect(container.querySelectorAll("[data-psi-theme]")).toHaveLength(1);
  });

  it("sets no theme attribute without sidebarTheme", () => {
    const { container } = render(<Shell />);
    expect(container.querySelector("[data-psi-theme]")).toBeNull();
  });

  it("merges className, passes rest props and forwards the ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Shell className="mine" data-testid="shell" ref={ref} />);
    const root = screen.getByTestId("shell");
    expect(root).toBe(ref.current);
    expect(root).toHaveClass("mine");
    expect(root.className).toMatch(/appShell/);
  });

  it("renders without optional slots", () => {
    render(
      <AppShell>
        <p>Only content</p>
      </AppShell>,
    );
    expect(screen.getByRole("main")).toHaveTextContent("Only content");
  });
});

describe("AppShell's frame tokens (D110)", () => {
  it("the root paints --psi-app-shell-bg", () => {
    expect(rule(".appShell")).toContain("background: var(--psi-app-shell-bg);");
  });

  it("main paints --psi-app-shell-main-bg and rounds its top-start corner with --psi-app-shell-main-radius", () => {
    const main = rule(".main");
    expect(main).toContain("background: var(--psi-app-shell-main-bg);");
    expect(main).toContain("border-start-start-radius: var(--psi-app-shell-main-radius);");
  });

  it("the corner is square where a header and a sidebar do not both meet main", () => {
    expect(rule(".mainSquare")).toContain("border-start-start-radius: 0;");
    const square = () => screen.getByRole("main").className;

    const { unmount } = render(<Shell />);
    expect(square()).not.toMatch(/mainSquare/);
    unmount();

    const closed = render(<Shell sidebarOpen={false} />);
    expect(square()).toMatch(/mainSquare/);
    closed.unmount();

    const noHeader = render(<Shell header={undefined} />);
    expect(square()).toMatch(/mainSquare/);
    noHeader.unmount();

    render(<Shell sidebar={undefined} />);
    expect(square()).toMatch(/mainSquare/);
  });
});

describe("AppShell's padded main and banner (D113)", () => {
  it("main pads its page from the two padding tokens", () => {
    const main = rule(".main");
    expect(main).toContain("padding-block: var(--psi-app-shell-main-padding-block);");
    expect(main).toContain("padding-inline: var(--psi-app-shell-main-padding-inline);");
  });

  it("the banner wrapper cancels the padding on three sides and puts the block padding back below as padding", () => {
    const banner = rule(".banner");
    expect(banner).toContain("margin-block-start: calc(var(--psi-app-shell-main-padding-block) * -1);");
    expect(banner).toContain("margin-inline: calc(var(--psi-app-shell-main-padding-inline) * -1);");
    expect(banner).toContain("padding-block-end: var(--psi-app-shell-main-padding-block);");
    // A margin there would collapse with the page's first child and pull it up.
    expect(banner).not.toContain("margin-block:");
    expect(banner).not.toContain("margin-block-end");
  });

  it("an empty banner wrapper leaves the layout", () => {
    expect(rule(".banner:empty")).toContain("display: none;");
  });

  it("renders the banner inside main, before the page", () => {
    render(<Shell banner={<p>Data is stale</p>} />);
    const main = screen.getByRole("main");
    const wrapper = main.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/banner/);
    expect(wrapper).toHaveTextContent("Data is stale");
    expect(wrapper.nextElementSibling).toHaveTextContent("Content");
  });

  it("renders no wrapper without a banner, so the page is main's first child", () => {
    render(<Shell />);
    const main = screen.getByRole("main");
    expect(main.firstElementChild?.tagName).toBe("P");
    expect(main.firstElementChild).toHaveTextContent("Content");
  });

  it("stacks several banners in order", () => {
    render(
      <Shell
        banner={
          <>
            <p>First</p>
            <p>Second</p>
          </>
        }
      />,
    );
    const wrapper = screen.getByRole("main").firstElementChild as HTMLElement;
    expect([...wrapper.children].map((el) => el.textContent)).toEqual(["First", "Second"]);
  });

  it("a banner that renders nothing leaves an empty wrapper, which the :empty rule removes", () => {
    render(<Shell banner={false} />);
    const wrapper = screen.getByRole("main").firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/banner/);
    expect(wrapper.childNodes).toHaveLength(0);
  });
});

describe("AppShell's sidebar line (D114)", () => {
  it("the sidebar draws its inline-end edge from the width and colour tokens", () => {
    expect(rule(".sidebar")).toContain(
      "border-inline-end: var(--psi-app-shell-sidebar-border-width) solid var(--psi-app-shell-sidebar-border);",
    );
  });
});

describe("AppShell's sliding sidebar (D142)", () => {
  it("instant by default: no slide class, no inner wrapper, a closed sidebar is hidden", () => {
    const { container } = render(<Shell sidebarOpen={false} />);
    const root = container.firstElementChild!;
    expect(root.className).not.toMatch(/slide/);
    expect(document.getElementById("sidebar")).toHaveAttribute("hidden");
    expect(document.getElementById("sidebar")!.firstElementChild!.tagName).toBe("NAV");
  });

  it('sidebarMotion="slide" wraps the content once and keeps a closed sidebar out of `hidden`', () => {
    const { container, rerender } = render(<Shell sidebarMotion="slide" />);
    const root = container.firstElementChild!;
    const sidebar = document.getElementById("sidebar")!;
    expect(root.className).toMatch(/slide/);
    expect(root.className).not.toMatch(/sidebarClosed/);
    expect(sidebar.children).toHaveLength(1);
    expect(sidebar.firstElementChild!.className).toMatch(/sidebarInner/);
    expect(sidebar.firstElementChild!.firstElementChild!.tagName).toBe("NAV");

    rerender(<Shell sidebarMotion="slide" sidebarOpen={false} />);
    expect(root.className).toMatch(/sidebarClosed/);
    expect(sidebar).not.toHaveAttribute("hidden");
    expect(screen.getByRole("main").className).toMatch(/mainSquare/);
  });

  it('"slide" with no sidebar content is the instant frame', () => {
    const { container } = render(<Shell sidebarMotion="slide" sidebar={undefined} />);
    expect(container.firstElementChild!.className).not.toMatch(/slide/);
    expect(container.firstElementChild!.className).toMatch(/sidebarClosed/);
    expect(document.getElementById("sidebar")).toHaveAttribute("hidden");
    expect(document.getElementById("sidebar")!.children).toHaveLength(0);
  });

  it("the CSS runs the column to 0 through the sidebar's tokens", () => {
    expect(rule(".slide")).toContain(
      "transition: grid-template-columns var(--psi-app-shell-sidebar-duration) var(--psi-app-shell-sidebar-ease);",
    );
    expect(rule(".slide.sidebarClosed")).toContain("grid-template-columns: 0px minmax(0, 1fr);");
    expect(rule(".slide.sidebarClosed .sidebar")).toContain("visibility: hidden;");
    expect(rule(".slide .sidebar")).toContain("--psi-app-shell-sidebar-width: inherit;");
    expect(rule(".sidebarInner")).toContain("inline-size: var(--psi-app-shell-sidebar-width);");
    expect(rule(".sidebarInner")).toContain(
      "border-inline-end: var(--psi-app-shell-sidebar-border-width) solid transparent;",
    );
  });
});

describe("AppShell: focus inside a closing sidebar (D142)", () => {
  function Toggled({ open, motion, toggle = true, disabled = false }: { open: boolean; motion?: "instant" | "slide"; toggle?: boolean; disabled?: boolean }) {
    return (
      <AppShell
        sidebarOpen={open}
        sidebarMotion={motion}
        header={toggle ? <button aria-controls="other sidebar" disabled={disabled}>Menu</button> : <span>Header</span>}
        sidebar={<nav aria-label="Main"><a href="#a">Inside</a></nav>}
      >
        <a href="#b">Outside</a>
      </AppShell>
    );
  }

  for (const motion of ["instant", "slide"] as const) {
    it(`${motion}: moves focus from the sidebar to the toggle that names it`, () => {
      const { rerender } = render(<Toggled open motion={motion} />);
      screen.getByText("Inside").focus();
      rerender(<Toggled open={false} motion={motion} />);
      expect(screen.getByRole("button", { name: "Menu" })).toHaveFocus();
    });

    it(`${motion}: with no toggle, or a disabled one, moves it to main`, () => {
      for (const props of [{ toggle: false }, { disabled: true }]) {
        const { rerender, unmount } = render(<Toggled open motion={motion} {...props} />);
        screen.getByText("Inside").focus();
        rerender(<Toggled open={false} motion={motion} {...props} />);
        expect(document.getElementById("main")).toHaveFocus();
        unmount();
      }
    });
  }

  it("leaves focus outside the sidebar alone", () => {
    const { rerender } = render(<Toggled open motion="slide" />);
    screen.getByText("Outside").focus();
    rerender(<Toggled open={false} motion="slide" />);
    expect(screen.getByText("Outside")).toHaveFocus();
  });
});
