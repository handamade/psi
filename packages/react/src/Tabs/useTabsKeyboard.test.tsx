import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "./Tabs.js";
import { TabList } from "./TabList.js";
import { Tab } from "./Tab.js";
import { TabPanel } from "./TabPanel.js";

/** Controlled wrapper — automatic activation means arrow keys move focus AND
 * selection, so the tests need selection to actually advance. */
function Live({ orientation }: { orientation?: "horizontal" | "vertical" }) {
  const [value, setValue] = useState("all");
  return (
    <Tabs value={value} onValueChange={setValue} orientation={orientation}>
      <TabList aria-label="Views">
        <Tab value="all">All</Tab>
        <Tab value="uncat">Uncategorised</Tab>
        <Tab value="archived" disabled>
          Archived
        </Tab>
        <Tab value="month">This month</Tab>
      </TabList>
      <TabPanel value="all">All rows</TabPanel>
      <TabPanel value="uncat">Uncategorised rows</TabPanel>
      <TabPanel value="archived">Archived rows</TabPanel>
      <TabPanel value="month">Month rows</TabPanel>
    </Tabs>
  );
}

const tab = (name: string) => screen.getByRole("tab", { name });

describe("useTabsKeyboard", () => {
  it("moves to the next enabled tab on ArrowRight, selection following focus", async () => {
    const user = userEvent.setup();
    render(<Live />);
    tab("All").focus();

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tab("Uncategorised"));
    expect(tab("Uncategorised")).toHaveAttribute("aria-selected", "true");
  });

  it("reaches a disabled tab and focuses it without selecting it (D131)", async () => {
    const user = userEvent.setup();
    render(<Live />);
    tab("All").focus();

    await user.keyboard("{ArrowRight}{ArrowRight}");
    // Archived sits between Uncategorised and This month: it takes focus and
    // the tab stop, and the selection stays where it was.
    expect(document.activeElement).toBe(tab("Archived"));
    expect(tab("Archived")).toHaveAttribute("aria-selected", "false");
    expect(tab("Uncategorised")).toHaveAttribute("aria-selected", "true");
    expect(tab("Archived")).toHaveAttribute("tabindex", "0");
    expect(tab("Uncategorised")).toHaveAttribute("tabindex", "-1");
  });

  it("moves on from a disabled tab in both directions", async () => {
    const user = userEvent.setup();
    render(<Live />);
    tab("All").focus();

    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(document.activeElement).toBe(tab("This month"));
    expect(tab("This month")).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(document.activeElement).toBe(tab("Uncategorised"));
    expect(tab("Uncategorised")).toHaveAttribute("aria-selected", "true");
  });

  it("wraps at both ends", async () => {
    const user = userEvent.setup();
    render(<Live />);
    tab("All").focus();

    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(tab("This month"));

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tab("All"));
  });

  it("Home and End jump to the first and last tab", async () => {
    const user = userEvent.setup();
    render(<Live />);
    tab("All").focus();

    await user.keyboard("{End}");
    expect(document.activeElement).toBe(tab("This month"));

    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(tab("All"));
  });

  it("ignores the cross-axis keys when horizontal", async () => {
    const user = userEvent.setup();
    render(<Live />);
    tab("All").focus();

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(tab("All"));
    expect(tab("All")).toHaveAttribute("aria-selected", "true");
  });

  it("uses the block axis when vertical, and ignores Left/Right", async () => {
    const user = userEvent.setup();
    render(<Live orientation="vertical" />);
    tab("All").focus();

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(tab("Uncategorised"));

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tab("Uncategorised"));
  });

  it("Home and End reach a disabled tab at either end, and select nothing (D131)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Tabs value="b" onValueChange={onValueChange}>
        <TabList aria-label="Edges">
          <Tab value="a" disabled>
            A
          </Tab>
          <Tab value="b">B</Tab>
          <Tab value="c" disabled>
            C
          </Tab>
        </TabList>
        <TabPanel value="a">A</TabPanel>
        <TabPanel value="b">B</TabPanel>
        <TabPanel value="c">C</TabPanel>
      </Tabs>,
    );
    tab("B").focus();

    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(tab("A"));
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(tab("C"));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(tab("B")).toHaveAttribute("aria-selected", "true");
  });

  it("does not select itself — onValueChange is the only channel", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Tabs value="all" onValueChange={onValueChange}>
        <TabList aria-label="Views">
          <Tab value="all">All</Tab>
          <Tab value="uncat">Uncategorised</Tab>
        </TabList>
        <TabPanel value="all">All rows</TabPanel>
        <TabPanel value="uncat">Uncategorised rows</TabPanel>
      </Tabs>,
    );
    tab("All").focus();

    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenCalledWith("uncat");
    expect(tab("All")).toHaveAttribute("aria-selected", "true");
  });
});
