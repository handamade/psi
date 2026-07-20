import type { ThemeDef } from "./dsl/types.js";
import { PROPERTY_GROUPS, expandScopes, keyGroup } from "./scopes.js";

export interface ScopeViolation {
  component: string;
  key: string;
  group: string;
  token: string;
  scopes: readonly string[];
}

const VAR_RE = /var\((--psi-[a-z0-9-]+)/g;
const SCALE_RE = /^--psi-(space|size|radius|text|font|duration|ease|z)-/;
const camelToKebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** Collect the semantic token names (camelCase) a component-token value
 * ultimately binds, following own-token chains. Unresolvable --psi- refs
 * are returned as raw var names (prefixed "!") for the caller to flag. */
function semanticRefs(
  component: string,
  value: string,
  vars: Record<string, string>,
  kebabToName: Map<string, string>,
  seen: Set<string> = new Set(),
): string[] {
  const out: string[] = [];
  for (const m of value.matchAll(VAR_RE)) {
    const varName = m[1];
    const bare = varName.slice("--psi-".length);
    if (SCALE_RE.test(varName)) continue;
    const ownPrefix = `${component}-`;
    if (bare.startsWith(ownPrefix)) {
      const ownKey = bare.slice(ownPrefix.length);
      if (seen.has(ownKey)) continue;
      seen.add(ownKey);
      const ownValue = vars[ownKey];
      if (ownValue === undefined) { out.push(`!${varName}`); continue; }
      out.push(...semanticRefs(component, ownValue, vars, kebabToName, seen));
      continue;
    }
    const name = kebabToName.get(bare);
    out.push(name ?? `!${varName}`);
  }
  return out;
}

function checkOne(
  component: string,
  key: string,
  value: string,
  vars: Record<string, string>,
  theme: ThemeDef,
  kebabToName: Map<string, string>,
): ScopeViolation[] {
  const group = keyGroup(key);
  if (!group) return [];
  const groupProps = new Set(PROPERTY_GROUPS[group]);
  const violations: ScopeViolation[] = [];
  for (const name of semanticRefs(component, value, vars, kebabToName)) {
    if (name.startsWith("!")) {
      violations.push({ component, key, group, token: name.slice(1), scopes: [] });
      continue;
    }
    const scopes = theme[name]?.scopes;
    if (scopes === undefined) continue; // unscoped tokens are valid everywhere
    const allowed = scopes.includes(group) || expandScopes(scopes).some((p) => groupProps.has(p));
    if (!allowed) violations.push({ component, key, group, token: name, scopes });
  }
  return violations;
}

/** D46 primary gate: every component token whose key declares a property
 * group (-bg/-fg/-border) may only bind semantic tokens scoped to it. */
export function checkScopes(
  componentVars: Record<string, Record<string, string>>,
  theme: ThemeDef,
): ScopeViolation[] {
  const kebabToName = new Map(Object.keys(theme).map((n) => [camelToKebab(n), n]));
  const violations: ScopeViolation[] = [];
  for (const [component, vars] of Object.entries(componentVars)) {
    for (const [key, value] of Object.entries(vars)) {
      violations.push(...checkOne(component, key, value, vars, theme, kebabToName));
    }
  }
  return violations;
}

/** Same gate for brand componentOverrides ("button-accent-bg": "..."):
 * component resolved by longest known prefix; unknown prefixes are skipped
 * (non-color overrides like media-tint carry no component token shape). */
export function checkOverrideScopes(
  overrides: Record<string, string>,
  componentVars: Record<string, Record<string, string>>,
  theme: ThemeDef,
): ScopeViolation[] {
  const kebabToName = new Map(Object.keys(theme).map((n) => [camelToKebab(n), n]));
  const components = Object.keys(componentVars).sort((a, b) => b.length - a.length);
  const violations: ScopeViolation[] = [];
  for (const [fullKey, value] of Object.entries(overrides)) {
    const component = components.find((c) => fullKey.startsWith(`${c}-`));
    if (!component) continue;
    const key = fullKey.slice(component.length + 1);
    violations.push(...checkOne(component, key, value, componentVars[component], theme, kebabToName));
  }
  return violations;
}
