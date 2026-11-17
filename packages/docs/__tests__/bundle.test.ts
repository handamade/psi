import { describe, expect, it } from "vitest";

import { buildDocsPages, componentPageMd, patternMd, tokenMd, topicMd } from "../src/markdown";
import { loadDocsInput } from "../src/node";
import { componentPages, tokenPages } from "../src/pages";
import type { PatternLike } from "../src/types";

const input = loadDocsInput();

const pattern: PatternLike = {
  id: "destructive-confirm",
  intent: "Confirm before deleting.",
  match: ["delete confirmation", "are you sure"],
  compose: {
    component: "Dialog",
    props: { open: "{param:open}" },
    slots: { title: ["{content:title}"], footer: [{ component: "Button", props: { variant: "danger" }, content: "Delete" }] },
  },
  parameters: [{ key: "open", ask: "Is it open?", options: ["open", "closed"], default: "closed" }],
  content: { title: "Delete this item?" },
  gaps: [],
  blocked: false,
  preset: "<Dialog open>…</Dialog>",
};

describe("tokenMd", () => {
  it("gives the custom property, the formula and a row per theme", () => {
    const md = tokenMd(input, "bgPrimary");
    expect(md.startsWith("# `--psi-bg-primary`\n")).toBe(true);
    expect(md).toContain(input.resolved.light.tokens.bgPrimary.formula);
    for (const t of ["light", "dark", "acme", "ember"]) expect(md).toMatch(new RegExp(`^\\| ${t} \\| oklch\\(`, "m"));
  });

  it("throws on an unknown token", () => {
    expect(() => tokenMd(input, "nope")).toThrow(/nope/);
  });
});

describe("patternMd", () => {
  const md = patternMd(pattern);
  it("states intent, matches, parameters, content and the preset", () => {
    expect(md.startsWith("# Pattern: destructive-confirm\n")).toBe(true);
    expect(md).toContain("Confirm before deleting.");
    expect(md).toContain("| `open` | Is it open? | open, closed | closed |");
    expect(md).toContain("- `title`: Delete this item?");
    expect(md).toContain("```tsx\n<Dialog open>…</Dialog>\n```");
  });

  it("draws the compose tree as a nested list", () => {
    expect(md).toContain('- `Dialog` {"open":"{param:open}"}');
    expect(md).toContain("  - footer:");
    expect(md).toContain('    - `Button` {"variant":"danger"}: Delete');
  });

  it("says when a pattern is blocked, and why", () => {
    const blocked = patternMd({ ...pattern, blocked: true, gaps: ["no Combobox"], preset: null });
    expect(blocked).toContain("Blocked. Gaps: no Combobox");
    expect(blocked).not.toContain("```tsx");
  });
});

describe("topicMd", () => {
  it("renders nested guidance as a list", () => {
    const md = topicMd("motion", { reducedMotion: "zero", recipes: { fade: "opacity", list: ["a", "b"] } });
    expect(md).toBe(
      "# Topic: motion\n\n- **reducedMotion**: zero\n- **recipes**:\n  - **fade**: opacity\n  - **list**:\n    - a\n    - b\n",
    );
  });

  it("renders a bare string as a paragraph", () => {
    expect(topicMd("note", "Just text.")).toBe("# Topic: note\n\nJust text.\n");
  });
});

describe("buildDocsPages", () => {
  const pages = buildDocsPages(input, { patterns: [pattern], topics: { motion: { a: 1 } } });

  it("holds every component, token and guide page, identical to its builder", () => {
    expect(Object.keys(pages.components)).toEqual(componentPages.map((p) => p.slug));
    expect(pages.components.tabs.markdown).toBe(componentPageMd(input, componentPages.find((p) => p.slug === "tabs")!));
    expect(Object.keys(pages.tokenPages)).toEqual(tokenPages.map((p) => p.slug));
    expect(pages.tokenPages.color.title).toBe("Color tokens");
    expect(Object.keys(pages.guides)).toEqual(input.guides.map((g) => g.id));
  });

  it("holds every token, and the patterns and topics it was given", () => {
    expect(Object.keys(pages.tokens).length).toBe(Object.keys(input.resolved.light.tokens).length);
    expect(Object.keys(pages.patterns)).toEqual(["destructive-confirm"]);
    expect(pages.topics.motion).toBe("# Topic: motion\n\n- **a**: 1\n");
  });
});
