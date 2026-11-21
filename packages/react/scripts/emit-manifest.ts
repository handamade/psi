import { writeFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { withCustomConfig } from "react-docgen-typescript";
import { a11yMeta } from "../src/a11y-meta.js";
import { loadSlotContracts } from "./slots.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const COMPONENTS = [
  "Button",
  "IconButton",
  "Card",
  "Panel",
  "Stack",
  "Text",
  "PageHeading",
  "DescriptionList",
  "DescriptionItem",
  "Input",
  "Select",
  "Field",
  "FieldStack",
  "Dialog",
  "Checkbox",
  "Switch",
  "Textarea",
  "RadioGroup",
  "Radio",
  "Tag",
  "Combobox",
  "Toolbar",
  "Tooltip",
  "NavBar",
  "SkipLink",
  "Link",
  "NavTree",
  "NavGroup",
  "NavItem",
  "AppShell",
  "AspectRatio",
  "Menu",
  "MenuItem",
  "MenuSeparator",
  "MenuText",
  "Table",
  "TableHead",
  "TableBody",
  "TableRow",
  "TableHeaderCell",
  "TableCell",
  "TableCaption",
  "TableContainer",
  "Pagination",
  "CursorPagination",
  "Toast",
  "ToastRegion",
  "ToastProvider",
  "Announcement",
  "Banner",
  "InlineAlert",
  "Skeleton",
  "CopyButton",
  "Count",
  "Tabs",
  "TabList",
  "Tab",
  "TabPanel",
  "SegmentedControl",
  "Segment",
];

// Keep a prop when it is declared on the component's own props interface
// (parent file is not inside node_modules), or when it is one of the small
// set of well-known DOM passthroughs every component re-exposes (ref,
// className). Everything else inherited from *HTMLAttributes<...> (onClick,
// disabled, id, style, aria-*, ...) is dropped so the manifest reflects each
// component's actual API surface instead of hundreds of native attributes.
const WELL_KNOWN_PASSTHROUGHS = ["ref", "className", "placeholder"];

/** Props a component inherits from React's DOM types, per component: the
 * names (what it passes through) and the interfaces they came from. Filled
 * as a side effect of propFilter, which sees every prop before dropping it. */
const inherited: Record<string, { names: Set<string>; parents: Set<string> }> = {};

const parser = withCustomConfig(join(root, "tsconfig.json"), {
  propFilter: (prop, component) => {
    const fromReact = prop.parent?.fileName.includes("node_modules") ?? false;
    if (!fromReact || WELL_KNOWN_PASSTHROUGHS.includes(prop.name)) return true;
    const entry = (inherited[component.name] ??= { names: new Set(), parents: new Set() });
    entry.names.add(prop.name);
    if (prop.parent?.name) entry.parents.add(prop.parent.name);
    return false;
  },
  // Expand literal-only unions (e.g. `"accent" | "accent-subtle" | ...`,
  // `24 | 32 | 40 | 48`) into their individual values instead of collapsing
  // to the type alias name ("Variant", "Size"). Consumers of the manifest
  // need the actual allowed values, not an internal alias identifier.
  shouldExtractLiteralValuesFromEnum: true,
  // Optional props otherwise report as e.g. "boolean | undefined" — the
  // `| undefined` half is redundant with `required: false` on the prop.
  shouldRemoveUndefinedFromOptional: true,
});

// A handful of DOM passthrough props (see WELL_KNOWN_PASSTHROUGHS above) are
// inherited from React's own type declarations (node_modules), so there is
// no component source file where we could attach a JSDoc comment. Give them
// a fixed, accurate description here instead of leaving the field empty.
const PASSTHROUGH_DESCRIPTIONS: Record<string, string> = {
  className: "Additional CSS class name(s) merged onto the component's root element.",
  placeholder: "Native placeholder text shown while the field is empty (only on components whose host element supports it).",
};

// Most components live at src/<Name>/<Name>.tsx. A few are child components
// that share their parent's folder instead of getting one of their own
// (Menu's item, separator and text live in Menu/, not in folders of their own).
const COMPONENT_DIR: Record<string, string> = {
  Radio: "RadioGroup",
  Segment: "SegmentedControl",
  DescriptionItem: "DescriptionList",
  MenuItem: "Menu",
  MenuSeparator: "Menu",
  MenuText: "Menu",
  TableHead: "Table",
  TableBody: "Table",
  TableRow: "Table",
  TableHeaderCell: "Table",
  TableCell: "Table",
  TableCaption: "Table",
  TableContainer: "Table",
  ToastRegion: "Toast",
  ToastProvider: "Toast",
  Announcement: "Toast",
  TabList: "Tabs",
  Tab: "Tabs",
  TabPanel: "Tabs",
  NavTree: "NavTree",
  NavGroup: "NavTree",
  NavItem: "NavTree",
};

// Components with zero props by design (documented as such in their own
// JSDoc) — an explicit opt-out from the "no props extracted" guard below, so
// that guard still catches real parse failures (a missing/renamed file, or a
// propFilter regression) for every other component.
const NO_PROPS_COMPONENTS = ["MenuSeparator"];

/** Renders a prop's type as a single string, expanding literal unions. */
function typeToString(p: { type: { name: string; value?: { value: string }[] } }): string {
  if (p.type.name === "enum" && Array.isArray(p.type.value)) {
    return p.type.value.map((v) => v.value).join(" | ");
  }
  return p.type.name;
}

/** The most specific React attribute interface a component's props extend:
 * ButtonHTMLAttributes over HTMLAttributes over AriaAttributes. */
function attributesOf(name: string): string | null {
  const parents = [...(inherited[name]?.parents ?? [])];
  if (parents.length === 0) return null;
  const specific = parents.filter((p) => /HTMLAttributes$/.test(p) && p !== "HTMLAttributes").sort();
  if (specific.length > 0) return specific[0];
  return parents.includes("HTMLAttributes") ? "HTMLAttributes" : parents.sort()[0];
}

const ICON_PROP_DESCRIPTIONS: Record<string, string> = {
  size: "Width and height of the glyph, in px.",
};

/** D145: hooks whose API the manifest states, read from their source. */
const HOOKS = [
  { name: "useToast", file: "Toast/useToast.ts" },
  { name: "useFieldControl", file: "Field/useFieldControl.ts" },
];

interface HookMember {
  name: string;
  type: string;
  required: boolean;
  default: string | null;
  description: string;
}

/** A hook's description, the interface it returns with each member's
 * signature and TSDoc, and every interface those members take, read with the
 * TypeScript checker so the docs cannot drift from the source. */
function hookDoc(name: string, file: string) {
  const program = ts.createProgram([file], { strict: true, jsx: ts.JsxEmit.ReactJSX, skipLibCheck: true });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(file);
  if (!source) throw new Error(`emit-manifest: cannot read ${file}`);
  const text = (symbol: ts.Symbol) => ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\s+/g, " ").trim();
  const defaultOf = (symbol: ts.Symbol) => {
    const tag = symbol.getJsDocTags(checker).find((t) => t.name === "default");
    return tag ? ts.displayPartsToString(tag.text).trim() : null;
  };
  const interfaces = new Map<string, ts.InterfaceDeclaration>();
  let hook: ts.FunctionDeclaration | undefined;
  source.forEachChild((n) => {
    if (ts.isInterfaceDeclaration(n)) interfaces.set(n.name.text, n);
    if (ts.isFunctionDeclaration(n) && n.name?.text === name) hook = n;
  });
  if (!hook?.name || !hook.type) throw new Error(`emit-manifest: no exported function ${name} with a return type in ${file}`);
  const returns = hook.type.getText(source);
  const membersOf = (decl: ts.InterfaceDeclaration): HookMember[] =>
    decl.members.map((m) => {
      const symbol = checker.getSymbolAtLocation(m.name!)!;
      return {
        name: symbol.name,
        type: ts.isPropertySignature(m) && m.type ? m.type.getText(source).replace(/\s+/g, " ") : checker.typeToString(checker.getTypeAtLocation(m)),
        required: !m.questionToken,
        default: defaultOf(symbol),
        description: text(symbol),
      };
    });
  const returned = interfaces.get(returns);
  if (!returned) throw new Error(`emit-manifest: ${name} returns ${returns}, which ${file} does not declare`);
  const members = membersOf(returned);
  // The interfaces the returned members mention, in order of first mention.
  const types = [...interfaces.keys()]
    .filter((k) => k !== returns && members.some((m) => new RegExp(`\\b${k}\\b`).test(m.type)))
    .sort((a, b) => members.findIndex((m) => m.type.includes(a)) - members.findIndex((m) => m.type.includes(b)))
    .map((k) => ({ name: k, fields: membersOf(interfaces.get(k)!) }));
  // The hook's own comment keeps its line breaks: it may hold an indented
  // usage example, which markdown renders as code.
  const description = ts
    .displayPartsToString(checker.getSymbolAtLocation(hook.name)!.getDocumentationComment(checker))
    .trim()
    // An indented example (TSDoc loses one space of its indent) becomes a fence.
    .replace(/(?:^ {2,}\S.*(?:\n|$))+/gm, (block) => {
      const lines = block.replace(/\n$/, "").split("\n");
      const indent = Math.min(...lines.map((l) => l.match(/^ */)![0].length));
      return "```tsx\n" + lines.map((l) => l.slice(indent)).join("\n") + "\n```\n";
    });
  return { name, description, returns, members, types };
}

const slotsByComponent = loadSlotContracts(join(root, "src"), COMPONENTS, COMPONENT_DIR);

const manifest = COMPONENTS.map((name) => {
  const dir = COMPONENT_DIR[name] ?? name;
  // A source file may export more than one thing docgen can see (e.g.
  // Pagination.tsx also exports the pure `paginationRange` helper) — docgen
  // returns one doc per export, in file order, so blindly taking the first
  // silently grabbed the wrong one once a helper preceded the component.
  // Match by displayName instead of positionally destructuring.
  const docs = parser.parse(join(root, "src", dir, `${name}.tsx`));
  const doc = docs.find((d) => d.displayName === name);
  // No positional fallback: falling back to docs[0] is what produced the bug
  // this match replaced, and it fails silently — the manifest would simply
  // describe the wrong export. The manifest is the artifact agents read, so a
  // mismatch must be loud.
  if (!doc) {
    throw new Error(
      `emit-manifest: no export named "${name}" in ${dir}/${name}.tsx — docgen saw [${docs
        .map((d) => d.displayName)
        .join(", ")}]`,
    );
  }
  const hasNoProps = Object.keys(doc.props ?? {}).length === 0;
  if (hasNoProps && !NO_PROPS_COMPONENTS.includes(name)) {
    throw new Error(
      `emit-manifest: no props extracted for ${name} — file moved/renamed or docgen parse failure`,
    );
  }
  return {
    name,
    // Collapse TSDoc line wrapping — the manifest description is a one-liner.
    description: (doc.description ?? "").replace(/\s+/g, " ").trim(),
    slots: slotsByComponent[name],
    attributes: attributesOf(name),
    accessibleName: a11yMeta[name]?.accessibleName ?? null,
    props: Object.values(doc.props ?? {}).map((p) => ({
      name: p.name,
      type: typeToString(p),
      required: p.required,
      default: p.defaultValue?.value ?? null,
      description: p.description || PASSTHROUGH_DESCRIPTIONS[p.name] || "",
    })),
  };
});

// The icon roster has no other machine-readable form: emit-patterns reads
// src/icons off disk and throws the list away, which is why "22 icons" could
// rot on the public site undetected while component counts at least had a
// source to check against (D76).
const icons = readdirSync(join(root, "src", "icons"))
  .filter((f) => f.startsWith("Icon") && f.endsWith(".tsx"))
  .map((f) => f.replace(/\.tsx$/, ""))
  .sort();

// D145: an icon's props and meaning, so the MCP can index, search and check
// icons. Every icon declares the same IconProps; parse them all in one program
// and refuse to emit one shared table if any differs.
const iconDocs = parser.parse(icons.map((name) => join(root, "src", "icons", `${name}.tsx`)));
const iconProps = icons.map((name) => {
  const doc = iconDocs.find((d) => d.displayName === name);
  if (!doc) throw new Error(`emit-manifest: no export named "${name}" in icons/${name}.tsx`);
  return Object.values(doc.props ?? {}).map((p) => ({
    name: p.name,
    type: typeToString(p),
    required: p.required,
    default: p.defaultValue?.value ?? null,
    description: p.description || "",
  }));
});
const sharedIconProps = JSON.stringify(iconProps[0]);
icons.forEach((name, i) => {
  if (JSON.stringify(iconProps[i]) !== sharedIconProps) {
    throw new Error(`emit-manifest: ${name}'s props differ from ${icons[0]}'s; the manifest states one icon prop table`);
  }
});
const keywords = JSON.parse(readFileSync(join(root, "src", "icons", "keywords.json"), "utf8")) as Record<string, string[]>;
const keywordKeys = Object.keys(keywords).sort();
if (JSON.stringify(keywordKeys) !== JSON.stringify(icons)) {
  const missing = icons.filter((n) => !keywords[n]);
  const extra = keywordKeys.filter((n) => !icons.includes(n));
  throw new Error(`emit-manifest: src/icons/keywords.json must list every icon once (missing: ${missing.join(", ") || "none"}; unknown: ${extra.join(", ") || "none"})`);
}
for (const name of icons) {
  if (keywords[name].length === 0) throw new Error(`emit-manifest: ${name} has no keywords in src/icons/keywords.json`);
}
const iconDetails = {
  props: iconProps[0].map((p) => ({
    ...p,
    description: p.description || ICON_PROP_DESCRIPTIONS[p.name] || PASSTHROUGH_DESCRIPTIONS[p.name] || "",
  })),
  attributes: inherited[icons[0]]?.parents.has("SVGAttributes") ? "SVGAttributes" : attributesOf(icons[0]),
  keywords: Object.fromEntries(icons.map((n) => [n, keywords[n]])),
};

const contracts = JSON.parse(readFileSync(join(root, "src", "contracts.json"), "utf8")) as Record<string, string[]>;

const hooks = HOOKS.map((h) => hookDoc(h.name, join(root, "src", h.file)));

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(
  join(root, "dist", "manifest.json"),
  JSON.stringify({ components: manifest, icons, iconDetails, hooks, contracts }, null, 2) + "\n",
);

// The names themselves go in a separate file: ~250 per component would
// quadruple manifest.json. Identical sets are stored once.
const sets: string[][] = [];
const setIndex = new Map<string, number>();
const attributeSetOf: Record<string, number> = {};
for (const name of COMPONENTS) {
  const names = [...(inherited[name]?.names ?? [])].sort();
  if (names.length === 0) continue;
  const key = names.join(",");
  let i = setIndex.get(key);
  if (i === undefined) {
    i = sets.length;
    sets.push(names);
    setIndex.set(key, i);
  }
  attributeSetOf[name] = i;
}
// D145: the SVG attributes every icon passes to its <svg>, one set for all.
const iconNames = [...(inherited[icons[0]]?.names ?? [])].sort();
let iconSet = setIndex.get(iconNames.join(","));
if (iconSet === undefined) {
  iconSet = sets.length;
  sets.push(iconNames);
}
writeFileSync(
  join(root, "dist", "attributes.json"),
  JSON.stringify({ sets, components: attributeSetOf, icons: iconSet }) + "\n",
);
console.log(
  `[react] wrote dist/manifest.json (${manifest.length} components, ${icons.length} icons, ${sets.length} attribute sets)`,
);
