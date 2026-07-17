import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function parseNewThemeArgs(argv: string[]): { name: string | undefined; base: string } {
  const FLAGS_WITH_VALUES = new Set(["--base"]);
  let name: string | undefined;
  let base = "light";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--base") { base = argv[++i] ?? "(missing)"; continue; }
    if (a.startsWith("--")) { if (FLAGS_WITH_VALUES.has(a)) i++; continue; }
    if (name === undefined) name = a;
  }
  return { name, base };
}

function main(name: string, base: string) {
  if (base !== "light" && base !== "dark") {
    console.error(`--base must be "light" or "dark", got "${base}"`);
    process.exit(1);
  }

  const dir = resolve(import.meta.dirname, "../src/themes/customers");
  const file = resolve(dir, `${name}.ts`);
  const registryFile = resolve(dir, "index.ts");

  if (existsSync(file)) {
    console.error(`Theme "${name}" already exists at ${file}`);
    process.exit(1);
  }

  if (!existsSync(registryFile)) {
    console.error(`Registry file not found at ${registryFile}. Cannot register "${name}".`);
    process.exit(1);
  }

  const REGISTER_MARKER = "// <ds:register — new-theme inserts here, do not remove>";

  const registrySource = readFileSync(registryFile, "utf8");
  if (!registrySource.includes(REGISTER_MARKER)) {
    console.error(
      `Could not find the registration marker in ${registryFile}.\n` +
        `Expected a line containing: ${REGISTER_MARKER}\n` +
        `Add it back to customers/index.ts (inside the customerThemes record) and re-run this script.`,
    );
    process.exit(1);
  }

  mkdirSync(dir, { recursive: true });

  const anchors = base === "dark"
    ? `  // Dark-first brand (D27): formulas build on darkTheme.
  // ink = the brand's LIGHT text anchor, canvas = the DARK page anchor —
  // dark formulas force L per token, so hue/chroma carry the brand.
  ${name}Ink: { l: 0.95, c: 0.01, h: 250 },
  ${name}Canvas: { l: 0.15, c: 0.005, h: 250 },
  ${name}Brand: { l: 0.7, c: 0.18, h: 260 },`
    : `  // Base theme: light (D27). Replace with brand OKLCH anchors.
  ${name}Ink: { l: 0.25, c: 0.02, h: 250 },
  ${name}Canvas: { l: 0.95, c: 0.005, h: 250 },
  ${name}Brand: { l: 0.55, c: 0.21, h: 260 },`;

  const template = `import type { Palette, SlotMap } from "../../dsl/types.js";

export const ${name}Palette: Palette = {
${anchors}
  // Semantic anchors — safe starting points, tune to taste. success/warning
  // need to stay distinct from each other and from ${name}Brand: warning in
  // particular must stay light enough to carry black label text at 4.5:1.
  ${name}Success: { l: 0.52, c: 0.19, h: 155 },
  ${name}Warning: { l: 0.75, c: 0.18, h: 75 },
  ${name}Danger: { l: 0.55, c: 0.22, h: 25 },
  white: { l: 1.0, c: 0, h: 0 },
  black: { l: 0.0, c: 0, h: 0 },
};

export const ${name}Slots: SlotMap = {
  ink: "${name}Ink",
  canvas: "${name}Canvas",
  accent: "${name}Brand",
  success: "${name}Success",
  warning: "${name}Warning",
  danger: "${name}Danger",
};
`;

  writeFileSync(file, template);
  console.log(`Created ${file}`);

  // Register the new theme: prepend the import at the top of the registry file
  // and insert the entry into customerThemes as a new line just before the
  // marker's own line (so the marker's existing indentation is untouched).
  const importLine = `import { ${name}Palette, ${name}Slots } from "./${name}.js";\n`;
  const registrationLine = `  ${name}: { palette: ${name}Palette, slots: ${name}Slots${base === "dark" ? ', base: "dark"' : ""} },\n`;

  const markerIndex = registrySource.indexOf(REGISTER_MARKER);
  const markerLineStart = registrySource.lastIndexOf("\n", markerIndex) + 1;
  const bodyWithRegistration =
    registrySource.slice(0, markerLineStart) + registrationLine + registrySource.slice(markerLineStart);

  const updatedRegistry = importLine + bodyWithRegistration;

  writeFileSync(registryFile, updatedRegistry);
  console.log(`Registered in customers/index.ts. Edit the palette, then run pnpm build.`);
}

// Only run the CLI side effects when this file is executed directly (e.g. via
// `pnpm new-theme` / `tsx scripts/new-theme.ts`), not when imported for tests.
const isMainModule = process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const { name, base } = parseNewThemeArgs(process.argv.slice(2));
  if (!name) {
    console.error("Usage: pnpm new-theme <name> [--base dark]");
    process.exit(1);
  }
  main(name, base);
}
