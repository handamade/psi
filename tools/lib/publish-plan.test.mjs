import { describe, expect, it } from "vitest";
import { publishOrder, workspaceLeaks } from "./publish-plan.mjs";

const pkg = (name, deps = {}, field = "dependencies") => ({ name, dir: `packages/${name}`, json: { name, [field]: deps } });

describe("publishOrder", () => {
  it("puts a package after every workspace package it depends on", () => {
    const tokens = pkg("@handamade/psi-tokens");
    const react = pkg("@handamade/psi-react", { "@handamade/psi-tokens": "workspace:*" });
    const mcp = pkg("@handamade/psi-mcp", {
      "@handamade/psi-tokens": "workspace:*",
      "@handamade/psi-react": "workspace:*",
    });
    expect(publishOrder([mcp, react, tokens]).map((p) => p.name)).toEqual([
      "@handamade/psi-tokens",
      "@handamade/psi-react",
      "@handamade/psi-mcp",
    ]);
  });

  it("counts peer and dev dependencies too, since pnpm pack pins all of them", () => {
    const tokens = pkg("@handamade/psi-tokens");
    const react = pkg("@handamade/psi-react", { "@handamade/psi-tokens": ">=0.2.0 <1.0.0" }, "peerDependencies");
    const viaDev = pkg("@handamade/psi-x", { "@handamade/psi-react": "workspace:*" }, "devDependencies");
    expect(publishOrder([viaDev, react, tokens]).map((p) => p.name)).toEqual([
      "@handamade/psi-tokens",
      "@handamade/psi-react",
      "@handamade/psi-x",
    ]);
  });

  it("ignores dependencies outside the set being published", () => {
    const react = pkg("@handamade/psi-react", { react: "^19.0.0" });
    expect(publishOrder([react]).map((p) => p.name)).toEqual(["@handamade/psi-react"]);
  });

  it("keeps independent packages in the order given", () => {
    const a = pkg("a");
    const b = pkg("b");
    expect(publishOrder([b, a]).map((p) => p.name)).toEqual(["b", "a"]);
  });

  it("refuses a dependency cycle rather than guessing an order", () => {
    const a = pkg("a", { b: "workspace:*" });
    const b = pkg("b", { a: "workspace:*" });
    expect(() => publishOrder([a, b])).toThrow(/cycle/);
  });
});

describe("workspaceLeaks", () => {
  it("is empty when every internal dependency was pinned to a version", () => {
    expect(
      workspaceLeaks({
        dependencies: { "@handamade/psi-tokens": "0.30.0" },
        peerDependencies: { react: "^19.0.0" },
      }),
    ).toEqual([]);
  });

  it("names each workspace: or catalog: spec left in any dependency field", () => {
    expect(
      workspaceLeaks({
        dependencies: { "@handamade/psi-tokens": "workspace:*" },
        devDependencies: { vitest: "catalog:" },
        optionalDependencies: { "@handamade/psi-react": "workspace:^" },
      }),
    ).toEqual([
      "dependencies.@handamade/psi-tokens@workspace:*",
      "devDependencies.vitest@catalog:",
      "optionalDependencies.@handamade/psi-react@workspace:^",
    ]);
  });
});
