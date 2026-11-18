import type { ThemeDef } from "./dsl/types.js";
import { durationScale, motionPresets } from "./scales/motion.js";
import { PROPERTY_GROUPS, expandScopes, keyGroup } from "./scopes.js";
import { classifyComponentTokens } from "./emit/component-scope.js";

export interface ScopeViolation {
  component: string;
  key: string;
  group: string;
  token: string;
  scopes: readonly string[];
}

const VAR_RE = /var\((--psi-[a-z0-9-]+)/g;
const SCALE_RE = /^--psi-(space|size|radius|text|font|duration|ease|motion|z)-/;
const camelToKebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** Collect the semantic token names (camelCase) a component-token value
 * ultimately binds, following component-token chains across the whole
 * registry (own family and cross-family, e.g. dialog-bg → surface-bg).
 * Unresolvable --psi- refs are returned as raw var names (prefixed "!")
 * for the caller to flag. */
function semanticRefs(
  component: string,
  value: string,
  all: Record<string, Record<string, string>>,
  kebabToName: Map<string, string>,
  seen: Set<string> = new Set(),
): string[] {
  const out: string[] = [];
  for (const m of value.matchAll(VAR_RE)) {
    const varName = m[1];
    const bare = varName.slice("--psi-".length);
    if (SCALE_RE.test(varName)) continue;
    // Component refs resolve through the registry; longest prefix wins.
    const owner = Object.keys(all)
      .filter((c) => bare.startsWith(`${c}-`))
      .sort((a, b) => b.length - a.length)[0];
    if (owner !== undefined) {
      const key = bare.slice(owner.length + 1);
      const guard = `${owner}:${key}`;
      if (seen.has(guard)) continue;
      seen.add(guard);
      const ownerValue = all[owner][key];
      if (ownerValue === undefined) { out.push(`!${varName}`); continue; }
      out.push(...semanticRefs(owner, ownerValue, all, kebabToName, seen));
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
  all: Record<string, Record<string, string>>,
  theme: ThemeDef,
  kebabToName: Map<string, string>,
): ScopeViolation[] {
  const group = keyGroup(key);
  if (!group) return [];
  const groupProps = new Set(PROPERTY_GROUPS[group]);
  const violations: ScopeViolation[] = [];
  for (const name of semanticRefs(component, value, all, kebabToName)) {
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

/** D141: a duration token must be exactly one var() of a duration step or of a
 * preset's duration, both of which reduced motion zeroes (D30). A literal
 * (`200ms`) never reads a duration token, so nothing would zero it. Math is
 * refused too: `calc()` of a step would zero, `max()` with a literal would
 * not, and telling them apart is more than this needs. A fallback is refused,
 * since it is what renders whenever the named token is missing. The `-ease`
 * half is not gated: a curve cannot break reduced motion. */
const DURATION_VALUE = /^var\(--psi-(?:duration-(\d+)|motion-([a-z]+)-duration)\)$/;
const isDurationKey = (key: string) => key.split("-").at(-1) === "duration";

function durationViolation(component: string, key: string, value: string): ScopeViolation[] {
  if (!isDurationKey(key)) return [];
  const m = DURATION_VALUE.exec(value.trim());
  const ok = m !== null && (m[1] !== undefined
    ? (durationScale as readonly number[]).includes(Number(m[1]))
    : Object.hasOwn(motionPresets, m[2]));
  if (ok) return [];
  return [{
    component, key, group: "duration", token: value,
    scopes: ["var(--psi-duration-<step>)", "var(--psi-motion-<preset>-duration)"],
  }];
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
      violations.push(...checkOne(component, key, value, componentVars, theme, kebabToName));
      violations.push(...durationViolation(component, key, value));
    }
  }
  return violations;
}

/** Same gate for brand componentOverrides ("button-accent-bg": "..."):
 * component resolved by longest known prefix; unknown prefixes are skipped
 * (non-color overrides like media-tint carry no component token shape).
 *
 * D139: an override of a page-scoped token (geometry, type, motion) may bind
 * no semantic token at all. A page-scoped token is not declared again under a
 * sub-theme, so the page's resolved colour would reach into every sub-theme
 * inside it, unchecked against that theme's contrast. Such a violation carries
 * the group "page". */
export function checkOverrideScopes(
  overrides: Record<string, string>,
  componentVars: Record<string, Record<string, string>>,
  theme: ThemeDef,
): ScopeViolation[] {
  const kebabToName = new Map(Object.keys(theme).map((n) => [camelToKebab(n), n]));
  const components = Object.keys(componentVars).sort((a, b) => b.length - a.length);
  const scopes = classifyComponentTokens(componentVars, Object.keys(theme));
  const violations: ScopeViolation[] = [];
  for (const [fullKey, value] of Object.entries(overrides)) {
    const component = components.find((c) => fullKey.startsWith(`${c}-`));
    // D141: every -duration override, whether or not Psi knows its component.
    if (!component) {
      const [head, ...rest] = fullKey.split("-");
      violations.push(...durationViolation(head, rest.join("-"), value));
      continue;
    }
    const key = fullKey.slice(component.length + 1);
    violations.push(...durationViolation(component, key, value));
    violations.push(...checkOne(component, key, value, componentVars, theme, kebabToName));
    if (scopes.get(`--psi-${fullKey}`) === "page") {
      for (const token of semanticRefs(component, value, componentVars, kebabToName)) {
        // "!" marks a var outside the theme: a scale or layout value, unless it
        // is a palette entry, which a theme declares.
        if (token.startsWith("!") && !token.startsWith("!--psi-palette-")) continue;
        const name = token.startsWith("!") ? token.slice(1) : token;
        violations.push({ component, key, group: "page", token: name, scopes: theme[name]?.scopes ?? [] });
      }
    }
  }
  return violations;
}
