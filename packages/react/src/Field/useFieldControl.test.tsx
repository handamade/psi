import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field } from "./Field.js";
import { useFieldControl } from "./useFieldControl.js";

/** A control Psi did not write: a combobox-shaped div. */
function Custom() {
  const props = useFieldControl();
  return <div role="combobox" tabIndex={0} aria-expanded="false" data-testid="custom" {...props} />;
}

describe("useFieldControl (D84)", () => {
  it("returns the Field's wiring as spreadable props", () => {
    render(
      <Field label="Airline" error="Pick one." required>
        <Custom />
      </Field>,
    );
    const el = screen.getByTestId("custom");
    expect(el.id).not.toBe("");
    expect(screen.getByText("Airline")).toHaveAttribute("for", el.id);
    expect(el).toHaveAttribute("aria-describedby", screen.getByText("Pick one.").id);
    expect(el).toHaveAttribute("aria-invalid", "true");
    expect(el).toHaveAttribute("aria-required", "true");
    expect(el).toHaveAttribute("required");
  });

  it("omits the flags a Field does not set, rather than writing false", () => {
    render(
      <Field label="Airline" description="Optional.">
        <Custom />
      </Field>,
    );
    const el = screen.getByTestId("custom");
    expect(el).toHaveAttribute("aria-describedby", screen.getByText("Optional.").id);
    expect(el).not.toHaveAttribute("aria-invalid");
    expect(el).not.toHaveAttribute("aria-required");
    expect(el).not.toHaveAttribute("required");
  });

  it("returns an empty object outside a Field", () => {
    let seen: unknown;
    function Probe() {
      seen = useFieldControl();
      return null;
    }
    render(<Probe />);
    expect(seen).toEqual({});
  });
});
