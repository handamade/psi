import type { ChildNode, PluginCreator } from "postcss";

/** The order base.css declares (WS5). Repeated here so that importing
 * `@handamade/psi-react/styles` before base.css cannot create psi.components
 * first and rank it below psi.base and psi.theme. */
export const LAYER_ORDER = "psi.base, psi.theme, psi.components, psi.utilities";

/** psi-react's own CSS Modules, and nothing else: the token stylesheets are
 * layered already, and Storybook runs this plugin over every stylesheet. */
const COMPONENT_MODULE = /[\\/]packages[\\/]react[\\/]src[\\/].+\.module\.css/;

/** At-rules left at top level, unlayered. `@font-face` and `@property` register
 * a global name rather than style an element, and what a layer means for them
 * has varied by engine; the rest are not allowed in a layer block, or a layer
 * statement means something else inside one. */
const UNLAYERED = new Set(["charset", "import", "font-face", "property"]);

const staysUnlayered = (node: ChildNode) =>
  node.type === "atrule" &&
  (UNLAYERED.has(node.name) || (node.name === "layer" && node.nodes === undefined));

/**
 * D94: wraps each psi-react CSS Module in `@layer psi.components`, so the
 * utilities in `@layer psi.utilities` win over a component's own values.
 *
 * Registered in both the library build (vite.config.ts) and Storybook's
 * viteFinal, so `vr` renders the cascade consumers get.
 */
export const psiComponentsLayer: PluginCreator<void> = () => ({
  postcssPlugin: "psi-components-layer",
  Once(root, { AtRule }) {
    if (!COMPONENT_MODULE.test(root.source?.input.file ?? "")) return;

    const layer = new AtRule({ name: "layer", params: "psi.components" });
    for (const node of [...root.nodes]) {
      if (!staysUnlayered(node)) layer.append(node);
    }
    root.append(new AtRule({ name: "layer", params: LAYER_ORDER }), layer);
  },
});
psiComponentsLayer.postcss = true;
