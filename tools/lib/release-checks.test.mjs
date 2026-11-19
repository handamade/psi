import { describe, expect, it } from "vitest";
import { evalFreshness, figmaWarning, minorsBehind, newestRun, releaseDates } from "./release-checks.mjs";

const tag = (pkg, version, date) => `@handamade/psi-${pkg}@${version}\t${date}`;
// The three packages are tagged together at one version (lockstep).
const release = (version, date) => ["tokens", "react", "mcp"].map((p) => tag(p, version, date));

describe("newestRun", () => {
  it("orders by name, so a suffixed run is newer than the plain one of the same day", () => {
    expect(newestRun(["2026-08-07.md", "2026-08-07-b.md", "2026-07-21.md"])).toEqual({
      file: "2026-08-07-b.md",
      date: "2026-08-07",
    });
  });

  it("ignores files that are not runs", () => {
    expect(newestRun(["README.md", "2026-07-15.md", "notes.txt", "2026-13.md"])).toEqual({
      file: "2026-07-15.md",
      date: "2026-07-15",
    });
  });

  it("returns null when there are no runs", () => {
    expect(newestRun([])).toBeNull();
    expect(newestRun(["README.md"])).toBeNull();
  });
});

describe("releaseDates", () => {
  it("counts a version once across its three package tags, at its earliest date", () => {
    const lines = [tag("tokens", "0.37.0", "2026-11-18"), tag("react", "0.37.0", "2026-11-19"), tag("mcp", "0.37.0", "2026-11-18")];
    expect([...releaseDates(lines)]).toEqual([["0.37.0", "2026-11-18"]]);
  });

  it("ignores tags that are not Psi package releases", () => {
    const lines = ["v1.0.0\t2026-01-01", "@other/pkg@1.0.0\t2026-01-01", "", ...release("0.1.0", "2026-06-01")];
    expect([...releaseDates(lines).keys()]).toEqual(["0.1.0"]);
  });
});

describe("evalFreshness", () => {
  const tags = [
    ...release("0.14.2", "2026-08-07"),
    ...release("0.15.0", "2026-08-10"),
    ...release("0.16.0", "2026-08-10"),
    ...release("0.17.0", "2026-08-11"),
    ...release("0.18.0", "2026-08-12"),
    ...release("0.19.0", "2026-08-13"),
  ];

  it("does not count a release tagged on the run's own day", () => {
    const r = evalFreshness({ runFiles: ["2026-08-07-b.md"], tagLines: release("0.14.2", "2026-08-07"), limit: 5 });
    expect(r).toMatchObject({ ok: true, since: 0, newest: "2026-08-07-b.md" });
  });

  it("passes at limit - 1 releases since the run", () => {
    const r = evalFreshness({ runFiles: ["2026-08-07.md"], tagLines: tags.slice(0, 15), limit: 5 });
    expect(r).toMatchObject({ ok: true, since: 4 });
  });

  it("refuses at limit releases since the run, naming the run and how to log one", () => {
    const r = evalFreshness({ runFiles: ["2026-07-21.md", "2026-08-07-b.md"], tagLines: tags, limit: 5 });
    expect(r.ok).toBe(false);
    expect(r.since).toBe(5);
    expect(r.message).toContain("runs/2026-08-07-b.md");
    expect(r.message).toContain("5 releases");
    expect(r.message).toContain("PROMPT.md");
    expect(r.message).toContain("RUBRIC.md");
  });

  it("refuses when there is no run at all", () => {
    const r = evalFreshness({ runFiles: [], tagLines: tags, limit: 5 });
    expect(r).toMatchObject({ ok: false, newest: null });
    expect(r.message).toContain("PROMPT.md");
  });
});

describe("minorsBehind", () => {
  it("counts minors within a major", () => {
    expect(minorsBehind("0.27.0", "0.37.0")).toBe(10);
    expect(minorsBehind("0.37.0", "0.37.2")).toBe(0);
    expect(minorsBehind("0.38.0", "0.37.0")).toBe(0);
  });

  it("treats a major behind as infinitely behind", () => {
    expect(minorsBehind("0.37.0", "1.0.0")).toBe(Infinity);
  });
});

describe("figmaWarning", () => {
  it("is quiet when the stamp is at most one minor behind", () => {
    expect(figmaWarning({ stamp: { reflects: "0.37.0" }, released: "0.37.0" })).toBeNull();
    expect(figmaWarning({ stamp: { reflects: "0.37.0" }, released: "0.38.0" })).toBeNull();
  });

  it("warns when the stamp is more than one minor behind, naming both versions", () => {
    const w = figmaWarning({ stamp: { reflects: "0.37.0" }, released: "0.39.0" });
    expect(w).toContain("0.37.0");
    expect(w).toContain("0.39.0");
    expect(w).toContain("docs/figma-library.json");
  });

  it("warns when the stamp is missing or unreadable", () => {
    expect(figmaWarning({ stamp: null, released: "0.37.0" })).toContain("docs/figma-library.json");
    expect(figmaWarning({ stamp: { reflects: "latest" }, released: "0.37.0" })).toContain("docs/figma-library.json");
  });
});
