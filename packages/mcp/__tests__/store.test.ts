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

  it("fills a query's results to the budget, best first, as the catalog grows (D132)", () => {
    const extras = Array.from({ length: 30 }, (_, n) => `ExtraButton${n}`);
    const grownIndex = {
      ...index,
      docs: {
        ...index.docs,
        components: {
          ...index.docs.components,
          extras: { ...Object.values(index.docs.components)[0], title: "ExtraButtons", members: extras },
        },
      },
      components: [
        ...index.components,
        ...extras.map((name) => ({
          ...index.components[0],
          name,
          // As long as a summary gets (220): 20 such hits outgrow the budget.
          description: "A <button> that does a button's work. ".repeat(8),
        })),
      ],
    } as typeof index;
    const results = createStore(grownIndex).search("button");
    expect(JSON.stringify(results).length).toBeLessThanOrEqual(6000);
    expect(results[0].id).toBe("component:Button");
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
    // And the overview is still worth calling: it names every component and
    // states the totals (D145), where it used to show 8 of 60.
    const components = briefs.find((b) => b.id === "component:*")!;
    expect(components.summary).toContain(`${index.components.length} components`);
    for (const c of index.components) expect(components.summary).toContain(c.name);
    const icons = briefs.find((b) => b.id === "icons:all")!;
    expect(icons.summary).toContain(`${index.icons.names.length} icons`);
  });

  it("gives every pattern row more than one word of its intent (D145)", () => {
    // At 0.37.0's 24 patterns the D61 component floor left an intro cap of 0:
    // "The…", "Transient…". The names row costs a third of the 8 briefs.
    for (const row of store.search("").filter((b) => b.kind === "pattern")) {
      const intro = row.summary.replace(/, blocked \(gaps: .*\)$/, "");
      expect(intro.split(" ").length, row.id).toBeGreaterThan(3);
    }
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

  it("keeps every pattern, the index rows and readable intros inside the operating envelope (D61, D100, D145)", () => {
    // 24 real + 3 synthetic = 27. D145 replaced the D61 floor of 8 component
    // briefs with one `component:*` row naming them all, and added
    // `icons:all`; what growth spends now is the pattern intro. With long
    // synthetic ids every intro keeps at least 16 characters through 34
    // patterns and falls to a word at 35 (scripts/measure-overview-envelope.ts).
    // The synthetic count is what you lower when the real catalog grows.
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
    expect(briefs.some((b) => b.id === "component:*")).toBe(true);
    expect(briefs.some((b) => b.id === "icons:all")).toBe(true);
    for (const row of briefs.filter((b) => b.kind === "pattern")) {
      expect(row.summary.replace(/, blocked \(gaps: .*\)$/, "").length, row.id).toBeGreaterThanOrEqual(16);
    }

    // The backlog must survive the trim inside the envelope — this is the
    // assertion whose absence let a flat 120-char cap ship a truncated tail.
    for (const p of grown.patterns.filter((x) => x.blocked)) {
      const brief = briefs.find((b) => b.id === `pattern:${p.id}`);
      expect(brief?.summary).toContain("blocked (gaps:");
    }
  });

  it("degrades by shortening pattern intros, never by dropping patterns, past the envelope (D61)", () => {
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
    // The names row is fixed: every component stays named however far the
    // catalog grows (D145).
    expect(briefs.some((b) => b.id === "component:*")).toBe(true);

    for (const p of grown.patterns.filter((x) => x.blocked)) {
      const brief = briefs.find((b) => b.id === `pattern:${p.id}`);
      expect(brief?.summary).toContain("blocked (gaps:");
    }
  });

  it("finds an icon by its name and by what it shows (D145)", () => {
    expect(store.search("IconMoreHorizontal")[0].id).toBe("icon:IconMoreHorizontal");
    expect(store.search("more horizontal")[0].id).toBe("icon:IconMoreHorizontal");
    expect(store.search("ellipsis").some((b) => b.id === "icon:IconMoreHorizontal")).toBe(true);
    expect(store.search("delete").some((b) => b.id === "icon:IconTrash")).toBe(true);
  });

  it("finds a hook by name, first (D145)", () => {
    expect(store.search("useToast")[0].id).toBe("hook:useToast");
    expect(store.search("useFieldControl")[0].id).toBe("hook:useFieldControl");
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

  it("returns an icon's page, by id or bare name (D145)", () => {
    const page = store.get("icon:IconTrash")!;
    expect(page).toMatchObject({ id: "icon:IconTrash", kind: "icon", title: "IconTrash" });
    expect(page.markdown).toBe(index.docs.icons.byName.IconTrash);
    expect(page.markdown).toContain('import { IconTrash } from "@handamade/psi-react";');
    expect(store.get("IconTrash")!.id).toBe("icon:IconTrash");
    expect(store.get("icon:Button")).toBeNull();
  });

  it("returns the icons page as icons:all or icons (D145)", () => {
    for (const id of ["icons:all", "icons"]) {
      const page = store.get(id)!;
      expect(page).toMatchObject({ id: "icons:all", kind: "icons" });
      for (const name of index.icons.names) expect(page.markdown).toContain(name);
    }
  });

  it("returns the page a hook is documented on (D145)", () => {
    const page = store.get("hook:useToast")!;
    expect(page).toMatchObject({ id: "hook:useToast", kind: "hook", title: "useToast" });
    expect(page.markdown).toBe(index.docs.components.toast.markdown);
    expect(page.markdown).toContain("## useToast()");
    expect(store.get("useToast")!.id).toBe("hook:useToast");
    expect(store.get("useFieldControl")!.markdown).toContain("## useFieldControl()");
  });

  it("refuses an index whose exported hook is on no page (D145)", () => {
    const docs = structuredClone(index.docs);
    docs.components.toast.hooks = [];
    expect(() => createStore({ ...index, docs })).toThrow(/hook "useToast" is on no docs page/);
  });

  it("suggests icon ids for a misspelt one (D145)", () => {
    expect(store.suggest("IconTrsh")).toContain("icon:IconTrash");
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
