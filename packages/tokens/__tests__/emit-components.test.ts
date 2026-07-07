import { describe, expect, it } from "vitest";
import { emitComponentVarsCSS } from "../scripts/emit-components.js";
import { buttonVars } from "../src/components/button.js";

describe("emitComponentVarsCSS", () => {
  it("emits ds.components layer with prefixed vars", () => {
    const css = emitComponentVarsCSS("button", buttonVars);
    expect(css).toContain("@layer ds.components");
    expect(css).toContain(":root, [data-ds-theme]");
    expect(css).toContain("--ds-button-accent-bg: var(--ds-fill-accent);");
    expect(css).toContain(
      "--ds-button-accent-bg-hover: oklch(from var(--ds-button-accent-bg) calc(l - 0.04) c h);",
    );
  });
});
