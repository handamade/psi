/** Theming-section builder for emit-docs (HAN-41): only claim what the
 * component's token family actually offers. `varsCss` is the content of
 * `tokens/dist/components/<name>.vars.css`, or null when no family exists.
 * `families` are the component token families its stylesheets bind when it
 * has none of its own — a member of the Table family binds `--psi-table-*`
 * (D128), and saying it binds "scale tokens only" was false. */
export function themingSection(
  tokenName: string,
  varsCss: string | null,
  states: { hover: string; active: string },
  families: string[] = [],
): string {
  if (varsCss === null) {
    if (families.length > 0) {
      const list = families.map((f) => `\`--psi-${f}-*\``);
      const named = list.length === 1 ? list[0] : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
      return `This component has no \`${tokenName}\` tokens of its own. Its styling binds the ${named} tokens; override those at any scope.`;
    }
    return `This component has no \`${tokenName}\` tokens — its styling binds scale tokens only, so there is nothing component-scoped to override. Theme changes reach it through the semantic tokens of its children and surroundings.`;
  }
  const hasInteractiveStates = varsCss.includes("-hover");
  if (!hasInteractiveStates) {
    return `Override \`${tokenName}\` custom properties at any scope.`;
  }
  return `Override \`${tokenName}\` custom properties at any scope; interactive states derive automatically (${states.hover} hover, ${states.active} active).`;
}

/** The component token families a stylesheet binds (D128): every
 * `var(--psi-…)` name it reads, looked up among the names each family's
 * generated `.vars.css` declares. Exact names, not prefixes, so a semantic
 * or scale token that happens to share a family's prefix does not count.
 * `familyVars` maps a family name to its `.vars.css` text. Sorted by name. */
export function boundFamilies(css: string, familyVars: Record<string, string>): string[] {
  const used = new Set([...css.matchAll(/var\(\s*(--psi-[a-z0-9-]+)/g)].map((m) => m[1]));
  const found: string[] = [];
  for (const [family, vars] of Object.entries(familyVars)) {
    const declared = [...vars.matchAll(/(--psi-[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
    if (declared.some((name) => used.has(name))) found.push(family);
  }
  return found.sort();
}
