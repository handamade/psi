import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ComponentEntry, Oklch, PropDoc, PsiIndex, TokenEntry } from "./types.js";

const THEMES = ["light", "dark", "acme", "ember"];

export interface BuildInputs {
  tokensDist: string;
  reactDist: string;
  reactDocs: string;
  version: string;
}

/** Release-versioned onboarding facts; travels with the index (spec: topics). */
export const GETTING_STARTED = {
  install: "npm install @handamade/psi-tokens @handamade/psi-react",
  cssImports: [
    "@handamade/psi-tokens/base.css",
    "@handamade/psi-tokens/<theme>.css — one per theme you use (light|dark|acme|ember)",
    "@handamade/psi-tokens/components.css",
    "@handamade/psi-tokens/utilities.css — REQUIRED: .psi-container + reduced-motion zeroing",
  ],
  themeAttribute: 'Set data-psi-theme="light|dark|acme|ember" on <html> or a subtree root.',
  rules:
    "Sizes are px numbers (24 | 32 | 40 | 48), never S/M/L. Variants are flat " +
    "(accent, accent-subtle, neutral, neutral-subtle, ghost, danger, danger-subtle, outline); " +
    "one accent per visual group (Tags exempt, D40); danger only for destructive actions. " +
    "Never hardcode colors — bind var(--psi-*).",
};

/** Shape of a component record in `packages/react/dist/manifest.json`. */
interface ManifestComponent {
  name: string;
  description: string;
  props: PropDoc[];
}

/** Shape of `packages/tokens/dist/resolved/<theme>.json`. */
interface ResolvedTheme {
  tokens: Record<string, { formula: string; oklch: Oklch; hex: string }>;
  scales: Record<string, unknown>;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function buildIndex(inputs: BuildInputs): Promise<PsiIndex> {
  const manifest = (await readJson(join(inputs.reactDist, "manifest.json"))) as {
    components: ManifestComponent[];
  };
  const guidance = (await readJson(join(inputs.tokensDist, "guidance.json"))) as Record<
    string,
    unknown
  >;
  const resolved: Record<string, ResolvedTheme> = {};
  for (const theme of THEMES) {
    resolved[theme] = (await readJson(
      join(inputs.tokensDist, "resolved", `${theme}.json`),
    )) as ResolvedTheme;
  }

  const components: ComponentEntry[] = [];
  for (const c of manifest.components) {
    components.push({
      name: c.name,
      description: c.description,
      props: c.props,
      doc: await readFile(join(inputs.reactDocs, `${c.name}.md`), "utf8"),
    });
  }

  const light = resolved.light;
  const tokens: TokenEntry[] = Object.keys(light.tokens).map((name) => ({
    name,
    formula: light.tokens[name].formula,
    values: Object.fromEntries(
      THEMES.map((t) => [
        t,
        { oklch: resolved[t].tokens[name].oklch, hex: resolved[t].tokens[name].hex },
      ]),
    ),
  }));

  return {
    version: inputs.version,
    themes: [...THEMES],
    components,
    tokens,
    scales: light.scales,
    topics: { ...guidance, "getting-started": GETTING_STARTED },
  };
}
