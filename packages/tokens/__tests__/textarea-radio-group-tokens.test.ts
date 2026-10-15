import { describe, it, expect } from "vitest";
import { textareaVars } from "../src/components/textarea.js";
import { radioGroupVars } from "../src/components/radio-group.js";
import { componentVars } from "../src/components/registry.js";

describe("textarea and radio-group tokens (D104)", () => {
  it("textarea aliases the input's semantics and the 32px value ramp", () => {
    expect(textareaVars).toEqual({
      bg: "var(--psi-bg-primary)",
      fg: "var(--psi-fg-primary)",
      placeholder: "var(--psi-fg-tertiary)",
      border: "var(--psi-border-neutral)",
      "border-hover": "var(--psi-border-strong)",
      "border-error": "var(--psi-fg-danger)",
      "focus-ring": "var(--psi-border-focus)",
      radius: "var(--psi-control-radius)",
      "padding-inline": "var(--psi-control-value-32-padding-inline)",
      font: "var(--psi-control-value-32-font)",
      "counter-fg": "var(--psi-fg-secondary)",
    });
  });

  it("radio-group reuses the checkbox's gated checked pair", () => {
    expect(radioGroupVars["circle-bg-checked"]).toBe("var(--psi-fill-accent)");
    expect(radioGroupVars["dot-fg"]).toBe("var(--psi-fg-on-accent)");
  });

  it("both are registered", () => {
    expect(componentVars.textarea).toBe(textareaVars);
    expect(componentVars["radio-group"]).toBe(radioGroupVars);
  });
});
