import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as allIcons from "./index.js";
import { IconPlus } from "./IconPlus.js";
import { IconClose } from "./IconClose.js";
import { IconSearch } from "./IconSearch.js";
import { IconArrowDown } from "./IconArrowDown.js";
import { IconArrowUpRight } from "./IconArrowUpRight.js";
import { IconLinkedIn } from "./IconLinkedIn.js";
import { IconGitHub } from "./IconGitHub.js";
import { IconX } from "./IconX.js";
import { IconInstagram } from "./IconInstagram.js";
import { IconInfo } from "./IconInfo.js";
import { IconAlertTriangle } from "./IconAlertTriangle.js";
import { IconAlertCircle } from "./IconAlertCircle.js";
import { IconMoreHorizontal } from "./IconMoreHorizontal.js";
import { IconMenu } from "./IconMenu.js";
import { IconChevronLeft } from "./IconChevronLeft.js";
import { IconLogOut } from "./IconLogOut.js";
import { IconSimCard } from "./IconSimCard.js";
import {
  IconShieldCheck,
  IconBlocks,
  IconFileCog,
  IconCrosshair,
  IconCirclePlay,
  IconChartColumnBig,
  IconScrollText,
  IconActivity,
} from "./index.js";

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

  // D64 — Toast's status icons. IconCheck already serves `success`.
  it("renders the status icons", () => {
    const icons = [
      <IconInfo key="info" />,
      <IconAlertTriangle key="alert-triangle" />,
      <IconAlertCircle key="alert-circle" />,
    ];
    icons.forEach((icon) => {
      const { container } = render(icon);
      const svg = container.querySelector("svg")!;
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("width", "20");
      expect(svg).toHaveAttribute("height", "20");
    });
  });

  it("gives each status icon a distinct shape", () => {
    const shapes = [<IconInfo key="i" />, <IconAlertTriangle key="t" />, <IconAlertCircle key="c" />].map(
      (icon) => render(icon).container.querySelector("svg")!.innerHTML,
    );
    expect(new Set(shapes).size).toBe(3);
  });

  it("honours a custom size on the status icons", () => {
    const { container } = render(<IconAlertCircle size={16} />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("width", "16");
    expect(svg).toHaveAttribute("height", "16");
  });

  // D81 — the application-shell glyphs an admin console needs: the navigation
  // toggle, collapsing the sidebar, signing out, and a SIM card for card estates.
  it("ships the application-shell glyphs, each with its own shape (D81)", () => {
    const shapes = [
      <IconMenu key="menu" />,
      <IconChevronLeft key="chevron-left" />,
      <IconLogOut key="log-out" />,
      <IconSimCard key="sim-card" />,
    ].map((icon) => {
      const svg = render(icon).container.querySelector("svg")!;
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("width", "20");
      expect(svg).toHaveAttribute("stroke", "currentColor");
      return svg.innerHTML;
    });
    expect(new Set(shapes).size).toBe(4);
  });

  it("ships an ellipsis glyph for row-actions triggers (D70)", () => {
    const { container } = render(<IconMoreHorizontal />);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    // Three filled dots. row-actions specified an icon trigger before any
    // ellipsis existed; this is the referent for that placeholder.
    expect(svg.querySelectorAll("circle")).toHaveLength(3);
  });

  // D137 — one glyph per section of a navigation tree, copied from Lucide.
  const navSection = {
    IconShieldCheck,
    IconBlocks,
    IconFileCog,
    IconCrosshair,
    IconCirclePlay,
    IconChartColumnBig,
    IconScrollText,
    IconActivity,
  };

  it("ships the navigation-section glyphs in Psi's stroke shape, each with its own shape (D137)", () => {
    const shapes = Object.values(navSection).map((Icon) => {
      const svg = render(<Icon />).container.querySelector("svg")!;
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("width", "20");
      expect(svg).toHaveAttribute("height", "20");
      expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
      expect(svg).toHaveAttribute("fill", "none");
      expect(svg).toHaveAttribute("stroke", "currentColor");
      expect(svg).toHaveAttribute("stroke-width", "2");
      expect(svg).toHaveAttribute("stroke-linecap", "round");
      expect(svg).toHaveAttribute("stroke-linejoin", "round");
      expect(svg.children.length).toBeGreaterThan(0);
      return svg.innerHTML;
    });
    expect(new Set(shapes).size).toBe(8);
  });

  it("gives every exported icon a 24-unit grid, aria-hidden and a default size of 20", () => {
    const entries = Object.entries(allIcons);
    expect(entries.length).toBe(38);
    for (const [name, Icon] of entries) {
      const svg = render(<Icon />).container.querySelector("svg");
      expect(svg, name).not.toBeNull();
      expect(svg!.getAttribute("viewBox"), name).toBe("0 0 24 24");
      expect(svg!.getAttribute("aria-hidden"), name).toBe("true");
      expect(svg!.getAttribute("width"), name).toBe("20");
    }
  });

  // The notice ships in the tarball (package.json `files`). Every third-party
  // icon must be listed under its source, and every listed icon must exist.
  it("lists every Lucide icon in THIRD-PARTY-NOTICES.md, and names only icons that exist (D137)", () => {
    const notice = readFileSync(join(import.meta.dirname, "../../THIRD-PARTY-NOTICES.md"), "utf8");
    const sections = notice.split(/^## /m).slice(1);
    const covered = (heading: string) => {
      const section = sections.find((s) => s.startsWith(heading));
      expect(section, heading).toBeDefined();
      return new Set(section!.match(/\bIcon[A-Z]\w*/g) ?? []);
    };
    const lucide = covered("Lucide");
    for (const name of Object.keys(navSection)) expect(lucide.has(name), name).toBe(true);
    const exported = new Set(Object.keys(allIcons));
    for (const name of notice.match(/\bIcon[A-Z]\w*/g) ?? []) {
      expect(exported.has(name), `${name} in the notice`).toBe(true);
    }
  });
});
