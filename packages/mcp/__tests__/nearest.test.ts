import { describe, expect, it } from "vitest";

import { closest, distance, nearest } from "../src/nearest.js";

describe("distance", () => {
  it("is the Levenshtein edit distance", () => {
    expect(distance("kitten", "sitting")).toBe(3);
    expect(distance("", "abc")).toBe(3);
    expect(distance("same", "same")).toBe(0);
  });
});

describe("nearest", () => {
  it("suggests a close name, case-insensitively", () => {
    expect(nearest("varient", ["variant", "size", "disabled"])).toBe("variant");
    expect(nearest("ICONBUTTON", ["Button", "IconButton"])).toBe("IconButton");
  });

  it("suggests nothing for a wild guess", () => {
    expect(nearest("color", ["variant", "size"])).toBeNull();
  });
});

describe("closest", () => {
  it("returns the n closest, nearest first, with no threshold", () => {
    expect(closest("buton", ["Button", "Banner", "Tabs", "Table"], 2)).toEqual(["Button", "Banner"]);
  });
});
