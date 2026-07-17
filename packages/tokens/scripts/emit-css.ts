import type {
  ChannelOp,
  Palette,
  SlotMap,
  ThemeDef,
  TokenDef,
} from "../src/dsl/types.js";
import type { BrandFonts } from "../src/themes/customers/index.js";

// ── Helpers ────────────────────────────────────────────────────────

export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function tokenVar(name: string): string {
  return `--ds-${camelToKebab(name)}`;
}

export function paletteVar(name: string): string {
  return `--ds-palette-${name}`;
}

/**
 * Convert a ChannelOp to its CSS representation within oklch(from ...).
 * - set  → literal value
 * - delta → calc(channel +/- value)
 * - cap  → min(channel, value)
 */
export function opToCSS(channel: string, op: ChannelOp): string {
  switch (op.op) {
    case "set":
      return `${op.value}`;
    case "delta": {
      const sign = op.value >= 0 ? "+" : "-";
      const abs = Math.abs(op.value);
      return `calc(${channel} ${sign} ${abs})`;
    }
    case "cap":
      return `min(${channel}, ${op.value})`;
  }
}

/**
 * Assemble the full oklch(from var(...) ...) expression for a token.
 *
 * Slot-sourced token with ops:
 *   oklch(from var(--ds-palette-sapphire) 0.65 min(c, 0.23) h)
 *
 * Ref-sourced token with alpha:
 *   oklch(from var(--ds-fg-primary) l c h / 0.7)
 *
 * No-op (just a slot reference, no ops, no alpha):
 *   var(--ds-palette-platinum)
 */
export function tokenToLiveCSS(def: TokenDef, slots: SlotMap): string {
  const hasOps = def.l || def.c || def.h;
  const hasAlpha = def.alpha !== undefined;

  // Determine the source CSS var
  let sourceVar: string;
  if (def.from.type === "slot") {
    const paletteName = (slots as Record<string, string>)[def.from.name];
    sourceVar = `var(${paletteVar(paletteName)})`;
  } else {
    sourceVar = `var(${tokenVar(def.from.name)})`;
  }

  // If no operations and no alpha, just reference the var directly
  if (!hasOps && !hasAlpha) {
    return sourceVar;
  }

  // Build oklch(from ...) expression
  const lPart = def.l ? opToCSS("l", def.l) : "l";
  const cPart = def.c ? opToCSS("c", def.c) : "c";
  const hPart = def.h ? opToCSS("h", def.h) : "h";

  let expr = `oklch(from ${sourceVar} ${lPart} ${cPart} ${hPart}`;
  if (hasAlpha) {
    expr += ` / ${def.alpha}`;
  }
  expr += `)`;

  return expr;
}

// ── Base CSS (palette) ────────────────────────────────────────────

export function emitBaseCSS(palette: Palette): string {
  const lines: string[] = [];
  lines.push("@layer ds.base, ds.theme, ds.components, ds.utilities;");
  lines.push("");
  lines.push("@layer ds.base {");
  lines.push("  :root {");

  for (const [name, entry] of Object.entries(palette)) {
    lines.push(
      `    ${paletteVar(name)}: oklch(${entry.l} ${entry.c} ${entry.h});`,
    );
  }

  lines.push("  }");
  lines.push("}");

  return lines.join("\n") + "\n";
}

// ── Theme CSS (semantic tokens) ───────────────────────────────────

export function emitThemeCSS(
  themeName: string,
  theme: ThemeDef,
  palette: Palette,
  slots: SlotMap,
  opts?: { fonts?: BrandFonts; componentOverrides?: Record<string, string> },
): string {
  const lines: string[] = [];

  // Determine selector
  const selector =
    themeName === "light"
      ? `:root, [data-ds-theme="light"]`
      : `[data-ds-theme="${themeName}"]`;

  lines.push("@layer ds.theme {");
  lines.push(`  ${selector} {`);

  // Scope this theme's own palette vars inside its selector block so a
  // customer brand's colors ship only with that theme, and two customers
  // that happen to reuse an anchor name can't collide in a shared :root.
  for (const [name, entry] of Object.entries(palette)) {
    lines.push(
      `    ${paletteVar(name)}: oklch(${entry.l} ${entry.c} ${entry.h});`,
    );
  }

  for (const [name, def] of Object.entries(theme)) {
    const cssVar = tokenVar(name);
    const value = tokenToLiveCSS(def, slots);
    lines.push(`    ${cssVar}: ${value};`);
  }

  if (opts?.fonts) {
    for (const [role, stack] of Object.entries(opts.fonts)) {
      lines.push(`    --ds-font-${role}: ${stack};`);
    }
  }

  lines.push("  }");
  lines.push("}");

  if (opts?.componentOverrides && Object.keys(opts.componentOverrides).length > 0) {
    lines.push("@layer ds.components {");
    lines.push(`  [data-ds-theme="${themeName}"] {`);
    for (const [name, value] of Object.entries(opts.componentOverrides)) {
      lines.push(`    --ds-${name}: ${value};`);
    }
    lines.push("  }");
    lines.push("}");
  }

  return lines.join("\n") + "\n";
}
