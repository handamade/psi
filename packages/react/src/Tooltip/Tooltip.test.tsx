import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "./Tooltip.js";

describe("Tooltip", () => {
  it("does not show tooltip content by default", () => {
    render(
      <Tooltip content="Help text">
        <button>Trigger</button>
      </Tooltip>,
    );
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows tooltip on focus and hides on blur", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Help text">
        <button>Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Trigger" });

    await user.tab();
    expect(trigger).toHaveFocus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Help text");

    await user.tab();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("sets aria-describedby on trigger when visible", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Descriptive text">
        <button>Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Trigger" });

    expect(trigger).not.toHaveAttribute("aria-describedby");

    await user.tab();
    const tooltip = screen.getByRole("tooltip");
    expect(trigger).toHaveAttribute("aria-describedby", tooltip.id);
  });

  it("removes aria-describedby when hidden", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Text">
        <button>Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Trigger" });

    await user.tab();
    expect(trigger).toHaveAttribute("aria-describedby");

    await user.tab();
    expect(trigger).not.toHaveAttribute("aria-describedby");
  });

  it("applies placement class", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Bottom tooltip" placement="bottom">
        <button>Trigger</button>
      </Tooltip>,
    );
    await user.tab();
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("bottom");
  });

  it("defaults to top placement", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Top tooltip">
        <button>Trigger</button>
      </Tooltip>,
    );
    await user.tab();
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("top");
  });

  it("preserves child event handlers", async () => {
    const user = userEvent.setup();
    let focused = false;
    render(
      <Tooltip content="Text">
        <button onFocus={() => { focused = true; }}>Trigger</button>
      </Tooltip>,
    );
    await user.tab();
    expect(focused).toBe(true);
  });

  it("closes on Escape while visible (WCAG 1.4.13)", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="tip">
        <button>t</button>
      </Tooltip>,
    );
    await user.tab(); // focus shows immediately
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("delays open on hover but not on focus", () => {
    vi.useFakeTimers();
    try {
      const { container: hoverContainer } = render(
        <Tooltip content="tip">
          <button>hover-trigger</button>
        </Tooltip>,
      );
      const hoverScope = within(hoverContainer);
      const hoverTrigger = hoverScope.getByRole("button", {
        name: "hover-trigger",
      });

      fireEvent.mouseEnter(hoverTrigger);
      expect(hoverScope.queryByRole("tooltip")).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(hoverScope.queryByRole("tooltip")).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(50); // total 150ms
      });
      expect(hoverScope.getByRole("tooltip")).toHaveTextContent("tip");

      // Focus shows immediately, no delay, on a fresh render.
      const { container: focusContainer } = render(
        <Tooltip content="focus-tip">
          <button>focus-trigger</button>
        </Tooltip>,
      );
      const focusScope = within(focusContainer);
      const focusTrigger = focusScope.getByRole("button", {
        name: "focus-trigger",
      });
      act(() => {
        fireEvent.focus(focusTrigger);
      });
      expect(focusScope.getByRole("tooltip")).toHaveTextContent("focus-tip");
    } finally {
      vi.useRealTimers();
    }
  });
  describe("hoverable (WCAG 1.4.13, D105)", () => {
    const openByHover = (trigger: HTMLElement) => {
      fireEvent.mouseOver(trigger);
      act(() => {
        vi.advanceTimersByTime(150);
      });
    };

    it("stays open when the pointer moves from the trigger onto the bubble", () => {
      vi.useFakeTimers();
      try {
        render(
          <Tooltip content="tip">
            <button>t</button>
          </Tooltip>,
        );
        const trigger = screen.getByRole("button", { name: "t" });
        openByHover(trigger);
        const bubble = screen.getByRole("tooltip");
        fireEvent.mouseOut(trigger, { relatedTarget: bubble });
        fireEvent.mouseOver(bubble, { relatedTarget: trigger });
        act(() => {
          vi.advanceTimersByTime(500);
        });
        expect(screen.getByRole("tooltip")).toHaveTextContent("tip");
      } finally {
        vi.useRealTimers();
      }
    });

    it("closes when the pointer leaves the trigger and the bubble", () => {
      vi.useFakeTimers();
      try {
        render(
          <Tooltip content="tip">
            <button>t</button>
          </Tooltip>,
        );
        const trigger = screen.getByRole("button", { name: "t" });
        openByHover(trigger);
        const bubble = screen.getByRole("tooltip");
        fireEvent.mouseOut(trigger, { relatedTarget: bubble });
        fireEvent.mouseOver(bubble, { relatedTarget: trigger });
        fireEvent.mouseOut(bubble, { relatedTarget: document.body });
        expect(screen.queryByRole("tooltip")).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it("still runs a child's own mouse handlers and opens on its hover", () => {
      vi.useFakeTimers();
      try {
        const onEnter = vi.fn();
        const onLeave = vi.fn();
        render(
          <Tooltip content="tip">
            <button onMouseEnter={onEnter} onMouseLeave={onLeave}>t</button>
          </Tooltip>,
        );
        const trigger = screen.getByRole("button", { name: "t" });
        openByHover(trigger);
        expect(onEnter).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("tooltip")).toBeInTheDocument();
        fireEvent.mouseOut(trigger, { relatedTarget: document.body });
        expect(onLeave).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("tooltip")).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it("lets the bubble take the pointer and bridges the gap on every side", () => {
      const css = readFileSync(join(import.meta.dirname, "tooltip.module.css"), "utf8");
      const bubble = /\.tooltip\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
      expect(bubble).not.toMatch(/pointer-events:\s*none/);
      const bridge = /\.tooltip::before\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
      expect(bridge).toMatch(/content:\s*""/);
      expect(bridge).toMatch(/position:\s*absolute/);
      for (const side of ["top", "bottom", "left", "right"]) {
        const rule = new RegExp(`\\.${side}::before\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? "";
        expect(rule, side).toMatch(/var\(--psi-space-4\)/);
      }
    });
  });
});
