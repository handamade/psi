import type { ResolvedTheme } from "../src/dsl/resolver.js";
import type { ColorScheme } from "../src/dsl/types.js";
import { spacingScale } from "../src/scales/spacing.js";
import { sizeScale } from "../src/scales/sizes.js";
import { radiusScale } from "../src/scales/radius.js";
import { typographyCombos, comboName, WEIGHT_VALUES, displayCombos, displayName } from "../src/scales/typography.js";
import { durationScale, easings } from "../src/scales/motion.js";
import { breakpoints, container, zIndex } from "../src/scales/layout.js";
import { focusRing } from "../src/scales/focus-ring.js";
import { SCALE_SCOPES } from "../src/scopes.js";

/**
 * Emit a JSON string containing the resolved theme tokens.
 * Used for Figma/docs and other tooling that needs static color values.
 */
export function emitResolvedJSON(
  themeName: string,
  resolved: ResolvedTheme,
  colorScheme: ColorScheme,
): string {
  return JSON.stringify(
    {
      theme: themeName,
      // D116 — the scheme the theme's CSS declares, so a reader of this file
      // can tell a dark theme from a light one without parsing CSS.
      colorScheme,
      tokens: resolved,
      scales: {
        space: [...spacingScale],
        size: [...sizeScale],
        radius: [...radiusScale],
        motion: { durations: [...durationScale], easings },
        layout: { breakpoints, container, zIndex },
        focusRing,
        scopes: SCALE_SCOPES,
      },
      typography: typographyCombos.map((c) => ({
        name: comboName(c),
        ...c,
        cssWeight: WEIGHT_VALUES[c.weight],
      })),
      display: displayCombos.map((d) => ({ name: displayName(d), ...d, cssWeight: WEIGHT_VALUES[d.weight] })),
    },
    null,
    2,
  ) + "\n";
}
