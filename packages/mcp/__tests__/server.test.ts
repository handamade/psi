import { describe, it, expect, beforeAll } from "vitest";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildIndex } from "../src/index-builder.js";
import { createStore } from "../src/store.js";
import { createPsiServer } from "../src/server.js";

type ToolCallResult = { content: Array<{ type: string; text: string }>; isError?: boolean };

const pkgs = fileURLToPath(new URL("../..", import.meta.url));
let client: Client;

beforeAll(async () => {
  const index = await buildIndex({
    tokensDist: `${pkgs}tokens/dist`,
    reactDist: `${pkgs}react/dist`,
    reactDocs: `${pkgs}react/docs`,
    version: "0.0.0-test",
  });
  const server = createPsiServer(createStore(index), index.version);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test", version: "0.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
});

describe("psi MCP server", () => {
  it("lists exactly the two read-only tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["get", "search"]);
  });

  it("answers search calls with briefs", async () => {
    const res = (await client.callTool({ name: "search", arguments: { query: "button" } })) as ToolCallResult;
    const briefs = JSON.parse(res.content[0].text);
    expect(briefs[0].id).toBe("component:Button");
  });

  it("answers get calls with full detail", async () => {
    const res = (await client.callTool({ name: "get", arguments: { id: "token:bgPrimary" } })) as ToolCallResult;
    const detail = JSON.parse(res.content[0].text);
    expect(detail.values.ember.hex).toMatch(/^#/);
  });

  it("flags unknown ids as errors without throwing", async () => {
    const res = (await client.callTool({ name: "get", arguments: { id: "component:Dialog" } })) as ToolCallResult;
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("search");
  });
});
