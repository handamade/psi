import { colorTokens as colorTokensOf, THEMES, type ColorToken } from "@handamade/psi-docs";
import { resolved } from "@handamade/psi-docs/node";

export { THEMES, kebab, type ColorToken, type Guidance, type Resolved, type ThemeName } from "@handamade/psi-docs";
export { guidance, resolved } from "@handamade/psi-docs/node";

export function colorTokens(): ColorToken[] {
  return colorTokensOf(Object.fromEntries(THEMES.map((t) => [t, resolved(t)])) as Parameters<typeof colorTokensOf>[0]);
}
