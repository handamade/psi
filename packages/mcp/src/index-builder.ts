import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { BaseIndex, ComponentEntry, HookEntry, Oklch, PatternEntry, PropDoc, TokenEntry } from "./types.js";

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
    "@handamade/psi-react/styles — REQUIRED: component CSS. Separate export; the JS never " +
      "imports it for you. Without it every component renders unstyled (HAN-17 finding).",
  ],
  themeAttribute: 'Set data-psi-theme="light|dark|acme|ember" on <html> or a subtree root.',
  rules:
    "Sizes are px numbers (24 | 32 | 40 | 48), never S/M/L. Variants are flat " +
    "(accent, accent-subtle, neutral, neutral-subtle, ghost, danger, danger-subtle, outline); " +
    "one accent per visual group (Tags exempt, D40); danger only for destructive actions. " +
    "Never hardcode colors — bind var(--psi-*).",
};

/** Theme mechanics; travels with the index (spec: topics). */
export const THEMES_TOPIC = {
  themes: [...THEMES],
  attribute: 'Set data-psi-theme="light|dark|acme|ember" on <html> or a subtree root.',
  switching:
    "Theme CSS files are scoped under [data-psi-theme] and co-import safely — " +
    "import every theme you switch between at runtime.",
  customerThemes:
    "light/dark are the core pair; acme and ember are customer brand themes " +
    "(OKLCH formula overrides, same semantic token names).",
};

/** Shape of a component record in `packages/react/dist/manifest.json`. */
interface ManifestComponent {
  name: string;
  description: string;
  props: PropDoc[];
  slots: Array<{
    name: string;
    accepts: { components?: string[]; contracts?: string[] };
    cardinality: string;
    order?: number;
  }>;
  attributes: string | null;
  accessibleName: { oneOf: string[] } | null;
}

/** Shape of `packages/tokens/dist/resolved/<theme>.json`. */
interface ResolvedTheme {
  tokens: Record<string, { formula: string; oklch: Oklch; hex: string }>;
  scales: Record<string, unknown>;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function buildIndex(inputs: BuildInputs): Promise<BaseIndex> {
  const manifest = (await readJson(join(inputs.reactDist, "manifest.json"))) as {
    components: ManifestComponent[];
    icons: string[];
    iconDetails: { props: PropDoc[]; attributes: string | null; keywords: Record<string, string[]> };
    hooks: HookEntry[];
    contracts: Record<string, string[]>;
  };
  // Fail-fast is deliberate: requires @handamade/psi-react built first — same posture
  // as the manifest/guidance reads above.
  const patternsFile = (await readJson(join(inputs.reactDist, "patterns.json"))) as {
    patterns: PatternEntry[];
  };
  const attributes = (await readJson(join(inputs.reactDist, "attributes.json"))) as {
    sets: string[][];
    components: Record<string, number>;
    icons?: number;
  };
  // The export surface, as verify-published reads it: every `export { … }`
  // and `export type { … }` in the compiled entry's declarations.
  const dts = await readFile(join(inputs.reactDist, "index.d.ts"), "utf8");
  const exportNames = [...dts.matchAll(/^export\s+(?:type\s+)?\{([^}]+)\}/gm)].flatMap((m) =>
    m[1]
      .split(",")
      .map((n) => n.trim().split(/\s+as\s+/).pop()!)
      .filter(Boolean),
  );
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
      slots: c.slots,
      attributes: c.attributes,
      attributeSet: attributes.components[c.name] ?? null,
      accessibleName: c.accessibleName,
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
    patterns: patternsFile.patterns,
    scales: light.scales,
    attributeSets: attributes.sets,
    contracts: manifest.contracts,
    exports: [...new Set(exportNames)].sort(),
    icons: {
      names: manifest.icons,
      props: manifest.iconDetails.props,
      attributes: manifest.iconDetails.attributes,
      attributeSet: attributes.icons ?? null,
      keywords: manifest.iconDetails.keywords,
    },
    hooks: manifest.hooks,
    topics: {
      ...guidance,
      "getting-started": GETTING_STARTED,
      themes: THEMES_TOPIC,
      scales: light.scales,
    },
  };
}
