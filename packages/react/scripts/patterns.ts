import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// D48's "scopes entry" class is enforced by the D46 token build (packages/tokens); not duplicated here.

/** A single node in a pattern's `compose` tree: a component instance, its
 * props (which may hold `{param:key}` / `{content:key}` placeholders), and
 * its slot fills (nested nodes or string literals / placeholders). */
export interface PatternNode {
  component: string;
  props?: Record<string, unknown>;
  slots?: Record<string, Array<PatternNode | string>>;
  content?: string; // content key for text children
}

/** Authored composition recipe (D47): what to build, from what parts, with
 * what parameters exposed to the consumer, and which named components in
 * `compose` are known gaps (not yet in the manifest). */
export interface Pattern {
  id: string;
  intent: string;
  match: string[];
  compose: PatternNode;
  parameters: Array<{ key: string; ask: string; options: Array<string | number>; default?: string | number }>;
  content: Record<string, string>;
  gaps: string[];
}

/** Slice of `dist/manifest.json` a pattern is validated against. */
export interface ManifestComponent {
  name: string;
  slots: Array<{ name: string; accepts: { components?: string[]; contracts?: string[] }; cardinality: string; order?: number }>;
  props: Array<{ name: string; type: string; required: boolean; default: unknown }>;
}

/** Loads *.json pattern files from `dir`, sorted by filename. Throws on a
 * missing/mistyped required field (id, intent, match, compose); the rest
 * default to []/{}/[]. `pattern.schema.json` (a JSON Schema sidecar, not a
 * pattern) is skipped. */
export function loadPatterns(dir: string): Pattern[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "pattern.schema.json")
    .sort();

  return files.map((file) => {
    const raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as Record<string, unknown>;

    if (typeof raw.id !== "string") throw new Error(`${file}: missing/invalid "id"`);
    if (typeof raw.intent !== "string") throw new Error(`${file}: missing/invalid "intent"`);
    if (!Array.isArray(raw.match)) throw new Error(`${file}: missing/invalid "match"`);
    if (typeof raw.compose !== "object" || raw.compose === null) {
      throw new Error(`${file}: missing/invalid "compose"`);
    }

    return {
      id: raw.id,
      intent: raw.intent,
      match: raw.match as string[],
      compose: raw.compose as PatternNode,
      parameters: (raw.parameters as Pattern["parameters"]) ?? [],
      content: (raw.content as Pattern["content"]) ?? {},
      gaps: (raw.gaps as string[]) ?? [],
    };
  });
}

/** Parses a TypeScript literal-union type string (`'"a" | "b"'`, `"24 | 32"`)
 * into its member values. Returns null when any member isn't a pure string
 * or number literal (e.g. `string`, `boolean`, or a mixed union). */
export function parseLiteralUnion(type: string): Array<string | number> | null {
  const parts = type.split(" | ");
  const out: Array<string | number> = [];
  for (const part of parts) {
    const strMatch = /^"(.*)"$/.exec(part);
    if (strMatch) {
      out.push(strMatch[1]);
      continue;
    }
    if (/^-?\d+(?:\.\d+)?$/.test(part)) {
      out.push(Number(part));
      continue;
    }
    return null;
  }
  return out;
}

const PARAM_RE = /^\{param:([a-z0-9-]+)\}$/;
const CONTENT_RE = /^\{content:([a-z0-9-]+)\}$/;
const CANONICAL_CARDINALITIES = new Set(["0..1", "1..1", "0..*", "1..*"]);

/** Validates every pattern's compose tree against the manifest and the D45
 * slot contracts (D48 error classes 1-8). Throws on the first violation
 * found; returns the gap map (patternId -> gap component names actually
 * used) when every pattern is clean. */
export function validatePatterns(
  patterns: Pattern[],
  components: ManifestComponent[],
  contracts: Record<string, string[]>,
): { gaps: Record<string, string[]> } {
  const byName = new Map(components.map((c) => [c.name, c]));

  for (const pattern of patterns) {
    const prefix = `pattern "${pattern.id}": `;
    const referencedParams = new Set<string>();
    // param key -> literal union of every prop site it fills; `null` marks a
    // gap-node site (no manifest prop to check a union against — unconstrained).
    const paramSites = new Map<string, Array<Array<string | number> | null>>();
    const referencedContent = new Set<string>();

    // Legal in prop positions: both {param:key} and {content:key}.
    const trackPropPlaceholders = (value: unknown) => {
      if (typeof value !== "string") return;
      const paramMatch = PARAM_RE.exec(value);
      if (paramMatch) referencedParams.add(paramMatch[1]);
      const contentMatch = CONTENT_RE.exec(value);
      if (contentMatch) referencedContent.add(contentMatch[1]);
    };

    // Legal in text positions (slot string fills, node `content`): only
    // {content:key} — {param:key} only binds prop values (D48).
    const trackTextPlaceholder = (value: string) => {
      const paramMatch = PARAM_RE.exec(value);
      if (paramMatch) {
        throw new Error(
          `${prefix}param "${paramMatch[1]}" used outside a prop position — parameters bind prop values (D48)`,
        );
      }
      const contentMatch = CONTENT_RE.exec(value);
      if (contentMatch) referencedContent.add(contentMatch[1]);
    };

    const walk = (node: PatternNode, path: string) => {
      const isGap = pattern.gaps.includes(node.component);
      const manifestComponent = byName.get(node.component);

      if (!manifestComponent && !isGap) {
        throw new Error(`${prefix}${path}: unknown component "${node.component}"`);
      }

      if (node.content !== undefined) {
        // node.content is a bare content-key reference (not {content:key}
        // syntax) — but a {param:key} placeholder here is still a prop-only
        // violation (D48) and must throw, not be silently treated as a key.
        const paramMatch = PARAM_RE.exec(node.content);
        if (paramMatch) {
          throw new Error(
            `${prefix}param "${paramMatch[1]}" used outside a prop position — parameters bind prop values (D48)`,
          );
        }
        referencedContent.add(node.content);
      }

      // Gap nodes have no manifest entry to check prop existence/type/union
      // against, but their props must still be scanned for {param:}/{content:}
      // placeholders — otherwise a declared param/content key that's only
      // ever used on a gap node reads as "never referenced" (class 6/8 false
      // positive). By the unknown-component check above, at this point
      // either manifestComponent is set or isGap is true (or both) — a gap
      // listing always wins over a coincidental manifest match.
      for (const [propName, propValue] of Object.entries(node.props ?? {})) {
        if (!manifestComponent || isGap) {
          trackPropPlaceholders(propValue);
          const paramMatch = typeof propValue === "string" ? PARAM_RE.exec(propValue) : null;
          if (paramMatch) {
            // Unconstrained: no literal union to check against on a gap
            // node, so record `null` — the class-7 options check below
            // skips null sites instead of treating them as "not a
            // literal-union prop".
            const sites = paramSites.get(paramMatch[1]) ?? [];
            sites.push(null);
            paramSites.set(paramMatch[1], sites);
          }
          continue;
        }

        const propDef = manifestComponent.props.find((p) => p.name === propName);
        if (!propDef) {
          throw new Error(
            `${prefix}${path}: unknown prop "${propName}" on component "${node.component}"`,
          );
        }
        trackPropPlaceholders(propValue);

        const paramMatch = typeof propValue === "string" ? PARAM_RE.exec(propValue) : null;
        if (paramMatch) {
          const union = parseLiteralUnion(propDef.type);
          const sites = paramSites.get(paramMatch[1]) ?? [];
          sites.push(union ?? []);
          paramSites.set(paramMatch[1], sites);
          if (!union) {
            throw new Error(
              `${prefix}param "${paramMatch[1]}" fills prop "${propName}" which is not a literal-union prop`,
            );
          }
          continue;
        }

        const union = parseLiteralUnion(propDef.type);
        if (union) {
          if (!union.includes(propValue as string | number)) {
            throw new Error(
              `${prefix}${path}: value "${propValue}" not in the literal union for prop "${propName}"`,
            );
          }
        } else if (propDef.type === "boolean") {
          if (typeof propValue !== "boolean") {
            throw new Error(
              `${prefix}${path}: value "${propValue}" is not a boolean for prop "${propName}"`,
            );
          }
        }
      }

      const givenSlots = node.slots ?? {};
      const checkedSlots = new Set<string>();

      const checkCardinality = (slotName: string, slotDef: ManifestComponent["slots"][number] | undefined, count: number) => {
        if (!slotDef) return;
        const cardinality = slotDef.cardinality;
        if (!CANONICAL_CARDINALITIES.has(cardinality)) {
          throw new Error(`${prefix}slot "${slotName}" has unrecognized cardinality "${cardinality}"`);
        }
        const min = cardinality === "1..1" || cardinality === "1..*" ? 1 : 0;
        const max = cardinality === "0..1" || cardinality === "1..1" ? 1 : Infinity;
        if (count < min || count > max) {
          throw new Error(
            `${prefix}${path}: slot "${slotName}" requires cardinality ${cardinality} but got ${count} entries`,
          );
        }
      };

      for (const [slotName, fills] of Object.entries(givenSlots)) {
        checkedSlots.add(slotName);
        const slotDef = manifestComponent?.slots.find((s) => s.name === slotName);
        if (manifestComponent && !isGap && slotName !== "body" && !slotDef) {
          throw new Error(`${prefix}${path}: unknown slot "${slotName}" on component "${node.component}"`);
        }

        checkCardinality(slotName, slotDef, fills.length);

        for (const [i, fill] of fills.entries()) {
          const fillPath = `${path}.${slotName}[${i}]`;
          if (typeof fill === "string") {
            trackTextPlaceholder(fill);
            continue;
          }

          const fillIsGap = pattern.gaps.includes(fill.component);
          if (slotDef && !fillIsGap) {
            const accepts = slotDef.accepts;
            const allowedComponents = new Set(accepts.components ?? []);
            for (const contractName of accepts.contracts ?? []) {
              for (const member of contracts[contractName] ?? []) allowedComponents.add(member);
            }
            const open = !accepts.components && !accepts.contracts;
            if (!open && !allowedComponents.has(fill.component)) {
              throw new Error(
                `${prefix}${path}: slot "${slotName}" does not accept component "${fill.component}"`,
              );
            }
          }

          walk(fill, fillPath);
        }
      }

      if (manifestComponent && !isGap) {
        for (const slotDef of manifestComponent.slots) {
          if (!checkedSlots.has(slotDef.name)) checkCardinality(slotDef.name, slotDef, 0);
        }
      }
    };

    walk(pattern.compose, "compose");

    for (const param of pattern.parameters) {
      if (!referencedParams.has(param.key)) {
        throw new Error(`${prefix}param "${param.key}" declared but never referenced`);
      }
    }
    for (const key of referencedParams) {
      const param = pattern.parameters.find((p) => p.key === key);
      if (!param) {
        throw new Error(`${prefix}param "${key}" referenced but not declared`);
      }
      const sites = paramSites.get(key) ?? [];
      for (const union of sites) {
        if (union === null) continue; // gap-node site: unconstrained, no literal union to check against
        for (const option of param.options) {
          if (!union.includes(option)) {
            throw new Error(
              `${prefix}option "${option}" of param "${key}" is not in the literal union of one of its fill sites`,
            );
          }
        }
      }
    }

    for (const key of Object.keys(pattern.content)) {
      if (!referencedContent.has(key)) {
        throw new Error(`${prefix}content "${key}" declared but never referenced`);
      }
    }
    for (const key of referencedContent) {
      if (!(key in pattern.content)) {
        throw new Error(`${prefix}content "${key}" referenced but not declared`);
      }
    }
  }

  return {
    gaps: Object.fromEntries(patterns.filter((p) => p.gaps.length > 0).map((p) => [p.id, p.gaps])),
  };
}

/** Renders a fully-bound pattern (`gaps: []`, every parameter defaulted) to a
 * deterministic JSX string using each parameter/content default — a
 * byte-identical re-render every time. Returns null when the pattern has
 * gaps or any parameter lacks a `default` (not renderable as a static
 * preset). Pure string building; `components` is accepted for interface
 * symmetry with `validatePatterns` but rendering only needs the pattern's
 * own compose tree, parameters, and content. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- `components` kept for interface symmetry with `validatePatterns`.
export function renderPreset(pattern: Pattern, components: ManifestComponent[]): string | null {
  if (pattern.gaps.length > 0) return null;
  if (pattern.parameters.some((p) => p.default === undefined)) return null;

  const paramDefaults = new Map(pattern.parameters.map((p) => [p.key, p.default as string | number]));
  const content = pattern.content;
  const ind = (depth: number) => "  ".repeat(depth);

  // Resolves a text position (slot string fill, or a prop's raw string):
  // {content:key} -> content value; anything else is literal text.
  const resolveText = (raw: string): string => {
    const contentMatch = CONTENT_RE.exec(raw);
    return contentMatch ? content[contentMatch[1]] : raw;
  };

  // JSX attribute values are double-quoted string literals — a literal `"`
  // in the content/default text would otherwise terminate the attribute
  // early and emit invalid JSX. Text children have no such delimiter (JSX
  // text runs to the next `<`/`{`), so quotes there are left raw.
  const escapeAttr = (s: string): string => s.replaceAll('"', "&quot;");

  // Resolves a prop's rendered RHS: {param:key} -> the parameter's default
  // (typed, so a numeric default renders as `{32}` not `"32"`); {content:key}
  // -> the content string; a literal string/number/boolean renders as-is.
  // String results land in an attribute position, so `"` is escaped.
  const resolvePropValue = (raw: unknown): string => {
    if (typeof raw === "string") {
      const paramMatch = PARAM_RE.exec(raw);
      if (paramMatch) {
        const value = paramDefaults.get(paramMatch[1]);
        return typeof value === "number" ? `{${value}}` : `"${escapeAttr(String(value))}"`;
      }
      return `"${escapeAttr(resolveText(raw))}"`;
    }
    return `{${raw}}`; // number | boolean literal
  };

  /** Renders one pattern node to JSX. Body-slot fills and node.content both
   * resolve to the element's children; when both are present, `body` wins —
   * `node.content` is only consulted when the node has no `body` slot fills
   * (see the `childText`/`childNodes` block below). */
  const renderNode = (node: PatternNode, depth: number): string => {
    const props: Array<{ name: string; value: string }> = [];

    for (const [name, raw] of Object.entries(node.props ?? {})) {
      props.push({ name, value: resolvePropValue(raw) });
    }

    for (const [slotName, fills] of Object.entries(node.slots ?? {})) {
      if (slotName === "body") continue;
      if (fills.length === 1) {
        const fill = fills[0];
        props.push(
          typeof fill === "string"
            ? { name: slotName, value: `"${escapeAttr(resolveText(fill))}"` }
            : { name: slotName, value: `{${renderNode(fill, depth + 1)}}` },
        );
      } else {
        const items = fills.map((fill) => (typeof fill === "string" ? resolveText(fill) : renderNode(fill, depth + 2)));
        const inner = items.map((item) => `${ind(depth + 2)}${item}`).join("\n");
        props.push({ name: slotName, value: `{<>\n${inner}\n${ind(depth + 1)}</>}` });
      }
    }

    props.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    // Children: a `body` slot's fills, else a bare `content` key lookup.
    let childText: string | null = null;
    let childNodes: string[] | null = null;
    const body = node.slots?.body;
    if (body && body.length > 0) {
      if (body.length === 1 && typeof body[0] === "string") {
        childText = resolveText(body[0]);
      } else {
        childNodes = body.map((fill) => (typeof fill === "string" ? resolveText(fill) : renderNode(fill, depth + 1)));
      }
    } else if (node.content !== undefined) {
      childText = content[node.content];
    }

    // Block mode (props each on their own line, children each on their own
    // line) is forced by any prop value that itself spans multiple lines
    // (a fragment or nested-node slot fill), or by multiple/non-text
    // children. Otherwise everything fits on one line.
    const blockMode = props.some((p) => p.value.includes("\n")) || childNodes !== null;

    if (!blockMode) {
      const propsInline = props.map((p) => `${p.name}=${p.value}`).join(" ");
      const open = `<${node.component}${propsInline ? ` ${propsInline}` : ""}`;
      return childText !== null ? `${open}>${childText}</${node.component}>` : `${open} />`;
    }

    if (props.length === 0) {
      const lines = [`<${node.component}>`];
      if (childText !== null) lines.push(`${ind(depth + 1)}${childText}`);
      if (childNodes) for (const c of childNodes) lines.push(`${ind(depth + 1)}${c}`);
      lines.push(`${ind(depth)}</${node.component}>`);
      return lines.join("\n");
    }

    const lines = [`<${node.component}`];
    for (const p of props) lines.push(`${ind(depth + 1)}${p.name}=${p.value}`);
    if (childText === null && childNodes === null) {
      lines.push(`${ind(depth)}/>`);
      return lines.join("\n");
    }
    lines.push(`${ind(depth)}>`);
    if (childText !== null) lines.push(`${ind(depth + 1)}${childText}`);
    if (childNodes) for (const c of childNodes) lines.push(`${ind(depth + 1)}${c}`);
    lines.push(`${ind(depth)}</${node.component}>`);
    return lines.join("\n");
  };

  return `${renderNode(pattern.compose, 0)}\n`;
}
