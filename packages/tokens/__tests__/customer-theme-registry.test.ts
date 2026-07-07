import { describe, expect, it } from "vitest";
import { customerThemes } from "../src/themes/customers/index.js";

describe("customer theme registry", () => {
  it("has an acme entry with a palette and slots", () => {
    expect(customerThemes.acme).toBeDefined();
    expect(customerThemes.acme.palette).toBeTypeOf("object");
    expect(customerThemes.acme.slots).toBeTypeOf("object");
    expect(customerThemes.acme.slots.ink).toBeTypeOf("string");
  });

  it("does not require overrides to be set", () => {
    expect(customerThemes.acme.overrides).toBeUndefined();
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
