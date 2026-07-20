import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPatterns, parseLiteralUnion, validatePatterns } from "./patterns.js";
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
  id: "p", intent: "i", match: ["m"], parameters: [], content: {}, gaps: [],
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
});
