import { parse, type ParserPlugin } from "@babel/parser";

/** The few node fields the check reads. @babel/types is not a dependency of
 * this package, so nodes are typed loosely and narrowed by `type`. */
export interface AnyNode {
  type: string;
  loc?: { start: { line: number; column: number } };
  [key: string]: unknown;
}

export type Parsed =
  | { ok: true; ast: AnyNode; shift: number }
  | { ok: false; message: string; line: number; column: number };

const OPTIONS = { sourceType: "module" as const, plugins: ["jsx", "typescript"] as ParserPlugin[] };

/** Parses a module, or failing that, a run of sibling JSX elements wrapped in
 * a fragment. `shift` is the wrapper's length on line 1. */
export function parseSource(code: string): Parsed {
  try {
    return { ok: true, ast: parse(code, OPTIONS) as unknown as AnyNode, shift: 0 };
  } catch (first) {
    // A fragment retry is for sibling elements: code that starts and ends as
    // JSX. Anything else that failed to parse has a real syntax error, which
    // the wrapper would turn into JSX text.
    const trimmed = code.trim();
    const retry = trimmed.startsWith("<") && trimmed.endsWith(">");
    try {
      if (!retry) throw first;
      return { ok: true, ast: parse(`<>${code}</>`, OPTIONS) as unknown as AnyNode, shift: 2 };
    } catch {
      const e = first as { message: string; loc?: { line: number; column: number } };
      return {
        ok: false,
        message: e.message.replace(/\s*\(\d+:\d+\)$/, ""),
        line: e.loc?.line ?? 1,
        column: (e.loc?.column ?? 0) + 1,
      };
    }
  }
}

const SKIP = new Set(["loc", "start", "end", "extra", "range", "leadingComments", "trailingComments", "innerComments"]);

/** Visits every node, depth-first, in source order. */
export function walk(node: unknown, visit: (n: AnyNode) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (!node || typeof node !== "object") return;
  const n = node as AnyNode;
  if (typeof n.type === "string") visit(n);
  for (const [key, value] of Object.entries(n)) {
    if (!SKIP.has(key) && value && typeof value === "object") walk(value, visit);
  }
}

/** 1-based line and column in the code as given, undoing the wrapper. */
export function position(n: AnyNode, shift: number): { line: number; column: number } {
  const start = n.loc?.start ?? { line: 1, column: 0 };
  return { line: start.line, column: start.column + 1 - (start.line === 1 ? shift : 0) };
}

/** An element's tag as written: `Button`, `div`, `Icons.Plus`; null for a namespaced name. */
export function tagOf(name: AnyNode): string | null {
  if (name.type === "JSXIdentifier") return name.name as string;
  if (name.type === "JSXMemberExpression") {
    const object = tagOf(name.object as AnyNode);
    return object ? `${object}.${(name.property as AnyNode).name as string}` : null;
  }
  return null;
}
