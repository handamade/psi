import { describe, it, expect, beforeEach } from "vitest";
import { BRAND_KEY, MODE_KEY, readStoredBrand, readStoredMode } from "../theme";

beforeEach(() => localStorage.clear());

describe("readStoredMode", () => {
  it("returns a stored light or dark", () => {
    localStorage.setItem(MODE_KEY, "dark");
    expect(readStoredMode()).toBe("dark");
  });

  it("returns null when nothing is stored, so the caller can ask the OS", () => {
    expect(readStoredMode()).toBeNull();
  });

  it("rejects a value from the old four-theme roster", () => {
    // A returning visitor holding "ember" must not be stranded in a theme the
    // header can no longer leave.
    localStorage.setItem(MODE_KEY, "ember");
    expect(readStoredMode()).toBeNull();
  });
});

describe("readStoredBrand", () => {
  it("returns null when absent", () => {
    expect(readStoredBrand()).toBeNull();
  });

  it("returns a valid stored vector", () => {
    const v = { hue: 200, chroma: "calm", mode: "light", radius: 8, name: "lagoon" };
    localStorage.setItem(BRAND_KEY, JSON.stringify({ vector: v, cache: {} }));
    expect(readStoredBrand()?.vector.name).toBe("lagoon");
  });

  it("clears and returns null for a corrupt vector", () => {
    localStorage.setItem(BRAND_KEY, JSON.stringify({ vector: { hue: 999 }, cache: {} }));
    expect(readStoredBrand()).toBeNull();
    expect(localStorage.getItem(BRAND_KEY)).toBeNull();
  });

  it("clears and returns null for non-JSON", () => {
    localStorage.setItem(BRAND_KEY, "{{{not json");
    expect(readStoredBrand()).toBeNull();
    expect(localStorage.getItem(BRAND_KEY)).toBeNull();
  });

  it("clears and returns null for an off-scale radius", () => {
    const v = { hue: 200, chroma: "calm", mode: "light", radius: 10, name: "lagoon" };
    localStorage.setItem(BRAND_KEY, JSON.stringify({ vector: v, cache: {} }));
    expect(readStoredBrand()).toBeNull();
  });
});
