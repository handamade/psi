import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import type { AnchorHTMLAttributes, Ref } from "react";
import { Link } from "./Link.js";

/** A stand-in for a router's link: an anchor that takes every anchor prop. */
function RouterLink({ to, ref, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; ref?: Ref<HTMLAnchorElement> }) {
  return <a ref={ref} href={to} data-router="yes" {...rest} />;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Link with href (D119)", () => {
  it("renders one anchor with psi-link and the consumer's class", () => {
    render(<Link href="/invoices" className="mine">Invoices</Link>);
    const a = screen.getByRole("link", { name: "Invoices" });
    expect(a).toHaveAttribute("href", "/invoices");
    expect(a).toHaveClass("psi-link", "mine");
  });

  it("forwards ref and anchor props", () => {
    const ref = createRef<HTMLAnchorElement>();
    render(<Link href="/a" ref={ref} target="_blank" rel="noreferrer" id="x">A</Link>);
    const a = screen.getByRole("link", { name: "A" });
    expect(ref.current).toBe(a);
    expect(a).toHaveAttribute("target", "_blank");
    expect(a).toHaveAttribute("rel", "noreferrer");
    expect(a).toHaveAttribute("id", "x");
  });

  it("marks aria-current=page only with current", () => {
    const { rerender } = render(<Link href="/a">A</Link>);
    expect(screen.getByRole("link")).not.toHaveAttribute("aria-current");
    rerender(<Link href="/a" current>A</Link>);
    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
  });
});

describe("Link with a child link (D119, the D93 pattern)", () => {
  it("renders the child itself, not a wrapper, merging the classes", () => {
    const { container } = render(
      <Link className="mine">
        <RouterLink to="/a" className="own">A</RouterLink>
      </Link>,
    );
    expect(container.querySelectorAll("a")).toHaveLength(1);
    const a = screen.getByRole("link", { name: "A" });
    expect(a).toHaveAttribute("data-router", "yes");
    expect(a).toHaveClass("psi-link", "own", "mine");
  });

  it("leaves the child's handlers alone", async () => {
    const onClick = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <Link>
        <RouterLink to="/a" onClick={onClick}>A</RouterLink>
      </Link>,
    );
    await userEvent.click(screen.getByRole("link", { name: "A" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("current adds aria-current=page to the child", () => {
    render(
      <Link current>
        <RouterLink to="/a">A</RouterLink>
      </Link>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
  });

  it("without current, the child's own aria-current survives", () => {
    render(
      <Link>
        <RouterLink to="/a" aria-current="page">A</RouterLink>
      </Link>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
  });

  it("does not warn", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Link>
        <RouterLink to="/a">A</RouterLink>
      </Link>,
    );
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("Link with nothing to style (D119)", () => {
  it("renders a string child as it is and warns once in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container, rerender } = render(<Link>just text</Link>);
    rerender(<Link>just text</Link>);
    expect(container.textContent).toBe("just text");
    expect(container.querySelector("a")).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("Link: pass href, or one link element as the child; nothing was styled.");
  });

  it("does not warn in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Link>just text</Link>);
    expect(warn).not.toHaveBeenCalled();
  });
});
