/** D143: the five placeholders that bind a compose-tree prop to a pattern's
 * own state or to an input its caller supplies. Pure; shared by
 * `validatePatterns`, `renderPreset` (text) and `renderPresetElement`
 * (runtime values). */

export type Binding =
  | { kind: "state" | "toggle" | "setter" | "input"; key: string }
  | { kind: "set"; key: string; value: string | number | boolean };

const KEY = "[a-z][A-Za-z0-9]*";
export const KEY_RE = new RegExp(`^${KEY}$`);
const FORMS: Array<[Binding["kind"], RegExp]> = [
  ["state", new RegExp(`^\\{state:(${KEY})\\}$`)],
  ["set", new RegExp(`^\\{set:(${KEY}):(.+)\\}$`)],
  ["toggle", new RegExp(`^\\{toggle:(${KEY})\\}$`)],
  ["setter", new RegExp(`^\\{setter:(${KEY})\\}$`)],
  ["input", new RegExp(`^\\{input:(${KEY})\\}$`)],
];
const NEAR_MISS = /^\{(state|set|toggle|setter|input):/;

const parseSetValue = (raw: string): string | number | boolean => {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
};

/** A binding, or null when `raw` is not one. A string that starts like a
 * binding but does not parse is an authoring mistake: it throws rather than
 * render as literal text. */
export function parseBinding(raw: unknown): Binding | null {
  if (typeof raw !== "string") return null;
  for (const [kind, re] of FORMS) {
    const m = re.exec(raw);
    if (!m) continue;
    return kind === "set" ? { kind, key: m[1], value: parseSetValue(m[2]) } : { kind, key: m[1] };
  }
  if (NEAR_MISS.test(raw)) throw new Error(`malformed binding "${raw}"`);
  return null;
}

export const setterName = (key: string): string => `set${key[0].toUpperCase()}${key.slice(1)}`;

export const pascalCase = (id: string): string =>
  id.split("-").map((w) => `${w[0].toUpperCase()}${w.slice(1)}`).join("");

/** An input's declared TypeScript type is a function type when it starts
 * with `(`, as in `() => void`. */
export const isFunctionType = (type: string): boolean => type.trimStart().startsWith("(");

/** The JSX expression a binding emits in a preset. */
export function bindingExpr(b: Binding): string {
  switch (b.kind) {
    case "state":
    case "input":
      return b.key;
    case "setter":
      return setterName(b.key);
    case "toggle":
      return `() => ${setterName(b.key)}(!${b.key})`;
    case "set":
      return `() => ${setterName(b.key)}(${JSON.stringify(b.value)})`;
  }
}

export interface BindingScope {
  values: Record<string, unknown>;
  setters: Record<string, (value: unknown) => void>;
}

/** The runtime value a binding resolves to inside a mounted preset. */
export function bindingValue(b: Binding, scope: BindingScope): unknown {
  switch (b.kind) {
    case "state":
    case "input":
      return scope.values[b.key];
    case "setter":
      return scope.setters[b.key];
    case "toggle":
      return () => scope.setters[b.key](!scope.values[b.key]);
    case "set":
      return () => scope.setters[b.key](b.value);
  }
}

/** `dist/attributes.json` (D129) as component name → the attribute names it
 * passes through to its DOM element. */
export function attributesByComponent(json: { sets: string[][]; components: Record<string, number> }): Record<string, string[]> {
  return Object.fromEntries(Object.entries(json.components).map(([name, i]) => [name, json.sets[i]]));
}
