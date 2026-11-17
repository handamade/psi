import { nearest } from "../nearest.js";
import type { ComponentEntry } from "../types.js";
import type { CheckIndex } from "./index.js";
import { parseSource, position, tagOf, walk, type AnyNode } from "./parse.js";

export type Rule =
  | "parse"
  | "unknown-export"
  | "unknown-prop"
  | "invalid-value"
  | "missing-required"
  | "slot"
  | "accessible-name";

export interface Finding {
  line: number;
  column: number;
  rule: Rule;
  message: string;
}

export interface Report {
  findings: Finding[];
  /** Psi component → how many elements were checked. */
  checked: Map<string, number>;
  /** Tag → why it was not checked. */
  notChecked: Map<string, string>;
  skipped: string[];
}

const PSI = "@handamade/psi-react";
const ALWAYS_ALLOWED = new Set(["key", "ref"]);

/** The literal members of a manifest type string, or null when any member is
 * not a string or number literal (then the value cannot be judged). */
export function literalUnion(type: string): Array<string | number> | null {
  const out: Array<string | number> = [];
  for (const part of type.split(" | ").map((p) => p.trim())) {
    const quoted = part.match(/^"(.*)"$/);
    if (quoted) out.push(quoted[1]);
    else if (/^-?\d+(\.\d+)?$/.test(part)) out.push(Number(part));
    else return null;
  }
  return out;
}

const show = (v: string | number | boolean) => (typeof v === "string" ? `"${v}"` : String(v));

type AttrValue =
  | { kind: "literal"; value: string | number | boolean }
  | { kind: "jsx"; node: AnyNode }
  | { kind: "computed" };

export interface Attr {
  name: string;
  value: AttrValue;
  node: AnyNode;
}

export interface Element {
  component: ComponentEntry;
  node: AnyNode;
  attrs: Attr[];
  spread: boolean;
  /** The JSX children nodes, as written. */
  children: AnyNode[];
}

function valueOf(value: AnyNode | null): AttrValue {
  if (value === null) return { kind: "literal", value: true };
  if (value.type === "StringLiteral") return { kind: "literal", value: value.value as string };
  if (value.type === "JSXElement" || value.type === "JSXFragment") return { kind: "jsx", node: value };
  if (value.type === "JSXExpressionContainer") {
    const e = value.expression as AnyNode;
    if (e.type === "StringLiteral" || e.type === "NumericLiteral" || e.type === "BooleanLiteral") {
      return { kind: "literal", value: e.value as string | number | boolean };
    }
    if (e.type === "TemplateLiteral" && (e.expressions as unknown[]).length === 0) {
      const [quasi] = e.quasis as AnyNode[];
      return { kind: "literal", value: (quasi.value as { cooked: string }).cooked };
    }
    if (e.type === "UnaryExpression" && e.operator === "-" && (e.argument as AnyNode).type === "NumericLiteral") {
      return { kind: "literal", value: -((e.argument as AnyNode).value as number) };
    }
    if (e.type === "JSXElement" || e.type === "JSXFragment") return { kind: "jsx", node: e };
  }
  return { kind: "computed" };
}

export function runCheck(code: string, index: CheckIndex): Report {
  const report: Report = { findings: [], checked: new Map(), notChecked: new Map(), skipped: [] };
  const parsed = parseSource(code);
  if (!parsed.ok) {
    report.findings.push({ line: parsed.line, column: parsed.column, rule: "parse", message: parsed.message });
    return report;
  }
  const { ast, shift } = parsed;
  const at = (n: AnyNode) => position(n, shift);
  const find = (n: AnyNode, rule: Rule, message: string) => report.findings.push({ ...at(n), rule, message });
  const where = (n: AnyNode) => `${at(n).line}:${at(n).column}`;

  const components = new Map(index.components.map((c) => [c.name, c]));
  const exported = new Set(index.exports);

  // Imports from Psi: local name → exported name.
  const psiLocals = new Map<string, string>();
  const otherLocals = new Set<string>();
  walk(ast, (n) => {
    if (n.type !== "ImportDeclaration") return;
    const fromPsi = (n.source as AnyNode).value === PSI;
    for (const spec of n.specifiers as AnyNode[]) {
      const local = (spec.local as AnyNode).name as string;
      if (!fromPsi) {
        otherLocals.add(local);
        continue;
      }
      if (spec.type !== "ImportSpecifier") continue;
      const imported = spec.imported as AnyNode;
      const name = (imported.name ?? imported.value) as string;
      if (!exported.has(name)) {
        const near = nearest(name, index.exports);
        find(imported, "unknown-export", `\`${name}\` is not exported by ${PSI}${near ? `; did you mean \`${near}\`?` : "."}`);
        continue;
      }
      psiLocals.set(local, name);
    }
  });
  const hasPsiImport = psiLocals.size > 0;

  /** The Psi component a tag names, or null (recording why in notChecked). */
  function componentFor(tag: string): ComponentEntry | null {
    if (/^[a-z]/.test(tag)) return null; // an HTML element
    if (tag.includes(".")) {
      report.notChecked.set(tag, "member expression");
      return null;
    }
    if (otherLocals.has(tag) && !psiLocals.has(tag)) {
      report.notChecked.set(tag, hasPsiImport ? `not imported from ${PSI}` : "imported from elsewhere");
      return null;
    }
    const exportName = hasPsiImport ? psiLocals.get(tag) : components.has(tag) ? tag : undefined;
    if (exportName === undefined) {
      report.notChecked.set(tag, hasPsiImport ? `not imported from ${PSI}` : "not a Psi export");
      return null;
    }
    const component = components.get(exportName);
    if (!component) report.notChecked.set(tag, "a Psi export with no manifest entry");
    return component ?? null;
  }

  const elements: Element[] = [];
  walk(ast, (n) => {
    if (n.type !== "JSXElement") return;
    const opening = n.openingElement as AnyNode;
    const tag = tagOf(opening.name as AnyNode);
    if (!tag) return;
    const component = componentFor(tag);
    if (!component) return;
    const attrs: Attr[] = [];
    let spread = false;
    for (const a of opening.attributes as AnyNode[]) {
      if (a.type === "JSXSpreadAttribute") {
        spread = true;
        continue;
      }
      const nameNode = a.name as AnyNode;
      if (nameNode.type !== "JSXIdentifier") continue; // namespaced, e.g. xlink:href
      attrs.push({ name: nameNode.name as string, value: valueOf(a.value as AnyNode | null), node: a });
    }
    elements.push({ component, node: opening, attrs, spread, children: n.children as AnyNode[] });
    report.checked.set(component.name, (report.checked.get(component.name) ?? 0) + 1);
  });

  for (const el of elements) {
    const c = el.component;
    if (el.spread) report.skipped.push(`a spread on \`${c.name}\` at ${where(el.node)}`);
    const declared = new Map(c.props.map((p) => [p.name, p]));
    const passThrough = new Set(c.attributeSet === null ? [] : index.attributeSets[c.attributeSet]);

    for (const attr of el.attrs) {
      const prop = declared.get(attr.name);
      if (!prop) {
        const allowed =
          ALWAYS_ALLOWED.has(attr.name) || attr.name.startsWith("aria-") || attr.name.startsWith("data-") || passThrough.has(attr.name);
        if (!allowed) {
          const near = nearest(attr.name, [...declared.keys(), ...passThrough]);
          find(attr.node, "unknown-prop", `\`${c.name}\` has no prop \`${attr.name}\`${near ? `; did you mean \`${near}\`?` : "."}`);
        }
        continue;
      }
      if (attr.value.kind === "computed") {
        report.skipped.push(`a computed \`${attr.name}\` on \`${c.name}\` at ${where(attr.node)}`);
        continue;
      }
      const union = literalUnion(prop.type);
      if (union === null || attr.value.kind !== "literal") continue;
      const value = attr.value.value;
      if (!union.some((member) => member === value)) {
        find(attr.node, "invalid-value", `\`${attr.name}\` on \`${c.name}\` is ${show(value)}; it takes ${union.map(show).join(" | ")}.`);
      }
    }

    if (!el.spread) {
      const given = new Set(el.attrs.map((a) => a.name));
      const hasChildren = el.children.some(
        (ch) => !(ch.type === "JSXText" && !(ch.value as string).trim()) && !(ch.type === "JSXExpressionContainer" && (ch.expression as AnyNode).type === "JSXEmptyExpression"),
      );
      for (const p of c.props) {
        if (!p.required || given.has(p.name)) continue;
        if (p.name === "children" && hasChildren) continue;
        find(el.node, "missing-required", `\`${c.name}\` needs \`${p.name}\`.`);
      }
    }
  }

  return report;
}
