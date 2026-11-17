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
  const server = createPsiServer(createStore(index), index.version, index);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test", version: "0.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
});

describe("psi MCP server", () => {
  it("lists the read-only tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["check", "get", "search", "theme"]);
  });

  it("answers theme calls with CSS, and bad input as an error", async () => {
    const ok = (await client.callTool({ name: "theme", arguments: { color: "#3b82f6", name: "ocean" } })) as ToolCallResult;
    expect(ok.isError).toBeFalsy();
    expect(ok.content[0].text).toContain('[data-psi-theme="ocean-dark"]');
    const bad = (await client.callTool({ name: "theme", arguments: { color: "nope" } })) as ToolCallResult;
    expect(bad.isError).toBe(true);
    expect(bad.content[0].text).toContain('Could not read "nope"');
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

  it("rejects an over-long get id and search query before any work", async () => {
    const id = (await client.callTool({ name: "get", arguments: { id: "x".repeat(201) } })) as ToolCallResult;
    expect(id.isError).toBe(true);
    expect(id.content[0].text.length).toBeLessThan(1000);
    const query = (await client.callTool({ name: "search", arguments: { query: "x".repeat(501) } })) as ToolCallResult;
    expect(query.isError).toBe(true);
  });

  it("answers check calls with findings, and over-long code as an error", async () => {
    const res = (await client.callTool({ name: "check", arguments: { code: '<Button size="md">x</Button>' } })) as ToolCallResult;
    expect(res.content[0].text).toContain("**invalid-value**");
    const long = (await client.callTool({ name: "check", arguments: { code: "x".repeat(20_001) } })) as ToolCallResult;
    expect(long.isError).toBe(true);
  });
});
