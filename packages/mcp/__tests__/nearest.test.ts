import { describe, expect, it } from "vitest";

import { closest, distance, hint, nearest, words } from "../src/nearest.js";

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

describe("hint (D145)", () => {
  it("prefers a close typo of the component's own prop", () => {
    expect(hint("sise", ["size"], ["side"])).toBe("size"); // both 1 edit; its own prop wins
    expect(hint("varient", ["variant"], ["value"])).toBe("variant");
  });

  it("takes the component's prop that says the same in fewer words over a looser typo", () => {
    expect(hint("onValueChange", ["onChange", "onInputChange", "onOpenChange"], ["onVolumeChange"])).toBe("onChange");
  });

  it("needs two shared words and containment", () => {
    expect(hint("label", ["dismissLabel"], [])).toBeNull();
    expect(hint("onOpenChange", ["onValueChange"], [])).toBeNull(); // 5 edits, and neither's words hold the other's
    expect(words("aria-labelledby")).toEqual(["aria", "labelledby"]);
    expect(words("onValueChange")).toEqual(["on", "value", "change"]);
  });

  it("falls back to the DOM, within a third of the name's length", () => {
    expect(hint("onClik", [], ["onClick"])).toBe("onClick");
    expect(hint("foo", [], ["fr"])).toBeNull();
  });
});
