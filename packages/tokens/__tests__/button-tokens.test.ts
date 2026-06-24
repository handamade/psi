import { describe, it, expect } from "vitest";
import { buttonTokens } from "../src/components/button.js";

const VARIANTS = [
  "accent",
  "accent-subtle",
  "neutral",
  "neutral-subtle",
  "ghost",
  "danger",
  "danger-subtle",
] as const;

const REQUIRED_KEYS = ["bg", "bgHover", "bgActive", "fg"] as const;

describe("buttonTokens", () => {
  it("exports all seven variants", () => {
    expect(Object.keys(buttonTokens).sort()).toEqual([...VARIANTS].sort());
  });

  for (const variant of VARIANTS) {
    describe(`variant: ${variant}`, () => {
      it("has all required token keys (bg, bgHover, bgActive, fg)", () => {
        const entry = buttonTokens[variant];
        for (const key of REQUIRED_KEYS) {
          expect(entry).toHaveProperty(key);
          expect(typeof entry[key]).toBe("string");
          expect(entry[key].length).toBeGreaterThan(0);
        }
      });
    });
  }

  it("accent bg references --ds-fill-accent", () => {
    expect(buttonTokens.accent.bg).toContain("--ds-fill-accent");
  });

  it("accent hover derives from component token with semantic fallback", () => {
    const hover = buttonTokens.accent.bgHover;
    expect(hover).toContain("oklch(from");
    expect(hover).toContain("--ds-button-accent-bg");
    expect(hover).toContain("--ds-fill-accent");
  });

  it("accent active has stronger lightness shift than hover", () => {
    const hover = buttonTokens.accent.bgHover;
    const active = buttonTokens.accent.bgActive;
    // Both use oklch(from ...) with calc(l - X)
    const hoverShift = hover.match(/calc\(l - ([\d.]+)\)/)?.[1];
    const activeShift = active.match(/calc\(l - ([\d.]+)\)/)?.[1];
    expect(hoverShift).toBeDefined();
    expect(activeShift).toBeDefined();
    expect(Number(activeShift)).toBeGreaterThan(Number(hoverShift));
  });

  it("accent fg is static white", () => {
    expect(buttonTokens.accent.fg).toContain("--ds-fg-static-white");
  });

  it("ghost bg is transparent", () => {
    expect(buttonTokens.ghost.bg).toBe("transparent");
  });

  it("danger bg references --ds-fill-danger", () => {
    expect(buttonTokens.danger.bg).toContain("--ds-fill-danger");
  });

  it("accent-subtle bg references --ds-fill-tint-accent", () => {
    expect(buttonTokens["accent-subtle"].bg).toContain(
      "--ds-fill-tint-accent",
    );
  });

  it("danger-subtle bg references --ds-fill-tint-danger", () => {
    expect(buttonTokens["danger-subtle"].bg).toContain(
      "--ds-fill-tint-danger",
    );
  });

  it("neutral bg references fill-neutral3", () => {
    expect(buttonTokens.neutral.bg).toContain("--ds-fill-neutral3");
  });
});
