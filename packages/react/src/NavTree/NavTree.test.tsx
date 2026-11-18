import { createRef } from "react";
import type { ReactNode } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavTree } from "./NavTree.js";
import { NavGroup } from "./NavGroup.js";
import { NavItem } from "./NavItem.js";
import { Count } from "../Count/Count.js";
import { IconSimCard } from "../icons/IconSimCard.js";

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

describe("NavItem href and current (D88)", () => {
  it("with href renders the anchor itself, children as its text", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem href="#reports">Reports</NavItem>
      </NavTree>,
    );
    const link = screen.getByRole("link", { name: "Reports" });
    expect(link).toHaveAttribute("href", "#reports");
    expect(link.tagName).toBe("A");
    expect(link.closest("li")).not.toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("current marks the anchor aria-current=page", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem href="#a" current>
          A
        </NavItem>
      </NavTree>,
    );
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute("aria-current", "page");
  });

  it("without current the anchor carries no aria-current", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem href="#a">A</NavItem>
        <NavItem href="#b" current={false}>
          B
        </NavItem>
      </NavTree>,
    );
    expect(screen.getByRole("link", { name: "A" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "B" })).not.toHaveAttribute("aria-current");
  });

  it("without href still renders the consumer's single anchor child, keeping its own props", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <NavTree aria-label="Main">
        <NavItem>
          <a href="#own" onClick={onClick}>
            Own
          </a>
        </NavItem>
      </NavTree>,
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "#own");
    expect(links[0]).not.toHaveAttribute("aria-current");
    await user.click(links[0]);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("NavItem current on a child link (D93)", () => {
  it("current marks a child link aria-current=page", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem current>
          <a href="/x">X</a>
        </NavItem>
      </NavTree>,
    );
    const link = screen.getByRole("link", { name: "X" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link).toHaveAttribute("href", "/x");
  });

  it("current keeps the child's own props and handlers", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <NavTree aria-label="Main">
        <NavItem current>
          <a href="/x" className="router-link" onClick={onClick}>
            X
          </a>
        </NavItem>
      </NavTree>,
    );
    const link = screen.getByRole("link", { name: "X" });
    expect(link).toHaveClass("router-link");
    await user.click(link);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("without current leaves the child's own aria-current alone", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem>
          <a href="/x" aria-current="page">
            X
          </a>
        </NavItem>
      </NavTree>,
    );
    expect(screen.getByRole("link", { name: "X" })).toHaveAttribute("aria-current", "page");
  });

  it("current={false} also leaves the child's own aria-current alone", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem current={false}>
          <a href="/x" aria-current="location">
            X
          </a>
        </NavItem>
      </NavTree>,
    );
    expect(screen.getByRole("link", { name: "X" })).toHaveAttribute("aria-current", "location");
  });

  it("current renders a non-element child untouched", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem current>Plain text</NavItem>
      </NavTree>,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("Plain text");
  });
});

describe("NavItem parent of the current screen (D96)", () => {
  // jsdom does no layout, so these read the rules; the rendering itself is
  // measured in a browser by apps/storybook/vr/nav-tree.interaction.spec.ts.
  const css = readFileSync(join(import.meta.dirname, "nav-tree.module.css"), "utf8");
  const rule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
    return new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css)?.[1];
  };
  it("marks a link with aria-current=true by the current colour and medium weight", () => {
    const body = rule('.item a[aria-current="true"]');
    expect(body).toMatch(/color:\s*var\(--psi-nav-tree-item-fg-current\);/);
    expect(body).toMatch(/font:\s*var\(--psi-text-14-20-medium\);/);
  });
  it("gives the parent no surface and no bar: those stay the marks of the page itself", () => {
    expect(rule('.item a[aria-current="true"]')).not.toMatch(/background/);
    expect(css).not.toMatch(/aria-current="true"\]::before/);
  });
});

const navCss = readFileSync(join(import.meta.dirname, "nav-tree.module.css"), "utf8");

describe("NavItem icon and count (D124)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("with href: icon, label and count sit inside the link, in that order", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem href="#cards" icon={<IconSimCard />} count={<Count value={238} />}>
          Cards
        </NavItem>
      </NavTree>,
    );
    const link = screen.getByRole("link", { name: "Cards 238" });
    const parts = Array.from(link.children).map((el) => el.className);
    expect(parts[0]).toMatch(/icon/);
    expect(parts[1]).toMatch(/label/);
    expect(parts[2]).toMatch(/countSlot/);
    expect(link.children[0]).toHaveAttribute("aria-hidden", "true");
    expect(link.children[0].querySelector("svg")).not.toBeNull();
  });

  it("a count's label joins the link's name in place of the number", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem href="#cards" count={<Count value={4} tone="attention" label="4 stuck" />}>
          Cards
        </NavItem>
      </NavTree>,
    );
    expect(screen.getByRole("link", { name: "Cards 4 stuck" })).toBeInTheDocument();
  });

  it("an icon alone leaves the name as the label", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem href="#cards" icon={<IconSimCard />}>
          Cards
        </NavItem>
      </NavTree>,
    );
    expect(screen.getByRole("link", { name: "Cards" })).toBeInTheDocument();
  });

  it("with a router child: clones it, keeps its props and handlers, and fills it", async () => {
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    render(
      <NavTree aria-label="Main">
        <NavItem current icon={<IconSimCard />} count={<Count value={238} />}>
          <a href="#cards" className="router" onClick={onClick}>
            Cards
          </a>
        </NavItem>
      </NavTree>,
    );
    const link = screen.getByRole("link", { name: "Cards 238" });
    expect(link).toHaveClass("router");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link.children[0]).toHaveAttribute("aria-hidden", "true");
    await userEvent.click(link);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("without current, a decorated router child keeps its own aria-current", () => {
    render(
      <NavTree aria-label="Main">
        <NavItem icon={<IconSimCard />}>
          <a href="#cards" aria-current="true">
            Cards
          </a>
        </NavItem>
      </NavTree>,
    );
    expect(screen.getByRole("link", { name: "Cards" })).toHaveAttribute("aria-current", "true");
  });

  it("with neither prop, the markup is what it was: no wrappers", () => {
    const { container } = render(
      <NavTree aria-label="Main">
        <NavItem href="#a">A</NavItem>
        <NavItem>
          <a href="#b">B</a>
        </NavItem>
      </NavTree>,
    );
    for (const link of container.querySelectorAll("a")) {
      expect(link.children).toHaveLength(0);
    }
  });

  it("a string child with an icon renders the string, no icon, and warns once in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <NavTree aria-label="Main">
        <NavItem icon={<IconSimCard />}>Cards</NavItem>
      </NavTree>,
    );
    expect(container.querySelector("li")).toHaveTextContent("Cards");
    expect(container.querySelector("svg")).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("a Fragment child with a count renders its content, no count, and warns once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(
      <NavTree aria-label="Main">
        <NavItem count={<Count value={3} />}>
          <>
            <a href="#a">A</a>
          </>
        </NavItem>
      </NavTree>,
    );
    expect(container.querySelector("li")).toHaveTextContent(/^A$/);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("a router link with function children keeps working: icon, label and count, no console.error", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    function FnLink({ to, children }: { to: string; children: (s: { isActive: boolean }) => ReactNode }) {
      return <a href={to}>{children({ isActive: true })}</a>;
    }
    render(
      <NavTree aria-label="Main">
        <NavItem icon={<IconSimCard />} count={<Count value={238} />}>
          <FnLink to="#cards">{({ isActive }) => (isActive ? "Cards" : "x")}</FnLink>
        </NavItem>
      </NavTree>,
    );
    const link = screen.getByRole("link", { name: "Cards 238" });
    expect(link.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(link.firstElementChild?.querySelector("svg")).not.toBeNull();
    expect(error).not.toHaveBeenCalled();
  });

  it("does not warn when the props have somewhere to go", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <NavTree aria-label="Main">
        <NavItem href="#a" icon={<IconSimCard />}>
          A
        </NavItem>
      </NavTree>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("CSS: the icon is sized by the token and the count is pushed to the inline end", () => {
    expect(navCss).toMatch(/\.icon > svg\s*\{[^}]*inline-size:\s*var\(--psi-nav-tree-icon-size\)/);
    expect(navCss).toMatch(/\.icon > svg\s*\{[^}]*block-size:\s*var\(--psi-nav-tree-icon-size\)/);
    expect(navCss).toMatch(/\.countSlot\s*\{[^}]*margin-inline-start:\s*auto/);
    expect(navCss).toMatch(/\.label\s*\{[^}]*min-width:\s*0/);
  });
});

describe("NavGroup icon (D124)", () => {
  it("puts the icon in the button before the label, hidden; the name is the label", () => {
    render(
      <NavTree aria-label="Main">
        <NavGroup label="Reports" icon={<IconSimCard />} open={false} onOpenChange={() => {}}>
          <NavItem href="#s">Sales</NavItem>
        </NavGroup>
      </NavTree>,
    );
    const button = screen.getByRole("button", { name: "Reports" });
    const first = button.children[0];
    expect(first.className).toMatch(/icon/);
    expect(first).toHaveAttribute("aria-hidden", "true");
    expect(first.querySelector("svg")).not.toBeNull();
  });

  it("keeps the icon when the group is closed", () => {
    const { rerender } = render(
      <NavTree aria-label="Main">
        <NavGroup label="Reports" icon={<IconSimCard />} open onOpenChange={() => {}}>
          <NavItem href="#s">Sales</NavItem>
        </NavGroup>
      </NavTree>,
    );
    rerender(
      <NavTree aria-label="Main">
        <NavGroup label="Reports" icon={<IconSimCard />} open={false} onOpenChange={() => {}}>
          <NavItem href="#s">Sales</NavItem>
        </NavGroup>
      </NavTree>,
    );
    expect(screen.getByRole("button", { name: "Reports" }).children[0].className).toMatch(/icon/);
  });

  it("CSS: the chevron keeps the inline end when an icon joins the row", () => {
    expect(navCss).toMatch(/\.chevron\s*\{[^}]*margin-inline-start:\s*auto/);
  });

  it("marks a group with an icon, and only then, so its items can line up under the label", () => {
    render(
      <NavTree aria-label="Main">
        <NavGroup label="Reports" icon={<IconSimCard />} open onOpenChange={() => {}}>
          <NavItem href="#s">Sales</NavItem>
        </NavGroup>
        <NavGroup label="Settings" open onOpenChange={() => {}}>
          <NavItem href="#p">Profile</NavItem>
        </NavGroup>
      </NavTree>,
    );
    const [withIcon, without] = screen.getAllByRole("button").map((b) => b.closest("li")!);
    expect(withIcon.className).toMatch(/withIcon/);
    expect(without.className).not.toMatch(/withIcon/);
  });

  it("CSS: under an icon group, items start where the label's text starts", () => {
    // The label's text sits after the icon and the button's own gap (space-8),
    // so the list is inset by exactly that much from the button's padding.
    expect(navCss).toMatch(
      /\.withIcon > \.groupList\s*\{[^}]*padding-inline-start:\s*calc\(var\(--psi-nav-tree-icon-size\) \+ var\(--psi-space-8\)\)/,
    );
  });
});

describe("Icon colours, guide line and the bar on it (D138)", () => {
  // jsdom does no layout or cascade, so these read the rules. The pixels (the
  // line at 19px, the bar on it, RTL) are measured in a browser by
  // apps/storybook/vr/nav-tree.interaction.spec.ts.
  const css = navCss;
  const body = (selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
    return [...css.matchAll(new RegExp(`(?:^|\\}|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`, "g"))].map((m) => m[1]).join("\n");
  };

  it("an entry's icon and a group's icon each bind their own colour token", () => {
    expect(body(".item .icon")).toMatch(/color:\s*var\(--psi-nav-tree-item-icon-fg\);/);
    expect(body(".groupButton .icon")).toMatch(/color:\s*var\(--psi-nav-tree-group-icon-fg\);/);
  });

  it("the current entry's icon, page or parent, follows its text", () => {
    expect(css).toMatch(
      /\.item a\[aria-current="page"\] \.icon,\s*\.item a\[aria-current="true"\] \.icon\s*\{\s*color:\s*currentColor;\s*\}/,
    );
  });

  it("only a group with an icon draws the guide line, as a border from the guide tokens", () => {
    const line = body(".withIcon > .groupList::before");
    expect(line).toMatch(/content:\s*"";/);
    expect(line).toMatch(/position:\s*absolute;/);
    expect(line).toMatch(/inset-block:\s*var\(--psi-space-2\);/);
    expect(line).toMatch(
      /border-inline-start:\s*var\(--psi-nav-tree-guide-width\) solid var\(--psi-nav-tree-guide-border\);/,
    );
    expect(body(".withIcon > .groupList")).toMatch(/position:\s*relative;/);
    // No line under a group without an icon.
    expect(css.match(/\.groupList::before/g)).toHaveLength(css.match(/\.withIcon > \.groupList::before/g)!.length);
  });

  it("the line's column is computed from the button's padding and the icon size, not a token", () => {
    const line = body(".withIcon > .groupList::before");
    expect(line).toMatch(
      /inset-inline-start:\s*calc\(var\(--psi-space-12\) \+ \(var\(--psi-nav-tree-icon-size\) - var\(--psi-nav-tree-guide-width\)\) \/ 2\);/,
    );
    expect(css).not.toMatch(/--psi-nav-tree-guide-(column|offset|inset)/);
  });

  it("the bar reads its width, block inset and radius from tokens", () => {
    const bar = body('.item a[aria-current="page"]::before');
    expect(bar).toMatch(/width:\s*var\(--psi-nav-tree-indicator-width\);/);
    expect(bar).toMatch(/inset-block:\s*var\(--psi-nav-tree-indicator-inset-block\);/);
    expect(bar).toMatch(/border-radius:\s*var\(--psi-nav-tree-indicator-radius\);/);
    expect(bar).toMatch(/inset-inline-start:\s*0;/);
    expect(bar).not.toMatch(/3px/);
  });

  it("under a guided group, the bar's offset is clamped to 0 by the guide's width, so it moves only when the line draws", () => {
    const bar = body('.withIcon > .groupList > .item a[aria-current="page"]::before');
    expect(bar).toMatch(
      /inset-inline-start:\s*clamp\(\s*calc\(var\(--psi-nav-tree-guide-width\) \* -1000\),[^;]*var\(--psi-nav-tree-indicator-width\)[^;]*calc\(var\(--psi-nav-tree-guide-width\) \* 1000\)\s*\);/,
    );
  });

  it("round() is only used behind @supports: Psi's floor (Chrome 119) predates it", () => {
    const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const supports = /@supports \(inset-inline-start: round\(down, 1\.5px, 1px\)\) \{[\s\S]*?\n\}/.exec(code)?.[0] ?? "";
    const outside = code.replace(supports, "");
    expect(supports).toMatch(/round\(down,/);
    expect(outside).not.toMatch(/round\(/);
  });
});
