import { describe, expect, it } from "vitest";
import { emitUiSdkCSS, emitUiSdkJSON } from "../scripts/emit-bridges.js";
import { readUiSdkWebCss, uiSdkVersion } from "../src/bridges/ui-sdk-source.js";

const css = emitUiSdkCSS(readUiSdkWebCss(), uiSdkVersion());

describe("emitUiSdkCSS (D146)", () => {
  it("names the UI SDK version and the layer line in its header, and imports nothing", () => {
    expect(css).toContain("@ui-sdk/core@0.1.0-beta.17");
    expect(css).toContain("@layer ui-sdk, psi.ui-sdk, psi.base, psi.theme, psi.components, psi.utilities;");
    expect(css).not.toMatch(/@import/);
  });

  it("declares the map once, in psi.ui-sdk, on every theme root", () => {
    expect(css.match(/@layer psi\.ui-sdk \{/g)).toHaveLength(1);
    expect(css.match(/:root, :host, \[data-psi-theme\] \{/g)).toHaveLength(1);
    expect(css).toContain("--ui-primary: var(--psi-fill-accent);");
    expect(css).toContain("--ui-line-height: calc(20 / 14);");
    expect(css).not.toContain("--ui-shadow:");
  });

  it("sets width and offset on the eight outline rings, and width on the box-shadow ring", () => {
    expect(css.match(/outline-width: var\(--psi-focus-ring-width\);/g)).toHaveLength(8);
    expect(css.match(/outline-offset: var\(--psi-focus-ring-offset\);/g)).toHaveLength(8);
    expect(css).toContain('[data-slot="resizable-handle"]:focus-visible {\n    box-shadow: 0 0 0 var(--psi-focus-ring-width) var(--ui-ring);');
    expect(css).not.toMatch(/outline-color|outline-style/);
  });
});

describe("emitUiSdkJSON (D146)", () => {
  it("carries the version, both layer lines, the map with roles and the left-alone list", () => {
    const j = JSON.parse(emitUiSdkJSON(uiSdkVersion()));
    expect(j.uiSdkVersion).toBe("0.1.0-beta.17");
    expect(j.tailwindLayerLine).toContain("psi.utilities, utilities;");
    expect(j.map).toContainEqual({ name: "--ui-input", value: "var(--psi-border-control)", role: "control-border" });
    expect(j.map).toContainEqual({ name: "--ui-radius", value: "var(--psi-control-radius)", role: null });
    expect(j.leftAlone).toContain("--ui-shadow");
  });
});
