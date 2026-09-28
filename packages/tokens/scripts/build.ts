import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { defaultPalette, defaultSlots } from "../src/palettes/default.js";
import { lightTheme } from "../src/themes/light.js";
import { darkTheme } from "../src/themes/dark.js";
import { customerThemes, assembleCustomerTheme } from "../src/themes/customers/index.js";
import type { BrandFonts } from "../src/themes/customers/index.js";
import { validateScopeConsistency, validateNoScalePrefixShadow } from "../src/dsl/validator.js";
import { SCALE_SCOPES, PROPERTY_GROUPS, keyGroup } from "../src/scopes.js";

import { emitBaseCSS, emitThemeCSS, camelToKebab } from "./emit-css.js";
import { componentVars } from "../src/components/registry.js";
import { gateTheme, ThemeGateError } from "../src/theme/gate.js";
import { emitResolvedJSON } from "./emit-json.js";
import { emitTokenTypes } from "./emit-types.js";
import { emitScaleVarsCSS, emitUtilitiesCSS, emitUtilitiesRoster } from "./emit-utilities.js";
import { emitComponentVarsCSS } from "./emit-components.js";
import { emitDTCG } from "./emit-dtcg.js";
import { BUTTON_VARIANTS } from "../src/components/button.js";
import { sizeScale } from "../src/scales/sizes.js";
import { breakpoints } from "../src/scales/layout.js";
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

  // D46 — every theme must declare the same scope (or no scope) for a
  // given token name; catches accidental scope drift across brands.
  validateScopeConsistency(
    Object.fromEntries(Object.entries(themes).map(([n, c]) => [n, c.theme])),
  );

  // D46 follow-up (HAN-21) — semantic names must not shadow scale families.
  validateNoScalePrefixShadow(
    Object.values(themes).flatMap((c) => Object.keys(c.theme).map(camelToKebab)),
  );

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
    `\n@layer psi.base {\n  :root {\n${emitScaleVarsCSS()}\n  }\n}\n`;
  writeFileSync(join(distDir, "base.css"), baseCSS);
  console.log("  wrote dist/base.css");

  // 2. For each theme: validate, resolve, check contrast, emit CSS + JSON
  for (const [themeName, config] of Object.entries(themes)) {
    const { theme: themeDef, palette, slots } = config;

    // Validate, resolve, and gate: WCAG AA contrast + D46 scopes. D81: one
    // implementation (src/theme/gate.ts), shared with a consumer's theme build.
    let gated;
    try {
      gated = gateTheme(themeName, themeDef, palette, slots, config.componentOverrides);
    } catch (e) {
      if (e instanceof ThemeGateError) {
        if (e.contrastFailures.length > 0) {
          console.error(`  CONTRAST FAILURES in ${themeName}:`);
          for (const f of e.contrastFailures) console.error(`    ${f.fg} on ${f.bg}: ${f.ratio} (need ${f.minRatio})`);
        }
        if (e.scopeViolations.length > 0) {
          console.error(`  SCOPE VIOLATIONS in ${themeName}:`);
          for (const v of e.scopeViolations) {
            console.error(`    --psi-${v.component}-${v.key} (${v.group}) binds ${v.token} [${v.scopes.join(", ") || "unknown token"}]`);
          }
        }
      }
      throw e;
    }
    const { resolved } = gated;
    for (const w of gated.warnings) console.warn(`  GAMUT WARNING [${themeName}] ${w}`);
    console.log(`  validated ${themeName} theme; contrast and scope gates passed`);

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

  // D46 scope map for the stylelint consumer rule.
  const semanticScopes = Object.fromEntries(
    Object.entries(themes.light.theme)
      .filter(([, def]) => def.scopes !== undefined)
      .map(([name, def]) => [camelToKebab(name), def.scopes]),
  );
  const componentScopes = Object.fromEntries(
    Object.entries(componentVars).flatMap(([component, vars]) =>
      Object.keys(vars)
        .map((key) => [`${component}-${key}`, keyGroup(key)] as const)
        .filter(([, g]) => g !== undefined)
        .map(([k, g]) => [k, [g]]),
    ),
  );
  writeFileSync(join(distDir, "scope-map.json"), JSON.stringify({
    propertyGroups: PROPERTY_GROUPS,
    semantic: semanticScopes,
    component: componentScopes,
    scales: SCALE_SCOPES,
  }, null, 2) + "\n");
  console.log("  wrote dist/scope-map.json");

  // 6. Emit guidance.json
  writeFileSync(
    join(distDir, "guidance.json"),
    JSON.stringify({ ...guidance, utilities: emitUtilitiesRoster() }, null, 2),
  );
  console.log("  wrote dist/guidance.json");

  console.log("[tokens] Build complete.");
}

build();
