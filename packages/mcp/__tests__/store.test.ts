/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll } from "vitest";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../src/index-builder.js";
import { createStore, type Store } from "../src/store.js";

const pkgs = fileURLToPath(new URL("../..", import.meta.url));
let store: Store;

beforeAll(async () => {
  const index = await buildIndex({
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

  it("stays within the response budget", () => {
    for (const q of ["", "button", "color", "a"]) {
      expect(JSON.stringify(store.search(q)).length).toBeLessThanOrEqual(6000);
    }
  });

  it("returns an overview for an empty query", () => {
    const briefs = store.search("");
    expect(briefs.some((b) => b.kind === "component")).toBe(true);
    expect(briefs.some((b) => b.kind === "topic")).toBe(true);
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
});
