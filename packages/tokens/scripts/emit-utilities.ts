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
    lines.push(`    --psi-space-${px}: ${pxToRem(px)};`);
  }

  lines.push("");

  // Sizes
  for (const px of sizeScale) {
    lines.push(`    --psi-size-${px}: ${pxToRem(px)};`);
  }

  lines.push("");

  // Radius
  for (const px of radiusScale) {
    lines.push(`    --psi-radius-${px}: ${pxToRem(px)};`);
  }
  lines.push(`    --psi-radius-full: 9999px;`);

  lines.push("");

  // Typography
  for (const c of typographyCombos) {
    lines.push(`    --psi-text-${comboName(c)}: ${WEIGHT_VALUES[c.weight]} ${pxToRem(c.fontSize)}/${pxToRem(c.lineHeight)} var(${comboFontVar(c)});`);
  }

  lines.push("");

  // Display (D28) — fluid clamp() sizes, pixel-true at both endpoints
  for (const d of displayCombos) {
    const size = d.min === d.max ? pxToRem(d.min) : `clamp(${pxToRem(d.min)}, ${d.vw}vw, ${pxToRem(d.max)})`;
    lines.push(`    --psi-display-${displayName(d)}: ${WEIGHT_VALUES[d.weight]} ${size}/${d.lineHeight} var(--psi-font-display);`);
  }

  lines.push("");

  // Motion (WS3) — durations + named easing curves; see guidance.ts for reduced-motion policy
  for (const ms of durationScale) lines.push(`    --psi-duration-${ms}: ${ms}ms;`);
  for (const [name, curve] of Object.entries(easings)) lines.push(`    --psi-ease-${name}: ${curve};`);

  lines.push("");
  lines.push(`    --psi-container-max: ${pxToRem(container.max)};`);
  lines.push(`    --psi-gutter: ${pxToRem(container.gutter)};`);
  for (const [name, z] of Object.entries(zIndex)) lines.push(`    --psi-z-${name}: ${z};`);

  lines.push("");

  // Font stacks
  lines.push(
    `    --psi-font-sans: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";`,
  );
  lines.push(
    `    --psi-font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;`,
  );
  lines.push(`    --psi-font-serif: Georgia, "Times New Roman", Times, serif;`);
  lines.push(`    --psi-font-display: var(--psi-font-sans);`);

  return lines.join("\n");
}

// ── Utility classes ──────────────────────────────────────────────

/**
 * Generate utility classes for spacing, sizing, and typography.
 * Wrapped in @layer psi.utilities.
 */
export function emitUtilitiesCSS(): string {
  const lines: string[] = [];

  lines.push("@layer psi.utilities {");

  // Gap utilities
  for (const px of spacingScale) {
    lines.push(`  .psi-gap-${px} { gap: var(--psi-space-${px}); }`);
  }

  lines.push("");

  // Padding utilities
  for (const px of spacingScale) {
    lines.push(`  .psi-p-${px} { padding: var(--psi-space-${px}); }`);
    lines.push(
      `  .psi-px-${px} { padding-inline: var(--psi-space-${px}); }`,
    );
    lines.push(
      `  .psi-py-${px} { padding-block: var(--psi-space-${px}); }`,
    );
  }

  lines.push("");

  // Margin utilities
  for (const px of spacingScale) {
    lines.push(`  .psi-m-${px} { margin: var(--psi-space-${px}); }`);
    lines.push(
      `  .psi-mx-${px} { margin-inline: var(--psi-space-${px}); }`,
    );
    lines.push(
      `  .psi-my-${px} { margin-block: var(--psi-space-${px}); }`,
    );
  }

  lines.push("");

  // Typography utilities
  for (const c of typographyCombos) {
    lines.push(`  .psi-text-${comboName(c)} { font: var(--psi-text-${comboName(c)}); }`);
  }

  lines.push("");

  // Display utilities (D28) — tracking + uppercase, since font shorthand can't carry them
  for (const d of displayCombos) {
    lines.push(`  .psi-display-${displayName(d)} { font: var(--psi-display-${displayName(d)}); letter-spacing: ${d.tracking}em; text-transform: uppercase; }`);
  }

  lines.push("");
  lines.push(`  .psi-container { max-width: var(--psi-container-max); margin-inline: auto; padding-inline: var(--psi-gutter); }`);
  lines.push(`  /* Gutter narrows under md — breakpoint baked at build time (D31). */`);
  lines.push(`  @media (max-width: ${breakpoints.md}px) {`);
  lines.push(`    :root { --psi-gutter: ${pxToRem(container.gutterNarrow)}; }`);
  lines.push(`  }`);

  lines.push("");
  lines.push(`  .psi-media-tint { filter: var(--psi-media-tint); transition: filter var(--psi-duration-450) var(--psi-ease-soft); }`);
  lines.push(`  .psi-media-tint:hover, .psi-media-tint:focus-visible { filter: none; }`);

  lines.push("");
  lines.push("  /* Reduced motion (D30): zero every duration token; anything driven by");
  lines.push("     --psi-duration-* complies for free. psi.utilities wins over psi.base. */");
  lines.push("  @media (prefers-reduced-motion: reduce) {");
  lines.push("    :root {");
  for (const ms of durationScale) lines.push(`      --psi-duration-${ms}: 0.01ms;`);
  lines.push("    }");
  lines.push("  }");

  lines.push("}");

  return lines.join("\n") + "\n";
}
