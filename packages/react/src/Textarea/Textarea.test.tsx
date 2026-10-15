import { useState } from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./Textarea.js";
import { Field } from "../Field/Field.js";

const box = () => screen.getByRole("textbox", { name: "Description" });

describe("Textarea (D104)", () => {
  it("renders a native textarea with 3 rows by default", () => {
    render(<Textarea aria-label="Description" />);
    expect(box().tagName).toBe("TEXTAREA");
    expect(box()).toHaveAttribute("rows", "3");
  });

  it("takes its wiring from a Field: id, describedby, invalid, required", () => {
    render(
      <Field label="Description" error="Say what happened." required>
        <Textarea aria-describedby="extra" />
      </Field>,
    );
    const label = screen.getByText("Description").closest("label")!;
    expect(box().id).toBe(label.htmlFor);
    expect(box()).toHaveAttribute("aria-invalid", "true");
    expect(box()).toBeRequired();
    const describedBy = box().getAttribute("aria-describedby")!.split(" ");
    expect(describedBy).toContain("extra");
    expect(describedBy.some((id) => document.getElementById(id)?.textContent === "Say what happened.")).toBe(true);
  });

  it("shows a counter with maxLength that follows typing, uncontrolled", async () => {
    render(<Textarea aria-label="Description" maxLength={10} />);
    expect(screen.getByText("0 / 10")).toBeInTheDocument();
    await userEvent.type(box(), "abc");
    expect(screen.getByText("3 / 10")).toBeInTheDocument();
  });

  it("follows the value when controlled", async () => {
    function Controlled() {
      const [v, setV] = useState("hi");
      return <Textarea aria-label="Description" maxLength={10} value={v} onChange={(e) => setV(e.target.value)} />;
    }
    render(<Controlled />);
    expect(screen.getByText("2 / 10")).toBeInTheDocument();
    await userEvent.type(box(), "!");
    expect(screen.getByText("3 / 10")).toBeInTheDocument();
  });

  it("the counter is not a live region and describes the textarea", () => {
    render(<Textarea aria-label="Description" maxLength={10} />);
    const counter = screen.getByText("0 / 10").closest("[data-psi-textarea-counter]") as HTMLElement;
    expect(counter).not.toBeNull();
    expect(counter).not.toHaveAttribute("aria-live");
    expect(counter.closest("[aria-live]")).toBeNull();
    expect(box().getAttribute("aria-describedby")!.split(" ")).toContain(counter.id);
    expect(counter).toHaveTextContent("0 / 10 characters");
  });

  it("has no counter without maxLength, or with showCounter={false}", () => {
    const { rerender } = render(<Textarea aria-label="Description" />);
    expect(document.querySelector("[data-psi-textarea-counter]")).toBeNull();
    rerender(<Textarea aria-label="Description" maxLength={10} showCounter={false} />);
    expect(document.querySelector("[data-psi-textarea-counter]")).toBeNull();
  });

  it("passes minLength and maxLength through as native attributes", () => {
    render(<Textarea aria-label="Description" minLength={5} maxLength={280} />);
    expect(box()).toHaveAttribute("minlength", "5");
    expect(box()).toHaveAttribute("maxlength", "280");
  });
});
