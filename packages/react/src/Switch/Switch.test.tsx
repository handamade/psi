import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { Switch } from "./Switch.js";

describe("Switch", () => {
  it("renders a switch with label text", () => {
    render(<Switch>Dark mode</Switch>);
    expect(
      screen.getByRole("switch", { name: "Dark mode" }),
    ).toBeInTheDocument();
  });

  it("toggles checked state via click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch onChange={onChange}>Toggle</Switch>);
    const sw = screen.getByRole("switch", { name: "Toggle" });
    expect(sw).not.toBeChecked();
    await user.click(sw);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("renders checked when controlled", () => {
    render(
      <Switch checked onChange={() => {}}>
        On
      </Switch>,
    );
    expect(screen.getByRole("switch", { name: "On" })).toBeChecked();
  });

  it("supports disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Switch disabled onChange={onChange}>
        Disabled
      </Switch>,
    );
    const sw = screen.getByRole("switch", { name: "Disabled" });
    expect(sw).toBeDisabled();
    await user.click(sw);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Switch ref={ref}>Ref</Switch>);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current!.type).toBe("checkbox");
  });

  it("has role=switch", () => {
    render(<Switch>Mode</Switch>);
    const sw = screen.getByRole("switch");
    expect(sw).toBeInTheDocument();
  });

  it("applies disabled class to label", () => {
    const { container } = render(<Switch disabled>Disabled</Switch>);
    const label = container.querySelector("label")!;
    expect(label.className).toContain("disabled");
  });

  it("toggles with Space via keyboard", async () => {
    const user = userEvent.setup();
    render(<Switch>Notify</Switch>);
    await user.tab();
    expect(screen.getByRole("switch")).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("switch")).toBeChecked();
  });
});
