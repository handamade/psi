/** Theming-section builder for emit-docs (HAN-41): only claim what the
 * component's token family actually offers. `varsCss` is the content of
 * `tokens/dist/components/<name>.vars.css`, or null when no family exists. */
export function themingSection(
  tokenName: string,
  varsCss: string | null,
  states: { hover: string; active: string },
): string {
  if (varsCss === null) {
    return `This component has no \`${tokenName}\` tokens — its styling binds scale tokens only, so there is nothing component-scoped to override. Theme changes reach it through the semantic tokens of its children and surroundings.`;
  }
  const hasInteractiveStates = varsCss.includes("-hover");
  if (!hasInteractiveStates) {
    return `Override \`${tokenName}\` custom properties at any scope.`;
  }
  return `Override \`${tokenName}\` custom properties at any scope; interactive states derive automatically (${states.hover} hover, ${states.active} active).`;
}
