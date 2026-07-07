import type { ResolvedTheme } from "../src/dsl/resolver.js";
import { typographyCombos, comboName, WEIGHT_VALUES } from "../src/scales/typography.js";

/**
 * Emit a JSON string containing the resolved theme tokens.
 * Used for Figma/docs and other tooling that needs static color values.
 */
export function emitResolvedJSON(
  themeName: string,
  resolved: ResolvedTheme,
): string {
  return JSON.stringify(
    {
      theme: themeName,
      tokens: resolved,
      typography: typographyCombos.map((c) => ({
        name: comboName(c),
        ...c,
        cssWeight: WEIGHT_VALUES[c.weight],
      })),
    },
    null,
    2,
  ) + "\n";
}
