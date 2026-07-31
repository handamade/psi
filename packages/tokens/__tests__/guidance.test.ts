import { describe, expect, it } from "vitest";
import { guidance } from "../src/guidance.js";
import { controlVars } from "../src/components/control.js";

describe("guidance", () => {
  it("has 9 variant entries", () => {
    expect(guidance.variants).toHaveLength(9);
  });

  it("includes accent variant with non-empty intent", () => {
    const accentVariant = guidance.variants.find((v) => v.variant === "accent");
    expect(accentVariant).toBeDefined();
    expect(accentVariant?.intent).toBeTruthy();
    expect(accentVariant?.intent).toMatch(/Primary action/);
  });

  it("has hover state equal to 'L - 0.04'", () => {
    expect(guidance.states.hover).toBe("L - 0.04");
  });

  it("encodes D40: tags exempt from one-accent-per-group, subtle badge guidance", () => {
    expect(guidance.tags.accentRule).toMatch(/do not count|exempt/i);
    expect(guidance.tags.badges).toEqual({
      highlight: "accent-subtle",
      meta: "neutral-subtle",
      status: "success | warning | danger",
    });
    expect(guidance.tags.tagApi).toMatch(/variant="accent" subtle/);
  });

  it("exposes the D54 control ramp so agents can query per-size geometry", () => {
    expect(guidance.geometry.sizes).toEqual([24, 32, 40, 48]);
    expect(guidance.geometry.label.paddingInline).toEqual([8, 12, 16, 20]);
    expect(guidance.geometry.label.paddingInlineIcon).toEqual([6, 8, 12, 16]);
    expect(guidance.geometry.label.gap).toEqual([4, 8, 8, 8]);
    expect(guidance.geometry.value.paddingInline).toEqual([8, 8, 12, 16]);
    expect(guidance.geometry.components.Button).toBe("label");
    expect(guidance.geometry.components.Input).toBe("value");
    expect(guidance.geometry.components.Select).toBe("value");
    expect(guidance.geometry.note).toMatch(/--psi-control-/);
  });

  const px = (value: string) => {
    const m = value.match(/--psi-space-(\d+)\)/);
    if (!m) throw new Error(`not a spacing token: ${value}`);
    return Number(m[1]);
  };
  const combo = (value: string) => {
    const m = value.match(/--psi-text-([a-z0-9-]+)\)/);
    if (!m) throw new Error(`not a typography token: ${value}`);
    return m[1];
  };

  it("geometry mirrors controlVars, so the ramp cannot drift out of guidance (D54)", () => {
    const sizes = guidance.geometry.sizes;
    expect(sizes.map((n) => px(controlVars[`${n}-padding-inline`])))
      .toEqual([...guidance.geometry.label.paddingInline]);
    expect(sizes.map((n) => px(controlVars[`${n}-padding-inline-icon`])))
      .toEqual([...guidance.geometry.label.paddingInlineIcon]);
    expect(sizes.map((n) => px(controlVars[`${n}-gap`])))
      .toEqual([...guidance.geometry.label.gap]);
    expect(sizes.map((n) => px(controlVars[`value-${n}-padding-inline`])))
      .toEqual([...guidance.geometry.value.paddingInline]);
    expect(sizes.map((n) => combo(controlVars[`${n}-font`])))
      .toEqual([...guidance.geometry.label.font]);
    expect(sizes.map((n) => combo(controlVars[`value-${n}-font`])))
      .toEqual([...guidance.geometry.value.font]);
  });
});
