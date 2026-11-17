import { describe, it, expect, beforeAll } from "vitest";
import { createStore, type Store } from "../src/store.js";
import type { PsiIndex } from "../src/types.js";
import { loadTestIndex } from "./test-index.js";

let store: Store;
let index: PsiIndex;

beforeAll(async () => {
  index = await loadTestIndex();
  store = createStore(index);
});

describe("search", () => {
  function synthesizePatterns(count: number) {
    return {
      ...index,
      patterns: [
        ...index.patterns,
        ...Array.from({ length: count }, (_, n) => ({
          ...index.patterns[n % index.patterns.length],
          id: `synthetic-pattern-${n}`,
        })),
      ],
    };
  }

  it("ranks the Button component first for 'button'", () => {
    const briefs = store.search("button");
    expect(briefs[0].id).toBe("component:Button");
    expect(briefs[0].summary).toContain("accent");
  });

  it("finds tokens and topics", () => {
    expect(store.search("bgPrimary").some((b) => b.id === "token:bgPrimary")).toBe(true);
    expect(store.search("variants").some((b) => b.id === "topic:variants")).toBe(true);
  });

  it("resolves scale and theme queries to their topics (HAN-16)", () => {
    expect(store.search("space").some((b) => b.id === "topic:scales")).toBe(true);
    expect(store.search("radius").some((b) => b.id === "topic:scales")).toBe(true);
    expect(store.search("themes").some((b) => b.id === "topic:themes")).toBe(true);
    expect(store.get("topic:themes")!.markdown).toContain("ember");
    expect(store.get("topic:scales")!.markdown).toContain("space");
  });

  it("stays within the response budget", () => {
    for (const q of ["", "button", "color", "a"]) {
      expect(JSON.stringify(store.search(q)).length).toBeLessThanOrEqual(6000);
    }
    // The overview is the response that grows with the catalog, so it is
    // held to the budget at the grown sizes the envelope tests use as well
    // (D61, D100), not only at today's.
    for (const extra of [5, 16]) {
      const grown = createStore(synthesizePatterns(extra) as typeof index);
      expect(JSON.stringify(grown.search("")).length).toBeLessThanOrEqual(6000);
    }
  });

  it("returns an overview for an empty query", () => {
    const briefs = store.search("");
    expect(briefs.some((b) => b.kind === "component")).toBe(true);
    expect(briefs.some((b) => b.kind === "topic")).toBe(true);
    expect(briefs.some((b) => b.kind === "pattern")).toBe(true);
  });

  it("keeps the whole guidance surface in the overview, whatever the catalog size", () => {
    const briefs = store.search("");
    // The overview is a consumer agent's first call, and it is budget-capped.
    // Guidance must never be the thing that falls off the end: topics carry
    // rules that no keyword query re-derives, and `getting-started` carries
    // the five required CSS imports. Components are the affordable tail —
    // search("menu") finds Menu.
    expect(briefs.some((b) => b.id === "topic:getting-started")).toBe(true);
    // Not just getting-started: every topic and every pattern the index holds
    // must survive the budget fill.
    const ids = new Set(briefs.map((b) => b.id));
    for (const name of Object.keys(index.topics)) expect(ids.has(`topic:${name}`)).toBe(true);
    for (const p of index.patterns) expect(ids.has(`pattern:${p.id}`)).toBe(true);
    // And the overview is still worth calling: it carries components too.
    expect(briefs.filter((b) => b.kind === "component").length).toBeGreaterThan(5);
  });

  it("ranks the destructive-confirm pattern first for 'delete confirmation' (D47)", () => {
    const briefs = store.search("delete confirmation");
    expect(briefs[0].id).toBe("pattern:destructive-confirm");
  });

  it("drops the repeated title from the overview's pattern rows only (D100)", () => {
    // A pattern's title is its id after `pattern:`, so in the budget-capped
    // overview it is pure cost. Every other row, and every keyword result,
    // keeps it.
    const overview = store.search("");
    const patternRows = overview.filter((b) => b.kind === "pattern");
    expect(patternRows.length).toBe(index.patterns.length);
    for (const row of patternRows) {
      expect(Object.keys(row)).toEqual(["id", "kind", "summary"]);
      expect(row.id).toMatch(/^pattern:/);
    }
    for (const row of overview.filter((b) => b.kind !== "pattern")) {
      expect(row).toHaveProperty("title");
    }

    // The stored brief is untouched: keyword search returns it whole.
    const hit = store.search("delete confirmation")[0];
    expect(hit).toMatchObject({ id: "pattern:destructive-confirm", title: "destructive-confirm" });
  });

  it("keeps every pattern and the component floor inside the operating envelope (D61, D100)", () => {
    // 24 real + 3 synthetic = 27. D129 added two fixed index rows to the
    // overview (guide:* and tokens:*, about 220 characters), so the edge
    // moved in: the component floor holds through 3 synthetic patterns and
    // first breaks at 4 (7 components at 4, measured against this store.ts),
    // where before D129 it held through 5. The synthetic count is what you
    // lower when the real catalog grows; the 6000-character budget and the
    // floor of 8 do not move.
    //
    // The envelope is a function of per-pattern *cost*, not pattern count:
    // id, kind and the never-capped `blocked (gaps: …)` tail are not
    // compressible, so the same count of cheaper patterns fits and the same
    // count of dearer ones does not. A sweep with short synthetic ids puts
    // the edge at 36; this test deliberately uses long ids, which is the
    // conservative case and the one closer to Psi's real ids.
    const grown = synthesizePatterns(3);
    const grownStore = createStore(grown as typeof index);
    const briefs = grownStore.search("");

    expect(JSON.stringify(briefs).length).toBeLessThanOrEqual(6000);
    for (const name of Object.keys(grown.topics)) {
      expect(briefs.some((b) => b.id === `topic:${name}`)).toBe(true);
    }
    for (const p of grown.patterns) {
      expect(briefs.some((b) => b.id === `pattern:${p.id}`)).toBe(true);
    }
    expect(briefs.filter((b) => b.kind === "component").length).toBeGreaterThanOrEqual(8);

    // The backlog must survive the trim inside the envelope — this is the
    // assertion whose absence let a flat 120-char cap ship a truncated tail.
    for (const p of grown.patterns.filter((x) => x.blocked)) {
      const brief = briefs.find((b) => b.id === `pattern:${p.id}`);
      expect(brief?.summary).toContain("blocked (gaps:");
    }
  });

  it("degrades by shedding components, not patterns, past the envelope (D61)", () => {
    // 16 synthetic on top of 24 real = 40 total, past the envelope (the
    // floor holds through 27 patterns since D129's two fixed index rows). At
    // this size the component floor provably cannot hold: 40 patterns'
    // irreducible per-item JSON overhead (id/kind, never capped, plus the
    // always-uncapped `blocked (gaps: …)` tail) alone
    // exceeds what's left of the 6000-byte budget after topics and any
    // component reserve — no derived pattern-intro limit can close that
    // gap. So COMPONENT_FLOOR is deliberately NOT asserted here; instead
    // this test pins the intended degradation mode — components decline
    // one at a time rather than vanishing, and neither topics nor patterns
    // are ever sacrificed to make room. If a future change makes patterns
    // start vanishing instead of components, this test must fail.
    const grown = synthesizePatterns(16);
    const grownStore = createStore(grown as typeof index);
    const briefs = grownStore.search("");

    expect(JSON.stringify(briefs).length).toBeLessThanOrEqual(6000);
    for (const p of grown.patterns) {
      expect(briefs.some((b) => b.id === `pattern:${p.id}`)).toBe(true);
    }
    expect(briefs.filter((b) => b.kind === "component").length).toBeGreaterThanOrEqual(1);

    for (const p of grown.patterns.filter((x) => x.blocked)) {
      const brief = briefs.find((b) => b.id === `pattern:${p.id}`);
      expect(brief?.summary).toContain("blocked (gaps:");
    }
  });

  it("finds guides and token pages by keyword", () => {
    expect(store.search("theming").some((b) => b.id === "guide:theming")).toBe(true);
    expect(store.search("typography").some((b) => b.id === "tokens:typography")).toBe(true);
  });

  it("lists the guides and token pages in one index row each in the overview (D129)", () => {
    const overview = store.search("");
    const guides = overview.find((b) => b.id === "guide:*")!;
    const tokenPages = overview.find((b) => b.id === "tokens:*")!;
    for (const id of Object.keys(index.docs.guides)) expect(guides.summary).toContain(id);
    for (const slug of Object.keys(index.docs.tokenPages)) expect(tokenPages.summary).toContain(slug);
  });
});

describe("get", () => {
  it("returns a component's whole docs page", () => {
    const page = store.get("component:Button")!;
    expect(page).toMatchObject({ id: "component:Button", kind: "component", title: "Button" });
    expect(page.markdown).toBe(index.docs.components.button.markdown);
    expect(page.markdown).toContain("## Examples");
  });

  it("returns the page that holds a member export", () => {
    const page = store.get("TableRow")!;
    expect(page.kind).toBe("component");
    expect(page.markdown).toBe(index.docs.components.table.markdown);
  });

  it("resolves bare names case-insensitively", () => {
    expect(store.get("button")?.id).toBe("component:Button");
  });

  it("returns a token page, a guide, a token, a pattern and a topic as markdown", () => {
    expect(store.get("tokens:color")?.markdown).toBe(index.docs.tokenPages.color.markdown);
    expect(store.get("guide:theming")?.markdown).toBe(index.docs.guides.theming.markdown);
    expect(store.get("token:bgPrimary")?.markdown).toContain("| ember | oklch(");
    expect(store.get("pattern:destructive-confirm")?.markdown).toMatch(/^# Pattern: destructive-confirm\n/);
    expect(store.get("topic:variants")?.markdown).toMatch(/^# Topic: variants\n/);
  });

  it("keeps today's meaning for a bare name that is both a topic and a token page", () => {
    // "motion" is a guidance topic and a token page. Bare names keep their
    // pre-D129 resolution order, so it stays the topic.
    expect(store.get("motion")?.kind).toBe("topic");
    expect(store.get("tokens:motion")?.kind).toBe("tokens");
  });

  it("does not resolve names inherited from Object.prototype", () => {
    expect(store.get("constructor")).toBeNull();
    expect(store.get("__proto__")).toBeNull();
    expect(store.get("guide:constructor")).toBeNull();
    expect(store.get("tokens:constructor")).toBeNull();
  });

  it("returns null for an unknown id, and suggests the three nearest", () => {
    expect(store.get("component:Buton")).toBeNull();
    expect(store.suggest("component:Buton")).toHaveLength(3);
    expect(store.suggest("component:Buton")[0]).toBe("component:Button");
  });

  it("suggest keeps every kind that shares a bare name", () => {
    expect(store.suggest("motio")).toContain("topic:motion");
  });

  it("filter-toolbar is now unblocked with a preset (D52)", () => {
    const brief = store.search("filter toolbar").find((b) => b.id === "pattern:filter-toolbar");
    expect(brief).toBeDefined();
    expect(brief!.summary).not.toContain("blocked");
    expect(store.get("pattern:filter-toolbar")!.markdown).toContain("<Toolbar");
  });
});
