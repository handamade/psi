export function emitComponentVarsCSS(
  component: string,
  vars: Record<string, string>,
): string {
  const lines = Object.entries(vars).map(
    ([k, v]) => `    --psi-${component}-${k}: ${v};`,
  );
  // :where() = zero specificity: brand overrides (D34), emitted at
  // [data-psi-theme="<name>"] in this same layer, win regardless of import order.
  return `@layer psi.components {\n  :where(:root, [data-psi-theme]) {\n${lines.join("\n")}\n  }\n}\n`;
}
