import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPatterns, parseLiteralUnion, renderPreset, validatePatterns } from "./patterns.js";
import type { ManifestComponent, Pattern } from "./patterns.js";

const button: ManifestComponent = {
  name: "Button",
  slots: [],
  props: [
    { name: "variant", type: '"accent" | "ghost" | "danger"', required: false, default: "neutral" },
    { name: "size", type: "24 | 32 | 40 | 48", required: false, default: 32 },
    { name: "disabled", type: "boolean", required: false, default: false },
  ],
};
const dialog: ManifestComponent = {
  name: "Dialog",
  slots: [
    { name: "title", accepts: { contracts: ["inline-content"] }, cardinality: "0..1", order: 1 },
    { name: "body", accepts: {}, cardinality: "0..*", order: 2 },
    { name: "footer", accepts: { components: ["Button"] }, cardinality: "1..*", order: 3 },
  ],
  props: [],
};
const tag: ManifestComponent = { name: "Tag", slots: [], props: [] };
const components = [button, dialog, tag];
const contracts = { "inline-content": ["Tag"] };

const base = (over: Partial<Pattern>): Pattern => ({
  id: "p", intent: "i", match: ["m"], parameters: [], content: {}, gaps: [], requires: [],
  compose: { component: "Button" }, ...over,
});

describe("parseLiteralUnion", () => {
  it("parses string and number unions, rejects non-literals", () => {
    expect(parseLiteralUnion('"a" | "b-c"')).toEqual(["a", "b-c"]);
    expect(parseLiteralUnion("24 | 32")).toEqual([24, 32]);
    expect(parseLiteralUnion("string")).toBeNull();
    expect(parseLiteralUnion('"a" | string')).toBeNull();
    expect(parseLiteralUnion("boolean")).toBeNull();
  });
});

describe("loadPatterns", () => {
  it("loads *.json sorted by filename and applies defaults", () => {
    const dir = mkdtempSync(join(tmpdir(), "patterns-"));
    writeFileSync(join(dir, "b.json"), JSON.stringify(base({ id: "b" })));
    writeFileSync(join(dir, "a.json"), JSON.stringify({ id: "a", intent: "i", match: ["m"], compose: { component: "X" } }));
    const ps = loadPatterns(dir);
    expect(ps.map((p) => p.id)).toEqual(["a", "b"]);
    expect(ps[0].parameters).toEqual([]);
    expect(ps[0].content).toEqual({});
    expect(ps[0].gaps).toEqual([]);
  });
  it("throws on a missing required field", () => {
    const dir = mkdtempSync(join(tmpdir(), "patterns-"));
    writeFileSync(join(dir, "x.json"), JSON.stringify({ id: "x", match: [], compose: { component: "B" } }));
    expect(() => loadPatterns(dir)).toThrow(/x\.json.*intent/);
  });
  it("ignores pattern.schema.json", () => {
    const dir = mkdtempSync(join(tmpdir(), "patterns-"));
    writeFileSync(join(dir, "pattern.schema.json"), "{}");
    writeFileSync(join(dir, "a.json"), JSON.stringify(base({ id: "a" })));
    expect(loadPatterns(dir)).toHaveLength(1);
  });
});

describe("validatePatterns (one case per D48 error class)", () => {
  const ok = (p: Pattern) => validatePatterns([p], components, contracts);

  it("passes a clean pattern and reports gaps without throwing", () => {
    const blocked = base({ id: "blk", gaps: ["Toolbar"], compose: { component: "Toolbar" } });
    expect(ok(blocked).gaps).toEqual({ blk: ["Toolbar"] });
  });
  it("1: unknown component (not in manifest, not in gaps)", () => {
    expect(() => ok(base({ compose: { component: "Ghost" } }))).toThrow(/pattern "p".*unknown component "Ghost"/);
  });
  it("2: undeclared slot", () => {
    expect(() => ok(base({ compose: { component: "Dialog", slots: { header: [] } } }))).toThrow(/slot "header"/);
    expect(() => ok(base({ compose: { component: "Button", slots: { body: ["{content:t}"] }, }, content: { t: "x" } }))).not.toThrow(); // body always legal
  });
  it("3: prop outside literal union; booleans type-checked; non-union strings pass", () => {
    expect(() => ok(base({ compose: { component: "Button", props: { variant: "primary" } } }))).toThrow(/"primary".*variant/);
    expect(() => ok(base({ compose: { component: "Button", props: { size: 28 } } }))).toThrow(/28/);
    expect(() => ok(base({ compose: { component: "Button", props: { disabled: "yes" } } }))).toThrow(/disabled/);
    expect(() => ok(base({ compose: { component: "Button", props: { disabled: true, variant: "ghost" } } }))).not.toThrow();
  });
  it("4: slot fill violating the D45 contract (contract members allowed, others not)", () => {
    const fill = (c: string) => base({ compose: { component: "Dialog", slots: { title: [{ component: c }], footer: [{ component: "Button" }] } } });
    expect(() => ok(fill("Tag"))).not.toThrow();      // via inline-content contract
    expect(() => ok(fill("Button"))).toThrow(/title.*Button/); // Button not in title's accepts
  });
  it("5: cardinality", () => {
    expect(() => ok(base({ compose: { component: "Dialog" } }))).toThrow(/footer.*1\.\.\*/); // required slot empty
    const two = base({ compose: { component: "Dialog", slots: { title: ["{content:a}", "{content:b}"], footer: [{ component: "Button" }] }, content: { a: "x", b: "y" } } });
    expect(() => ok(two)).toThrow(/title.*0\.\.1/);
  });
  it("5b: unrecognized cardinality is a defensive throw, not silently accepted", () => {
    const weird: ManifestComponent = {
      name: "Weird",
      slots: [{ name: "body", accepts: {}, cardinality: "2..3", order: 1 }],
      props: [],
    };
    expect(() =>
      validatePatterns([base({ compose: { component: "Weird" } })], [...components, weird], contracts),
    ).toThrow(/slot "body".*unrecognized cardinality "2\.\.3"/);
  });
  it("6: param referenced but undeclared, and declared but unreferenced", () => {
    expect(() => ok(base({ compose: { component: "Button", props: { size: "{param:size}" } } }))).toThrow(/param "size".*not declared/);
    expect(() => ok(base({ parameters: [{ key: "size", ask: "?", options: [32], default: 32 }] }))).toThrow(/param "size".*never referenced/);
  });
  it("7: options must be ⊆ the union of every fill site", () => {
    const p = (options: Array<string | number>) => base({
      compose: { component: "Button", props: { size: "{param:size}" } },
      parameters: [{ key: "size", ask: "?", options, default: options[0] }],
    });
    expect(() => ok(p([32, 40]))).not.toThrow();
    expect(() => ok(p([32, 28]))).toThrow(/28.*size/);
    const nonUnion = base({
      compose: { component: "Button", props: { disabled: "{param:d}" } },
      parameters: [{ key: "d", ask: "?", options: [1], default: 1 }],
    });
    expect(() => ok(nonUnion)).toThrow(/param "d".*not a literal-union prop/);
  });
  it("7b: {param:} is legal only in prop positions — throws in a slot text fill", () => {
    const inSlot = base({
      compose: { component: "Dialog", slots: { title: ["{param:x}"], footer: [{ component: "Button" }] } },
    });
    expect(() => ok(inSlot)).toThrow(/param "x" used outside a prop position/);
  });
  it("7c: {param:} is legal only in prop positions — throws in node content", () => {
    const inContent = base({ compose: { component: "Button", content: "{param:x}" } });
    expect(() => ok(inContent)).toThrow(/param "x" used outside a prop position/);
  });
  it("8: content key referenced but undeclared, and declared but unreferenced", () => {
    expect(() => ok(base({ compose: { component: "Button", content: "label" } }))).toThrow(/content "label".*not declared/);
    expect(() => ok(base({ content: { orphan: "x" } }))).toThrow(/content "orphan".*never referenced/);
  });

  it("9: fill text must be JSX-safe — the preset renders it into a text child", () => {
    const content = (v: string) => base({ compose: { component: "Button", content: "label" }, content: { label: v } });
    expect(() => ok(content("<verb the object>"))).toThrow(/content "label" contains "<"/);
    expect(() => ok(content("{{verb the object}}"))).toThrow(/content "label" contains "\{"/);
    expect(() => ok(content("[verb the object]"))).not.toThrow();
    // Literal (non-placeholder) slot fills are rendered verbatim too — including
    // a near-miss placeholder, which would otherwise reach the preset as text.
    const fill = (v: string) => base({ compose: { component: "Button", slots: { body: [v] } } });
    expect(() => ok(fill("<what is permanently lost>"))).toThrow(/slot text fill.*contains "<"/);
    expect(() => ok(fill("{content:Nope}"))).toThrow(/slot text fill.*contains "\{"/);
  });

  it("gap-node props still track {content:} placeholders (review fix: gap props were skipped entirely)", () => {
    const p = base({
      gaps: ["Toolbar"],
      compose: { component: "Toolbar", props: { x: "{content:ph}" } },
      content: { ph: "x" },
    });
    expect(() => ok(p)).not.toThrow();
  });

  it("gap-node {param:} prop sites are unconstrained — no union to check against", () => {
    const p = base({
      gaps: ["Toolbar"],
      compose: { component: "Toolbar", props: { size: "{param:s}" } },
      parameters: [{ key: "s", ask: "?", options: ["any", "options", "at all"], default: "any" }],
    });
    expect(() => ok(p)).not.toThrow();
  });

  it("10: a declared gap that now resolves in the manifest throws — the ledger must self-clear", () => {
    const p = base({ gaps: ["Tag"], compose: { component: "Button" } });
    expect(() => ok(p)).toThrow(/pattern "p".*gap "Tag" is no longer missing — remove it from gaps/);
  });
});

describe("real patterns/ + real dist/manifest.json (D62-D63)", () => {
  it("data-table and table-pagination are unblocked once Table and Pagination ship", () => {
    const root = join(import.meta.dirname, "..");
    const manifest = JSON.parse(readFileSync(join(root, "dist", "manifest.json"), "utf8")) as {
      components: ManifestComponent[];
    };
    const contracts = JSON.parse(readFileSync(join(root, "src", "contracts.json"), "utf8")) as Record<
      string,
      string[]
    >;
    const patterns = loadPatterns(join(root, "patterns"));
    validatePatterns(patterns, manifest.components, contracts);
    const builtPatterns = patterns.map((p) => ({
      id: p.id,
      gaps: p.gaps,
      blocked: p.gaps.length > 0,
      preset: p.gaps.length > 0 ? null : renderPreset(p, manifest.components),
    }));
    const byId = Object.fromEntries(builtPatterns.map((p) => [p.id, p]));
    expect(byId["data-table"].gaps).toEqual([]);
    expect(byId["data-table"].blocked).toBe(false);
    expect(byId["data-table"].preset).toContain("<Table");
    expect(byId["data-table"].preset).toContain("<TableHeaderCell");
    expect(byId["table-pagination"].gaps).toEqual([]);
    expect(byId["table-pagination"].blocked).toBe(false);
    expect(byId["table-pagination"].preset).toContain("<Pagination");
  });
});

describe("requires — declared affordances (D71)", () => {
  const icons = ["IconMoreHorizontal", "IconSearch"];

  it("defaults to an empty list when a pattern declares none", () => {
    const dir = mkdtempSync(join(tmpdir(), "patterns-"));
    writeFileSync(join(dir, "a.json"), JSON.stringify(base({ id: "a" })));
    expect(loadPatterns(dir)[0].requires).toEqual([]);
  });

  it("rejects a malformed entry at load time", () => {
    const dir = mkdtempSync(join(tmpdir(), "patterns-"));
    writeFileSync(
      join(dir, "a.json"),
      JSON.stringify({ ...base({ id: "a" }), requires: [{ content: "x", kind: "sparkle", name: "Y" }] }),
    );
    expect(() => loadPatterns(dir)).toThrow(/kind/);
  });

  it("rejects a requires entry naming a content key the pattern does not have", () => {
    const p = base({
      content: {},
      requires: [{ content: "trigger-icon", kind: "icon", name: "IconMoreHorizontal" }],
    });
    expect(() => validatePatterns([p], components, contracts, icons)).toThrow(/trigger-icon/);
  });

  // The whole point of D71: this is the shape that used to pass silently.
  it("reports an unresolved icon as a gap, which blocks the pattern", () => {
    const p = base({
      id: "row-actions",
      content: { "trigger-icon": "[icon]" },
      requires: [{ content: "trigger-icon", kind: "icon", name: "IconEllipsis" }],
    });
    const { gaps } = validatePatterns([p], components, contracts, icons);
    expect(gaps["row-actions"]).toEqual(["IconEllipsis"]);
  });

  it("reports an unresolved component as a gap", () => {
    const p = base({
      id: "detail-drawer",
      content: { body: "[key-value summary]" },
      requires: [{ content: "body", kind: "component", name: "DescriptionList" }],
    });
    const { gaps } = validatePatterns([p], components, contracts, icons);
    expect(gaps["detail-drawer"]).toEqual(["DescriptionList"]);
  });

  it("adds no gap once the affordance resolves", () => {
    const p = base({
      id: "row-actions",
      content: { "trigger-icon": "[icon]" },
      requires: [{ content: "trigger-icon", kind: "icon", name: "IconMoreHorizontal" }],
    });
    const { gaps } = validatePatterns([p], components, contracts, icons);
    expect(gaps["row-actions"]).toBeUndefined();
  });

  it("does not force removal when it resolves, unlike an authored gap", () => {
    // `gaps` throws once its entry appears in the manifest, so the backlog
    // self-clears. `requires` is the opposite: a resolved requirement is the
    // steady state and must stay declared, or the check stops guarding it.
    const p = base({
      requires: [{ content: "c", kind: "component", name: "Button" }],
      content: { c: "[something]" },
    });
    expect(() => validatePatterns([p], components, contracts, icons)).not.toThrow();
  });
});

describe("aria-* props (D73)", () => {
  it("accepts an aria attribute the manifest does not list", () => {
    // Every component spreads rest props onto a DOM element, so aria-* is
    // always valid; the manifest's silence was never a claim otherwise. Before
    // D73 this threw, which is why filter-toolbar shipped an unnamed Select.
    const p = base({ compose: { component: "Button", props: { "aria-label": "Close" } } });
    expect(() => validatePatterns([p], components, contracts)).not.toThrow();
  });

  it("resolves a content placeholder inside an aria attribute", () => {
    const p = base({
      compose: { component: "Button", props: { "aria-label": "{content:label}" } },
      content: { label: "Search transactions" },
    });
    expect(() => validatePatterns([p], components, contracts)).not.toThrow();
    expect(renderPreset(p, components)).toContain('aria-label="Search transactions"');
  });

  it("still rejects a genuinely unknown prop", () => {
    // The escape hatch is aria-* only — it must not become a hole through
    // which any invented prop passes.
    const p = base({ compose: { component: "Button", props: { ariaLabel: "Close" } } });
    expect(() => validatePatterns([p], components, contracts)).toThrow(/unknown prop/);
  });
});
