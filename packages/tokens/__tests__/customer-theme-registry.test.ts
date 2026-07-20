import { describe, expect, it } from "vitest";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
import { acmePalette, acmeSlots } from "../src/themes/customers/acme.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { token, slot } from "../src/dsl/builders.js";

describe("customer theme registry", () => {
  it("has an acme entry with a palette and slots", () => {
    expect(customerThemes.acme).toBeDefined();
    expect(customerThemes.acme.palette).toBeTypeOf("object");
    expect(customerThemes.acme.slots).toBeTypeOf("object");
    expect(customerThemes.acme.slots.ink).toBeTypeOf("string");
  });

  // D39 note: this previously asserted acme itself ships no overrides, but the
  // gamut retune gave acme fg* cap overrides — the API contract (overrides are
  // optional) is what matters, so assert it directly.
  it("does not require overrides to be set", () => {
    const def = assembleCustomerTheme({ palette: acmePalette, slots: acmeSlots });
    expect(def).toEqual(lightTheme);
  });

  it("every registered slot name resolves to a key in its own palette", () => {
    for (const [name, customer] of Object.entries(customerThemes)) {
      for (const slotValue of Object.values(customer.slots)) {
        expect(customer.palette, `${name}: slot references missing palette key "${slotValue}"`).toHaveProperty(
          slotValue,
        );
      }
    }
  });
});

describe("dark-first customer themes (D27)", () => {
  it("assembles over lightTheme by default", () => {
    const def = assembleCustomerTheme({ palette: acmePalette, slots: acmeSlots });
    expect(def.bgPrimary).toEqual(lightTheme.bgPrimary);
  });

  it("assembles over darkTheme when base is 'dark'", () => {
    const def = assembleCustomerTheme({ palette: acmePalette, slots: acmeSlots, base: "dark" });
    expect(def.bgPrimary).toEqual(darkTheme.bgPrimary);
    expect(def.fgPrimary).toEqual(darkTheme.fgPrimary);
  });

  it("merges overrides over the dark base", () => {
    const overrides = { bgPrimary: token({ from: slot.canvas }) };
    const def = assembleCustomerTheme({ palette: acmePalette, slots: acmeSlots, base: "dark", overrides });
    // D46: an override without its own scopes inherits the base token's scopes.
    expect(def.bgPrimary).toEqual({ ...overrides.bgPrimary, scopes: darkTheme.bgPrimary.scopes });
    expect(def.bgSecondary).toEqual(darkTheme.bgSecondary);
  });
});
