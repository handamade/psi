import { spacingScale } from "../src/scales/spacing.js";
import { sizeScale } from "../src/scales/sizes.js";
import { radiusScale } from "../src/scales/radius.js";
import { typographyCombos, comboName, comboFontVar, WEIGHT_VALUES, displayCombos, displayName } from "../src/scales/typography.js";
import { durationScale, easings } from "../src/scales/motion.js";
import { breakpoints, container, zIndex } from "../src/scales/layout.js";

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
    lines.push(`    --ds-text-${comboName(c)}: ${WEIGHT_VALUES[c.weight]} ${pxToRem(c.fontSize)}/${pxToRem(c.lineHeight)} var(${comboFontVar(c)});`);
  }

  lines.push("");

  // Display (D28) — fluid clamp() sizes, pixel-true at both endpoints
  for (const d of displayCombos) {
    const size = d.min === d.max ? pxToRem(d.min) : `clamp(${pxToRem(d.min)}, ${d.vw}vw, ${pxToRem(d.max)})`;
    lines.push(`    --ds-display-${displayName(d)}: ${WEIGHT_VALUES[d.weight]} ${size}/${d.lineHeight} var(--ds-font-display);`);
  }

  lines.push("");

  // Motion (WS3) — durations + named easing curves; see guidance.ts for reduced-motion policy
  for (const ms of durationScale) lines.push(`    --ds-duration-${ms}: ${ms}ms;`);
  for (const [name, curve] of Object.entries(easings)) lines.push(`    --ds-ease-${name}: ${curve};`);

  lines.push("");
  lines.push(`    --ds-container-max: ${pxToRem(container.max)};`);
  lines.push(`    --ds-gutter: ${pxToRem(container.gutter)};`);
  for (const [name, z] of Object.entries(zIndex)) lines.push(`    --ds-z-${name}: ${z};`);

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

  lines.push("");

  // Display utilities (D28) — tracking + uppercase, since font shorthand can't carry them
  for (const d of displayCombos) {
    lines.push(`  .ds-display-${displayName(d)} { font: var(--ds-display-${displayName(d)}); letter-spacing: ${d.tracking}em; text-transform: uppercase; }`);
  }

  lines.push("");
  lines.push(`  .ds-container { max-width: var(--ds-container-max); margin-inline: auto; padding-inline: var(--ds-gutter); }`);
  lines.push(`  /* Gutter narrows under md — breakpoint baked at build time (D31). */`);
  lines.push(`  @media (max-width: ${breakpoints.md}px) {`);
  lines.push(`    :root { --ds-gutter: ${pxToRem(container.gutterNarrow)}; }`);
  lines.push(`  }`);

  lines.push("");
  lines.push(`  .ds-media-tint { filter: var(--ds-media-tint); transition: filter var(--ds-duration-450) var(--ds-ease-soft); }`);
  lines.push(`  .ds-media-tint:hover, .ds-media-tint:focus-visible { filter: none; }`);

  lines.push("");
  lines.push("  /* Reduced motion (D30): zero every duration token; anything driven by");
  lines.push("     --ds-duration-* complies for free. ds.utilities wins over ds.base. */");
  lines.push("  @media (prefers-reduced-motion: reduce) {");
  lines.push("    :root {");
  for (const ms of durationScale) lines.push(`      --ds-duration-${ms}: 0.01ms;`);
  lines.push("    }");
  lines.push("  }");

  lines.push("}");

  return lines.join("\n") + "\n";
}
