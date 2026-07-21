import { describe, expect, it } from "vitest";
import { themingSection } from "./docs-sections.js";

const states = { hover: "L - 0.04", active: "L - 0.08" };

describe("themingSection (HAN-41)", () => {
  it("claims override + derived states only when the family has hover tokens", () => {
    const css = "--psi-button-accent-bg: x;\n--psi-button-accent-bg-hover: y;";
    const s = themingSection("--psi-button-*", css, states);
    expect(s).toContain("Override `--psi-button-*`");
    expect(s).toContain("interactive states derive automatically");
  });

  it("drops the interactive-states claim for a static token family", () => {
    const css = "--psi-panel-bg: x;\n--psi-panel-radius: y;";
    const s = themingSection("--psi-panel-*", css, states);
    expect(s).toContain("Override `--psi-panel-*`");
    expect(s).not.toContain("interactive states");
    expect(s).not.toContain("hover");
  });

  it("states there is nothing to override for a token-less component", () => {
    const s = themingSection("--psi-toolbar-*", null, states);
    expect(s).not.toContain("Override");
    expect(s).not.toContain("interactive states");
    expect(s).toContain("no `--psi-toolbar-*` tokens");
    expect(s).toContain("scale tokens");
  });
});
