import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createStore } from "../src/store.js";
import { createPsiServer } from "../src/server.js";
import { loadTestIndex } from "./test-index.js";

type ToolCallResult = { content: Array<{ type: string; text: string }>; isError?: boolean };

let client: Client;

beforeAll(async () => {
  const index = await loadTestIndex();
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

  it("answers get calls with the docs page's markdown", async () => {
    const res = (await client.callTool({ name: "get", arguments: { id: "token:bgPrimary" } })) as ToolCallResult;
    expect(res.content[0].text).toMatch(/^# `--psi-bg-primary`\n/);
    expect(res.content[0].text).toContain("| ember | oklch(");
  });

  it("flags unknown ids as errors without throwing", async () => {
    const res = (await client.callTool({ name: "get", arguments: { id: "component:DoesNotExist" } })) as ToolCallResult;
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("search");
    expect(res.content[0].text).toContain("Nearest:");
  });
});
