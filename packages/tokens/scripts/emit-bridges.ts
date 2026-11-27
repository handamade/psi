import { uiSdkTokenMap, uiSdkColourRoles, uiSdkLeftAlone, UI_SDK_LAYER_LINE, UI_SDK_TAILWIND_LAYER_LINE } from "../src/bridges/ui-sdk.js";
import { extractRingRules } from "../src/bridges/ui-sdk-ring.js";

/** D146 — dist/ui-sdk.css. Generated; edit src/bridges/ui-sdk.ts instead. */
export function emitUiSdkCSS(webCss: string, version: string): string {
  const map = Object.entries(uiSdkTokenMap).map(([k, v]) => `    --ui-${k}: ${v};`).join("\n");
  const rings = extractRingRules(webCss).map(({ kind, selector }) =>
    kind === "outline"
      ? `  ${selector} {\n    outline-width: var(--psi-focus-ring-width);\n    outline-offset: var(--psi-focus-ring-offset);\n  }`
      : `  ${selector} {\n    box-shadow: 0 0 0 var(--psi-focus-ring-width) var(--ui-ring);\n  }`,
  ).join("\n\n");
  return `/* @handamade/psi-tokens/ui-sdk.css (D146), generated. Themes UI SDK's default look with Psi tokens.
 * Built against @ui-sdk/core@${version}. Import it after @ui-sdk/core/web.css, behind this layer line:
 *   ${UI_SDK_LAYER_LINE}
 * Retune it through Psi tokens, never through --ui-* directly. */
@layer psi.ui-sdk {
  :root, :host, [data-psi-theme] {
${map}
  }

${rings}
}
`;
}

/** D146 — dist/ui-sdk.json, read by the consumer guide. Generated. */
export function emitUiSdkJSON(version: string): string {
  return JSON.stringify({
    uiSdkVersion: version,
    layerLine: UI_SDK_LAYER_LINE,
    tailwindLayerLine: UI_SDK_TAILWIND_LAYER_LINE,
    map: Object.entries(uiSdkTokenMap).map(([k, v]) => ({ name: `--ui-${k}`, value: v, role: uiSdkColourRoles[k] ?? null })),
    leftAlone: uiSdkLeftAlone.map((k) => `--ui-${k}`),
  }, null, 2) + "\n";
}
