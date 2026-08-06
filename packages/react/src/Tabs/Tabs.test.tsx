import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "./Tabs.js";
import { TabList } from "./TabList.js";
import { Tab } from "./Tab.js";
import { TabPanel } from "./TabPanel.js";

function Fixture({
  value = "all",
  onValueChange = () => {},
  orientation,
}: {
  value?: string;
  onValueChange?: (v: string) => void;
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange} orientation={orientation}>
      <TabList aria-label="Views">
        <Tab value="all">All</Tab>
        <Tab value="uncategorised">Uncategorised</Tab>
        <Tab value="archived" disabled>
          Archived
        </Tab>
        <Tab value="month">This month</Tab>
      </TabList>
      <TabPanel value="all">All rows</TabPanel>
      <TabPanel value="uncategorised">Uncategorised rows</TabPanel>
      <TabPanel value="archived">Archived rows</TabPanel>
      <TabPanel value="month">Month rows</TabPanel>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("names the tablist and defaults to horizontal", () => {
    render(<Fixture />);
    const list = screen.getByRole("tablist", { name: "Views" });
    expect(list).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("reflects vertical orientation", () => {
    render(<Fixture orientation="vertical" />);
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
  });

  it("marks only the matching tab selected", () => {
    render(<Fixture value="uncategorised" />);
    expect(screen.getByRole("tab", { name: "Uncategorised" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "false");
  });

  it("wires aria-controls and aria-labelledby both ways", () => {
    render(<Fixture value="all" />);
    const tab = screen.getByRole("tab", { name: "All" });
    const panel = screen.getByRole("tabpanel");
    expect(tab.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
  });

  it("keeps exactly one tab in the tab order (roving tabindex)", () => {
    render(<Fixture value="uncategorised" />);
    const tabs = screen.getAllByRole("tab");
    const focusable = tabs.filter((t) => t.tabIndex === 0);
    expect(focusable).toHaveLength(1);
    expect(focusable[0]).toHaveAccessibleName("Uncategorised");
  });

  it("renders every panel but hides the unselected ones", () => {
    const { container } = render(<Fixture value="all" />);
    // All four exist in the DOM — aria-controls must resolve, and panel state
    // (a half-filled form) must survive a tab switch.
    const panels = container.querySelectorAll('[role="tabpanel"]');
    expect(panels).toHaveLength(4);
    // Only the selected one is exposed.
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("All rows");
  });

  it("makes the active panel a tab stop", () => {
    // Without tabIndex=0 a panel whose content has no focusable element is
    // unreachable by keyboard.
    render(<Fixture />);
    expect(screen.getByRole("tabpanel")).toHaveAttribute("tabindex", "0");
  });

  it("reports selection on click without selecting itself", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Fixture value="all" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("tab", { name: "This month" }));
    expect(onValueChange).toHaveBeenCalledWith("month");
    // Controlled-only (D50/D53/D62): the consumer flips `value`.
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
  });

  it("marks a disabled tab aria-disabled and refuses to select it", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Fixture onValueChange={onValueChange} />);

    const archived = screen.getByRole("tab", { name: "Archived" });
    // aria-disabled, not the disabled attribute — it stays discoverable (D53).
    expect(archived).toHaveAttribute("aria-disabled", "true");
    expect(archived).not.toHaveAttribute("disabled");

    await user.click(archived);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("scopes tabs to their own list when two sets coexist", () => {
    render(
      <>
        <Fixture value="all" />
        <Tabs value="x" onValueChange={() => {}}>
          <TabList aria-label="Other">
            <Tab value="x">X</Tab>
          </TabList>
          <TabPanel value="x">X panel</TabPanel>
        </Tabs>
      </>,
    );
    const other = screen.getByRole("tablist", { name: "Other" });
    expect(within(other).getAllByRole("tab")).toHaveLength(1);
    // Ids must not collide across independent sets.
    const allIds = screen.getAllByRole("tab").map((t) => t.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
