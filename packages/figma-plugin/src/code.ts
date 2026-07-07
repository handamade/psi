// ── Types ────────────────────────────────────────────────────────────

interface ResolvedToken {
  name: string;
  oklch: { l: number; c: number; h: number; alpha?: number };
  hex: string;
  formula: string;
}

interface ScaleSet {
  space: number[];
  size: number[];
  radius: number[];
}

type TypographyWeight = "regular" | "medium" | "semibold" | "bold";

interface TypographyCombo {
  name: string;
  fontSize: number;
  lineHeight: number;
  weight: TypographyWeight;
  cssWeight: number;
}

interface SyncMessage {
  type: "sync";
  theme: string;
  tokens: ResolvedToken[];
  scales?: ScaleSet;
  typography?: TypographyCombo[];
  dryRun: boolean;
}

interface VariableSyncResult {
  created: number;
  updated: number;
  unchanged: number;
  orphanedNames: string[];
}

interface TextStyleSyncResult {
  created: number;
  updated: number;
  unchanged: number;
  failed: string[];
}

interface SyncResult {
  type: "result";
  theme: string;
  created: number;
  updated: number;
  unchanged: number;
  orphanedNames: string[];
  textStyles: TextStyleSyncResult;
  dryRun: boolean;
}

interface ErrorResult {
  type: "error";
  message: string;
}

// ── Constants ────────────────────────────────────────────────────────

const COLLECTION_NAME = "DS Tokens";
const FONT_FAMILY = "Inter";

const WEIGHT_TO_FONT_STYLE: Record<TypographyWeight, string> = {
  regular: "Regular",
  medium: "Medium",
  semibold: "Semi Bold",
  bold: "Bold",
};

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Convert a hex color string (#rrggbb or #rrggbbaa) to Figma's RGB(A) format.
 * Figma expects channels in 0-1 range.
 */
function hexToFigmaRGB(hex: string): RGB | RGBA {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  if (clean.length === 8) {
    const a = parseInt(clean.slice(6, 8), 16) / 255;
    return { r, g, b, a };
  }

  return { r, g, b };
}

/**
 * Check if two RGB(A) colors are approximately equal.
 */
function colorsEqual(
  a: RGB | RGBA,
  b: RGB | RGBA,
  epsilon = 0.002,
): boolean {
  const aA = "a" in a ? a.a : 1;
  const bA = "a" in b ? b.a : 1;
  return (
    Math.abs(a.r - b.r) < epsilon &&
    Math.abs(a.g - b.g) < epsilon &&
    Math.abs(a.b - b.b) < epsilon &&
    Math.abs(aA - bA) < epsilon
  );
}

/**
 * Convert a camelCase token name to a grouped Figma variable name.
 * e.g. "bgPrimary" → "bg/primary", "fillTintAccent" → "fill/tint-accent"
 */
function tokenToVariableName(name: string): string {
  // Known prefixes to use as group separators
  const prefixes = ["bg", "fg", "fill", "border"];

  for (const prefix of prefixes) {
    if (name.startsWith(prefix) && name.length > prefix.length) {
      const rest = name.slice(prefix.length);
      // Convert the remainder from PascalCase to kebab-case
      const kebab = rest
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .toLowerCase();
      return `${prefix}/${kebab}`;
    }
  }

  // Fallback: just kebab-case the whole thing
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * Build the Figma variable name for a scale value, e.g. ("space", 8) → "space/8".
 * Scales are theme-independent, unlike color tokens.
 */
function scaleVariableName(prefix: "space" | "size" | "radius", px: number): string {
  return `${prefix}/${px}`;
}

/**
 * Build the Figma text style name for a typography combo, e.g. "16-24-regular" → "DS/16-24-regular".
 */
function textStyleName(comboName: string): string {
  return `DS/${comboName}`;
}

function fontNamesEqual(a: FontName, b: FontName): boolean {
  return a.family === b.family && a.style === b.style;
}

function lineHeightsEqual(a: LineHeight, b: LineHeight): boolean {
  if (a.unit === "AUTO" && b.unit === "AUTO") return true;
  if (a.unit === "AUTO" || b.unit === "AUTO") return false;
  return a.unit === b.unit && Math.abs(a.value - b.value) < 0.01;
}

// ── Variable sync (colors + number scales) ──────────────────────────

async function syncVariables(
  theme: string,
  tokens: ResolvedToken[],
  scales: ScaleSet,
  dryRun: boolean,
): Promise<VariableSyncResult> {
  // 1. Find or create the variable collection
  const collections =
    await figma.variables.getLocalVariableCollectionsAsync();
  let collection = collections.find((c) => c.name === COLLECTION_NAME);

  if (!collection && !dryRun) {
    collection = figma.variables.createVariableCollection(COLLECTION_NAME);
  }

  // In dry-run without an existing collection, simulate from scratch
  if (!collection) {
    const scaleCount =
      scales.space.length + scales.size.length + scales.radius.length;
    return {
      created: tokens.length + scaleCount,
      updated: 0,
      unchanged: 0,
      orphanedNames: [],
    };
  }

  // 2. Find or create a mode for this theme
  let modeId: string;
  const existingMode = collection.modes.find((m) => m.name === theme);

  if (existingMode) {
    modeId = existingMode.modeId;
  } else if (!dryRun) {
    // If the collection has only the default mode with generic name, rename it
    if (
      collection.modes.length === 1 &&
      collection.modes[0].name === "Mode 1"
    ) {
      collection.renameMode(collection.modes[0].modeId, theme);
      modeId = collection.modes[0].modeId;
    } else {
      modeId = collection.addMode(theme);
    }
  } else {
    // Dry-run: use first mode as fallback for reading
    modeId = collection.modes[0]?.modeId ?? "";
  }

  // 3. Build a map of existing variables (colors + number scales) in this collection
  const existingVars = new Map<string, Variable>();
  const [colorVars, floatVars] = await Promise.all([
    figma.variables.getLocalVariablesAsync("COLOR"),
    figma.variables.getLocalVariablesAsync("FLOAT"),
  ]);
  for (const v of [...colorVars, ...floatVars]) {
    if (v.variableCollectionId === collection.id) {
      existingVars.set(v.name, v);
    }
  }

  // 4. Track the set of variable names we process
  const processedNames = new Set<string>();
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  // 5. Process each color token
  for (const token of tokens) {
    const varName = tokenToVariableName(token.name);
    processedNames.add(varName);

    // Build color from hex + resolved alpha
    const base = hexToFigmaRGB(token.hex);
    const newColor: RGBA = {
      r: base.r,
      g: base.g,
      b: base.b,
      a: token.oklch.alpha ?? 1,
    };
    const existingVar = existingVars.get(varName);

    if (existingVar) {
      // Check if the value has changed
      const currentValue = existingVar.valuesByMode[modeId] as
        | RGB
        | RGBA
        | undefined;

      if (currentValue && colorsEqual(currentValue, newColor)) {
        // Check if description (formula) also matches
        if (existingVar.description === token.formula) {
          unchanged++;
          continue;
        }
      }

      // Value or description changed
      if (!dryRun) {
        existingVar.setValueForMode(modeId, newColor);
        existingVar.description = token.formula;
      }
      updated++;
    } else {
      // Create new variable
      if (!dryRun) {
        const newVar = figma.variables.createVariable(
          varName,
          collection,
          "COLOR",
        );
        newVar.setValueForMode(modeId, newColor);
        newVar.description = token.formula;
      }
      created++;
    }
  }

  // 6. Process each number scale (space/size/radius) — theme-independent,
  // so the value is written for every mode in the collection.
  const scaleEntries: Array<{ prefix: "space" | "size" | "radius"; px: number }> = [
    ...scales.space.map((px) => ({ prefix: "space" as const, px })),
    ...scales.size.map((px) => ({ prefix: "size" as const, px })),
    ...scales.radius.map((px) => ({ prefix: "radius" as const, px })),
  ];
  const modeIds = collection.modes.map((m) => m.modeId);

  for (const { prefix, px } of scaleEntries) {
    const varName = scaleVariableName(prefix, px);
    processedNames.add(varName);

    const existingVar = existingVars.get(varName);

    if (existingVar) {
      const alreadyCorrect = modeIds.every((id) => {
        const value = existingVar.valuesByMode[id];
        return typeof value === "number" && Math.abs(value - px) < 0.001;
      });

      if (alreadyCorrect) {
        unchanged++;
        continue;
      }

      if (!dryRun) {
        for (const id of modeIds) {
          existingVar.setValueForMode(id, px);
        }
      }
      updated++;
    } else {
      if (!dryRun) {
        const newVar = figma.variables.createVariable(
          varName,
          collection,
          "FLOAT",
        );
        for (const id of modeIds) {
          newVar.setValueForMode(id, px);
        }
      }
      created++;
    }
  }

  // 7. Find orphaned variables (in collection but not in the incoming set)
  const orphanedNames: string[] = [];
  for (const [name] of existingVars) {
    if (!processedNames.has(name)) {
      orphanedNames.push(name);
    }
  }

  return { created, updated, unchanged, orphanedNames };
}

// ── Text style sync (typography combos) ─────────────────────────────

async function syncTextStyles(
  typography: TypographyCombo[],
  dryRun: boolean,
): Promise<TextStyleSyncResult> {
  const existingStyles = await figma.getLocalTextStylesAsync();
  const existingByName = new Map<string, TextStyle>();
  for (const style of existingStyles) {
    existingByName.set(style.name, style);
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const failed: string[] = [];

  for (const combo of typography) {
    const styleName = textStyleName(combo.name);
    const desiredFont: FontName = {
      family: FONT_FAMILY,
      style: WEIGHT_TO_FONT_STYLE[combo.weight],
    };
    const desiredLineHeight: LineHeight = {
      unit: "PIXELS",
      value: combo.lineHeight,
    };

    const existing = existingByName.get(styleName);

    if (existing) {
      const alreadyCorrect =
        fontNamesEqual(existing.fontName, desiredFont) &&
        Math.abs(existing.fontSize - combo.fontSize) < 0.01 &&
        lineHeightsEqual(existing.lineHeight, desiredLineHeight);

      if (alreadyCorrect) {
        unchanged++;
        continue;
      }
    }

    // Creating or updating a text style's font requires the font to be
    // loaded first. Don't let a missing font family crash the whole sync.
    try {
      await figma.loadFontAsync(desiredFont);
    } catch (err) {
      failed.push(
        `${styleName} (${err instanceof Error ? err.message : String(err)})`,
      );
      continue;
    }

    if (existing) {
      if (!dryRun) {
        existing.fontName = desiredFont;
        existing.fontSize = combo.fontSize;
        existing.lineHeight = desiredLineHeight;
      }
      updated++;
    } else {
      if (!dryRun) {
        const newStyle = figma.createTextStyle();
        newStyle.name = styleName;
        newStyle.fontName = desiredFont;
        newStyle.fontSize = combo.fontSize;
        newStyle.lineHeight = desiredLineHeight;
      }
      created++;
    }
  }

  return { created, updated, unchanged, failed };
}

// ── Main sync logic ──────────────────────────────────────────────────

async function syncTokens(msg: SyncMessage): Promise<SyncResult> {
  const { theme, tokens, dryRun } = msg;
  const scales: ScaleSet = msg.scales ?? { space: [], size: [], radius: [] };
  const typography: TypographyCombo[] = msg.typography ?? [];

  const variableResult = await syncVariables(theme, tokens, scales, dryRun);
  const textStyleResult = await syncTextStyles(typography, dryRun);

  return {
    type: "result",
    theme,
    created: variableResult.created,
    updated: variableResult.updated,
    unchanged: variableResult.unchanged,
    orphanedNames: variableResult.orphanedNames,
    textStyles: textStyleResult,
    dryRun,
  };
}

// ── Plugin entry point ───────────────────────────────────────────────

figma.showUI(__html__, { width: 400, height: 460 });

figma.ui.onmessage = async (msg: SyncMessage) => {
  if (msg.type !== "sync") return;

  try {
    const result = await syncTokens(msg);
    figma.ui.postMessage(result);
  } catch (err) {
    const errorResult: ErrorResult = {
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    };
    figma.ui.postMessage(errorResult);
  }
};
