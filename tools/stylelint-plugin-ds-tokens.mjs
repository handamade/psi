import stylelint from "stylelint";

const ruleName = "ds/component-tokens-only";
const ALLOWED_GLOBAL = /^--ds-(space|size|radius|text|font|duration|ease|z)-/;
// componentName derived from filename: button.module.css → button; icon-button → button (declared alias)
const ALIASES = { "icon-button": "button" };

const rule = (enabled) => (root, result) => {
  if (!enabled) return;
  const file = root.source?.input.file ?? "";
  const m = file.match(/([a-z-]+)\.module\.css$/);
  if (!m) return;
  const component = ALIASES[m[1]] ?? m[1];
  const own = new RegExp(`^--ds-${component}-`);
  root.walkDecls((decl) => {
    for (const varName of decl.value.matchAll(/var\((--ds-[a-z0-9-]+)/g)) {
      const name = varName[1];
      if (!own.test(name) && !ALLOWED_GLOBAL.test(name)) {
        stylelint.utils.report({
          ruleName, result, node: decl,
          message: `${name} is not a --ds-${component}-* or scale token (ds/component-tokens-only)`,
        });
      }
    }
    if (/^(transition|animation)/.test(decl.prop) && /(^|[\s,(])\d+(\.\d+)?m?s\b/.test(decl.value)) {
      stylelint.utils.report({
        ruleName, result, node: decl,
        message: `literal duration in "${decl.prop}" — use var(--ds-duration-*) (ds/component-tokens-only)`,
      });
    }
    if (decl.prop === "z-index" && /^\d+$/.test(decl.value.trim())) {
      stylelint.utils.report({
        ruleName, result, node: decl,
        message: `literal z-index — use var(--ds-z-*) (ds/component-tokens-only)`,
      });
    }
  });
};
rule.ruleName = ruleName;
rule.messages = stylelint.utils.ruleMessages(ruleName, {});
export default stylelint.createPlugin(ruleName, rule);
