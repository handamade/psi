import { describe, it, expect } from "vitest";
import { componentVars } from "../src/components/registry.js";

describe("text tokens (D109)", () => {
  it("alias the gated primary and secondary foregrounds", () => {
    expect(componentVars.text).toEqual({
      fg: "var(--psi-fg-primary)",
      "fg-secondary": "var(--psi-fg-secondary)",
    });
  });
});
