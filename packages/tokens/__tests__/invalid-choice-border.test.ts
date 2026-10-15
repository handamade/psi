import { describe, it, expect } from "vitest";
import { checkboxVars } from "../src/components/checkbox.js";
import { radioGroupVars } from "../src/components/radio-group.js";
import { inputVars } from "../src/components/input.js";

describe("choice controls in error (D108)", () => {
  it("both outline in the field error colour Input uses", () => {
    expect(inputVars["border-error"]).toBe("var(--psi-fg-danger)");
    expect(checkboxVars["box-border-error"]).toBe("var(--psi-fg-danger)");
    expect(radioGroupVars["circle-border-error"]).toBe("var(--psi-fg-danger)");
  });
});
