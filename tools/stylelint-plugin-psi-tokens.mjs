import stylelint from "stylelint";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ruleName = "psi/component-tokens-only";
const ALLOWED_GLOBAL = /^--psi-(space|size|radius|text|font|duration|ease|z)-/;
// componentName derived from filename: button.module.css → button; icon-button → button (declared alias)
const ALIASES = { "icon-button": "button" };

const rule = (enabled) => (root, result) => {
  if (!enabled) return;
  const file = root.source?.input.file ?? "";
  const m = file.match(/([a-z-]+)\.module\.css$/);
  if (!m) return;
  const component = ALIASES[m[1]] ?? m[1];
  const own = new RegExp(`^--psi-${component}-`);
  root.walkDecls((decl) => {
    for (const varName of decl.value.matchAll(/var\((--psi-[a-z0-9-]+)/g)) {
      const name = varName[1];
      if (!own.test(name) && !ALLOWED_GLOBAL.test(name)) {
        stylelint.utils.report({
          ruleName, result, node: decl,
          message: `${name} is not a --psi-${component}-* or scale token (psi/component-tokens-only)`,
        });
      }
    }
    if (/^(transition|animation)/.test(decl.prop) && /(^|[\s,(])\d+(\.\d+)?m?s\b/.test(decl.value)) {
      stylelint.utils.report({
        ruleName, result, node: decl,
        message: `literal duration in "${decl.prop}" — use var(--psi-duration-*) (psi/component-tokens-only)`,
      });
    }
    if (decl.prop === "z-index" && /^\d+$/.test(decl.value.trim())) {
      stylelint.utils.report({
        ruleName, result, node: decl,
        message: `literal z-index — use var(--psi-z-*) (psi/component-tokens-only)`,
      });
    }
  });
};
rule.ruleName = ruleName;
rule.messages = stylelint.utils.ruleMessages(ruleName, {});

const scopeRuleName = "psi/token-scopes";
const mapPath = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "tokens", "dist", "scope-map.json");

/** D46 secondary gate. The token build is the primary gate; when the map
 * has not been generated yet (fresh clone, no pnpm build), skip silently. */
const scopeRule = (enabled) => (root, result) => {
  if (!enabled || !existsSync(mapPath)) return;
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  const expand = (scopes) =>
    new Set(scopes.flatMap((s) => map.propertyGroups[s] ?? [s]));
  const lookup = (name) => {
    const bare = name.slice("--psi-".length);
    const scaleFamily = Object.keys(map.scales).find((f) => bare.startsWith(`${f}-`));
    if (scaleFamily) return map.scales[scaleFamily];
    return map.semantic[bare] ?? map.component[bare];
  };
  root.walkDecls((decl) => {
    if (decl.prop.startsWith("--")) return; // assigning to a custom prop is not a property binding
    for (const m of decl.value.matchAll(/var\((--psi-[a-z0-9-]+)/g)) {
      const scopes = lookup(m[1]);
      if (!scopes) continue; // unscoped
      if (!expand(scopes).has(decl.prop)) {
        stylelint.utils.report({
          ruleName: scopeRuleName, result, node: decl,
          message: `${m[1]} is scoped to [${scopes.join(", ")}] and may not bind "${decl.prop}" (psi/token-scopes)`,
        });
      }
    }
  });
};
scopeRule.ruleName = scopeRuleName;
scopeRule.messages = stylelint.utils.ruleMessages(scopeRuleName, {});

export default [
  stylelint.createPlugin(ruleName, rule),
  stylelint.createPlugin(scopeRuleName, scopeRule),
];
