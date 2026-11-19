import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = dirname(__dirname);
const manifest = JSON.parse(
  readFileSync(join(root, "dist", "manifest.json"), "utf8"),
) as { components: unknown[]; icons: string[] };

describe("manifest icon roster", () => {
  it("lists every Icon*.tsx in src/icons", () => {
    const onDisk = readdirSync(join(root, "src", "icons"))
      .filter((f) => f.startsWith("Icon") && f.endsWith(".tsx"))
      .map((f) => f.replace(/\.tsx$/, ""))
      .sort();
    expect(manifest.icons).toEqual(onDisk);
  });

  it("is sorted and non-empty", () => {
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.icons).toEqual([...manifest.icons].sort());
  });
});

describe("manifest: attributes, accessible names and contracts (D129)", () => {
  type Entry = { name: string; attributes: string | null; accessibleName: { oneOf: string[] } | null };
  const manifestD129 = JSON.parse(readFileSync(join(root, "dist", "manifest.json"), "utf8")) as {
    components: Entry[];
    contracts: Record<string, string[]>;
  };
  const attrs = JSON.parse(readFileSync(join(root, "dist", "attributes.json"), "utf8")) as {
    sets: string[][];
    components: Record<string, number>;
  };
  const by = (n: string) => manifestD129.components.find((c) => c.name === n)!;
  const attributeNames = (n: string) => new Set(attrs.sets[attrs.components[n]] ?? []);

  it("names the attribute interface each component extends", () => {
    expect(by("Button").attributes).toBe("ButtonHTMLAttributes");
    expect(by("Input").attributes).toBe("InputHTMLAttributes");
    expect(by("TableCell").attributes).toBe("TdHTMLAttributes");
    expect(by("MenuItem").attributes).toBeNull();
  });

  it("lists the attribute names that pass through, and leaves out declared props", () => {
    const button = attributeNames("Button");
    for (const a of ["onClick", "disabled", "id", "aria-describedby", "style"]) expect(button.has(a), a).toBe(true);
    expect(button.has("variant")).toBe(false);
    expect(attrs.components.MenuItem).toBeUndefined();
  });

  it("states which components need an accessible name", () => {
    expect(by("IconButton").accessibleName).toEqual({ oneOf: ["aria-label"] });
    expect(by("TabList").accessibleName).toEqual({ oneOf: ["aria-label"] });
    expect(by("Button").accessibleName).toBeNull();
  });

  it("carries the slot contracts", () => {
    expect(manifestD129.contracts.interactive).toContain("Button");
  });
});

describe("manifest: icon details and hooks (D145)", () => {
  const m = JSON.parse(readFileSync(join(root, "dist", "manifest.json"), "utf8")) as {
    icons: string[];
    iconDetails: {
      props: Array<{ name: string; type: string; default: unknown }>;
      attributes: string;
      keywords: Record<string, string[]>;
    };
    hooks: Array<{
      name: string;
      returns: string;
      members: Array<{ name: string; type: string; description: string }>;
      types: Array<{ name: string; fields: Array<{ name: string; required: boolean; default: string | null }> }>;
    }>;
  };
  const attrs = JSON.parse(readFileSync(join(root, "dist", "attributes.json"), "utf8")) as {
    sets: string[][];
    icons: number;
  };

  it("states one prop table for every icon: size, plus className", () => {
    expect(m.iconDetails.props.map((p) => p.name)).toEqual(["size", "className"]);
    const size = m.iconDetails.props[0];
    expect(size.type).toBe("number");
    expect(String(size.default)).toBe("20");
    expect(m.iconDetails.attributes).toBe("SVGAttributes");
  });

  it("has keywords for exactly the roster, none empty", () => {
    expect(Object.keys(m.iconDetails.keywords).sort()).toEqual(m.icons);
    for (const [name, words] of Object.entries(m.iconDetails.keywords)) expect(words.length, name).toBeGreaterThan(0);
    expect(m.iconDetails.keywords.IconMoreHorizontal).toContain("ellipsis");
  });

  it("lists the SVG attributes an icon passes through", () => {
    const set = new Set(attrs.sets[attrs.icons]);
    for (const a of ["strokeWidth", "style", "onClick", "role", "aria-label", "fill"]) expect(set.has(a), a).toBe(true);
    expect(set.has("size")).toBe(false);
  });

  it("reads useToast's handle and options from the source", () => {
    const hook = m.hooks.find((h) => h.name === "useToast")!;
    expect(hook.returns).toBe("ToastHandle");
    expect(hook.members.map((x) => x.name)).toEqual(["show", "announce", "dismiss", "clear"]);
    expect(hook.members[0].type).toBe("(toast: ToastOptions) => string");
    expect(hook.members.every((x) => x.description.length > 0)).toBe(true);
    expect(hook.types.map((t) => t.name)).toEqual(["ToastOptions", "AnnounceOptions"]);
    const options = hook.types[0].fields;
    expect(options.find((f) => f.name === "message")!.required).toBe(true);
    expect(options.find((f) => f.name === "variant")!.default).toBe('"neutral"');
  });
});
