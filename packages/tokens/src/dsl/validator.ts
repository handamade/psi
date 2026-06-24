import type { SlotMap, ThemeDef } from "./types.js";

// ── Validation error ───────────────────────────────────────────────

export class ValidationError extends Error {
  readonly path: string[];

  constructor(message: string, path: string[] = []) {
    super(message);
    this.name = "ValidationError";
    this.path = path;
  }
}

// ── Cycle detection ────────────────────────────────────────────────

function detectCycles(theme: ThemeDef): void {
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(name: string, chain: string[]): void {
    if (inStack.has(name)) {
      const cycleStart = chain.indexOf(name);
      const cycle = chain.slice(cycleStart).concat(name);
      throw new ValidationError(
        `Circular reference detected: ${cycle.join(" → ")}`,
        cycle,
      );
    }

    if (visited.has(name)) return;

    inStack.add(name);
    chain.push(name);

    const token = theme[name];
    if (token?.from.type === "ref") {
      dfs(token.from.name, chain);
    }

    chain.pop();
    inStack.delete(name);
    visited.add(name);
  }

  for (const name of Object.keys(theme)) {
    dfs(name, []);
  }
}

// ── Main validator ─────────────────────────────────────────────────

export function validate(
  theme: ThemeDef,
  slots: SlotMap,
  existingNames: string[] = [],
): void {
  const slotNames = new Set(Object.keys(slots));
  const tokenNames = new Set(Object.keys(theme));

  // Check for duplicate names against existingNames
  for (const name of tokenNames) {
    if (existingNames.includes(name)) {
      throw new ValidationError(
        `Duplicate token name: "${name}" already exists`,
        [name],
      );
    }
  }

  // Validate each token's source
  for (const [name, token] of Object.entries(theme)) {
    const { from } = token;

    if (from.type === "slot") {
      if (!slotNames.has(from.name)) {
        throw new ValidationError(
          `Unknown slot "${from.name}" in token "${name}"`,
          [name],
        );
      }
    } else if (from.type === "ref") {
      if (!tokenNames.has(from.name)) {
        throw new ValidationError(
          `Unknown ref "${from.name}" in token "${name}"`,
          [name],
        );
      }
    }
  }

  // Detect cycles in ref chains
  detectCycles(theme);
}
