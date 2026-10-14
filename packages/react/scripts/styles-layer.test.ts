import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postcss from "postcss";
import type { AtRule, ChildNode } from "postcss";

import { psiComponentsLayer, LAYER_ORDER } from "./components-layer.js";

// import.meta.dirname, not fileURLToPath(import.meta.url): under vitest's jsdom
// environment import.meta.url is not a file: URL. Same idiom as
// package-exports.test.ts.
const stylesPath = join(import.meta.dirname, "..", "dist", "styles.css");

/** At-rules that may sit outside `@layer psi.components` (D94): layer
 * statements, and the two that register a global name rather than style an
 * element. `@keyframes` is allowed out by the plan's contract, though the
 * plugin keeps it in; see the spec. */
const MAY_STAY_UNLAYERED = new Set(["layer", "keyframes", "property", "font-face", "charset", "import"]);

const isLayerStatement = (n: ChildNode): n is AtRule =>
  n.type === "atrule" && n.name === "layer" && n.nodes === undefined;

/** D94: component CSS lives in `@layer psi.components`, so utilities
 * (`@layer psi.utilities`) win over it. Before D94 every rule in styles.css was
 * unlayered and beat every utility, whatever the specificity. */
describe("dist/styles.css is layered (D94)", () => {
  it("exists — run `pnpm build` first", () => {
    expect(existsSync(stylesPath)).toBe(true);
  });

  const root = postcss.parse(existsSync(stylesPath) ? readFileSync(stylesPath, "utf8") : "");

  it("has no top-level rule or at-rule outside @layer psi.components", () => {
    const stray = (root.nodes ?? [])
      .filter((n) => n.type !== "comment")
      .filter((n) => {
        if (n.type !== "atrule") return true;
        if (n.name === "layer") return n.nodes !== undefined && n.params !== "psi.components";
        return !MAY_STAY_UNLAYERED.has(n.name);
      })
      .map((n) => (n.type === "rule" ? n.selector : `@${(n as AtRule).name} ${(n as AtRule).params}`));
    expect(stray).toEqual([]);
  });

  it("puts every style rule inside the layer", () => {
    // Guards against an empty or comment-only wrap passing the test above.
    let inside = 0;
    root.walkAtRules("layer", (at) => {
      if (at.params === "psi.components") at.walkRules(() => void inside++);
    });
    expect(inside).toBeGreaterThan(100);
  });

  it("declares the full layer order before any layer block", () => {
    // Without it, importing psi-react/styles before base.css would create
    // psi.components first and put it below psi.base and psi.theme.
    const first = (root.nodes ?? []).find((n) => n.type === "atrule" && n.name === "layer");
    expect(first && isLayerStatement(first)).toBe(true);
    // The minifier drops the spaces after the commas.
    expect((first as AtRule).params.split(/\s*,\s*/)).toEqual(LAYER_ORDER.split(", "));
  });

  it("keeps the Dialog's ::backdrop and the module keyframes inside the layer", () => {
    const layered: string[] = [];
    root.walkAtRules("layer", (at) => {
      if (at.params !== "psi.components") return;
      at.walkRules((r) => void (r.selector.includes("::backdrop") && layered.push(r.selector)));
      at.walkAtRules("keyframes", (k) => void layered.push(`@keyframes ${k.params}`));
    });
    expect(layered.some((s) => s.includes("::backdrop"))).toBe(true);
    expect(layered.some((s) => s.startsWith("@keyframes"))).toBe(true);
  });
});

describe("psiComponentsLayer plugin", () => {
  const run = (css: string, from = "/repo/packages/react/src/Button/button.module.css") =>
    postcss([psiComponentsLayer()]).process(css, { from }).css;

  it("wraps rules, media queries and keyframes in psi.components", () => {
    const out = postcss.parse(
      run(".a { color: red } @media (min-width: 1px) { .b { gap: 0 } } @keyframes k { to { opacity: 1 } }"),
    );
    const top = out.nodes.filter((n) => n.type === "atrule") as AtRule[];
    expect(top.map((n) => [n.name, n.params])).toEqual([
      ["layer", LAYER_ORDER],
      ["layer", "psi.components"],
    ]);
    const inner = top[1].nodes!.map((n) => (n.type === "rule" ? n.selector : `@${(n as AtRule).name}`));
    expect(inner).toEqual([".a", "@media", "@keyframes"]);
  });

  it("hoists @font-face and @property out of the layer, unlayered", () => {
    const out = postcss.parse(
      run("@property --x { syntax: '<length>'; inherits: false; initial-value: 0px } @font-face { font-family: F; src: local(Arial) } .a { color: red }"),
    );
    const top = out.nodes.map((n) => (n.type === "atrule" ? `@${n.name}` : n.type));
    expect(top).toEqual(["@property", "@font-face", "@layer", "@layer"]);
  });

  it("leaves CSS that is not a psi-react module alone", () => {
    // Storybook runs the plugin over every stylesheet it loads; the token
    // stylesheets are layered already and must not be wrapped twice.
    const css = "@layer psi.base { :root { --a: 1 } }";
    expect(run(css, "/repo/packages/tokens/dist/base.css")).toBe(css);
    expect(run(".a{}", "/repo/apps/storybook/.storybook/preview.css")).toBe(".a{}");
  });
});
