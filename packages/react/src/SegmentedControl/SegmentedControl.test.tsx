import { describe, it, expect, vi, afterEach } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedControl } from "./SegmentedControl.js";
import { Segment } from "./Segment.js";
import { Tabs } from "../Tabs/Tabs.js";
import { TabPanel } from "../Tabs/TabPanel.js";

afterEach(() => vi.restoreAllMocks());

function Setting({
  initial = "light",
  onChange,
  size,
  fill,
}: {
  initial?: string;
  onChange?: (v: string) => void;
  size?: 24 | 32 | 40;
  fill?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <SegmentedControl
      aria-label="Color scheme"
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      size={size}
      fill={fill}
    >
      <Segment value="light">Light</Segment>
      <Segment value="dark">Dark</Segment>
      <Segment value="contrast" disabled>
        Contrast
      </Segment>
      <Segment value="system">System</Segment>
    </SegmentedControl>
  );
}

function Views() {
  const [value, setValue] = useState("map");
  return (
    <Tabs value={value} onValueChange={setValue}>
      <SegmentedControl aria-label="Diagram">
        <Segment value="map">Map</Segment>
        <Segment value="trace">Trace</Segment>
      </SegmentedControl>
      <TabPanel value="map">The map</TabPanel>
      <TabPanel value="trace">The trace</TabPanel>
    </Tabs>
  );
}

const radio = (name: string) => screen.getByRole("radio", { name });
const tab = (name: string) => screen.getByRole("tab", { name });

describe("SegmentedControl on its own (D132)", () => {
  it("is a named radio group of radios, one tab stop on the checked one", () => {
    render(<Setting />);
    expect(screen.getByRole("radiogroup", { name: "Color scheme" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(radio("Light")).toHaveAttribute("aria-checked", "true");
    expect(radio("Dark")).toHaveAttribute("aria-checked", "false");
    expect(radio("Light")).toHaveAttribute("tabindex", "0");
    expect(radio("Dark")).toHaveAttribute("tabindex", "-1");
    expect(radio("Light").tagName).toBe("BUTTON");
    expect(radio("Light")).toHaveAttribute("type", "button");
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("selects on click, and a disabled segment refuses", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Setting onChange={onChange} />);
    await user.click(radio("Dark"));
    expect(onChange).toHaveBeenLastCalledWith("dark");
    expect(radio("Dark")).toHaveAttribute("aria-checked", "true");

    expect(radio("Contrast")).toHaveAttribute("aria-disabled", "true");
    expect(radio("Contrast")).not.toHaveAttribute("disabled");
    await user.click(radio("Contrast"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("moves and selects with the arrows on both axes, skipping disabled and wrapping", async () => {
    const user = userEvent.setup();
    render(<Setting />);
    radio("Light").focus();

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(radio("Dark"));
    expect(radio("Dark")).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(radio("System"));

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(radio("Light"));

    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(radio("System"));
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(radio("Dark"));

    await user.keyboard("{Home}");
    expect(radio("Light")).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{End}");
    expect(radio("System")).toHaveAttribute("aria-checked", "true");
  });

  it("with a value that matches nothing: none checked, the first enabled holds the stop, a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Setting initial="sepia" />);
    for (const r of screen.getAllByRole("radio")) expect(r).toHaveAttribute("aria-checked", "false");
    expect(radio("Light")).toHaveAttribute("tabindex", "0");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('SegmentedControl: value "sepia" matches no segment'));
  });

  it("defaults to size 32 and takes 24, 40 and fill", () => {
    const { container, rerender } = render(<Setting />);
    const root = () => container.firstElementChild as HTMLElement;
    expect(root()).toHaveAttribute("data-size", "32");
    expect(root()).not.toHaveAttribute("data-fill");
    rerender(<Setting size={24} />);
    expect(root()).toHaveAttribute("data-size", "24");
    rerender(<Setting size={40} fill />);
    expect(root()).toHaveAttribute("data-size", "40");
    expect(root()).toHaveAttribute("data-fill");
  });

  it("throws without value and onValueChange", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <SegmentedControl aria-label="x">
          <Segment value="a">A</Segment>
        </SegmentedControl>,
      ),
    ).toThrow(/pass value and onValueChange, or render it inside <Tabs>/);
  });

  it("a Segment outside a SegmentedControl throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Segment value="a">A</Segment>)).toThrow(/inside <SegmentedControl>/);
  });
});

describe("SegmentedControl inside Tabs (D132)", () => {
  it("is the tab list: tabs wired to their panels", () => {
    render(<Views />);
    const list = screen.getByRole("tablist", { name: "Diagram" });
    expect(list).toHaveAttribute("aria-orientation", "horizontal");
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(tab("Map")).toHaveAttribute("aria-selected", "true");
    expect(tab("Trace")).toHaveAttribute("aria-selected", "false");
    const panel = screen.getByRole("tabpanel", { name: "Map" });
    expect(tab("Map")).toHaveAttribute("aria-controls", panel.id);
    expect(tab("Map")).toHaveAttribute("tabindex", "0");
    expect(tab("Trace")).toHaveAttribute("tabindex", "-1");
  });

  it("switches the panel with a click and with ArrowRight, not ArrowDown", async () => {
    const user = userEvent.setup();
    render(<Views />);
    await user.click(tab("Trace"));
    expect(screen.getByRole("tabpanel", { name: "Trace" })).toHaveTextContent("The trace");

    tab("Trace").focus();
    await user.keyboard("{ArrowDown}");
    expect(tab("Trace")).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tab("Map"));
    expect(screen.getByRole("tabpanel", { name: "Map" })).toHaveTextContent("The map");
  });

  it("focuses a disabled segment without selecting it, as a disabled Tab does (D131)", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Tabs value="map" onValueChange={onValueChange}>
        <SegmentedControl aria-label="Diagram">
          <Segment value="map">Map</Segment>
          <Segment value="trace" disabled>
            Trace
          </Segment>
        </SegmentedControl>
        <TabPanel value="map">The map</TabPanel>
        <TabPanel value="trace">The trace</TabPanel>
      </Tabs>,
    );
    tab("Map").focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tab("Trace"));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(tab("Map")).toHaveAttribute("tabindex", "-1");
  });

  it("throws when given value or onValueChange inside Tabs", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <Tabs value="a" onValueChange={() => {}}>
          <SegmentedControl aria-label="x" value="a" onValueChange={() => {}}>
            <Segment value="a">A</Segment>
          </SegmentedControl>
          <TabPanel value="a">A</TabPanel>
        </Tabs>,
      ),
    ).toThrow(/Tabs owns the selected value/);
  });
});
