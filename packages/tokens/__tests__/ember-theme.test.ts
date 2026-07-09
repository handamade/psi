import { describe, expect, it } from "vitest";
import { resolve } from "../src/dsl/resolver.js";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
import { checkContrast, wcagAAPairs, componentLabelPairs } from "../src/contrast-matrix.js";

describe("ember brand (WS1)", () => {
  const ember = customerThemes.ember;

  it("is registered dark-first", () => {
    expect(ember).toBeDefined();
    expect(ember.base).toBe("dark");
  });

  const resolved = () => resolve(assembleCustomerTheme(ember), ember.palette, ember.slots);

  it("lands exactly on the shipped portfolio surfaces", () => {
    const r = resolved();
    expect(r.bgPrimary.hex).toBe("#0c0a09");
    expect(r.bgSecondary.hex).toBe("#100d0b");
    expect(r.fgPrimary.hex).toBe("#f3ede6");
  });

  it("passes the full AA gate (regression: dark-based customers are gated)", () => {
    const results = checkContrast(resolved(), [...wcagAAPairs, ...componentLabelPairs]);
    expect(results.filter((r) => !r.pass)).toEqual([]);
  });

  it("uses a dark accent label (D37): white would fail on the ember accent", () => {
    const r = resolved();
    const [onAccent] = checkContrast(r, [{ fg: "fgOnAccent", bg: "fillAccent", minRatio: 4.5 }]);
    const [white] = checkContrast(r, [{ fg: "fgStaticWhite", bg: "fillAccent", minRatio: 4.5 }]);
    expect(onAccent.pass).toBe(true);
    expect(white.pass).toBe(false);
  });

  it("ember restyles button typography to mono via component override (D34)", () => {
    expect(customerThemes.ember.componentOverrides?.["button-font"]).toBe("var(--ds-text-mono-15-24-regular)");
  });

  it("ember squares off card corners via component override (WS5): portfolio cards are square", () => {
    expect(customerThemes.ember.componentOverrides?.["card-radius"]).toBe("0");
  });

  it("ember defines the sepia media tint (D35)", () => {
    expect(customerThemes.ember.componentOverrides?.["media-tint"]).toBe(
      "grayscale(1) sepia(0.65) saturate(1.6) hue-rotate(-12deg) brightness(0.88) contrast(1.05)",
    );
  });
});
