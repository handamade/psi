import postcss, { type Rule } from "postcss";
import nested from "postcss-nested";

export type RingRule = { kind: "outline" | "box-shadow"; selector: string };

/** D146 §3: every rule whose `outline` or `box-shadow` draws `var(--ui-ring)`,
 * with nested `&` selectors flattened by postcss-nested. Source order. */
export function extractRingRules(css: string): RingRule[] {
  const root = postcss([nested()]).process(css, { from: undefined }).root;
  const out: RingRule[] = [];
  root.walkDecls((decl) => {
    if (decl.prop !== "outline" && decl.prop !== "box-shadow") return;
    if (!decl.value.includes("var(--ui-ring)")) return;
    const rule = decl.parent;
    if (!rule || rule.type !== "rule") {
      throw new Error(`extractRingRules: ${decl.prop} with --ui-ring outside a rule (${rule?.type})`);
    }
    out.push({ kind: decl.prop as RingRule["kind"], selector: (rule as Rule).selector.replace(/\s+/g, " ") });
  });
  return out;
}
