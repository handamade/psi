import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { withCustomConfig } from "react-docgen-typescript";
import { loadSlotContracts } from "./slots.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const COMPONENTS = [
  "Button",
  "IconButton",
  "Card",
  "Panel",
  "Input",
  "Select",
  "Field",
  "Dialog",
  "Checkbox",
  "Switch",
  "Tag",
  "Toolbar",
  "Tooltip",
  "NavBar",
  "AspectRatio",
  "Menu",
  "MenuItem",
  "MenuSeparator",
  "Table",
  "TableHead",
  "TableBody",
  "TableRow",
  "TableHeaderCell",
  "TableCell",
  "Pagination",
];

// Keep a prop when it is declared on the component's own props interface
// (parent file is not inside node_modules), or when it is one of the small
// set of well-known DOM passthroughs every component re-exposes (ref,
// className). Everything else inherited from *HTMLAttributes<...> (onClick,
// disabled, id, style, aria-*, ...) is dropped so the manifest reflects each
// component's actual API surface instead of hundreds of native attributes.
const WELL_KNOWN_PASSTHROUGHS = ["ref", "className", "placeholder"];

const parser = withCustomConfig(join(root, "tsconfig.json"), {
  propFilter: (prop) =>
    !prop.parent?.fileName.includes("node_modules") ||
    WELL_KNOWN_PASSTHROUGHS.includes(prop.name),
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
// (Menu's item and separator live in Menu/, not MenuItem/ or MenuSeparator/).
const COMPONENT_DIR: Record<string, string> = {
  MenuItem: "Menu",
  MenuSeparator: "Menu",
  TableHead: "Table",
  TableBody: "Table",
  TableRow: "Table",
  TableHeaderCell: "Table",
  TableCell: "Table",
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

const slotsByComponent = loadSlotContracts(join(root, "src"), COMPONENTS);

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
    props: Object.values(doc.props ?? {}).map((p) => ({
      name: p.name,
      type: typeToString(p),
      required: p.required,
      default: p.defaultValue?.value ?? null,
      description: p.description || PASSTHROUGH_DESCRIPTIONS[p.name] || "",
    })),
  };
});

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(
  join(root, "dist", "manifest.json"),
  JSON.stringify({ components: manifest }, null, 2) + "\n",
);
console.log(`[react] wrote dist/manifest.json (${manifest.length} components)`);
