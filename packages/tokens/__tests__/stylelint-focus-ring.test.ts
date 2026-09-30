import { describe, expect, it } from "vitest";
import stylelint from "stylelint";
import { fileURLToPath } from "node:url";

// Resolved as an absolute path from this test file's location so the test
// is independent of the process cwd stylelint resolves plugins against.
const pluginPath = fileURLToPath(new URL("../../../tools/stylelint-plugin-psi-tokens.mjs", import.meta.url));

const config = {
  plugins: [pluginPath],
  rules: { "psi/focus-ring": true, "psi/component-tokens-only": true },
};

async function lintCSS(code: string, codeFilename = "widget.module.css") {
  const { results } = await stylelint.lint({ code, codeFilename, config });
  return results[0].warnings.map((w) => w.text);
}

const RING = "outline: var(--psi-focus-ring-width) solid var(--psi-widget-focus-ring);";

describe("psi/focus-ring (D82)", () => {
  it("passes the shared ring, outside and inset", async () => {
    expect(await lintCSS(`.x:focus-visible { ${RING} outline-offset: var(--psi-focus-ring-offset); }`)).toEqual([]);
    expect(await lintCSS(`.x:focus-visible { ${RING} outline-offset: var(--psi-focus-ring-offset-inset); }`)).toEqual([]);
  });

  it("errors on a literal outline width", async () => {
    const warnings = await lintCSS(".x:focus-visible { outline: 2px solid var(--psi-widget-focus-ring); }");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/--psi-focus-ring-width/);
  });

  it("errors on a literal outline-offset, negative included", async () => {
    expect(await lintCSS(`.x:focus-visible { ${RING} outline-offset: 2px; }`)).toHaveLength(1);
    expect(await lintCSS(`.x:focus-visible { ${RING} outline-offset: -1px; }`)).toHaveLength(1);
  });

  it("errors on arithmetic over a token", async () => {
    expect(
      await lintCSS(`.x:focus-visible { ${RING} outline-offset: calc(var(--psi-focus-ring-offset) * -1); }`),
    ).toHaveLength(1);
  });

  it("errors on an outline keyed on :focus, or on no focus state at all", async () => {
    const onFocus = await lintCSS(`.x:focus { ${RING} }`);
    expect(onFocus).toHaveLength(1);
    expect(onFocus[0]).toMatch(/:focus-visible/);
    expect(await lintCSS(`.x { ${RING} }`)).toHaveLength(1);
  });

  it("requires :focus-visible in every selector of a list", async () => {
    expect(await lintCSS(`.a:focus-visible, .b:focus { ${RING} }`)).toHaveLength(1);
    expect(await lintCSS(`.a:focus-visible, .b:focus-visible + .c { ${RING} }`)).toEqual([]);
  });

  it("errors on removing the outline", async () => {
    const warnings = await lintCSS(".x:focus-visible { outline: none; }");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/removes the focus ring/);
  });

  it("leaves a transition on outline alone", async () => {
    expect(
      await lintCSS(".x { transition: outline var(--psi-duration-150) var(--psi-ease-standard); }"),
    ).toEqual([]);
  });

  it("only gates component CSS Modules", async () => {
    expect(await lintCSS("a:focus-visible { outline: 2px solid red; }", "app.css")).toEqual([]);
  });
});
