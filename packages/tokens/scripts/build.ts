import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { acmePalette, acmeSlots } from "../src/themes/customers/acme.js";
import { validate } from "../src/dsl/validator.js";
import { resolve } from "../src/dsl/resolver.js";
import { checkContrast, wcagAAPairs, componentLabelPairs } from "../src/contrast-matrix.js";

import { emitBaseCSS, emitThemeCSS } from "./emit-css.js";
import { emitResolvedJSON } from "./emit-json.js";
import { emitTokenTypes } from "./emit-types.js";
import { emitScaleVarsCSS, emitUtilitiesCSS } from "./emit-utilities.js";
import { emitComponentVarsCSS } from "./emit-components.js";
import { gamutWarnings } from "../src/gamut.js";
import { buttonVars } from "../src/components/button.js";

import type { Palette, SlotMap } from "../src/dsl/types.js";

// ── Config ────────────────────────────────────────────────────────

interface ThemeConfig {
  theme: typeof lightTheme;
  palette: Palette;
  slots: SlotMap;
}

const themes: Record<string, ThemeConfig> = {
  light: { theme: lightTheme, palette: defaultPalette, slots: defaultSlots },
  dark: { theme: darkTheme, palette: defaultPalette, slots: defaultSlots },
  acme: { theme: lightTheme, palette: acmePalette, slots: acmeSlots },
};

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const distDir = join(__dirname, "..", "dist");
const resolvedDir = join(distDir, "resolved");
const typesDir = join(distDir, "types");

// ── Build ─────────────────────────────────────────────────────────

function build(): void {
  console.log("[tokens] Building...");

  // Create output directories
  mkdirSync(distDir, { recursive: true });
  mkdirSync(resolvedDir, { recursive: true });
  mkdirSync(typesDir, { recursive: true });

  // 1. Emit base CSS: palette vars + scale vars
  // Merge all palettes so every theme's palette vars are available
  const allPalettes: Record<string, { l: number; c: number; h: number }> = {};
  for (const config of Object.values(themes)) {
    Object.assign(allPalettes, config.palette);
  }
  const paletteCSS = emitBaseCSS(allPalettes);
  const scaleVars = emitScaleVarsCSS();
  // Inject scale vars into the :root block (before the closing braces)
  const baseCSS = paletteCSS.replace(
    /(\s*}\n})\n$/,
    `\n\n${scaleVars}\n$1\n`,
  );
  writeFileSync(join(distDir, "base.css"), baseCSS);
  console.log("  wrote dist/base.css");

  // 2. For each theme: validate, resolve, check contrast, emit CSS + JSON
  for (const [themeName, config] of Object.entries(themes)) {
    const { theme: themeDef, palette, slots } = config;

    // Validate
    validate(themeDef, slots);
    console.log(`  validated ${themeName} theme`);

    // Resolve (static values for JSON)
    const resolved = resolve(themeDef, palette, slots);

    // Check gamut warnings (non-fatal)
    for (const w of gamutWarnings(resolved, themeDef, palette, slots)) {
      console.warn(`  GAMUT WARNING [${themeName}] ${w}`);
    }

    // Check contrast
    const contrastResults = checkContrast(resolved, [...wcagAAPairs, ...componentLabelPairs]);
    const failures = contrastResults.filter((r) => !r.pass);
    if (failures.length > 0) {
      console.error(`  CONTRAST FAILURES in ${themeName}:`);
      for (const f of failures) {
        console.error(`    ${f.fg} on ${f.bg}: ${f.ratio} (need ${f.minRatio})`);
      }
      throw new Error(`${themeName} theme has ${failures.length} contrast failures`);
    }
    console.log(`  contrast check passed for ${themeName}`);

    // Emit theme CSS (live oklch formulas)
    const themeCSS = emitThemeCSS(themeName, themeDef, palette, slots);
    writeFileSync(join(distDir, `${themeName}.css`), themeCSS);
    console.log(`  wrote dist/${themeName}.css`);

    // Emit resolved JSON
    const json = emitResolvedJSON(themeName, resolved);
    writeFileSync(join(resolvedDir, `${themeName}.json`), json);
    console.log(`  wrote dist/resolved/${themeName}.json`);
  }

  // 3. Emit TypeScript types
  const themeDefs = Object.fromEntries(
    Object.entries(themes).map(([name, config]) => [name, config.theme]),
  );
  const types = emitTokenTypes(themeDefs);
  writeFileSync(join(typesDir, "index.ts"), types);
  console.log("  wrote dist/types/index.ts");

  // 4. Emit utility classes
  const utilitiesCSS = emitUtilitiesCSS();
  writeFileSync(join(distDir, "utilities.css"), utilitiesCSS);
  console.log("  wrote dist/utilities.css");

  // 5. Emit component vars
  const componentVars: Record<string, Record<string, string>> = { button: buttonVars };
  const componentsDir = join(distDir, "components");
  mkdirSync(componentsDir, { recursive: true });
  const aggregate: string[] = [];
  for (const [name, vars] of Object.entries(componentVars)) {
    const css = emitComponentVarsCSS(name, vars);
    writeFileSync(join(componentsDir, `${name}.vars.css`), css);
    aggregate.push(css);
    console.log(`  wrote dist/components/${name}.vars.css`);
  }
  writeFileSync(join(distDir, "components.css"), aggregate.join("\n"));
  console.log("  wrote dist/components.css");

  console.log("[tokens] Build complete.");
}

build();
