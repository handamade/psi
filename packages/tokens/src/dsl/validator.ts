import type { SlotMap, ThemeDef } from "./types.js";
import { isKnownScopeEntry } from "../scopes.js";

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

    for (const entry of token.scopes ?? []) {
      if (!isKnownScopeEntry(entry)) {
        throw new ValidationError(
          `Unknown scope entry "${entry}" in token "${name}" — not a known CSS property or declared group`,
          [name],
        );
      }
    }
  }

  // Detect cycles in ref chains
  detectCycles(theme);
}

/** D46: the same token name must carry identical scopes in every theme —
 * scopes are a property of the token's meaning, not of a theme. */
export function validateScopeConsistency(themes: Record<string, ThemeDef>): void {
  const seen = new Map<string, { theme: string; scopes: string }>();
  for (const [themeName, theme] of Object.entries(themes)) {
    for (const [name, def] of Object.entries(theme)) {
      const key = JSON.stringify(def.scopes ?? null);
      const prior = seen.get(name);
      if (prior === undefined) {
        seen.set(name, { theme: themeName, scopes: key });
      } else if (prior.scopes !== key) {
        throw new ValidationError(
          `Scope drift for token "${name}": ${prior.theme} declares ${prior.scopes}, ${themeName} declares ${key}`,
          [name],
        );
      }
    }
  }
}

// Both gates resolve --psi-* names scale-first, so a semantic token whose
// kebab name starts with a scale-family prefix would be silently shadowed.
const SCALE_FAMILY_PREFIX = /^(space|size|radius|text|font|duration|ease|z)-/;

/** D46 follow-up (HAN-21): reject semantic token kebab names that a
 * scale-family lookup would shadow before the semantic lookup runs. */
export function validateNoScalePrefixShadow(kebabNames: readonly string[]): void {
  for (const name of kebabNames) {
    if (SCALE_FAMILY_PREFIX.test(name)) {
      throw new ValidationError(
        `Semantic token "${name}" starts with a scale-family prefix — it would be shadowed by the scale lookup in the build and stylelint gates`,
        [name],
      );
    }
  }
}
