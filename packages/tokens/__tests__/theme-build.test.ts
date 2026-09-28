// D81 — a consumer builds a gated theme from its own definition, outside the
// Psi repo, through the same validate → contrast → scope gates as Psi's build.
import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildThemeCss, ThemeGateError, type CustomerTheme } from "../src/theme/index.js";
import { run } from "../src/cli/psi-theme.js";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
import { emitThemeCSS } from "../src/emit/css.js";

const forest: CustomerTheme = {
  palette: {
    pine: { l: 0.2, c: 0.02, h: 150 },
    paper: { l: 0.99, c: 0.004, h: 150 },
    leaf: { l: 0.5, c: 0.12, h: 150 },
    moss: { l: 0.55, c: 0.1, h: 185 },
    amber: { l: 0.78, c: 0.15, h: 80 },
    brick: { l: 0.55, c: 0.2, h: 25 },
  },
  slots: { ink: "pine", canvas: "paper", accent: "leaf", success: "moss", warning: "amber", danger: "brick" },
};

describe("buildThemeCss (D81)", () => {
  it("emits exactly what Psi's own build emits for a shipped customer theme", () => {
    const acme = customerThemes.acme;
    const expected = emitThemeCSS("acme", assembleCustomerTheme(acme), acme.palette, acme.slots, {
      fonts: acme.fonts,
      componentOverrides: acme.componentOverrides,
    });
    expect(buildThemeCss("acme", acme).css).toBe(expected);
  });

  it("scopes a consumer theme to its own data-psi-theme attribute, never :root", () => {
    const { css } = buildThemeCss("forest", forest);
    expect(css).toContain('[data-psi-theme="forest"] {');
    expect(css).not.toContain(":root");
  });

  it("refuses a theme that fails WCAG AA, naming every failing pair", () => {
    // A pale accent under white on-accent text fails the fill contrast.
    const pale: CustomerTheme = { ...forest, palette: { ...forest.palette, leaf: { l: 0.86, c: 0.12, h: 150 } } };
    let caught: unknown;
    try {
      buildThemeCss("pale", pale);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ThemeGateError);
    const err = caught as ThemeGateError;
    expect(err.theme).toBe("pale");
    expect(err.contrastFailures.length).toBeGreaterThan(0);
    expect(err.message).toMatch(/contrast/i);
  });

  it("builds a dark-based theme for a sub-tree, such as a dark sidebar", () => {
    const sidebar: CustomerTheme = {
      ...forest,
      base: "dark",
      palette: { ...forest.palette, pine: { l: 0.97, c: 0.01, h: 150 }, paper: { l: 0.18, c: 0.03, h: 150 }, leaf: { l: 0.5, c: 0.12, h: 150 } },
    };
    expect(buildThemeCss("forest-sidebar", sidebar).css).toContain('[data-psi-theme="forest-sidebar"] {');
  });
});

describe("psi-theme CLI (D81)", () => {
  // Inside the package: Vitest resolves dynamic imports through Vite, which
  // refuses files outside the project (such as the OS temp dir).
  const dir = join(fileURLToPath(new URL(".", import.meta.url)), ".psi-theme-tmp");
  mkdirSync(dir, { recursive: true });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("writes the gated CSS for a definition module and exits 0", async () => {
    const def = join(dir, "forest.mjs");
    writeFileSync(def, `export default ${JSON.stringify(forest)};\n`);
    const out = join(dir, "forest.css");
    const code = await run([def, "--name", "forest", "--out", out]);
    expect(code).toBe(0);
    expect(readFileSync(out, "utf8")).toBe(buildThemeCss("forest", forest).css);
  });

  it("exits 1 and writes nothing when the gate refuses the theme", async () => {
    const pale = { ...forest, palette: { ...forest.palette, leaf: { l: 0.86, c: 0.12, h: 150 } } };
    const def = join(dir, "pale.mjs");
    writeFileSync(def, `export default ${JSON.stringify(pale)};\n`);
    const out = join(dir, "pale.css");
    const code = await run([def, "--name", "pale", "--out", out]);
    expect(code).toBe(1);
    expect(existsSync(out)).toBe(false);
  });

  it("exits 2 on missing arguments", async () => {
    expect(await run([])).toBe(2);
  });
});
