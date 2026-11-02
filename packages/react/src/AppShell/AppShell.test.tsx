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
  // jsdom does no layout and no paint, so these read the rules; what they paint
  // is measured in a browser by apps/storybook/vr/app-shell.interaction.spec.ts.
  const css = readFileSync(join(import.meta.dirname, "app-shell.module.css"), "utf8");
  const rule = (selector: string) => new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`).exec(css)?.[1];

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
