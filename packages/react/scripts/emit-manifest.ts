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
  "Input",
  "Select",
  "Field",
  "Dialog",
  "Checkbox",
  "Switch",
  "Tag",
  "Tooltip",
  "NavBar",
  "AspectRatio",
];

// Keep a prop when it is declared on the component's own props interface
// (parent file is not inside node_modules), or when it is one of the small
// set of well-known DOM passthroughs every component re-exposes (ref,
// className). Everything else inherited from *HTMLAttributes<...> (onClick,
// disabled, id, style, aria-*, ...) is dropped so the manifest reflects each
// component's actual API surface instead of hundreds of native attributes.
const WELL_KNOWN_PASSTHROUGHS = ["ref", "className"];

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
};

/** Renders a prop's type as a single string, expanding literal unions. */
function typeToString(p: { type: { name: string; value?: { value: string }[] } }): string {
  if (p.type.name === "enum" && Array.isArray(p.type.value)) {
    return p.type.value.map((v) => v.value).join(" | ");
  }
  return p.type.name;
}

const slotsByComponent = loadSlotContracts(join(root, "src"), COMPONENTS);

const manifest = COMPONENTS.map((name) => {
  const [doc] = parser.parse(join(root, "src", name, `${name}.tsx`));
  if (!doc || Object.keys(doc.props ?? {}).length === 0) {
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
