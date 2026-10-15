import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioGroup } from "./RadioGroup.js";
import { Radio } from "./Radio.js";
import { Field } from "../Field/Field.js";

const options = (
  <>
    <Radio value="bug">Something is broken</Radio>
    <Radio value="idea">An idea</Radio>
    <Radio value="other">Something else</Radio>
  </>
);
const radios = () => screen.getAllByRole("radio") as HTMLInputElement[];

describe("RadioGroup (D104)", () => {
  it("renders native radios sharing one name", () => {
    render(<RadioGroup aria-label="Category">{options}</RadioGroup>);
    const names = new Set(radios().map((r) => r.name));
    expect(radios()).toHaveLength(3);
    expect(names.size).toBe(1);
    expect([...names][0]).not.toBe("");
  });

  it("calls onValueChange with the clicked radio's value", async () => {
    const onValueChange = vi.fn();
    render(<RadioGroup aria-label="Category" onValueChange={onValueChange}>{options}</RadioGroup>);
    await userEvent.click(screen.getByRole("radio", { name: "An idea" }));
    expect(onValueChange).toHaveBeenCalledWith("idea");
  });

  it("follows value when controlled", async () => {
    function Controlled() {
      const [v, setV] = useState("bug");
      return <RadioGroup aria-label="Category" value={v} onValueChange={setV}>{options}</RadioGroup>;
    }
    render(<Controlled />);
    expect(screen.getByRole("radio", { name: "Something is broken" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "Something else" }));
    expect(screen.getByRole("radio", { name: "Something else" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Something is broken" })).not.toBeChecked();
  });

  it("standalone, is a radiogroup named by its aria-label", () => {
    render(<RadioGroup aria-label="Category">{options}</RadioGroup>);
    expect(screen.getByRole("radiogroup", { name: "Category" })).toBeInTheDocument();
  });

  it("inside Field group, adds no role: the fieldset is named by the legend", () => {
    render(
      <Field group label="Category">
        <RadioGroup>{options}</RadioGroup>
      </Field>,
    );
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.getByRole("group", { name: "Category" })).toBeInTheDocument();
  });

  it("a required, invalid Field makes every radio required and aria-invalid", () => {
    render(
      <Field group label="Category" required error="Pick one.">
        <RadioGroup>{options}</RadioGroup>
      </Field>,
    );
    for (const r of radios()) {
      expect(r).toBeRequired();
      expect(r).toHaveAttribute("aria-invalid", "true");
    }
  });

  it("disabled on the group disables every radio", () => {
    render(<RadioGroup aria-label="Category" disabled>{options}</RadioGroup>);
    for (const r of radios()) expect(r).toBeDisabled();
  });

  it("keeps a name the consumer passes", () => {
    render(<RadioGroup aria-label="Category" name="category">{options}</RadioGroup>);
    for (const r of radios()) expect(r).toHaveAttribute("name", "category");
  });
});
