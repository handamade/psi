import { describe, expect, it } from "vitest";
import { extractRingRules } from "../src/bridges/ui-sdk-ring.js";
import { readUiSdkWebCss, uiSdkVersion } from "../src/bridges/ui-sdk-source.js";

const EXPECTED = [
  { kind: "outline", selector: ":is(a, summary):focus-visible" },
  { kind: "outline", selector: ":where([data-slot]):focus-visible" },
  { kind: "outline", selector: '[data-slot="slider-thumb"]:has(:focus-visible)' },
  { kind: "outline", selector: ':is( [data-slot="date-input"], [data-slot="time-input"], [data-slot="password-input"], [data-slot="input-group"] ):has(:focus-visible)' },
  { kind: "outline", selector: '[data-slot="otp-input-slot"][data-active]' },
  { kind: "outline", selector: '[data-slot="color-picker-swatch-item"]:focus-visible' },
  { kind: "outline", selector: '[data-slot="image-cropper-handle"]:focus-visible::after' },
  { kind: "box-shadow", selector: '[data-slot="resizable-handle"]:focus-visible' },
  { kind: "outline", selector: '[data-slot="tree-item"]:focus-visible > [data-slot="tree-label"], [data-slot="tree-item"]:focus-visible > :not([data-slot]) > [data-slot="tree-label"]' },
];

describe("UI SDK ring rules (D146)", () => {
  it("is pinned at 0.1.0-beta.18", () => {
    expect(uiSdkVersion()).toBe("0.1.0-beta.18");
  });

  it("finds the nine ring rules of the pinned web.css, nested selectors resolved", () => {
    expect(extractRingRules(readUiSdkWebCss())).toEqual(EXPECTED);
  });

  it("resolves a nested & rule and ignores declarations that do not use --ui-ring", () => {
    const css = `@layer ui-sdk { [data-slot="x"] { color: red; &:focus-visible { outline: 4px solid var(--ui-ring); } } .y { outline: 1px solid red; } }`;
    expect(extractRingRules(css)).toEqual([{ kind: "outline", selector: '[data-slot="x"]:focus-visible' }]);
  });
});
