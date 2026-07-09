import { describe, expect, it } from "vitest";
import { spacingScale } from "../src/scales/spacing.js";
import { sizeScale } from "../src/scales/sizes.js";
import { radiusScale } from "../src/scales/radius.js";
import { breakpoints, container, zIndex } from "../src/scales/layout.js";
import { comboName, WEIGHT_VALUES } from "../src/scales/typography.js";
import { durationScale, easings } from "../src/scales/motion.js";
import { emitScaleVarsCSS, emitUtilitiesCSS } from "../scripts/emit-utilities.js";

describe("scales", () => {
  describe("spacing", () => {
    it("starts at 0", () => {
      expect(spacingScale[0]).toBe(0);
    });

    it("has expected values", () => {
      expect([...spacingScale]).toEqual([
        0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120, 144,
      ]);
    });

    it("is monotonically increasing", () => {
      for (let i = 1; i < spacingScale.length; i++) {
        expect(spacingScale[i]).toBeGreaterThan(spacingScale[i - 1]);
      }
    });
  });

  describe("sizes", () => {
    it("has expected values", () => {
      expect([...sizeScale]).toEqual([24, 32, 40, 48]);
    });
  });

  describe("radius", () => {
    it("has expected values", () => {
      expect([...radiusScale]).toEqual([4, 6, 8, 12]);
    });
  });

  describe("motion", () => {
    it("motion scale matches spec (WS3)", () => {
      expect([...durationScale]).toEqual([150, 200, 350, 450, 600]);
      expect(easings.soft).toBe("cubic-bezier(0.2, 0.6, 0.2, 1)");
    });

    it("emits duration and easing vars", () => {
      const css = emitScaleVarsCSS();
      expect(css).toContain("--ds-duration-150: 150ms;");
      expect(css).toContain("--ds-duration-600: 600ms;");
      expect(css).toContain("--ds-ease-standard: ease;");
      expect(css).toContain("--ds-ease-in-out: ease-in-out;");
      expect(css).toContain("--ds-ease-soft: cubic-bezier(0.2, 0.6, 0.2, 1);");
    });

    it("zeroes durations under prefers-reduced-motion (D30)", () => {
      const css = emitUtilitiesCSS();
      expect(css).toContain("@media (prefers-reduced-motion: reduce)");
      expect(css).toContain("--ds-duration-150: 0.01ms;");
      expect(css).toContain("--ds-duration-600: 0.01ms;");
    });
  });

  describe("layout", () => {
    it("layout constants match spec (WS4, D31)", () => {
      expect(breakpoints).toEqual({ sm: 560, md: 960 });
      expect(container).toEqual({ max: 1312, gutter: 40, gutterNarrow: 24 });
      expect(zIndex).toEqual({ nav: 100, overlay: 1000, tooltip: 1100 });
    });

    it("emits container, gutter, and z vars (WS4)", () => {
      const css = emitScaleVarsCSS();
      expect(css).toContain("--ds-container-max: 82rem;");
      expect(css).toContain("--ds-gutter: 2.5rem;");
      expect(css).toContain("--ds-z-nav: 100;");
      expect(css).toContain("--ds-z-tooltip: 1100;");
    });

    it("emits .ds-container and the gutter step-down (D31)", () => {
      const css = emitUtilitiesCSS();
      expect(css).toContain(".ds-container { max-width: var(--ds-container-max); margin-inline: auto; padding-inline: var(--ds-gutter); }");
      expect(css).toContain("@media (max-width: 960px)");
      expect(css).toContain("--ds-gutter: 1.5rem;");
    });
  });

  describe("typography combos", () => {
    it("names are pixel-true", () => {
      expect(comboName({ fontSize: 16, lineHeight: 24, weight: "regular" })).toBe("16-24-regular");
    });
    it("emits one font-shorthand var per combo", () => {
      const css = emitScaleVarsCSS();
      expect(css).toContain("--ds-text-16-24-regular: 400 1rem/1.5rem var(--ds-font-sans);");
      expect(css).not.toContain("--ds-text-xs");
    });
    it("emits one utility class per combo", () => {
      const css = emitUtilitiesCSS();
      expect(css).toContain(".ds-text-16-24-regular { font: var(--ds-text-16-24-regular); }");
    });
    it("maps extended weights (WS2)", () => {
      expect(WEIGHT_VALUES.extrabold).toBe(800);
      expect(WEIGHT_VALUES.black).toBe(900);
    });
    it("prefixes non-sans combo names with their role (WS2)", () => {
      expect(comboName({ fontSize: 18, lineHeight: 28, weight: "regular", role: "serif" })).toBe("serif-18-28-regular");
      expect(comboName({ fontSize: 16, lineHeight: 24, weight: "regular" })).toBe("16-24-regular");
      expect(comboName({ fontSize: 16, lineHeight: 24, weight: "regular", role: "sans" })).toBe("16-24-regular");
    });
    it("emits serif/mono combos against their role font var", () => {
      const css = emitScaleVarsCSS();
      expect(css).toContain("--ds-text-serif-18-28-regular: 400 1.125rem/1.75rem var(--ds-font-serif);");
      expect(css).toContain("--ds-text-mono-13-20-regular: 400 0.8125rem/1.25rem var(--ds-font-mono);");
      expect(emitUtilitiesCSS()).toContain(".ds-text-mono-15-24-medium { font: var(--ds-text-mono-15-24-medium); }");
    });

    it("emits display combos pixel-true at both clamp endpoints (D28)", () => {
      const css = emitScaleVarsCSS();
      expect(css).toContain("--ds-display-56-128-black: 900 clamp(3.5rem, 9vw, 8rem)/0.95 var(--ds-font-display);");
      expect(css).toContain("--ds-display-36-64-black: 900 clamp(2.25rem, 5vw, 4rem)/1.05 var(--ds-font-display);");
      expect(css).toContain("--ds-display-32-32-extrabold: 800 2rem/1.1 var(--ds-font-display);");
    });

    it("display utilities carry tracking and uppercase (D28)", () => {
      const css = emitUtilitiesCSS();
      expect(css).toContain(".ds-display-56-128-black { font: var(--ds-display-56-128-black); letter-spacing: -0.02em; text-transform: uppercase; }");
      expect(css).toContain(".ds-display-32-32-extrabold { font: var(--ds-display-32-32-extrabold); letter-spacing: -0.01em; text-transform: uppercase; }");
    });
  });
});

describe("emitScaleVarsCSS", () => {
  const css = emitScaleVarsCSS();

  it("emits spacing vars", () => {
    expect(css).toContain("--ds-space-0: 0;");
    expect(css).toContain("--ds-space-8: 0.5rem;");
    expect(css).toContain("--ds-space-16: 1rem;");
    expect(css).toContain("--ds-space-80: 5rem;");
  });

  it("emits size vars", () => {
    expect(css).toContain("--ds-size-24: 1.5rem;");
    expect(css).toContain("--ds-size-48: 3rem;");
  });

  it("emits radius vars", () => {
    expect(css).toContain("--ds-radius-4: 0.25rem;");
    expect(css).toContain("--ds-radius-12: 0.75rem;");
    expect(css).toContain("--ds-radius-full: 9999px;");
  });

  it("emits typography vars", () => {
    expect(css).toContain("--ds-text-16-24-regular: 400 1rem/1.5rem var(--ds-font-sans);");
  });

  it("emits font stacks", () => {
    expect(css).toContain("--ds-font-sans:");
    expect(css).toContain("--ds-font-mono:");
  });

  it("emits serif and display font roles (WS2, D29)", () => {
    expect(css).toContain(`--ds-font-serif: Georgia, "Times New Roman", Times, serif;`);
    expect(css).toContain(`--ds-font-display: var(--ds-font-sans);`);
  });
});

describe("emitUtilitiesCSS", () => {
  const css = emitUtilitiesCSS();

  it("wraps in @layer ds.utilities", () => {
    expect(css).toContain("@layer ds.utilities {");
  });

  it("emits gap classes", () => {
    expect(css).toContain(".ds-gap-0 { gap: var(--ds-space-0); }");
    expect(css).toContain(".ds-gap-16 { gap: var(--ds-space-16); }");
  });

  it("emits padding classes", () => {
    expect(css).toContain(".ds-p-8 { padding: var(--ds-space-8); }");
    expect(css).toContain(
      ".ds-px-8 { padding-inline: var(--ds-space-8); }",
    );
    expect(css).toContain(
      ".ds-py-8 { padding-block: var(--ds-space-8); }",
    );
  });

  it("emits margin classes", () => {
    expect(css).toContain(".ds-m-8 { margin: var(--ds-space-8); }");
    expect(css).toContain(
      ".ds-mx-8 { margin-inline: var(--ds-space-8); }",
    );
    expect(css).toContain(
      ".ds-my-8 { margin-block: var(--ds-space-8); }",
    );
  });

  it("emits typography classes", () => {
    expect(css).toContain(".ds-text-16-24-regular { font: var(--ds-text-16-24-regular); }");
  });

  it("emits the .ds-media-tint utility with hover reveal (D35)", () => {
    const css = emitUtilitiesCSS();
    expect(css).toContain(".ds-media-tint { filter: var(--ds-media-tint); transition: filter var(--ds-duration-450) var(--ds-ease-soft); }");
    expect(css).toContain(".ds-media-tint:hover, .ds-media-tint:focus-visible { filter: none; }");
  });
});
