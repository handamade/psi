import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** `"filter-toolbar"` -> `"FilterToolbar"`. */
export function patternIdToExportName(id: string): string {
  return id
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

const HEADER = `// GENERATED FILE — do not hand-edit. Run \`tsx scripts/emit-pattern-stories.ts\`
// (part of \`pnpm build\`) to regenerate. One story per packages/react
// patterns.json entry (D77) — every pattern is mounted from a real,
// registered component tree via renderPresetElement, not a hand-copied
// approximation of one, so a pattern's JSON and its story cannot drift
// apart and a new 14th pattern gets a story with no hand-authoring.

import type { Meta, StoryObj } from "storybook";
import * as Psi from "../../../../packages/react/src/index.js";
import { renderPresetElement } from "../../../../packages/react/scripts/patterns.js";
import patternsFile from "@handamade/psi-react/patterns.json";
import manifestFile from "@handamade/psi-react/manifest.json";

const meta: Meta = {
  title: "Patterns/Presets",
};
export default meta;
type Story = StoryObj;

function preset(id: string) {
  const pattern = patternsFile.patterns.find((p) => p.id === id);
  if (!pattern) throw new Error(\`emit-pattern-stories: no pattern "\${id}" in patterns.json\`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the JSON-imported pattern/manifest data's inferred shape doesn't structurally match Pattern/ManifestComponent, and Psi (a namespace import covering both components and TypeScript types) doesn't structurally match Record<string, ComponentType<any>> — both are genuine, deliberate boundary casts.
  return () => renderPresetElement(pattern as any, manifestFile.components as any, Psi as any);
}
`;

/** Pure string builder — no fs. `emitPatternStories([{id:...}, ...])` given
 * only the minimal shape it needs (`id`), so the "double-emit is
 * byte-identical" test doesn't need a full Pattern fixture. */
export function emitPatternStories(patterns: Array<{ id: string }>): string {
  const blocks = patterns.map((p) => {
    const name = patternIdToExportName(p.id);
    return `export const ${name}: Story = {\n  render: preset("${p.id}"),\n};\n`;
  });
  return HEADER + "\n" + blocks.join("\n");
}

function main() {
  const patternsPath = join(__dirname, "../../../packages/react/dist/patterns.json");
  const patterns = JSON.parse(readFileSync(patternsPath, "utf8")).patterns as Array<{ id: string }>;
  const source = emitPatternStories(patterns);
  const outPath = join(__dirname, "../src/patterns/Presets.stories.tsx");
  writeFileSync(outPath, source);
  console.log(`[storybook] wrote src/patterns/Presets.stories.tsx (${patterns.length} patterns)`);
}

main();
