import { describe, expect, it } from "vitest";
import { validate, ValidationError, validateScopeConsistency, validateNoScalePrefixShadow } from "../src/dsl/validator.js";
import { token, set, slot, ref } from "../src/dsl/builders.js";
import type { SlotMap, ThemeDef } from "../src/dsl/types.js";

const slots: SlotMap = {
  ink: "obsidian",
  canvas: "platinum",
  accent: "sapphire",
  success: "emerald",
  warning: "amber",
  danger: "ruby",
};

describe("validator", () => {
  it("accepts valid theme with slot and ref sources", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.ink, l: set(0.3) }),
      fgSecondary: token({ from: ref.fgPrimary, alpha: 0.7 }),
    };
    expect(() => validate(theme, slots)).not.toThrow();
  });

  it("rejects unknown slot name", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.nope, l: set(0.3) }),
    };
    expect(() => validate(theme, slots)).toThrow(ValidationError);
    expect(() => validate(theme, slots)).toThrow(/unknown slot "nope"/i);
  });

  it("rejects unknown ref name", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: ref.nonexistent, alpha: 0.5 }),
    };
    expect(() => validate(theme, slots)).toThrow(ValidationError);
    expect(() => validate(theme, slots)).toThrow(/unknown ref "nonexistent"/i);
  });

  it("detects direct circular ref", () => {
    const theme: ThemeDef = {
      a: token({ from: ref.b, l: set(0.5) }),
      b: token({ from: ref.a, l: set(0.5) }),
    };
    expect(() => validate(theme, slots)).toThrow(ValidationError);
    expect(() => validate(theme, slots)).toThrow(/circular/i);
  });

  it("detects transitive circular ref", () => {
    const theme: ThemeDef = {
      a: token({ from: ref.b, l: set(0.5) }),
      b: token({ from: ref.c, l: set(0.5) }),
      c: token({ from: ref.a, l: set(0.5) }),
    };
    expect(() => validate(theme, slots)).toThrow(ValidationError);
    expect(() => validate(theme, slots)).toThrow(/circular/i);
  });

  it("rejects duplicate token names", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.ink, l: set(0.3) }),
    };
    expect(() => validate(theme, slots, ["fgPrimary"])).toThrow(
      /duplicate.*fgPrimary/i,
    );
  });
});

describe("scope validation (D46)", () => {
  it("accepts tokens with known scope entries", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.ink, scopes: ["text"] }),
      fgDanger: token({ from: slot.danger, scopes: ["text", "border"] }),
    };
    expect(() => validate(theme, slots)).not.toThrow();
  });

  it("rejects unknown scope entries", () => {
    const theme: ThemeDef = {
      fgPrimary: token({ from: slot.ink, scopes: ["texture"] }),
    };
    expect(() => validate(theme, slots)).toThrow(ValidationError);
  });

  it("rejects scope drift between themes for the same token name", () => {
    const a: ThemeDef = { fgPrimary: token({ from: slot.ink, scopes: ["text"] }) };
    const b: ThemeDef = { fgPrimary: token({ from: slot.ink, scopes: ["surface"] }) };
    expect(() => validateScopeConsistency({ light: a, dark: b })).toThrow(ValidationError);
  });

  it("accepts identical or absent scopes across themes", () => {
    const a: ThemeDef = { fgPrimary: token({ from: slot.ink, scopes: ["text"] }), x: token({ from: slot.ink }) };
    const b: ThemeDef = { fgPrimary: token({ from: slot.ink, scopes: ["text"] }), x: token({ from: slot.ink }) };
    expect(() => validateScopeConsistency({ light: a, dark: b })).not.toThrow();
  });

  it("rejects absent-vs-present scope drift for the same token name", () => {
    const a: ThemeDef = { fgPrimary: token({ from: slot.ink, scopes: ["text"] }) };
    const b: ThemeDef = { fgPrimary: token({ from: slot.ink }) };
    expect(() => validateScopeConsistency({ light: a, dark: b })).toThrow(ValidationError);
  });

  it("rejects semantic token names that shadow a scale-family prefix", () => {
    expect(() => validateNoScalePrefixShadow(["space-hero"])).toThrow(ValidationError);
    expect(() => validateNoScalePrefixShadow(["z-banner"])).toThrow(ValidationError);
    expect(() => validateNoScalePrefixShadow(["fg-primary", "spacing-x", "texture-1"])).not.toThrow();
  });
});
