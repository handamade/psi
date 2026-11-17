import { describe, it, expect } from "vitest";
import { defaultFilter } from "./filter.js";

const opt = (label: string) => ({ value: label, label });

describe("the default filter (D130)", () => {
  it("is a contains match on the label", () => {
    expect(defaultFilter(opt("Amsterdam"), "ster")).toBe(true);
    expect(defaultFilter(opt("Amsterdam"), "rot")).toBe(false);
  });

  it("ignores case", () => {
    expect(defaultFilter(opt("Berlin"), "BER")).toBe(true);
    expect(defaultFilter(opt("BERLIN"), "lin")).toBe(true);
  });

  it("ignores accents on both sides", () => {
    expect(defaultFilter(opt("Zürich"), "zur")).toBe(true);
    expect(defaultFilter(opt("Zurich"), "zür")).toBe(true);
    expect(defaultFilter(opt("São Paulo"), "sao p")).toBe(true);
    expect(defaultFilter(opt("Kraków"), "krakow")).toBe(true);
  });

  it("matches every option on empty text", () => {
    expect(defaultFilter(opt("Oslo"), "")).toBe(true);
  });

  it("filters on the label, not the value or description", () => {
    expect(defaultFilter({ value: "ams", label: "Amsterdam", description: "Netherlands" }, "nether")).toBe(false);
    expect(defaultFilter({ value: "ams", label: "Amsterdam" }, "ams")).toBe(true);
    expect(defaultFilter({ value: "xyz", label: "Oslo" }, "xyz")).toBe(false);
  });
});
