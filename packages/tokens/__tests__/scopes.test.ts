import { describe, expect, it } from "vitest";
import {
  PROPERTY_GROUPS, SUFFIX_GROUPS, SCALE_SCOPES,
  expandScopes, isKnownScopeEntry, keyGroup,
} from "../src/scopes.js";

describe("scopes vocabulary", () => {
  it("declares the three normative suffix groups", () => {
    expect(SUFFIX_GROUPS).toEqual({ fg: "text", bg: "surface", border: "border" });
  });

  it("every suffix group is a declared property group", () => {
    for (const g of Object.values(SUFFIX_GROUPS)) {
      expect(PROPERTY_GROUPS[g]).toBeDefined();
    }
  });

  it("expands group names to concrete properties", () => {
    expect(expandScopes(["text"])).toEqual(expect.arrayContaining(["color", "fill", "stroke"]));
  });

  it("passes concrete property names through and dedupes", () => {
    const out = expandScopes(["color", "text"]);
    expect(out.filter((p) => p === "color")).toHaveLength(1);
  });

  it("throws on unknown entries in expandScopes", () => {
    expect(() => expandScopes(["texture"])).toThrow(/unknown scope entry/i);
  });

  it("isKnownScopeEntry accepts groups and known properties, rejects junk", () => {
    expect(isKnownScopeEntry("text")).toBe(true);
    expect(isKnownScopeEntry("background-color")).toBe(true);
    expect(isKnownScopeEntry("texture")).toBe(false);
  });

  it("keyGroup reads the last bg/fg/border segment", () => {
    expect(keyGroup("accent-bg")).toBe("surface");
    expect(keyGroup("accent-bg-hover")).toBe("surface");
    expect(keyGroup("bg")).toBe("surface");
    expect(keyGroup("fg")).toBe("text");
    expect(keyGroup("border-error")).toBe("border");
    expect(keyGroup("box-border-checked")).toBe("border");
    expect(keyGroup("outline-fg-hover")).toBe("text");
    expect(keyGroup("focus-ring")).toBeUndefined();
    expect(keyGroup("radius")).toBeUndefined();
    expect(keyGroup("backdrop")).toBeUndefined();
  });

  it("space scale is scoped to the gap group", () => {
    expect(SCALE_SCOPES.space).toEqual(["gap"]);
    expect(PROPERTY_GROUPS.gap).toContain("gap");
    expect(PROPERTY_GROUPS.gap).toContain("padding");
  });
});
