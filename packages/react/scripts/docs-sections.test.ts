import { describe, expect, it } from "vitest";
import { boundFamilies, themingSection } from "./docs-sections.js";

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

describe("themingSection for a family member (D128)", () => {
  it("names the families a token-less member binds instead of claiming scale tokens only", () => {
    const s = themingSection("--psi-table-cell-*", null, states, ["table"]);
    expect(s).toContain("no `--psi-table-cell-*` tokens of its own");
    expect(s).toContain("binds the `--psi-table-*` tokens");
    expect(s).toContain("override those at any scope");
    expect(s).not.toContain("scale tokens only");
  });

  it("lists several families", () => {
    const s = themingSection("--psi-pager-*", null, states, ["button", "link"]);
    expect(s).toContain("binds the `--psi-button-*` and `--psi-link-*` tokens");
  });

  it("keeps the scale-tokens line when the member binds no family", () => {
    expect(themingSection("--psi-toolbar-*", null, states, [])).toContain("scale tokens only");
  });
});

describe("boundFamilies (D128)", () => {
  const families = {
    table: ":where(:root) {\n  --psi-table-bg: x;\n  --psi-table-cell-border: y;\n}",
    button: ":where(:root) {\n  --psi-button-accent-bg: x;\n}",
  };

  it("finds the families whose generated tokens a stylesheet binds, in name order", () => {
    const css = ".cell { border-bottom: 1px solid var(--psi-table-cell-border); padding: var(--psi-space-8); }";
    expect(boundFamilies(css, families)).toEqual(["table"]);
  });

  it("ignores scale and semantic tokens and private properties", () => {
    const css = ".x { gap: var(--psi-space-8); color: var(--psi-fg-primary); --_psi-table-corner: 0px; }";
    expect(boundFamilies(css, families)).toEqual([]);
  });

  it("matches declared names exactly, not by prefix", () => {
    expect(boundFamilies(".x { color: var(--psi-table-bg-hover); }", families)).toEqual([]);
  });
});

