import { classifyComponentTokens, type ComponentTokenScope } from "../src/emit/component-scope.js";
import { componentVars } from "../src/components/registry.js";
import { lightTheme } from "../src/themes/light.js";

let registryScopes: Map<string, ComponentTokenScope> | undefined;
/** The shipped registry's classification, against the semantic vocabulary
 * every theme shares. */
export function defaultComponentScopes(): Map<string, ComponentTokenScope> {
  return (registryScopes ??= classifyComponentTokens(componentVars, Object.keys(lightTheme)));
}

/** One component's tokens, split by scope (D139). Page-scoped tokens are
 * declared at `:root` alone, so a sub-theme inherits the page's value;
 * theme-scoped tokens are declared again on every `data-psi-theme` element, so
 * their colours re-resolve there. */
export function emitComponentVarsCSS(
  component: string,
  vars: Record<string, string>,
  scopes: Map<string, ComponentTokenScope> = defaultComponentScopes(),
): string {
  const page: string[] = [];
  const theme: string[] = [];
  for (const [k, v] of Object.entries(vars)) {
    const name = `--psi-${component}-${k}`;
    const scope = scopes.get(name);
    if (scope === undefined) throw new Error(`${name} has no scope; classify the whole registry first`);
    (scope === "page" ? page : theme).push(`    ${name}: ${v};`);
  }
  // :where() = zero specificity: brand overrides (D34), emitted at
  // [data-psi-theme="<name>"] in this same layer, win regardless of import order.
  const blocks: string[] = [];
  if (page.length > 0) blocks.push(`  :where(:root) {\n${page.join("\n")}\n  }`);
  if (theme.length > 0) blocks.push(`  :where(:root, [data-psi-theme]) {\n${theme.join("\n")}\n  }`);
  return `@layer psi.components {\n${blocks.join("\n")}\n}\n`;
}
