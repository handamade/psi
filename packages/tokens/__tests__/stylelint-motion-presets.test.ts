import { describe, expect, it } from "vitest";
import stylelint from "stylelint";
import { fileURLToPath } from "node:url";

// D141: component CSS binds a --psi-motion-* preset in every transition and
// animation; the raw duration and easing scales are for the stated exceptions.
const pluginPath = fileURLToPath(new URL("../../../tools/stylelint-plugin-psi-tokens.mjs", import.meta.url));

const config = {
  plugins: [pluginPath],
  rules: { "psi/motion-presets": true, "psi/component-tokens-only": true },
};

async function lintCSS(code: string, codeFilename = "widget.module.css") {
  const { results } = await stylelint.lint({ code, codeFilename, config });
  return results[0].warnings.map((w) => w.text);
}

describe("psi/motion-presets (D141)", () => {
  it("reports a raw duration or easing token in a transition", async () => {
    const warnings = await lintCSS(".x { transition: color var(--psi-duration-150) var(--psi-ease-standard); }");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/--psi-motion-\*/);
  });

  it("reports one in an animation and in the longhands", async () => {
    expect(await lintCSS(".x { animation: in var(--psi-duration-200) var(--psi-motion-move-ease); }")).toHaveLength(1);
    expect(await lintCSS(".x { transition-duration: var(--psi-duration-150); }")).toHaveLength(1);
    expect(await lintCSS(".x { animation-timing-function: var(--psi-ease-soft); }")).toHaveLength(1);
  });

  it("passes a preset, and is accepted by component-tokens-only as a global prefix", async () => {
    expect(await lintCSS(".x { transition: color var(--psi-motion-feedback-duration) var(--psi-motion-feedback-ease); }")).toEqual([]);
    expect(await lintCSS(".x { animation: in var(--psi-motion-move-duration) var(--psi-motion-move-ease); }")).toEqual([]);
  });

  it("leaves other files and other properties alone", async () => {
    expect(await lintCSS(".x { transition: color var(--psi-duration-150) ease; }", "site.css")).toEqual([]);
    expect(await lintCSS(".x { --psi-widget-duration: var(--psi-duration-150); }")).toEqual([]);
  });

  it("honours a disable comment with a reason", async () => {
    const code = "/* stylelint-disable-next-line psi/motion-presets -- D86 */\n.x { animation: pulse var(--psi-duration-600) var(--psi-ease-in-out) infinite; }";
    expect(await lintCSS(code)).toEqual([]);
  });
});
