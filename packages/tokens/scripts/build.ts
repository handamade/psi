import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
import type { BrandFonts } from "../src/themes/customers/index.js";
import { validate } from "../src/dsl/validator.js";
import { resolve } from "../src/dsl/resolver.js";
import { checkContrast, wcagAAPairs, componentLabelPairs } from "../src/contrast-matrix.js";

import { emitBaseCSS, emitThemeCSS } from "./emit-css.js";
import { emitResolvedJSON } from "./emit-json.js";
import { emitTokenTypes } from "./emit-types.js";
import { emitScaleVarsCSS, emitUtilitiesCSS } from "./emit-utilities.js";
import { emitComponentVarsCSS } from "./emit-components.js";
import { emitDTCG } from "./emit-dtcg.js";
import { gamutWarnings } from "../src/gamut.js";
import { buttonVars, BUTTON_VARIANTS } from "../src/components/button.js";
import { sizeScale } from "../src/scales/sizes.js";
import { breakpoints } from "../src/scales/layout.js";
import { inputVars } from "../src/components/input.js";
import { selectVars } from "../src/components/select.js";
import { checkboxVars } from "../src/components/checkbox.js";
import { switchVars } from "../src/components/switch.js";
import { tagVars } from "../src/components/tag.js";
import { tooltipVars } from "../src/components/tooltip.js";
import { cardVars } from "../src/components/card.js";
import { navbarVars } from "../src/components/navbar.js";
import { mediaVars } from "../src/components/media.js";
import { guidance } from "../src/guidance.js";

import type { Palette, SlotMap } from "../src/dsl/types.js";

// ── Config ────────────────────────────────────────────────────────

interface ThemeConfig {
  theme: typeof lightTheme;
  palette: Palette;
  slots: SlotMap;
  fonts?: BrandFonts;
  componentOverrides?: Record<string, string>;
}

const themes: Record<string, ThemeConfig> = {
  light: { theme: lightTheme, palette: defaultPalette, slots: defaultSlots },
  dark: { theme: darkTheme, palette: defaultPalette, slots: defaultSlots },
  ...Object.fromEntries(Object.entries(customerThemes).map(([name, c]) => [
    name, { theme: assembleCustomerTheme(c), palette: c.palette, slots: c.slots, fonts: c.fonts, componentOverrides: c.componentOverrides },
  ])),
};

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const distDir = join(__dirname, "..", "dist");
const resolvedDir = join(distDir, "resolved");
const typesDir = join(distDir, "types");
const dtcgDir = join(distDir, "dtcg");

// ── Build ─────────────────────────────────────────────────────────

function build(): void {
  console.log("[tokens] Building...");

  // Create output directories
  mkdirSync(distDir, { recursive: true });
  mkdirSync(resolvedDir, { recursive: true });
  mkdirSync(typesDir, { recursive: true });
  mkdirSync(dtcgDir, { recursive: true });

  // 1. Emit base CSS: default palette vars + scale vars.
  // Customer palettes are no longer merged in here — emitThemeCSS scopes
  // each theme's own palette vars inside its own selector block, so
  // base.css only ever carries the default brand's palette.
  const baseCSS =
    emitBaseCSS(defaultPalette) +
    `\n@layer ds.base {\n  :root {\n${emitScaleVarsCSS()}\n  }\n}\n`;
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
    const themeCSS = emitThemeCSS(themeName, themeDef, palette, slots, {
      fonts: config.fonts,
      componentOverrides: config.componentOverrides,
    });
    writeFileSync(join(distDir, `${themeName}.css`), themeCSS);
    console.log(`  wrote dist/${themeName}.css`);

    // Emit resolved JSON
    const json = emitResolvedJSON(themeName, resolved);
    writeFileSync(join(resolvedDir, `${themeName}.json`), json);
    console.log(`  wrote dist/resolved/${themeName}.json`);

    // Emit DTCG JSON
    const dtcgJson = emitDTCG(themeName, resolved);
    writeFileSync(join(dtcgDir, `${themeName}.json`), dtcgJson);
    console.log(`  wrote dist/dtcg/${themeName}.json`);
  }

  // 3. Emit TypeScript types
  const themeDefs = Object.fromEntries(
    Object.entries(themes).map(([name, config]) => [name, config.theme]),
  );
  const types = emitTokenTypes(themeDefs, [...sizeScale], [...BUTTON_VARIANTS], breakpoints);
  writeFileSync(join(typesDir, "index.d.ts"), types);
  console.log("  wrote dist/types/index.d.ts");
  writeFileSync(join(typesDir, "index.js"), `export const breakpoints = ${JSON.stringify(breakpoints)};\n`);
  console.log("  wrote dist/types/index.js");

  // 4. Emit utility classes
  const utilitiesCSS = emitUtilitiesCSS();
  writeFileSync(join(distDir, "utilities.css"), utilitiesCSS);
  console.log("  wrote dist/utilities.css");

  // 5. Emit component vars
  const componentVars: Record<string, Record<string, string>> = {
    button: buttonVars,
    input: inputVars,
    select: selectVars,
    checkbox: checkboxVars,
    switch: switchVars,
    tag: tagVars,
    tooltip: tooltipVars,
    card: cardVars,
    navbar: navbarVars,
    media: mediaVars,
  };
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

  // 6. Emit guidance.json
  writeFileSync(join(distDir, "guidance.json"), JSON.stringify(guidance, null, 2));
  console.log("  wrote dist/guidance.json");

  console.log("[tokens] Build complete.");
}

build();
