import { describe, expect, it } from "vitest";
import { resolve } from "../src/dsl/resolver.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { tooltipVars } from "../src/components/tooltip.js";

const themes = [
  { name: "light", theme: lightTheme, palette: defaultPalette, slots: defaultSlots },
  { name: "dark", theme: darkTheme, palette: defaultPalette, slots: defaultSlots },
  ...Object.entries(customerThemes).map(([name, c]) => ({
    name, theme: assembleCustomerTheme(c), palette: c.palette, slots: c.slots,
  })),
];

describe("inversion tokens (D46 tooltip rebind)", () => {
  // Pure refs → byte-identical hex with their source in EVERY theme.
  // This is the zero-visual-diff guarantee for the tooltip rebind.
  it.each(themes)("bgInverted ≡ fgPrimary and fgOnInverted ≡ bgPrimary in $name", (t) => {
    const r = resolve(t.theme, t.palette, t.slots);
    expect(r.bgInverted.hex).toBe(r.fgPrimary.hex);
    expect(r.fgOnInverted.hex).toBe(r.bgPrimary.hex);
  });

  it("tooltip binds the inversion tokens, not raw fg/bg", () => {
    expect(tooltipVars.bg).toBe("var(--psi-bg-inverted)");
    expect(tooltipVars.fg).toBe("var(--psi-fg-on-inverted)");
  });
});
