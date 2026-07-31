import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// Import node's URL under its own name: the package's jsdom test
// environment makes a bare `new URL(...)` resolve against a fake browser
// location instead of `import.meta.url`'s file: base — use the real node
// implementation explicitly for this build-script test.
import { fileURLToPath, URL as NodeURL } from "node:url";
import { loadSlotContracts } from "./slots.js";

function fixture(files: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), "psi-slots-"));
  for (const [rel, content] of Object.entries(files)) {
    const path = join(dir, rel);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, JSON.stringify(content));
  }
  return dir;
}

describe("loadSlotContracts", () => {
  it("returns authored slots for components that declare them, [] for the rest", () => {
    const dir = fixture({
      "contracts.json": { chip: ["B"] },
      "A/slots.json": { slots: [{ name: "footer", accepts: { components: ["B"], contracts: ["chip"] }, cardinality: "0..*" }] },
    });
    const out = loadSlotContracts(dir, ["A", "B"]);
    expect(out.A).toHaveLength(1);
    expect(out.A[0].name).toBe("footer");
    expect(out.B).toEqual([]);
  });

  it("throws on a slot accepting an unknown component", () => {
    const dir = fixture({
      "A/slots.json": { slots: [{ name: "x", accepts: { components: ["Ghost"] }, cardinality: "0..1" }] },
    });
    expect(() => loadSlotContracts(dir, ["A"])).toThrow(/unknown component "Ghost"/);
  });

  it("throws on a slot accepting an undeclared contract", () => {
    const dir = fixture({
      "A/slots.json": { slots: [{ name: "x", accepts: { contracts: ["ghost-set"] }, cardinality: "0..1" }] },
    });
    expect(() => loadSlotContracts(dir, ["A"])).toThrow(/unknown contract "ghost-set"/);
  });

  it("throws when contracts.json names an unknown component", () => {
    const dir = fixture({ "contracts.json": { chip: ["Ghost"] } });
    expect(() => loadSlotContracts(dir, ["A"])).toThrow(/unknown component "Ghost"/);
  });

  it("real src: Dialog carries its three authored slots, leaves get []", () => {
    const src = join(fileURLToPath(new NodeURL("..", import.meta.url)), "src");
    const names = ["Button", "IconButton", "Card", "Input", "Select", "Field", "Dialog", "Checkbox", "Switch", "Tag", "Tooltip", "NavBar", "AspectRatio", "Menu", "MenuItem", "MenuSeparator"];
    const out = loadSlotContracts(src, names);
    expect(out.Dialog.map((s) => s.name)).toEqual(["title", "body", "footer"]);
    expect(out.Button).toEqual([]);
    expect(out.Menu.map((s) => s.name)).toEqual(["items"]);
    expect(out.MenuItem).toEqual([]);
    expect(out.MenuSeparator).toEqual([]);
  });
});
