import { describe, expect, it } from "vitest";
import stylelint from "stylelint";
import { fileURLToPath } from "node:url";

// Resolved as an absolute path from this test file's location so the test
// is independent of the process cwd stylelint resolves plugins against.
const pluginPath = fileURLToPath(new URL("../../../tools/stylelint-plugin-psi-tokens.mjs", import.meta.url));

const config = {
  plugins: [pluginPath],
  rules: { "psi/token-scopes": true },
};

async function lintCSS(code: string) {
  const { results } = await stylelint.lint({ code, codeFilename: "widget.module.css", config });
  return results[0].warnings.map((w) => w.text);
}

describe("psi/token-scopes (D46 secondary gate)", () => {
  it("errors on a text-scoped semantic token as background", async () => {
    const warnings = await lintCSS(".x { background: var(--psi-fg-primary); }");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/--psi-fg-primary/);
  });

  it("errors on a surface-scoped component token as color", async () => {
    const warnings = await lintCSS(".x { color: var(--psi-button-accent-bg); }");
    expect(warnings).toHaveLength(1);
  });

  it("errors on a space token as width", async () => {
    const warnings = await lintCSS(".x { width: var(--psi-space-8); }");
    expect(warnings).toHaveLength(1);
  });

  it("passes in-scope bindings", async () => {
    expect(await lintCSS(".x { color: var(--psi-fg-primary); }")).toEqual([]);
    expect(await lintCSS(".x { background: var(--psi-button-accent-bg); }")).toEqual([]);
    expect(await lintCSS(".x { gap: var(--psi-space-8); padding: var(--psi-space-16); }")).toEqual([]);
  });

  it("skips custom-property declarations and unscoped tokens", async () => {
    expect(await lintCSS(".x { --local: var(--psi-fg-primary); }")).toEqual([]);
    expect(await lintCSS(".x { width: var(--psi-size-24); }")).toEqual([]); // size family unscoped
  });
});
