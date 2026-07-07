export function emitComponentVarsCSS(
  component: string,
  vars: Record<string, string>,
): string {
  const lines = Object.entries(vars).map(
    ([k, v]) => `    --ds-${component}-${k}: ${v};`,
  );
  return `@layer ds.components {\n  :root, [data-ds-theme] {\n${lines.join("\n")}\n  }\n}\n`;
}
