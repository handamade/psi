import { describe, it, expect } from "vitest";
import { isBrandVector } from "../src/generate/types.js";
import { parsePrompt } from "../src/generate/prompt.js";

const valid = parsePrompt("sunset over the atlantic");

describe("isBrandVector", () => {
  it("accepts what parsePrompt produces", () => {
    expect(isBrandVector(valid)).toBe(true);
  });

  it.each([
    ["null", null],
    ["a string", "sunset"],
    ["an array", []],
    ["an empty object", {}],
  ])("rejects %s", (_label, value) => {
    expect(isBrandVector(value)).toBe(false);
  });

  it("rejects an off-scale radius — the D56 contract", () => {
    expect(isBrandVector({ ...valid, radius: 10 })).toBe(false);
    expect(isBrandVector({ ...valid, radius: 0 })).toBe(false);
  });

  it("rejects a hue outside the circle", () => {
    expect(isBrandVector({ ...valid, hue: 400 })).toBe(false);
    expect(isBrandVector({ ...valid, hue: -1 })).toBe(false);
    expect(isBrandVector({ ...valid, hue: Number.NaN })).toBe(false);
  });

  it("rejects an unknown chroma word", () => {
    expect(isBrandVector({ ...valid, chroma: "spicy" })).toBe(false);
  });

  it("rejects a mode that is not light or dark", () => {
    expect(isBrandVector({ ...valid, mode: "system" })).toBe(false);
  });

  it("rejects a name that is not a safe identifier stem", () => {
    expect(isBrandVector({ ...valid, name: "../../etc/passwd" })).toBe(false);
    expect(isBrandVector({ ...valid, name: "9lives" })).toBe(false);
    expect(isBrandVector({ ...valid, name: "" })).toBe(false);
    expect(isBrandVector({ ...valid, name: "Has-Capitals" })).toBe(false);
  });

  it("rejects a well-formed but absurdly long name", () => {
    // `name` becomes a filename and an identifier. A model returning 100k
    // legal characters would pass the regex and fail downstream.
    expect(isBrandVector({ ...valid, name: "a".repeat(65) })).toBe(false);
    expect(isBrandVector({ ...valid, name: "a".repeat(64) })).toBe(true);
  });

  it("rejects a fonts object carrying an unknown role", () => {
    expect(isBrandVector({ ...valid, fonts: { comic: "Comic Sans" } })).toBe(false);
  });

  it("accepts an absent fonts field", () => {
    const { fonts, ...withoutFonts } = valid;
    void fonts;
    expect(isBrandVector(withoutFonts)).toBe(true);
  });
});
