import { describe, it, expect } from "vitest";
import { buttonVars, BUTTON_VARIANTS } from "../src/components/button.js";

const VARIANTS = [
  "accent",
  "accent-subtle",
  "neutral",
  "neutral-subtle",
  "ghost",
  "danger",
  "danger-subtle",
] as const;

describe("buttonVars", () => {
  // Every variant should have -bg, -bg-hover, -bg-active, and -fg keys
  for (const variant of VARIANTS) {
    describe(`variant: ${variant}`, () => {
      it("has -bg key", () => {
        expect(buttonVars).toHaveProperty(`${variant}-bg`);
        expect(typeof buttonVars[`${variant}-bg`]).toBe("string");
      });

      // Ghost is special: transparent bg can't be derived from, so hover/active reference semantic fills
      if (variant === "ghost") {
        it("has -bg-hover key with semantic neutral fill (no component ref)", () => {
          expect(buttonVars).toHaveProperty(`${variant}-bg-hover`);
          expect(buttonVars[`${variant}-bg-hover`]).toContain("--ds-fill-neutral");
        });

        it("has -bg-active key with semantic neutral fill (no component ref)", () => {
          expect(buttonVars).toHaveProperty(`${variant}-bg-active`);
          expect(buttonVars[`${variant}-bg-active`]).toContain("--ds-fill-neutral");
        });
      } else {
        it("has -bg-hover key that references --ds-button-{variant}-bg", () => {
          expect(buttonVars).toHaveProperty(`${variant}-bg-hover`);
          expect(buttonVars[`${variant}-bg-hover`]).toContain(
            `--ds-button-${variant}-bg`,
          );
        });

        it("has -bg-active key that references --ds-button-{variant}-bg", () => {
          expect(buttonVars).toHaveProperty(`${variant}-bg-active`);
          expect(buttonVars[`${variant}-bg-active`]).toContain(
            `--ds-button-${variant}-bg`,
          );
        });
      }

      it("has -fg key", () => {
        expect(buttonVars).toHaveProperty(`${variant}-fg`);
        expect(typeof buttonVars[`${variant}-fg`]).toBe("string");
      });
    });
  }

  it("has focus-ring key", () => {
    expect(buttonVars).toHaveProperty("focus-ring");
    expect(typeof buttonVars["focus-ring"]).toBe("string");
  });

  it("accent bg references --ds-fill-accent", () => {
    expect(buttonVars["accent-bg"]).toContain("--ds-fill-accent");
  });

  it("accent hover derives from component token", () => {
    const hover = buttonVars["accent-bg-hover"];
    expect(hover).toContain("oklch(from");
    expect(hover).toContain("--ds-button-accent-bg");
  });

  it("accent active has stronger lightness shift than hover", () => {
    const hover = buttonVars["accent-bg-hover"];
    const active = buttonVars["accent-bg-active"];
    const hoverShift = hover.match(/calc\(l - ([\d.]+)\)/)?.[1];
    const activeShift = active.match(/calc\(l - ([\d.]+)\)/)?.[1];
    expect(hoverShift).toBeDefined();
    expect(activeShift).toBeDefined();
    expect(Number(activeShift)).toBeGreaterThan(Number(hoverShift));
  });

  it("accent fg is on-accent label token", () => {
    expect(buttonVars["accent-fg"]).toContain("--ds-fg-on-accent");
  });

  it("ghost bg is transparent", () => {
    expect(buttonVars["ghost-bg"]).toBe("transparent");
  });

  it("danger bg references --ds-fill-danger", () => {
    expect(buttonVars["danger-bg"]).toContain("--ds-fill-danger");
  });

  it("accent-subtle bg references --ds-fill-tint-accent", () => {
    expect(buttonVars["accent-subtle-bg"]).toContain(
      "--ds-fill-tint-accent",
    );
  });

  it("danger-subtle bg references --ds-fill-tint-danger", () => {
    expect(buttonVars["danger-subtle-bg"]).toContain("--ds-fill-tint-danger");
  });

  it("neutral bg references fill-neutral3", () => {
    expect(buttonVars["neutral-bg"]).toContain("--ds-fill-neutral3");
  });

  it("outline hover label reuses the accent label binding (D37)", () => {
    expect(buttonVars["outline-fg-hover"]).toBe("var(--ds-button-accent-fg)");
    expect(buttonVars["outline-border"]).toBe("var(--ds-border-strong)");
    expect(BUTTON_VARIANTS).toContain("outline");
  });
});
