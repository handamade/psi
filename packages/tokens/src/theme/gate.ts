// D81 — the theme gates, shared by Psi's own build (scripts/build.ts) and a
// consumer's theme build (buildThemeCss). One implementation, so a theme a
// consumer builds is held to exactly the bar Psi's shipped themes are.
import type { Palette, SlotMap, ThemeDef } from "../dsl/types.js";
import { validate } from "../dsl/validator.js";
import { resolve, type ResolvedTheme } from "../dsl/resolver.js";
import { gamutWarnings } from "../gamut.js";
import { checkContrast, wcagAAPairs, componentLabelPairs, type ContrastResult } from "../contrast-matrix.js";
import { checkScopes, checkOverrideScopes, type ScopeViolation } from "../scope-gate.js";
import { componentVars } from "../components/registry.js";

/** Thrown when a theme fails the WCAG AA contrast gate or the D46 scope gate. */
export class ThemeGateError extends Error {
  constructor(
    readonly theme: string,
    readonly contrastFailures: readonly ContrastResult[],
    readonly scopeViolations: readonly ScopeViolation[],
  ) {
    const parts: string[] = [];
    if (contrastFailures.length > 0) {
      parts.push(`${contrastFailures.length} contrast failures: ` +
        contrastFailures.map((f) => `${f.fg} on ${f.bg} ${f.ratio} (need ${f.minRatio})`).join("; "));
    }
    if (scopeViolations.length > 0) {
      parts.push(`${scopeViolations.length} scope violations: ` +
        scopeViolations.map((v) => `--psi-${v.component}-${v.key} (${v.group}) binds ${v.token}`).join("; "));
    }
    super(`${theme} theme failed its gates — ${parts.join(" · ")}`);
    this.name = "ThemeGateError";
  }
}

export interface GatedTheme {
  resolved: ResolvedTheme;
  /** Non-fatal gamut warnings. */
  warnings: string[];
}

/** Validate, resolve and gate one theme. Throws ValidationError on a malformed
 * definition and ThemeGateError on any contrast or scope failure. */
export function gateTheme(
  name: string,
  theme: ThemeDef,
  palette: Palette,
  slots: SlotMap,
  componentOverrides: Record<string, string> = {},
): GatedTheme {
  validate(theme, slots);
  const resolved = resolve(theme, palette, slots);
  const warnings = gamutWarnings(resolved, theme, palette, slots);

  const contrastFailures = checkContrast(resolved, [...wcagAAPairs, ...componentLabelPairs]).filter((r) => !r.pass);
  const scopeViolations = [
    ...checkScopes(componentVars, theme),
    ...checkOverrideScopes(componentOverrides, componentVars, theme),
  ];
  if (contrastFailures.length > 0 || scopeViolations.length > 0) {
    throw new ThemeGateError(name, contrastFailures, scopeViolations);
  }
  return { resolved, warnings };
}
