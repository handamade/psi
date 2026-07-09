import { spacingScale } from "../src/scales/spacing.js";
import { sizeScale } from "../src/scales/sizes.js";
import { radiusScale } from "../src/scales/radius.js";
import { typographyCombos, comboName, WEIGHT_VALUES } from "../src/scales/typography.js";

// ── Helpers ───────────────────────────────────────────────────────

function pxToRem(px: number): string {
  if (px === 0) return "0";
  return `${px / 16}rem`;
}

// ── Scale CSS custom properties ──────────────────────────────────

/**
 * Generate CSS custom properties for all scales.
 * These go inside the :root block in base.css.
 */
export function emitScaleVarsCSS(): string {
  const lines: string[] = [];

  // Spacing
  for (const px of spacingScale) {
    lines.push(`    --ds-space-${px}: ${pxToRem(px)};`);
  }

  lines.push("");

  // Sizes
  for (const px of sizeScale) {
    lines.push(`    --ds-size-${px}: ${pxToRem(px)};`);
  }

  lines.push("");

  // Radius
  for (const px of radiusScale) {
    lines.push(`    --ds-radius-${px}: ${pxToRem(px)};`);
  }
  lines.push(`    --ds-radius-full: 9999px;`);

  lines.push("");

  // Typography
  for (const c of typographyCombos) {
    lines.push(`    --ds-text-${comboName(c)}: ${WEIGHT_VALUES[c.weight]} ${pxToRem(c.fontSize)}/${pxToRem(c.lineHeight)} var(--ds-font-sans);`);
  }

  lines.push("");

  // Font stacks
  lines.push(
    `    --ds-font-sans: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";`,
  );
  lines.push(
    `    --ds-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;`,
  );
  lines.push(`    --ds-font-serif: Georgia, "Times New Roman", Times, serif;`);
  lines.push(`    --ds-font-display: var(--ds-font-sans);`);

  return lines.join("\n");
}

// ── Utility classes ──────────────────────────────────────────────

/**
 * Generate utility classes for spacing, sizing, and typography.
 * Wrapped in @layer ds.utilities.
 */
export function emitUtilitiesCSS(): string {
  const lines: string[] = [];

  lines.push("@layer ds.utilities {");

  // Gap utilities
  for (const px of spacingScale) {
    lines.push(`  .ds-gap-${px} { gap: var(--ds-space-${px}); }`);
  }

  lines.push("");

  // Padding utilities
  for (const px of spacingScale) {
    lines.push(`  .ds-p-${px} { padding: var(--ds-space-${px}); }`);
    lines.push(
      `  .ds-px-${px} { padding-inline: var(--ds-space-${px}); }`,
    );
    lines.push(
      `  .ds-py-${px} { padding-block: var(--ds-space-${px}); }`,
    );
  }

  lines.push("");

  // Margin utilities
  for (const px of spacingScale) {
    lines.push(`  .ds-m-${px} { margin: var(--ds-space-${px}); }`);
    lines.push(
      `  .ds-mx-${px} { margin-inline: var(--ds-space-${px}); }`,
    );
    lines.push(
      `  .ds-my-${px} { margin-block: var(--ds-space-${px}); }`,
    );
  }

  lines.push("");

  // Typography utilities
  for (const c of typographyCombos) {
    lines.push(`  .ds-text-${comboName(c)} { font: var(--ds-text-${comboName(c)}); }`);
  }

  lines.push("}");

  return lines.join("\n") + "\n";
}
