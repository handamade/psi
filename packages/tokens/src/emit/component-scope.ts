// D139 — where a component token is declared, and so what a sub-theme does to it.
//
// A custom property's var() resolves on the element that declares it, and
// descendants inherit the result. So a token that names a theme's colour has
// to be declared again on every `data-psi-theme` element, or a dark sidebar in
// a light page keeps the light colour (D88, D111). A token that names no theme
// value resolves the same everywhere, and declaring it again on a sub-theme
// does one thing only: it puts back Psi's default over whatever the page set.
//
// So there are two scopes:
//   theme — declared under `:where(:root, [data-psi-theme])`, as every token
//           was before D139: the key names a colour (a -bg/-fg/-border
//           segment, not followed by -width or another measure), or the
//           value reaches a semantic token or a palette entry, directly or
//           through another theme-scoped component token.
//   page  — declared under `:where(:root)` only: everything else, which is
//           geometry, type and motion. A sub-theme inherits the page's value.
import { keyGroup } from "../scopes.js";

export type ComponentTokenScope = "page" | "theme";

const VAR_RE = /var\((--psi-[a-z0-9-]+)/g;

// A key with a bg/fg/border segment names a colour ("accent-bg-hover",
// "inline-alert-border-danger"), unless its last segment measures something:
// "sidebar-border-width" is the width of a border, not its colour.
const GEOMETRY_TAILS = new Set(["width", "radius", "offset", "size", "height", "gap", "padding", "inset"]);
const namesColour = (key: string) => keyGroup(key) !== undefined && !GEOMETRY_TAILS.has(key.split("-").at(-1)!);
const camelToKebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** Every component token by its full custom-property name, with its key. */
function flatten(componentVars: Record<string, Record<string, string>>): Map<string, { key: string; value: string }> {
  const out = new Map<string, { key: string; value: string }>();
  for (const [component, vars] of Object.entries(componentVars)) {
    for (const [key, value] of Object.entries(vars)) out.set(`--psi-${component}-${key}`, { key, value });
  }
  return out;
}

function refs(value: string): string[] {
  return [...value.matchAll(VAR_RE)].map((m) => m[1]);
}

/** Classify every component token. `semanticNames` are the theme's token names
 * (camelCase, as in a ThemeDef); every theme declares the same set. */
export function classifyComponentTokens(
  componentVars: Record<string, Record<string, string>>,
  semanticNames: Iterable<string>,
): Map<string, ComponentTokenScope> {
  const semantic = new Set([...semanticNames].map((n) => `--psi-${camelToKebab(n)}`));
  const tokens = flatten(componentVars);
  const scopes = new Map<string, ComponentTokenScope>();

  const visit = (name: string, stack: Set<string>): ComponentTokenScope => {
    const known = scopes.get(name);
    if (known) return known;
    const token = tokens.get(name)!;
    let scope: ComponentTokenScope = namesColour(token.key) ? "theme" : "page";
    if (scope === "page") {
      for (const ref of refs(token.value)) {
        if (semantic.has(ref) || ref.startsWith("--psi-palette-")) { scope = "theme"; break; }
        if (tokens.has(ref) && !stack.has(ref)) {
          stack.add(ref);
          const inner = visit(ref, stack);
          stack.delete(ref);
          if (inner === "theme") { scope = "theme"; break; }
        }
      }
    }
    scopes.set(name, scope);
    return scope;
  };

  for (const name of tokens.keys()) visit(name, new Set([name]));
  return scopes;
}

/** The page-scoped tokens a theme's componentOverrides reach through var():
 * each one names an overridden token, directly or through another page-scoped
 * token. A page-scoped token resolves once, at `:root`, so an alias such as
 * `--psi-button-radius: var(--psi-control-radius)` would keep the root's value
 * under a theme that overrides `control-radius` on a narrower element. The
 * theme declares each of them again beside its overrides, so they re-resolve
 * wherever the theme is applied. Returned with their default values, keyed
 * without the `--psi-` prefix, in registry order. Tokens the theme overrides
 * itself are left out. */
export function overrideDependents(
  overrides: Record<string, string>,
  componentVars: Record<string, Record<string, string>>,
  scopes: Map<string, ComponentTokenScope>,
): Record<string, string> {
  const tokens = flatten(componentVars);
  const overridden = new Set(Object.keys(overrides).map((k) => `--psi-${k}`));
  const reaches = new Map<string, boolean>();

  const visit = (name: string, stack: Set<string>): boolean => {
    const known = reaches.get(name);
    if (known !== undefined) return known;
    let hit = false;
    for (const ref of refs(tokens.get(name)!.value)) {
      if (overridden.has(ref)) { hit = true; break; }
      if (tokens.has(ref) && scopes.get(ref) === "page" && !stack.has(ref)) {
        stack.add(ref);
        const inner = visit(ref, stack);
        stack.delete(ref);
        if (inner) { hit = true; break; }
      }
    }
    reaches.set(name, hit);
    return hit;
  };

  const out: Record<string, string> = {};
  for (const [name, { value }] of tokens) {
    if (scopes.get(name) !== "page" || overridden.has(name)) continue;
    if (visit(name, new Set([name]))) out[name.slice("--psi-".length)] = value;
  }
  return out;
}
