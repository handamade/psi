import { describe, it, expect } from "vitest";
import { parseNewThemeArgs } from "../scripts/new-theme.js";

describe("parseNewThemeArgs", () => {
  it("name after flags is not swallowed by the flag value", () => {
    expect(parseNewThemeArgs(["--base", "dark", "midnight"])).toEqual({ name: "midnight", base: "dark" });
  });
  it("name-first still works", () => {
    expect(parseNewThemeArgs(["midnight", "--base", "dark"])).toEqual({ name: "midnight", base: "dark" });
  });
  it("defaults base to light", () => {
    expect(parseNewThemeArgs(["midnight"])).toEqual({ name: "midnight", base: "light" });
  });
  it("--base with no value fails closed (invalid sentinel, rejected by validation)", () => {
    expect(parseNewThemeArgs(["midnight", "--base"])).toEqual({ name: "midnight", base: "(missing)" });
  });
});
