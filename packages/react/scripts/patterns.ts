import { createElement, useState, type ComponentType, type ReactElement, type ReactNode } from "react";
import { KEY_RE, bindingExpr, bindingValue, isFunctionType, parseBinding, pascalCase, setterName } from "./pattern-bindings.js";
import type { BindingScope } from "./pattern-bindings.js";

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

/** A design-system affordance a pattern's *content* depends on (D71).
 *
 * `gaps` covers components named in `compose`; this covers the other half —
 * a content placeholder standing for something the system must supply, which
 * nothing could previously see. `row-actions` asking for "[icon]" and
 * `detail-drawer` asking for "[key-value summary of the selected record]"
 * both declared `gaps: []` truthfully while being unbuildable. */
export interface PatternRequirement {
  /** Key in the pattern's `content` map whose placeholder this satisfies. */
  content: string;
  /** Where the name is resolved: the manifest, or the icon roster. */
  kind: "component" | "icon";
  /** What would satisfy it. */
  name: string;
}

/** D143: state a pattern owns; each entry is one `useState` in its preset. */
export interface PatternState {
  key: string;
  initial: string | number | boolean;
}

/** D143: a value or callback the pattern's caller supplies; each entry is a
 * typed prop of the preset's wrapper. `story` is what Storybook passes; a
 * function-typed input gets a no-op there instead. */
export interface PatternInput {
  key: string;
  type: string;
  story?: string | number | boolean;
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
  /** Affordances the content depends on (D71); see PatternRequirement. */
  requires: PatternRequirement[];
  /** D143; see PatternState. */
  state?: PatternState[];
  /** D143; see PatternInput. */
  inputs?: PatternInput[];
}

/** Slice of `dist/manifest.json` a pattern is validated against. */
export interface ManifestComponent {
  name: string;
  slots: Array<{ name: string; accepts: { components?: string[]; contracts?: string[] }; cardinality: string; order?: number }>;
  props: Array<{ name: string; type: string; required: boolean; default: unknown }>;
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
const ARIA_PROP_RE = /^aria-[a-z]+$/;
const CANONICAL_CARDINALITIES = new Set(["0..1", "1..1", "0..*", "1..*"]);

/** Characters that end a JSX text run: `<` opens an element, `{` opens an
 * expression container. Fill text carrying either one renders into a preset
 * that does not parse — the original angle-bracket placeholder convention
 * (`<verb the object>`) emitted `<Button><verb the object></Button>`, which
 * a JSX parser reads as an unclosed `<verb>` element. Checked on every
 * `content` value, not only the ones that reach a text position: whether a
 * key lands in a child or an attribute depends on the compose tree, and fill
 * text is prose either way. Use bracketed prose (`[verb the object]`). */
const JSX_UNSAFE_TEXT = /[<{]/;

/** Native elements a compose tree may name besides manifest components
 * (D127). Exactly `option`, so a preset can fill a `Select`; not "any
 * lowercase name", which would let a preset route around a Psi component with
 * raw HTML. An intrinsic node is not looked up in the manifest: its props are
 * only scanned for placeholders, and it takes only a `body` slot. */
export const INTRINSIC_ELEMENTS: ReadonlySet<string> = new Set(["option"]);

/** Validates every pattern's compose tree against the manifest and the D45
 * slot contracts (D48 error classes 1-8, plus class 9: fill text must be
 * JSX-safe so `renderPreset` can only emit a parseable preset). Throws on
 * the first violation found; returns the gap map (patternId -> gap component
 * names actually used) when every pattern is clean. `attributes`: component →
 * pass-through attribute names from `dist/attributes.json`; a prop the manifest
 * does not list is accepted when the component forwards it (D143). */
export function validatePatterns(
  patterns: Pattern[],
  components: ManifestComponent[],
  contracts: Record<string, string[]>,
  icons: string[] = [],
  attributes: Record<string, string[]> = {},
): { gaps: Record<string, string[]> } {
  const byName = new Map(components.map((c) => [c.name, c]));
  const iconNames = new Set(icons);
  /** pattern id -> affordances declared in `requires` that resolve to nothing. */
  const unmetRequirements = new Map<string, string[]>();

  for (const pattern of patterns) {
    const prefix = `pattern "${pattern.id}": `;

    // D143: the pattern's own state and its caller's inputs.
    const stateByKey = new Map((pattern.state ?? []).map((s) => [s.key, s]));
    const inputByKey = new Map((pattern.inputs ?? []).map((i) => [i.key, i]));
    const seenKeys = new Set<string>();
    for (const [kind, key] of [
      ...(pattern.state ?? []).map((s) => ["state", s.key] as const),
      ...(pattern.inputs ?? []).map((i) => ["input", i.key] as const),
    ]) {
      if (!KEY_RE.test(key)) throw new Error(`${prefix}${kind} key "${key}" is not a camelCase identifier`);
      if (seenKeys.has(key)) throw new Error(`${prefix}key "${key}" declared twice across state and inputs`);
      seenKeys.add(key);
    }
    for (const input of pattern.inputs ?? []) {
      if (!isFunctionType(input.type) && input.story === undefined) {
        throw new Error(`${prefix}input "${input.key}" needs a story value: it is not a function type`);
      }
    }
    const usedBindingKeys = new Set<string>();

    /** Validates a binding placeholder in a prop position. Returns true when
     * `value` was a binding (the caller then skips its literal checks).
     * `propType` is the manifest type, or null where there is none to
     * compare (gap nodes, intrinsics, aria-*, pass-through attributes). */
    const checkBinding = (propName: string, value: unknown, propType: string | null, path: string): boolean => {
      const binding = parseBinding(value);
      if (!binding) return false;
      usedBindingKeys.add(binding.key);
      let wantsFunction: boolean;
      if (binding.kind === "input") {
        const input = inputByKey.get(binding.key);
        if (!input) throw new Error(`${prefix}input "${binding.key}" referenced but not declared`);
        wantsFunction = isFunctionType(input.type);
      } else {
        const state = stateByKey.get(binding.key);
        if (!state) throw new Error(`${prefix}state "${binding.key}" referenced but not declared`);
        if (binding.kind === "toggle" && typeof state.initial !== "boolean") {
          throw new Error(`${prefix}${path}: {toggle:${binding.key}} needs a boolean state`);
        }
        wantsFunction = binding.kind !== "state";
      }
      if (propType !== null && propType.includes("=>") !== wantsFunction) {
        throw new Error(
          `${prefix}${path}: {${binding.kind}:${binding.key}} on prop "${propName}": ${
            wantsFunction ? "a callback binding needs a function-typed prop" : "a value binding needs a prop that is not a function"
          }`,
        );
      }
      return true;
    };

    // A declared gap suppresses prop/slot validation for that node (see the
    // "gap listing always wins" comment below) so the ledger can go stale
    // silently once the component ships — this is the check that lets it
    // self-clear instead: a gap that now resolves in the manifest must be
    // removed from `gaps`, not left validated-around forever.
    for (const gapName of pattern.gaps) {
      if (byName.has(gapName)) {
        throw new Error(`${prefix}gap "${gapName}" is no longer missing — remove it from gaps`);
      }
    }

    // D71: resolve declared affordances. An unmet one joins the pattern's
    // gaps, which is what drives `blocked` — the same machinery the compose
    // tree already feeds, now fed from content as well.
    const unmet: string[] = [];
    for (const req of pattern.requires ?? []) {
      if (!(req.content in pattern.content)) {
        throw new Error(
          `${prefix}requires names content key "${req.content}", which the pattern does not define`,
        );
      }
      const resolved = req.kind === "icon" ? iconNames.has(req.name) : byName.has(req.name);
      if (!resolved) unmet.push(req.name);
    }
    if (unmet.length > 0) unmetRequirements.set(pattern.id, unmet);

    const referencedParams = new Set<string>();
    // param key -> literal union of every prop site it fills; `null` marks a
    // gap-node site (no manifest prop to check a union against — unconstrained).
    const paramSites = new Map<string, Array<Array<string | number> | null>>();
    // A key that exists only to be satisfied by a `requires` entry is
    // referenced by that entry, not by the compose tree.
    const referencedContent = new Set<string>((pattern.requires ?? []).map((r) => r.content));

    const assertJsxSafeText = (value: string, what: string) => {
      const bad = JSX_UNSAFE_TEXT.exec(value);
      if (bad) {
        throw new Error(
          `${prefix}${what} contains "${bad[0]}" — fill text can land in a JSX text child, where "<" and "{" break the emitted preset; use bracketed prose like "[verb the object]"`,
        );
      }
    };

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
      if (parseBinding(value)) {
        throw new Error(`${prefix}binding "${value}" used outside a prop position — bindings bind prop values (D143)`);
      }
      const paramMatch = PARAM_RE.exec(value);
      if (paramMatch) {
        throw new Error(
          `${prefix}param "${paramMatch[1]}" used outside a prop position — parameters bind prop values (D48)`,
        );
      }
      const contentMatch = CONTENT_RE.exec(value);
      if (contentMatch) {
        referencedContent.add(contentMatch[1]);
        return;
      }
      // Not a placeholder — a literal text fill, rendered into the preset
      // verbatim, so it has to be JSX-safe on its own (this also catches a
      // near-miss placeholder like `{content:Foo}`, which would otherwise be
      // emitted as literal text).
      assertJsxSafeText(value, `slot text fill "${value}"`);
    };

    const walk = (node: PatternNode, path: string) => {
      if (INTRINSIC_ELEMENTS.has(node.component)) {
        for (const [propName, propValue] of Object.entries(node.props ?? {})) {
          if (!checkBinding(propName, propValue, null, path)) trackPropPlaceholders(propValue);
        }
        if (node.content !== undefined) referencedContent.add(node.content);
        for (const [slotName, fills] of Object.entries(node.slots ?? {})) {
          if (slotName !== "body") {
            throw new Error(`${prefix}${path}: intrinsic "${node.component}" takes only a body slot, not "${slotName}"`);
          }
          for (const [i, fill] of fills.entries()) {
            if (typeof fill === "string") trackTextPlaceholder(fill);
            else walk(fill, `${path}.body[${i}]`);
          }
        }
        return;
      }
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
          if (checkBinding(propName, propValue, null, path)) continue;
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

        // D73: aria-* is valid on every component. Each spreads its rest props
        // onto a DOM element, so the manifest's silence was never a claim that
        // an aria attribute is unavailable — and enumerating them per component
        // would fix one attribute at a time forever. Unchecked by design:
        // there is no literal union to validate an accessible name against.
        if (ARIA_PROP_RE.test(propName)) {
          if (checkBinding(propName, propValue, null, path)) continue;
          trackPropPlaceholders(propValue);
          continue;
        }

        const propDef = manifestComponent.props.find((p) => p.name === propName);
        if (!propDef) {
          // D143: a pass-through attribute the component forwards to its DOM
          // element (dist/attributes.json), such as a trigger's onClick.
          if (attributes[node.component]?.includes(propName)) {
            if (!checkBinding(propName, propValue, null, path)) trackPropPlaceholders(propValue);
            continue;
          }
          throw new Error(
            `${prefix}${path}: unknown prop "${propName}" on component "${node.component}"`,
          );
        }
        if (checkBinding(propName, propValue, propDef.type, path)) continue;
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

    for (const key of stateByKey.keys()) {
      if (!usedBindingKeys.has(key)) throw new Error(`${prefix}state "${key}" declared but never referenced`);
    }
    for (const key of inputByKey.keys()) {
      if (!usedBindingKeys.has(key)) throw new Error(`${prefix}input "${key}" declared but never referenced`);
    }

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

    for (const [key, value] of Object.entries(pattern.content)) {
      if (!referencedContent.has(key)) {
        throw new Error(`${prefix}content "${key}" declared but never referenced`);
      }
      assertJsxSafeText(value, `content "${key}"`);
    }
    for (const key of referencedContent) {
      if (!(key in pattern.content)) {
        throw new Error(`${prefix}content "${key}" referenced but not declared`);
      }
    }
  }

  return {
    gaps: Object.fromEntries(
      patterns
        .map((p) => [p.id, [...p.gaps, ...(unmetRequirements.get(p.id) ?? [])]] as const)
        .filter(([, list]) => list.length > 0),
    ),
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

  // D71: a content key satisfied by an icon requirement renders as the real
  // element, not its prose placeholder. Icons are not manifest components, so
  // they cannot appear in the compose tree — this is the only place a pattern
  // can emit one, and emitting `[icon]` was the defect the 2026-08-07 eval hit.
  const iconForContent = new Map(
    (pattern.requires ?? []).filter((r) => r.kind === "icon").map((r) => [r.content, r.name]),
  );

  // Resolves a text position (slot string fill, or a prop's raw string):
  // {content:key} -> content value; anything else is literal text.
  const resolveText = (raw: string): string => {
    const contentMatch = CONTENT_RE.exec(raw);
    return contentMatch ? content[contentMatch[1]] : raw;
  };

  /** Text children for a `node.content` key — the icon element when one
   * satisfies it, the content string otherwise. Prop positions never call
   * this: an element cannot sit in a double-quoted attribute. */
  const resolveChildText = (key: string): string => iconForContent.get(key) ? `<${iconForContent.get(key)} />` : content[key];

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
    const binding = parseBinding(raw);
    if (binding) return `{${bindingExpr(binding)}}`;
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
      childText = resolveChildText(node.content);
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

  const element = renderNode(pattern.compose, 0);
  const state = pattern.state ?? [];
  const inputs = pattern.inputs ?? [];
  if (state.length === 0 && inputs.length === 0) return `${element}\n`;

  // D143: a pattern with state or inputs renders as a component module in the
  // docs examples' style, so a pasted preset opens, closes and switches.
  const imported = new Set<string>();
  const collect = (node: PatternNode) => {
    if (!INTRINSIC_ELEMENTS.has(node.component)) imported.add(node.component);
    if (node.content !== undefined && iconForContent.has(node.content)) imported.add(iconForContent.get(node.content)!);
    for (const fills of Object.values(node.slots ?? {})) {
      for (const fill of fills) if (typeof fill !== "string") collect(fill);
    }
  };
  collect(pattern.compose);

  const lines: string[] = [];
  if (state.length > 0) lines.push('import { useState } from "react";');
  lines.push(`import { ${[...imported].sort().join(", ")} } from "@handamade/psi-react";`, "");
  const params =
    inputs.length > 0
      ? `{ ${inputs.map((i) => i.key).join(", ")} }: {\n${inputs.map((i) => `  ${i.key}: ${i.type};`).join("\n")}\n}`
      : "";
  lines.push(`export function ${pascalCase(pattern.id)}(${params}) {`);
  for (const s of state) lines.push(`  const [${s.key}, ${setterName(s.key)}] = useState(${JSON.stringify(s.initial)});`);
  lines.push("  return (", element.split("\n").map((l) => `    ${l}`).join("\n"), "  );", "}");
  return `${lines.join("\n")}\n`;
}

/**
 * Renders a fully-bound pattern (D77) to a real, mountable React element
 * tree — the same compose-tree walk and {param:}/{content:} resolution
 * `renderPreset` uses to emit JSX text, but calling `createElement` against
 * `registry` instead of pushing text. Returns null under the same two
 * conditions `renderPreset` does: unresolved gaps, or a parameter with no
 * default (not renderable as a static preset).
 *
 * No JSX-string formatting concerns apply here (block mode, indentation) —
 * those exist only for the human-readable copy-paste output. `registry` is
 * a flat name -> component map; the real barrel export names already match
 * `compose.component` strings exactly (`"Toolbar"` -> `export { Toolbar }`),
 * and the same barrel re-exports icons, so one `import * as Psi from
 * "@handamade/psi-react"` covers both `PatternNode.component` and D71 icon
 * requirements.
 *
 * `components` is unread by this function's body — kept for interface
 * symmetry with `renderPreset`/`validatePatterns` (both also take a
 * `components` parameter), even though this rendering only needs the
 * compose tree, parameters, and content.
 */
/** One stateful component per pattern object, so a re-render keeps its state
 * (D143). Storybook passes the same pattern object every render. */
const statefulPresets = new WeakMap<Pattern, ComponentType>();

export function renderPresetElement(
  pattern: Pattern,
  components: ManifestComponent[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- component prop shapes are determined by runtime pattern data, not statically knowable — this is the dynamic-dispatch boundary the function exists to cross.
  registry: Record<string, ComponentType<any>>,
): ReactElement | null {
  if (pattern.gaps.length > 0) return null;
  if (pattern.parameters.some((p) => p.default === undefined)) return null;

  const paramDefaults = new Map(pattern.parameters.map((p) => [p.key, p.default as string | number]));
  const content = pattern.content;

  const iconForContent = new Map(
    (pattern.requires ?? []).filter((r) => r.kind === "icon").map((r) => [r.content, r.name]),
  );

  const resolveText = (raw: string): string => {
    const m = CONTENT_RE.exec(raw);
    return m ? content[m[1]] : raw;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- component prop shapes are determined by runtime pattern data, not statically knowable — this is the dynamic-dispatch boundary the function exists to cross.
  const componentFor = (name: string): ComponentType<any> | string => {
    if (INTRINSIC_ELEMENTS.has(name)) return name;
    const Component = registry[name];
    if (!Component) throw new Error(`renderPresetElement: no component registered for "${name}"`);
    return Component;
  };

  /** Content children for a node with no `body` slot fills: the real icon
   * element when a D71 icon requirement satisfies the key, the content
   * string otherwise. */
  const resolveChildContent = (key: string): ReactNode => {
    const iconName = iconForContent.get(key);
    return iconName ? createElement(componentFor(iconName)) : content[key];
  };

  const resolvePropValue = (raw: unknown, scope: BindingScope): unknown => {
    const binding = parseBinding(raw);
    if (binding) return bindingValue(binding, scope);
    if (typeof raw === "string") {
      const paramMatch = PARAM_RE.exec(raw);
      if (paramMatch) return paramDefaults.get(paramMatch[1]);
      return resolveText(raw);
    }
    return raw; // number | boolean literal
  };

  let key = 0;
  const renderNode = (node: PatternNode, scope: BindingScope): ReactElement => {
    const Component = componentFor(node.component);
    const props: Record<string, unknown> = { key: key++ };

    for (const [name, raw] of Object.entries(node.props ?? {})) {
      props[name] = resolvePropValue(raw, scope);
    }

    for (const [slotName, fills] of Object.entries(node.slots ?? {})) {
      if (slotName === "body") continue;
      props[slotName] =
        fills.length === 1
          ? (typeof fills[0] === "string" ? resolveText(fills[0]) : renderNode(fills[0], scope))
          : fills.map((fill) => (typeof fill === "string" ? resolveText(fill) : renderNode(fill, scope)));
    }

    const body = node.slots?.body;
    let children: ReactNode = null;
    if (body && body.length > 0) {
      children = body.map((fill) => (typeof fill === "string" ? resolveText(fill) : renderNode(fill, scope)));
    } else if (node.content !== undefined) {
      children = resolveChildContent(node.content);
    }

    return createElement(Component, props, children);
  };

  const state = pattern.state ?? [];
  const inputs = pattern.inputs ?? [];
  if (state.length === 0 && inputs.length === 0) return renderNode(pattern.compose, { values: {}, setters: {} });

  let Preset = statefulPresets.get(pattern);
  if (!Preset) {
    Preset = function StatefulPreset() {
      const scope: BindingScope = { values: {}, setters: {} };
      // A pattern's state list is fixed for the component's lifetime, so the
      // hook order is stable across renders.
      for (const s of state) {
        const [value, setValue] = useState<unknown>(s.initial);
        scope.values[s.key] = value;
        scope.setters[s.key] = setValue;
      }
      for (const input of inputs) scope.values[input.key] = isFunctionType(input.type) ? () => {} : input.story;
      key = 0;
      return renderNode(pattern.compose, scope);
    };
    statefulPresets.set(pattern, Preset);
  }
  return createElement(Preset);
}
