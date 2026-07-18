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
          expect(buttonVars[`${variant}-bg-hover`]).toContain("--psi-fill-neutral");
        });

        it("has -bg-active key with semantic neutral fill (no component ref)", () => {
          expect(buttonVars).toHaveProperty(`${variant}-bg-active`);
          expect(buttonVars[`${variant}-bg-active`]).toContain("--psi-fill-neutral");
        });
      } else {
        it("has -bg-hover key that references --psi-button-{variant}-bg", () => {
          expect(buttonVars).toHaveProperty(`${variant}-bg-hover`);
          expect(buttonVars[`${variant}-bg-hover`]).toContain(
            `--psi-button-${variant}-bg`,
          );
        });

        it("has -bg-active key that references --psi-button-{variant}-bg", () => {
          expect(buttonVars).toHaveProperty(`${variant}-bg-active`);
          expect(buttonVars[`${variant}-bg-active`]).toContain(
            `--psi-button-${variant}-bg`,
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

  it("accent bg references --psi-fill-accent", () => {
    expect(buttonVars["accent-bg"]).toContain("--psi-fill-accent");
  });

  it("accent hover derives from component token", () => {
    const hover = buttonVars["accent-bg-hover"];
    expect(hover).toContain("oklch(from");
    expect(hover).toContain("--psi-button-accent-bg");
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
    expect(buttonVars["accent-fg"]).toContain("--psi-fg-on-accent");
  });

  it("ghost bg is transparent", () => {
    expect(buttonVars["ghost-bg"]).toBe("transparent");
  });

  it("danger bg references --psi-fill-danger", () => {
    expect(buttonVars["danger-bg"]).toContain("--psi-fill-danger");
  });

  it("accent-subtle bg references --psi-fill-tint-accent", () => {
    expect(buttonVars["accent-subtle-bg"]).toContain(
      "--psi-fill-tint-accent",
    );
  });

  it("danger-subtle bg references --psi-fill-tint-danger", () => {
    expect(buttonVars["danger-subtle-bg"]).toContain("--psi-fill-tint-danger");
  });

  it("neutral bg references fill-neutral3", () => {
    expect(buttonVars["neutral-bg"]).toContain("--psi-fill-neutral3");
  });

  it("outline hover label reuses the accent label binding (D37)", () => {
    expect(buttonVars["outline-fg-hover"]).toBe("var(--psi-button-accent-fg)");
    expect(buttonVars["outline-border"]).toBe("var(--psi-border-strong)");
    expect(BUTTON_VARIANTS).toContain("outline");
  });
});
