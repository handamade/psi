// ── Types ────────────────────────────────────────────────────────────

interface ResolvedToken {
  name: string;
  oklch: { l: number; c: number; h: number; alpha?: number };
  hex: string;
  formula: string;
}

interface SyncMessage {
  type: "sync";
  theme: string;
  tokens: ResolvedToken[];
  dryRun: boolean;
}

interface SyncResult {
  type: "result";
  theme: string;
  created: number;
  updated: number;
  unchanged: number;
  orphaned: number;
  dryRun: boolean;
}

interface ErrorResult {
  type: "error";
  message: string;
}

// ── Constants ────────────────────────────────────────────────────────

const COLLECTION_NAME = "DS Tokens";

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

// ── Main sync logic ──────────────────────────────────────────────────

async function syncTokens(msg: SyncMessage): Promise<SyncResult> {
  const { theme, tokens, dryRun } = msg;

  // 1. Find or create the variable collection
  const collections =
    await figma.variables.getLocalVariableCollectionsAsync();
  let collection = collections.find((c) => c.name === COLLECTION_NAME);

  if (!collection && !dryRun) {
    collection = figma.variables.createVariableCollection(COLLECTION_NAME);
  }

  // In dry-run without an existing collection, simulate from scratch
  if (!collection) {
    return {
      type: "result",
      theme,
      created: tokens.length,
      updated: 0,
      unchanged: 0,
      orphaned: 0,
      dryRun: true,
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

  // 3. Build a map of existing variables in this collection
  const existingVars = new Map<string, Variable>();
  const allVars = await figma.variables.getLocalVariablesAsync("COLOR");
  for (const v of allVars) {
    if (v.variableCollectionId === collection.id) {
      existingVars.set(v.name, v);
    }
  }

  // 4. Track the set of token names we process
  const processedNames = new Set<string>();
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  // 5. Process each token
  for (const token of tokens) {
    const varName = tokenToVariableName(token.name);
    processedNames.add(varName);

    const newColor = hexToFigmaRGB(token.hex);
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

  // 6. Find orphaned variables (in collection but not in token set)
  let orphaned = 0;
  for (const [name] of existingVars) {
    if (!processedNames.has(name)) {
      orphaned++;
    }
  }

  return {
    type: "result",
    theme,
    created,
    updated,
    unchanged,
    orphaned,
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
