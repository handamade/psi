export function emitComponentVarsCSS(
  component: string,
  vars: Record<string, string>,
): string {
  const lines = Object.entries(vars).map(
    ([k, v]) => `    --ds-${component}-${k}: ${v};`,
  );
  // :where() = zero specificity: brand overrides (D34), emitted at
  // [data-ds-theme="<name>"] in this same layer, win regardless of import order.
  return `@layer ds.components {\n  :where(:root, [data-ds-theme]) {\n${lines.join("\n")}\n  }\n}\n`;
}
