/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll } from "vitest";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../src/index-builder.js";
import { createStore, type Store } from "../src/store.js";

const pkgs = fileURLToPath(new URL("../..", import.meta.url));
let store: Store;
let index: Awaited<ReturnType<typeof buildIndex>>;

beforeAll(async () => {
  index = await buildIndex({
    tokensDist: `${pkgs}tokens/dist`,
    reactDist: `${pkgs}react/dist`,
    reactDocs: `${pkgs}react/docs`,
    version: "0.0.0-test",
  });
  store = createStore(index);
});

describe("search", () => {
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
    const themes = store.get("topic:themes") as { content: { themes: string[] } };
    expect(themes.content.themes).toContain("ember");
    expect((store.get("topic:scales") as { content: object }).content).toHaveProperty("space");
  });

  it("stays within the response budget", () => {
    for (const q of ["", "button", "color", "a"]) {
      expect(JSON.stringify(store.search(q)).length).toBeLessThanOrEqual(6000);
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

  it("keeps every pattern and the component floor inside the operating envelope (D61)", () => {
    // 6 synthetic patterns on top of 13 real = 19 total. Measured directly
    // against this store.ts (see docs/superpowers/specs/2026-08-05-overview-allocation-design.md,
    // "Operating envelope"): the floor holds through 21 patterns and first
    // breaks at 22 (drops to 7 components). 19 keeps a safety margin below
    // that measured edge — the spec's table claims the envelope reaches
    // ~25-28, but a full sweep run for this task (13/19/20/21/22/25/29/33/39
    // patterns, same store.ts, same synthesis) shows the floor already
    // failing at 25 (6 components, not the documented 8) and at every
    // larger point in the table; only 13 and ~19 reproduce as documented.
    // Flagged for reconciliation — see D61 task report.
    const grown = synthesizePatterns(6);
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
    // Triple today's catalog (26 synthetic on top of 13 real = 39 total),
    // past the ~25-28 pattern envelope documented in the spec's Operating
    // envelope section. At this size the component floor provably cannot
    // hold: 39 patterns' irreducible per-item JSON overhead (id/kind/title,
    // never capped, plus the always-uncapped `blocked (gaps: …)` tail) alone
    // exceeds what's left of the 6000-byte budget after topics and any
    // component reserve — no derived pattern-intro limit can close that
    // gap. So COMPONENT_FLOOR is deliberately NOT asserted here; instead
    // this test pins the intended degradation mode — components decline
    // one at a time rather than vanishing, and neither topics nor patterns
    // are ever sacrificed to make room. If a future change makes patterns
    // start vanishing instead of components, this test must fail.
    const grown = synthesizePatterns(26);
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
});

describe("get", () => {
  it("returns full component detail with props and doc", () => {
    const detail = store.get("component:Button");
    expect(detail).toMatchObject({ kind: "component", name: "Button" });
    expect((detail as any).props.length).toBeGreaterThan(3);
  });

  it("resolves bare names case-insensitively", () => {
    expect((store.get("button") as any).name).toBe("Button");
    expect((store.get("BGPRIMARY") as any).name).toBe("bgPrimary");
  });

  it("returns token values for all four themes", () => {
    const detail = store.get("token:bgPrimary") as any;
    expect(Object.keys(detail.values)).toEqual(["light", "dark", "acme", "ember"]);
    expect(detail.formula).toBe("slot(canvas)");
  });

  it("returns topic content and null for unknown ids", () => {
    expect((store.get("topic:getting-started") as any).content).toHaveProperty("cssImports");
    expect(store.get("nope:nothing")).toBeNull();
  });

  it("returns full pattern detail with parameters (D47)", () => {
    const detail = store.get("pattern:destructive-confirm");
    expect(detail).toMatchObject({ kind: "pattern", id: "destructive-confirm" });
    expect((detail as any).parameters.length).toBeGreaterThan(0);
  });

  it("filter-toolbar is now unblocked with a preset (D52)", () => {
    const brief = store.search("filter toolbar").find((b) => b.id === "pattern:filter-toolbar");
    expect(brief).toBeDefined();
    expect(brief!.summary).not.toContain("blocked");
    const detail = store.get("pattern:filter-toolbar");
    expect(JSON.stringify(detail)).toContain("<Toolbar");
  });
});
